import React from 'react';

export type Mode = 'web' | 'local';

interface ModeToggleProps {
    mode: Mode;
    setMode: (mode: Mode) => void;
}

export function ModeToggle({ mode, setMode }: ModeToggleProps) {
    return (
        <div className="flex p-1 space-x-1 bg-zinc-200/50 dark:bg-zinc-800/50 rounded-2xl shadow-inner max-w-sm mx-auto border border-zinc-200/50 dark:border-zinc-700/50">
            <button
                onClick={() => setMode('web')}
                className={`flex-1 py-3 px-4 rounded-xl text-sm font-semibold transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${mode === 'web'
                        ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-50 shadow-sm ring-1 ring-zinc-900/5 dark:ring-white/10 scale-100'
                        : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-white/50 dark:hover:bg-zinc-700/50 scale-[0.98]'
                    }`}
            >
                <div className="flex items-center justify-center gap-2.5">
                    <svg className={`w-4 h-4 transition-colors ${mode === 'web' ? 'text-blue-600 dark:text-blue-400' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    Web Upload
                </div>
            </button>
            <button
                onClick={() => setMode('local')}
                className={`flex-1 py-3 px-4 rounded-xl text-sm font-semibold transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${mode === 'local'
                        ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-50 shadow-sm ring-1 ring-zinc-900/5 dark:ring-white/10 scale-100'
                        : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-white/50 dark:hover:bg-zinc-700/50 scale-[0.98]'
                    }`}
            >
                <div className="flex items-center justify-center gap-2.5">
                    <svg className={`w-4 h-4 transition-colors ${mode === 'local' ? 'text-indigo-600 dark:text-indigo-400' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                    </svg>
                    Local Directory
                </div>
            </button>
        </div>
    );
}
