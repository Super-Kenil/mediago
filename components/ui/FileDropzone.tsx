import React, { useState, useCallback, useEffect } from 'react';
import { useFFmpeg } from '../../hooks/useFFmpeg';

export function FileDropzone() {
    const [isDragging, setIsDragging] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [isConverting, setIsConverting] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

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
            if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
            }
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
            }
        } catch (error) {
            console.error(error);
            alert("Conversion failed. Please check the console for details.");
        } finally {
            setIsConverting(false);
        }
    };

    return (
        <div className="w-full max-w-2xl mx-auto space-y-6">
            {!isLoaded && isFfmpegLoading && (
                <div className="flex items-center justify-center p-4 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-2xl animate-pulse">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-600 dark:text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Loading Conversion Engine...
                </div>
            )}

            <div
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                className={`relative group flex flex-col items-center justify-center w-full h-72 border-2 border-dashed rounded-3xl transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] cursor-pointer overflow-hidden ${isDragging
                    ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-500/10 scale-[1.02] shadow-sm'
                    : 'border-zinc-300 dark:border-zinc-700 bg-zinc-50/80 dark:bg-zinc-800/50 hover:bg-zinc-100/80 dark:hover:bg-zinc-800/80 hover:border-zinc-400 dark:hover:border-zinc-500 hover:shadow-sm'
                    }`}
            >
                <input
                    type="file"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    onChange={onChange}
                    disabled={isConverting}
                />

                <div className="flex flex-col items-center justify-center space-y-6 p-6 text-center z-0 relative">
                    <div className={`p-5 rounded-full transition-all duration-300 ${isDragging
                        ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 scale-110'
                        : 'bg-white dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400 shadow-sm group-hover:bg-zinc-50 dark:group-hover:bg-zinc-600 group-hover:scale-105 group-hover:text-blue-500'
                        }`}>
                        <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                    </div>

                    <div className="space-y-2">
                        <h3 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200">
                            <span className="text-blue-600 dark:text-blue-400">Click to browse</span> or drag & drop
                        </h3>
                        <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                            Videos, Images, or Audio files
                        </p>
                        <p className="text-xs text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mt-1">
                            Maximum file size 500MB
                        </p>
                    </div>
                </div>
            </div>

            {file && (
                <div className="flex flex-col gap-4 p-5 bg-white dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/80 rounded-2xl shadow-sm transition-all animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4 overflow-hidden">
                            <div className="p-3 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl">
                                <svg className="w-6 h-6 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                            <div className="flex flex-col min-w-0">
                                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate pr-4">
                                    {file.name}
                                </p>
                                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                    {(file.size / 1024 / 1024).toFixed(2)} MB
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => {
                                setFile(null);
                                setPreviewUrl(null);
                            }}
                            disabled={isConverting}
                            className="p-2.5 rounded-xl text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Remove file"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <div className="pt-4 border-t border-zinc-100 dark:border-zinc-700/50">
                        <h4 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">Convert to:</h4>
                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={() => handleConvert('png')}
                                disabled={!isLoaded || isConverting}
                                className="px-4 py-2 bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-500/20 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                PNG
                            </button>
                            <button
                                onClick={() => handleConvert('webp')}
                                disabled={!isLoaded || isConverting}
                                className="px-4 py-2 bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                WebP
                            </button>
                            <button
                                onClick={() => handleConvert('gif')}
                                disabled={!isLoaded || isConverting}
                                className="px-4 py-2 bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-500/20 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                GIF
                            </button>
                        </div>
                    </div>

                    {isConverting && (
                        <div className="p-4 mt-2 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl flex items-center justify-center space-x-3">
                            <svg className="animate-spin h-5 w-5 text-blue-600 dark:text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span className="text-sm font-medium text-zinc-600 dark:text-zinc-300">
                                Converting your file... this might take a moment.
                            </span>
                        </div>
                    )}

                    {previewUrl && !isConverting && (
                        <div className="mt-4 flex flex-col items-center space-y-3">
                            <p className="text-sm font-medium text-green-600 dark:text-green-400 self-start">
                                Conversion Successful!
                            </p>
                            <div className="relative w-full rounded-xl overflow-hidden bg-black/5 dark:bg-white/5 border border-zinc-200 dark:border-zinc-700 flex justify-center p-4">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={previewUrl}
                                    alt="Converted output"
                                    className="max-h-80 object-contain rounded-lg shadow-sm"
                                />
                            </div>
                            <a
                                href={previewUrl}
                                download={`converted_${file.name.split('.')[0]}`}
                                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-medium rounded-xl transition-colors text-center shadow-sm"
                            >
                                Download Converted File
                            </a>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
