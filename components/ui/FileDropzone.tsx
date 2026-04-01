import React, { useState, useCallback } from 'react';

export function FileDropzone() {
    const [isDragging, setIsDragging] = useState(false);
    const [file, setFile] = useState<File | null>(null);

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
        }
    }, []);

    const onChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setFile(e.target.files[0]);
        }
    }, []);

    return (
        <div className="w-full max-w-2xl mx-auto">
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
                <div className="mt-6 flex items-center justify-between p-5 bg-white dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/80 rounded-2xl shadow-sm transition-all animate-in fade-in slide-in-from-bottom-4 duration-500">
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
                                Ready for upload
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => setFile(null)}
                        className="p-2.5 rounded-xl text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all flex-shrink-0"
                        title="Remove file"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            )}
        </div>
    );
}
