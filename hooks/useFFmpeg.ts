import { useState, useRef, useCallback, useEffect } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

export function useFFmpeg() {
    const [isLoaded, setIsLoaded] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const ffmpegRef = useRef<FFmpeg | null>(null);

    const load = useCallback(async () => {
        if (ffmpegRef.current) return;
        setIsLoading(true);
        const ffmpeg = new FFmpeg();
        ffmpegRef.current = ffmpeg;

        ffmpeg.on('log', ({ message }) => {
            console.log(message);
        });

        try {
            const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
            await ffmpeg.load({
                coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
                wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
            });
            setIsLoaded(true);
        } catch (error) {
            console.error("Failed to load FFmpeg:", error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const convertImage = async (file: File, toFormat: 'png' | 'jpeg' | 'webp'): Promise<Blob> => {
        const ffmpeg = ffmpegRef.current;
        if (!ffmpeg || !isLoaded) throw new Error("FFmpeg is not loaded");

        const inputName = `input_${file.name}`;
        const outputName = `output.${toFormat}`;

        await ffmpeg.writeFile(inputName, await fetchFile(file));
        await ffmpeg.exec(['-i', inputName, outputName]);
        const data = await ffmpeg.readFile(outputName);

        await ffmpeg.deleteFile(inputName);
        await ffmpeg.deleteFile(outputName);

        return new Blob([data as any], { type: `image/${toFormat}` });
    };

    const convertWebpToGif = async (file: File): Promise<Blob> => {
        const ffmpeg = ffmpegRef.current;
        if (!ffmpeg || !isLoaded) throw new Error("FFmpeg is not loaded");

        const inputName = `input_${file.name}`;
        const tempVideo = `temp.mp4`;
        const outputName = `output.gif`;

        await ffmpeg.writeFile(inputName, await fetchFile(file));

        // Step 1: WebP → MP4
        await ffmpeg.exec([
            '-i', inputName,
            '-movflags', 'faststart',
            '-pix_fmt', 'yuv420p',
            tempVideo
        ]);

        // Step 2: MP4 → GIF
        await ffmpeg.exec([
            '-i', tempVideo,
            '-vf',
            'fps=10,scale=320:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse',
            '-loop', '0',
            outputName
        ]);

        const data = await ffmpeg.readFile(outputName);

        await ffmpeg.deleteFile(inputName);
        await ffmpeg.deleteFile(tempVideo);
        await ffmpeg.deleteFile(outputName);

        return new Blob([data as any], { type: 'image/gif' });
    };

    const convertVideoToGif = async (file: File): Promise<Blob> => {
        const ffmpeg = ffmpegRef.current;
        if (!ffmpeg || !isLoaded) throw new Error("FFmpeg is not loaded");

        const inputName = `input_${file.name}`;
        const outputName = `output.gif`;

        await ffmpeg.writeFile(inputName, await fetchFile(file));
        await ffmpeg.exec([
            '-i', inputName,
            '-vf', 'fps=10,scale=320:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse',
            '-loop', '0',
            outputName
        ]);
        const data = await ffmpeg.readFile(outputName);

        await ffmpeg.deleteFile(inputName);
        await ffmpeg.deleteFile(outputName);

        return new Blob([data as any], { type: 'image/gif' });
    };

    return {
        isLoaded,
        isLoading,
        convertImage,
        convertWebpToGif,
        convertVideoToGif,
    };
}
