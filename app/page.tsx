'use client';

import React, { useState } from 'react';

declare module 'react' {
  interface InputHTMLAttributes<T> extends HTMLAttributes<T> {
    webkitdirectory?: string;
    directory?: string;
  }
}

import { Navbar } from '@/components/Navbar';
import { ModeToggle, Mode } from '@/components/ModeToggle';
import { FileDropzone } from '@/components/ui/FileDropzone';

export default function Dashboard() {
  const [mode, setMode] = useState<Mode>('web');
  const [files, setFiles] = useState<FileList | null>(null);

  const handleFolderSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(e.target.files);
      console.log("Selected files:", e.target.files);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans flex flex-col transition-colors duration-300">
      <Navbar />

      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 flex flex-col gap-12">

        {/* Header Section */}
        <div className="flex flex-col items-center justify-center text-center space-y-5">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
            Media Management
          </h1>
          <p className="max-w-2xl text-lg sm:text-xl text-zinc-600 dark:text-zinc-400">
            Seamlessly upload files through the web interface or configure your local directory sync settings.
          </p>
        </div>

        {/* Navigation / Toggle */}
        <div className="w-full">
          <ModeToggle mode={mode} setMode={setMode} />
        </div>

        {/* Dynamic Content Area */}
        <div className="w-full transition-opacity duration-500 ease-in-out">
          {mode === 'web' ? (
            <div className="flex flex-col items-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[2rem] p-8 sm:p-14 shadow-sm hover:shadow-md transition-shadow duration-300">
              <div className="mb-10 text-center space-y-3">
                <h2 className="text-3xl font-bold text-zinc-800 dark:text-zinc-100">Upload Files</h2>
                <p className="text-base text-zinc-500 dark:text-zinc-400">
                  Select and upload media files securely to your cloud storage.
                </p>
              </div>
              <FileDropzone />
            </div>
          ) : (
            <div className="flex flex-col items-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[2rem] p-8 sm:p-14 shadow-sm hover:shadow-md transition-shadow duration-300">
              <div className="mb-10 text-center space-y-3">
                <h2 className="text-3xl font-bold text-zinc-800 dark:text-zinc-100">Local Directory Setup</h2>
                <p className="text-base text-zinc-500 dark:text-zinc-400">
                  Configure the path for local media synchronization.
                </p>
              </div>

              <div className="w-full max-w-3xl space-y-8">
                <div className="space-y-4 text-left w-full mx-auto">
                  <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 ml-1">
                    Directory Path
                  </label>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <input
                      type="text"
                      placeholder="/Users/admin/Media"
                      className="flex-1 w-full px-5 py-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-600 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none font-medium shadow-sm"
                    />
                    <input
                      type="file"
                      webkitdirectory="true"
                      className="hidden"
                      id="folderInput"
                      onChange={handleFolderSelect}
                    />
                    {files && (
                      <p className="text-sm text-green-500 mt-2">
                        {files.length} files selected
                      </p>
                    )}
                    <button
                      onClick={() => document.getElementById('folderInput')?.click()}
                      className="px-8 py-4 bg-zinc-900 dark:bg-white text-white dark:text-black font-semibold rounded-2xl"
                    >
                      Browse Folder
                    </button>
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-2 mt-3 ml-1">
                    <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Make sure the application has read and write permissions for this folder.
                  </p>
                </div>

                <div className="p-6 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-2xl flex gap-5 text-left w-full mx-auto">
                  <div className="mt-0.5 p-2 bg-amber-100 dark:bg-amber-500/20 rounded-xl h-fit">
                    <svg className="w-6 h-6 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-base font-semibold text-amber-900 dark:text-amber-500">Important Note</h4>
                    <p className="mt-2 text-sm text-amber-800 dark:text-amber-400/80 leading-relaxed">
                      Local directory monitoring is active. Files added to the monitored folder will be automatically processed. Symbolic links and hidden files are ignored.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
