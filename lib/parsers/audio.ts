import ffmpeg from "fluent-ffmpeg";
import path from "path";
import fs from "fs";
import os from "os";

function setupFfmpeg() {
  try {
    // Dynamic require so bundlers don't attempt to bundle platform binary package.json files
    const installer = require("@ffmpeg-installer/ffmpeg");
    if (installer && installer.path) {
      ffmpeg.setFfmpegPath(installer.path);
    }
  } catch {
    // Binary fallback
  }
}

setupFfmpeg();

export interface AudioChunk {
  chunkIndex: number;
  filePath: string;
  startTimeSeconds: number;
  durationSeconds: number;
}

/**
 * Splits an audio or video file into ~10-minute (600s) chunks formatted as 16kHz mono MP3
 */
export async function chunkAudioFile(
  inputFilePath: string,
  chunkDurationSeconds: number = 600
): Promise<{ chunks: AudioChunk[]; totalDuration: number }> {
  // First probe duration
  const totalDuration = await getMediaDuration(inputFilePath);
  const numChunks = Math.max(1, Math.ceil(totalDuration / chunkDurationSeconds));
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "recallloop-audio-"));
  const chunks: AudioChunk[] = [];

  for (let i = 0; i < numChunks; i++) {
    const startTime = i * chunkDurationSeconds;
    const duration = Math.min(chunkDurationSeconds, totalDuration - startTime);
    const chunkPath = path.join(tempDir, `chunk_${i}.mp3`);

    await new Promise<void>((resolve, reject) => {
      ffmpeg(inputFilePath)
        .setStartTime(startTime)
        .setDuration(duration)
        .audioChannels(1)
        .audioFrequency(16000)
        .audioCodec("libmp3lame")
        .output(chunkPath)
        .on("end", () => resolve())
        .on("error", (err) => reject(err))
        .run();
    });

    chunks.push({
      chunkIndex: i,
      filePath: chunkPath,
      startTimeSeconds: startTime,
      durationSeconds: duration,
    });
  }

  return { chunks, totalDuration };
}

export function getMediaDuration(filePath: string): Promise<number> {
  return new Promise((resolve) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err || !metadata || !metadata.format || !metadata.format.duration) {
        // Fallback default duration if ffprobe is unavailable
        resolve(300);
      } else {
        resolve(metadata.format.duration);
      }
    });
  });
}

export function cleanupAudioChunks(chunks: AudioChunk[]): void {
  for (const chunk of chunks) {
    try {
      if (fs.existsSync(chunk.filePath)) {
        fs.unlinkSync(chunk.filePath);
      }
      const dir = path.dirname(chunk.filePath);
      if (fs.existsSync(dir) && dir.includes("recallloop-audio-")) {
        fs.rmdirSync(dir);
      }
    } catch {
      // Best-effort cleanup
    }
  }
}
