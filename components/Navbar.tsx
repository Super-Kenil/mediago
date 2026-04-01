import React from 'react';

export function Navbar() {
    return (
        <nav className="w-full bg-white dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 shadow-sm sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16 items-center">
                    <div className="flex-shrink-0 flex items-center cursor-pointer group">
                        <div className="w-8 h-8 mr-3 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 dark:from-blue-500 dark:to-indigo-500 flex items-center justify-center shadow-md group-hover:shadow-lg transition-all duration-300">
                            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
                            </svg>
                        </div>
                        <span className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                            MediaGo
                        </span>
                    </div>
                    <div className="flex items-center space-x-6">
                        <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50 cursor-pointer transition-colors">
                            Documentation
                        </span>
                        <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50 cursor-pointer transition-colors">
                            Settings
                        </span>
                        <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden border border-zinc-300 dark:border-zinc-700 cursor-pointer hover:ring-2 hover:ring-blue-500 hover:ring-offset-2 hover:ring-offset-white dark:hover:ring-offset-zinc-950 transition-all">
                            {/* Avatar placeholder */}
                            <svg className="w-full h-full text-zinc-400 dark:text-zinc-500 mt-1" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" />
                            </svg>
                        </div>
                    </div>
                </div>
            </div>
        </nav>
    );
}
