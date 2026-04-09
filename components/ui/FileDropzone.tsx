import React, { useState, useCallback, useEffect } from 'react';
import { useFFmpeg } from '../../hooks/useFFmpeg';
import JSZip from 'jszip';

export type JobStatus = 'pending' | 'processing' | 'completed' | 'error';
export interface Job {
    file: string;
    status: JobStatus;
    error?: string;
}

export function FileDropzone() {
    const [isDragging, setIsDragging] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [isConverting, setIsConverting] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    // Zip feature history
    const [convertedHistory, setConvertedHistory] = useState<{ name: string, blob: Blob }[]>([]);

    // Backend directory processing state
    const [apiLoading, setApiLoading] = useState(false);
    const [apiResult, setApiResult] = useState<{
        processedFiles: string[];
        errors: { file: string; error: string }[];
    } | null>(null);
    const [apiGlobalError, setApiGlobalError] = useState<string | null>(null);

    // Concurrency queue state
    const [jobs, setJobs] = useState<Job[]>([]);
    const [queueRunning, setQueueRunning] = useState(false);

    // Configuration state
    const [folderPath, setFolderPath] = useState<string>("C:/Users/Administrator/Downloads");
    const [configQuality, setConfigQuality] = useState<number>(80);
    const [configTargetFormat, setConfigTargetFormat] = useState<string>('webp');

    const getAvailableFormats = (fileExtension: string) => {
        const ext = fileExtension.toLowerCase();
        const images = ['.jpg', '.jpeg', '.png', '.webp'];
        const videos = ['.mp4', '.avi', '.mov', '.webm'];
        if (images.includes(ext)) return ['webp', 'jpg', 'png'];
        if (videos.includes(ext)) return ['gif'];
        return [];
    };

    const { isLoaded, isLoading: isFfmpegLoading, convertImage, convertVideoToGif, convertWebpToGif } = useFFmpeg();

    const onDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const onDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const onDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            setFile(e.dataTransfer.files[0]);
            setPreviewUrl(null);
        }
    }, []);

    const onChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setFile(e.target.files[0]);
            setPreviewUrl(null);
        }
    }, []);

    useEffect(() => {
        return () => {
            if (previewUrl) URL.revokeObjectURL(previewUrl);
        };
    }, [previewUrl]);

    const handleConvert = async (type: 'png' | 'webp' | 'gif') => {
        if (!file || isConverting || !isLoaded) return;

        setIsConverting(true);
        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
            setPreviewUrl(null);
        }

        try {
            let resultBlob: Blob | null = null;
            const fileType = file.type;

            if (type === 'gif') {
                if (fileType.includes('video')) {
                    resultBlob = await convertVideoToGif(file);
                } else if (fileType === 'image/webp') {
                    resultBlob = await convertWebpToGif(file);
                } else {
                    alert("Only video or animated WebP can be converted to GIF");
                }
            } else if (type === 'png' || type === 'webp') {
                if (fileType.includes('image')) {
                    resultBlob = await convertImage(file, type);
                } else {
                    alert("Only images can be converted to PNG or WebP");
                }
            }

            if (resultBlob) {
                const url = URL.createObjectURL(resultBlob);
                setPreviewUrl(url);
                setConvertedHistory(prev => [...prev, { name: `converted_${file.name.split('.')[0]}.${type}`, blob: resultBlob! }]);
            }
        } catch (error) {
            console.error(error);
            alert("Conversion failed. Please check the console for details.");
        } finally {
            setIsConverting(false);
        }
    };

    const handleDownloadZip = async () => {
        if (convertedHistory.length === 0) return;
        const zip = new JSZip();

        convertedHistory.forEach((item) => {
            zip.file(item.name, item.blob);
        });

        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(zipBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'Converted_Media.zip';
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleProcessFolder = async () => {
        setApiLoading(true);
        setApiResult(null);
        setApiGlobalError(null);
        setJobs([]);
        setQueueRunning(true);

        try {
            const scanRes = await fetch('/api/process-media', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    path: folderPath,
                    targetFormat: configTargetFormat,
                    action: 'scan'
                })
            });
            const scanData = await scanRes.json();

            if (!scanRes.ok || !scanData.success) {
                throw new Error(scanData.error || 'Failed to scan root directory');
            }

            const fileList: string[] = scanData.files || [];
            if (fileList.length === 0) {
                throw new Error('No compatible files remaining to process in this directory.');
            }

            const initialJobs = fileList.map(f => ({ file: f, status: 'pending' as JobStatus }));
            setJobs(initialJobs);

            const concurrencyLimit = 2;
            let currentIndex = 0;
            const results: { processedFiles: string[], errors: { file: string, error: string }[] } = {
                processedFiles: [],
                errors: []
            };

            const worker = async () => {
                while (true) {
                    let jobIndex: number = -1;

                    if (currentIndex < initialJobs.length) {
                        jobIndex = currentIndex++;
                    } else {
                        break;
                    }

                    const jobFile = initialJobs[jobIndex].file;

                    setJobs(prev => {
                        const next = [...prev];
                        next[jobIndex] = { ...next[jobIndex], status: 'processing' };
                        return next;
                    });

                    try {
                        const res = await fetch('/api/process-media', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                path: folderPath,
                                quality: configQuality,
                                targetFormat: configTargetFormat,
                                action: 'process_single',
                                file: jobFile
                            })
                        });
                        const data = await res.json();

                        if (!res.ok || !data.success) {
                            throw new Error(data.error || 'API Execution failed');
                        }

                        if (data.errors && data.errors.length > 0) {
                            throw new Error(data.errors[0].error);
                        }

                        results.processedFiles.push(...(data.processedFiles || []));

                        setJobs(prev => {
                            const next = [...prev];
                            next[jobIndex] = { ...next[jobIndex], status: 'completed' };
                            return next;
                        });

                    } catch (err: any) {
                        results.errors.push({ file: jobFile, error: err.message });

                        setJobs(prev => {
                            const next = [...prev];
                            next[jobIndex] = { ...next[jobIndex], status: 'error', error: err.message };
                            return next;
                        });
                    }
                }
            };

            const workers = [];
            for (let i = 0; i < concurrencyLimit; i++) {
                workers.push(worker());
            }

            await Promise.all(workers);
            setApiResult(results);

        } catch (error: any) {
            setApiGlobalError(error.message || 'An unexpected error occurred.');
        } finally {
            setApiLoading(false);
            setQueueRunning(false);
        }
    };

    const handleClearResults = () => {
        setApiResult(null);
        setApiGlobalError(null);
        setJobs([]);
        setConvertedHistory([]);
    };

    return (
        <div className="w-full max-w-4xl mx-auto px-4 py-8 space-y-12">

            {/* FFmpeg Engine Status Component */}
            {!isLoaded && isFfmpegLoading && (
                <div className="flex items-center justify-center p-5 bg-indigo-50/80 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 rounded-2xl backdrop-blur-lg border border-indigo-100 dark:border-indigo-500/20 shadow-lg shadow-indigo-500/5 animate-in fade-in slide-in-from-top-4 duration-700">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-indigo-600 dark:text-indigo-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span className="font-semibold tracking-wide text-sm uppercase">Booting Media Engine...</span>
                </div>
            )}

            {/* SECTION 1: Web Uploads */}
            <section className="relative flex flex-col items-center w-full">
                <div className="mb-6 text-center">
                    <h2 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white sm:text-4xl">Studio <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">Upload</span></h2>
                    <p className="mt-2 text-lg text-zinc-500 dark:text-zinc-400">Drag and drop visual assets for client-side rendering.</p>
                </div>

                <div
                    onDragOver={onDragOver}
                    onDragLeave={onDragLeave}
                    onDrop={onDrop}
                    className={`relative group flex flex-col items-center justify-center w-full h-80 rounded-[2.5rem] transition-all duration-300 ease-out cursor-pointer overflow-hidden backdrop-blur-xl border-dashed border-2 ${isDragging
                        ? 'border-indigo-500 bg-indigo-50/60 dark:bg-indigo-900/20 scale-[1.02] shadow-[0_0_50px_-12px_rgba(99,102,241,0.3)]'
                        : 'border-zinc-300 dark:border-zinc-700 bg-white/40 dark:bg-zinc-900/40 hover:bg-zinc-50/60 dark:hover:bg-zinc-800/60 hover:border-indigo-400 dark:hover:border-indigo-500 hover:shadow-2xl hover:shadow-indigo-500/10'
                        }`}
                >
                    <input
                        type="file"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        onChange={onChange}
                        disabled={isConverting}
                    />

                    <div className="flex flex-col items-center justify-center space-y-6 p-6 text-center z-0 relative pointer-events-none">
                        <div className={`p-6 rounded-3xl transition-transform duration-500 ${isDragging
                            ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white scale-110 shadow-lg shadow-indigo-500/30'
                            : 'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 shadow-xl shadow-black/5 group-hover:-translate-y-2 group-hover:scale-105 group-hover:text-indigo-600 dark:group-hover:text-indigo-400'
                            }`}>
                            <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-xl font-bold text-zinc-800 dark:text-zinc-100">
                                <span className="text-indigo-600 dark:text-indigo-400">Click to browse</span> or drag & drop
                            </h3>
                            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                                MP4, WEBP, PNG, JPG supported natively
                            </p>
                        </div>
                    </div>
                </div>

                {/* Individual File Action Card */}
                {file && (
                    <div className="w-full mt-6 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xl border border-white/20 dark:border-zinc-800 rounded-3xl shadow-2xl p-6 transition-all animate-in fade-in slide-in-from-bottom-8 duration-700">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div className="flex items-center space-x-4 overflow-hidden">
                                <div className="p-3.5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-lg shadow-blue-500/20 text-white shrink-0">
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                </div>
                                <div className="flex flex-col min-w-0">
                                    <p className="text-base font-bold text-zinc-900 dark:text-white truncate">
                                        {file.name}
                                    </p>
                                    <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                                        {(file.size / 1024 / 1024).toFixed(2)} MB • Ready for processing
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    setFile(null);
                                    setPreviewUrl(null);
                                }}
                                disabled={isConverting}
                                className="p-3 rounded-2xl text-zinc-400 bg-zinc-50 hover:bg-red-50 hover:text-red-600 dark:bg-zinc-800 dark:hover:bg-red-500/10 dark:hover:text-red-400 transition-all disabled:opacity-50"
                                title="Remove file"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="mt-6 pt-5 border-t border-zinc-100 dark:border-zinc-800">
                            <h4 className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-4">Export Target</h4>
                            <div className="flex flex-wrap gap-3">
                                {file && getAvailableFormats(`.${file.name.split('.').pop()}`).map((format) => (
                                    <button
                                        key={format}
                                        onClick={() => handleConvert(format as 'png' | 'webp' | 'gif')}
                                        disabled={!isLoaded || isConverting}
                                        className={`px-5 py-2.5 rounded-xl text-sm font-bold tracking-wide transition-all shadow-sm hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none ${format === 'gif'
                                            ? 'bg-purple-100 text-purple-700 hover:bg-purple-200 hover:shadow-purple-500/20 dark:bg-purple-500/20 dark:text-purple-300 dark:hover:bg-purple-500/30'
                                            : format === 'png'
                                                ? 'bg-blue-100 text-blue-700 hover:bg-blue-200 hover:shadow-blue-500/20 dark:bg-blue-500/20 dark:text-blue-300 dark:hover:bg-blue-500/30'
                                                : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 hover:shadow-emerald-500/20 dark:bg-emerald-500/20 dark:text-emerald-300 dark:hover:bg-emerald-500/30'
                                            }`}
                                    >
                                        {format.toUpperCase()}
                                    </button>
                                ))}
                                {file && getAvailableFormats(`.${file.name.split('.').pop()}`).length === 0 && (
                                    <span className="text-sm font-medium text-red-500 dark:text-red-400 px-2 py-2 flex items-center">
                                        <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                        Incompatible format
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Loading State */}
                        {isConverting && (
                            <div className="mt-5 p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl flex items-center justify-center space-x-3 border border-zinc-100 dark:border-zinc-800">
                                <svg className="animate-spin h-5 w-5 text-indigo-600 dark:text-indigo-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <span className="text-sm font-semibold text-zinc-600 dark:text-zinc-300">
                                    Rendering pixels locally...
                                </span>
                            </div>
                        )}

                        {/* Success State */}
                        {previewUrl && !isConverting && (
                            <div className="mt-6 flex flex-col items-center animate-in zoom-in-95 duration-500 bg-zinc-50 dark:bg-zinc-800/30 p-5 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                                <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 self-start mb-4 flex items-center">
                                    <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                                    Conversion Matrix Completed!
                                </p>
                                <div className="relative w-full rounded-2xl overflow-hidden bg-zinc-200/50 dark:bg-black/40 flex justify-center p-6 shadow-inner">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={previewUrl} alt="Converted output" className="max-h-64 object-contain drop-shadow-2xl rounded-lg" />
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Web Upload Zip History Component */}
                {convertedHistory.length > 0 && (
                    <div className="w-full mt-6 flex flex-col sm:flex-row items-center justify-between p-5 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-3xl shadow-xl shadow-emerald-500/20 animate-in slide-in-from-bottom-8">
                        <div className="flex items-center text-white mb-4 sm:mb-0">
                            <div className="p-2.5 bg-white/20 rounded-xl mr-4 backdrop-blur-sm">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
                            </div>
                            <div>
                                <h4 className="font-bold text-lg leading-tight">Batch Archive Ready</h4>
                                <span className="text-sm font-medium text-emerald-100">{convertedHistory.length} files successfully converted</span>
                            </div>
                        </div>
                        <button
                            onClick={handleDownloadZip}
                            className="w-full sm:w-auto px-6 py-3.5 bg-white text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 rounded-2xl text-sm font-bold tracking-wide transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2 shrink-0"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            Download All (ZIP)
                        </button>
                    </div>
                )}
            </section>

            {/* SEPARATOR */}
            <div className="flex items-center py-4 opacity-60">
                <div className="flex-grow border-t border-zinc-200 dark:border-zinc-700"></div>
                <span className="flex-shrink-0 mx-4 text-sm font-medium text-zinc-400 uppercase tracking-widest">Server Utilities</span>
                <div className="flex-grow border-t border-zinc-200 dark:border-zinc-700"></div>
            </div>

            {/* SECTION 2: Local Directory Processing */}
            <section className="bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xl border border-white/20 dark:border-zinc-800 rounded-3xl shadow-2xl p-6 sm:p-8 overflow-hidden relative">
                {/* Background Decoration */}
                <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="p-3 bg-zinc-100 dark:bg-zinc-800 rounded-2xl shadow-sm text-zinc-700 dark:text-zinc-300">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="text-2xl font-extrabold text-zinc-900 dark:text-white">Directory Link</h3>
                            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Scan and process folders via backend pipelines</p>
                        </div>
                    </div>

                    {/* Configuration Panel */}
                    <div className="bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-700/80 rounded-3xl p-5 sm:p-7 shadow-sm">
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">

                            {/* Path Input */}
                            <div className="col-span-1 md:col-span-12 lg:col-span-6 flex flex-col">
                                <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-2 flex items-center">
                                    Target Directory Path
                                </label>
                                <input
                                    type="text"
                                    value={folderPath}
                                    onChange={(e) => setFolderPath(e.target.value)}
                                    className="w-full text-sm font-medium px-4 py-3 rounded-xl border border-zinc-300 dark:border-zinc-600 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 transition-all outline-none"
                                    placeholder="e.g. C:/Users/Admin/Downloads"
                                />
                            </div>

                            {/* Format Selection & Quality */}
                            <div className="col-span-1 md:col-span-12 lg:col-span-6 grid grid-cols-2 gap-4">
                                <div className="flex flex-col">
                                    <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-2">Build Format</label>
                                    <select
                                        value={configTargetFormat}
                                        onChange={(e) => setConfigTargetFormat(e.target.value)}
                                        className="w-full text-sm font-bold px-4 py-3.5 rounded-xl border border-zinc-300 dark:border-zinc-600 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 cursor-pointer outline-none appearance-none"
                                    >
                                        <option value="webp">WebP Graphic</option>
                                        <option value="jpg">JPEG Standard</option>
                                        <option value="png">PNG Lossless</option>
                                        <option value="gif">GIF Animation</option>
                                    </select>
                                </div>
                                <div className="flex flex-col justify-center">
                                    <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-2 flex justify-between items-center">
                                        Quality
                                        <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400 rounded text-xs leading-none">{configQuality}%</span>
                                    </label>
                                    <input
                                        type="range"
                                        min="0"
                                        max="100"
                                        value={configQuality}
                                        onChange={(e) => setConfigQuality(Number(e.target.value))}
                                        className="w-full h-2 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-indigo-600 dark:accent-indigo-500"
                                    />
                                </div>
                            </div>

                        </div>

                        {/* Execute Button */}
                        <div className="mt-8 flex justify-end">
                            <button
                                onClick={handleProcessFolder}
                                disabled={apiLoading || queueRunning}
                                className="w-full sm:w-auto px-8 py-3.5 bg-zinc-900 hover:bg-black text-white dark:bg-indigo-600 dark:hover:bg-indigo-500 rounded-2xl text-sm font-bold shadow-xl shadow-zinc-900/20 dark:shadow-indigo-600/20 transition-all hover:-translate-y-1 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-3"
                            >
                                {(apiLoading || queueRunning) ? (
                                    <>
                                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Pipeline Processing...
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        Initialize Batch Run
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* API General Error Handler */}
                    {apiGlobalError && (
                        <div className="mt-6 p-5 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-2xl flex items-start gap-4 animate-in slide-in-from-top-4">
                            <svg className="w-6 h-6 text-red-600 dark:text-red-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            <div>
                                <h4 className="font-bold text-red-800 dark:text-red-200">Execution Blocked</h4>
                                <p className="text-sm text-red-700 dark:text-red-300 mt-1">{apiGlobalError}</p>
                            </div>
                        </div>
                    )}

                    {/* Progress Queue UI */}
                    {jobs.length > 0 && (
                        <div className="mt-8">
                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end mb-4 gap-2">
                                <div>
                                    <h4 className="text-lg font-bold text-zinc-800 dark:text-zinc-200">Live Execution Queue</h4>
                                    <p className="text-sm font-medium text-zinc-500">Processing Node Workers: 2</p>
                                </div>
                                <div className="inline-flex items-center px-3 py-1.5 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 rounded-lg text-sm font-bold">
                                    Task Progress: {jobs.filter(j => j.status === 'completed' || j.status === 'error').length} / {jobs.length}
                                </div>
                            </div>

                            <ul className="space-y-3 bg-zinc-50 dark:bg-zinc-800/30 p-2 rounded-2xl border border-zinc-100 dark:border-zinc-700 max-h-80 overflow-y-auto custom-scrollbar shadow-inner">
                                {jobs.map((job, idx) => (
                                    <li key={idx} className="flex flex-col p-4 rounded-xl bg-white dark:bg-zinc-900 shadow-sm border border-zinc-100 dark:border-zinc-800 relative overflow-hidden group">
                                        <div className="flex justify-between items-center w-full z-10 relative">
                                            <span className="text-sm font-bold text-zinc-800 dark:text-zinc-200 truncate pr-4 max-w-[70%]">
                                                {job.file}
                                            </span>
                                            <span className={`text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-2 drop-shadow-sm transition-colors
                                                ${job.status === 'pending' ? 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400' : ''}
                                                ${job.status === 'processing' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300' : ''}
                                                ${job.status === 'completed' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300' : ''}
                                                ${job.status === 'error' ? 'bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-300' : ''}
                                            `}>
                                                {job.status === 'processing' && <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-indigo-400 opacity-75"></span>}
                                                {job.status === 'processing' && <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>}
                                                {job.status === 'processing' && 'Encoding...'}
                                                {job.status === 'pending' && 'Standing by'}
                                                {job.status === 'completed' && 'Rendered'}
                                                {job.status === 'error' && 'Failed'}
                                            </span>
                                        </div>

                                        {/* Status Detail Additions */}
                                        {job.status === 'processing' && (
                                            <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-2 mt-4 overflow-hidden relative shadow-inner">
                                                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-500 w-full animate-progress-indeterminate opacity-80"></div>
                                            </div>
                                        )}
                                        {job.error && (
                                            <p className="text-xs font-medium text-red-600 dark:text-red-400 mt-2 bg-red-50 dark:bg-red-900/10 p-2 rounded-lg border border-red-100 dark:border-red-900/30">
                                                {job.error}
                                            </p>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Final Results Controls */}
                    {apiResult && !queueRunning && (
                        <div className="mt-6 flex justify-end animate-in fade-in slide-in-from-top-4">
                            <button
                                onClick={handleClearResults}
                                className="px-5 py-2.5 text-sm font-bold text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-colors flex items-center gap-2"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                Clear Local Session
                            </button>
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}
