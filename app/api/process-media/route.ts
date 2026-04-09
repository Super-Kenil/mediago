import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';

// Next.js bundler sometimes breaks ffmpeg-static pathing by injecting "\ROOT\" 
// Use process.cwd() to resolve the absolute path from the actual project folder.
let finalFfmpegPath = ffmpegStatic || '';

if (finalFfmpegPath.includes('ROOT') || !finalFfmpegPath) {
    const ffmpegExe = os.platform() === 'win32' ? 'ffmpeg.exe' : 'ffmpeg';
    finalFfmpegPath = path.join(process.cwd(), 'node_modules', 'ffmpeg-static', ffmpegExe);
}

ffmpeg.setFfmpegPath(finalFfmpegPath);
console.log("Resolved FFmpeg absolute path:", finalFfmpegPath);

// ffmpeg.setFfmpegPath('D:\\react\ffmpeg\bin');
/**
 * 
 * Converts media files using fluent-ffmpeg.
 * Uses Promises to enable async/await.
 */
const processMedia = (inputPath: string, outputPath: string, quality: number, targetFormat?: string): Promise<void> => {
    return new Promise((resolve, reject) => {
        let command = ffmpeg(inputPath);

        if (targetFormat === 'webp' || targetFormat === 'jpg' || targetFormat === 'jpeg') {
            // For libwebp/jpg, we use standard -q:v parameter based on input quality
            if (quality !== undefined) {
                // E.g., User gave quality 80 => "-q:v 80"
                command = command.outputOptions(['-q:v', String(quality)]);
            }
        } else if (targetFormat === 'gif') {
            // "Implement logic to convert MP4 to GIF using FFmpeg filters" applying scale/FPS tweaks dynamically via quality
            // Quality 100: fps=15, scale=640:-1, Quality 0: fps=5, scale=240:-1
            const fps = Math.max(5, Math.floor((quality / 100) * 15 + 5));
            const width = Math.max(240, Math.floor((quality / 100) * 400 + 240));
            command = command.complexFilter([
                `fps=${fps},scale=${width}:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse`
            ]);
        }

        command
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
        const { path: dirPath, quality = 80, targetFormat = 'webp', action, file: targetFile } = body;

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

        // 5. Keep existing filter logic
        const validImageExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp']);
        const validVideoExtensions = new Set(['.mp4']);

        // Handle frontend queue scanner
        if (action === 'scan') {
            const dirEntries = await fs.readdir(dirPath, { withFileTypes: true });
            const files = dirEntries
                .filter(entry => entry.isFile() && !entry.name.startsWith('converted_'))
                .map(entry => entry.name)
                .filter(f => {
                    const ext = path.extname(f).toLowerCase();
                    if (targetFormat === 'gif' && validVideoExtensions.has(ext)) return true;
                    if (targetFormat !== 'gif' && validImageExtensions.has(ext)) return true;
                    return false;
                });
            return NextResponse.json({ success: true, files });
        }

        // Determine which files to process
        let filesToProcess: string[] = [];
        if (action === 'process_single' && targetFile) {
            filesToProcess = [targetFile];
        } else {
            // Read directory contents (withFileTypes ensures we distinguish files and directories cleanly)
            const dirEntries = await fs.readdir(dirPath, { withFileTypes: true });
            filesToProcess = dirEntries
                .filter(entry => entry.isFile())
                .map(entry => entry.name);
        }

        if (filesToProcess.length === 0) {
            return NextResponse.json(
                { success: false, error: 'Directory or target contains no files.' },
                { status: 400 }
            );
        }

        // Sets previously declared are accessible here.
        const processedFiles: string[] = [];
        const errors: any[] = [];

        // Process each file sequentially
        for (const file of filesToProcess) {
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
                    // Block Invalid conversion: Image -> Video (e.g. Image -> GIF)
                    if (targetFormat === 'gif') {
                        throw new Error(`Invalid conversion: Cannot convert image ${file} to a video/gif format.`);
                    }

                    const finalExt = ['webp', 'jpg', 'jpeg', 'png'].includes(targetFormat) ? targetFormat : 'webp';
                    const outputPath = path.join(outputDir, `${baseName}.${finalExt}`);

                    await processMedia(inputPath, outputPath, quality, finalExt);
                    processedFiles.push(outputPath);

                } else if (validVideoExtensions.has(ext)) {
                    // Block Invalid conversion: Video -> Image
                    if (targetFormat !== 'gif') {
                        throw new Error(`Invalid conversion: Cannot convert video ${file} to an image format (${targetFormat}).`);
                    }

                    const outputPath = path.join(outputDir, `${baseName}.gif`);
                    await processMedia(inputPath, outputPath, quality, 'gif');
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
