import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';

if (ffmpegStatic) {
    ffmpeg.setFfmpegPath(ffmpegStatic);
}

/**
 * Converts media files using fluent-ffmpeg.
 * Uses Promises to enable async/await.
 */
const processMedia = (inputPath: string, outputPath: string): Promise<void> => {
    return new Promise((resolve, reject) => {
        ffmpeg(inputPath)
            .output(outputPath)
            .on('end', () => resolve())
            .on('error', (err) => {
                console.error(`Error processing ${inputPath}:`, err);
                reject(err);
            })
            .run();
    });
};

export async function POST(req: Request) {
    // Block execution if NODE_ENV is not "development"
    if (process.env.NODE_ENV !== 'development') {
        return NextResponse.json(
            { success: false, error: 'This API is only available in local development.' },
            { status: 403 }
        );
    }

    try {
        // 1. Dynamic Path (Always use the path from body)
        const body = await req.json();
        const dirPath = body.path;

        if (!dirPath || typeof dirPath !== 'string') {
            return NextResponse.json(
                { success: false, error: 'Invalid path provided in request body.' },
                { status: 400 }
            );
        }

        // Validate the supplied path exists and is a directory
        try {
            const stats = await fs.stat(dirPath);
            if (!stats.isDirectory()) {
                return NextResponse.json(
                    { success: false, error: 'The provided path is not a directory.' },
                    { status: 400 }
                );
            }
        } catch (err: any) {
            return NextResponse.json(
                { success: false, error: `Directory not found: ${dirPath}`, details: err.message },
                { status: 404 }
            );
        }

        // 2. Create Output Folder named "converted" securely
        // fs.mkdir with recursive: true does NOT throw an error if the directory already exists
        const outputDir = path.join(dirPath, 'converted');
        try {
            await fs.mkdir(outputDir, { recursive: true });
        } catch (err: any) {
            return NextResponse.json(
                { success: false, error: `Failed to create 'converted' directory.`, details: err.message },
                { status: 500 }
            );
        }

        // Read directory contents (withFileTypes ensures we distinguish files and directories cleanly)
        const dirEntries = await fs.readdir(dirPath, { withFileTypes: true });
        const files = dirEntries
            .filter(entry => entry.isFile())
            .map(entry => entry.name);

        if (files.length === 0) {
            return NextResponse.json(
                { success: false, error: 'Directory contains no files.' },
                { status: 400 }
            );
        }

        // 5. Keep existing filter logic
        const validImageExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp']);
        const validVideoExtensions = new Set(['.mp4']);

        const processedFiles: string[] = [];
        const errors: any[] = [];

        // Process each file sequentially
        for (const file of files) {
            // 4. Skip Already Converted Files
            // We automatically ignored files inside the "converted" folder because fs.readdir is not recursive.
            // Now ignore files starting with 'converted_'
            if (file.startsWith('converted_')) {
                continue;
            }

            const ext = path.extname(file).toLowerCase();
            const baseName = path.basename(file, ext);
            const inputPath = path.join(dirPath, file);

            try {
                if (validImageExtensions.has(ext)) {
                    // 3. Save Converted Files (inside 'converted' folder, change extension to .webp)
                    const outputPath = path.join(outputDir, `${baseName}.webp`);
                    await processMedia(inputPath, outputPath);

                    // 7. Return processed file paths from the 'converted' folder
                    processedFiles.push(outputPath);
                } else if (validVideoExtensions.has(ext)) {
                    // 3. Save Converted Files (inside 'converted' folder, change extension to .gif)
                    const outputPath = path.join(outputDir, `${baseName}.gif`);
                    await processMedia(inputPath, outputPath);

                    // 7. Return processed file paths from the 'converted' folder
                    processedFiles.push(outputPath);
                }
            } catch (err: any) {
                errors.push({ file, error: err.message });
            }
        }

        return NextResponse.json({
            success: true,
            processedFiles,
            errors
        });

    } catch (error: any) {
        return NextResponse.json(
            { success: false, error: 'Failed to process request', details: error.message },
            { status: 500 }
        );
    }
}
