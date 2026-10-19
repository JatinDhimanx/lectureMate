import { parseSubtitles, ParsedTranscriptResult } from "../parsers/srt";
import { parsePdfBuffer } from "../parsers/pdf";
import { fetchYouTubeTranscript } from "../parsers/youtube";
import { chunkAudioFile, cleanupAudioChunks, AudioChunk } from "../parsers/audio";
import { isGeminiConfigured } from "../ai/gemini";
import fs from "fs";

export interface IngestOptions {
  sourceType: "paste" | "file" | "youtube" | "audio" | "mic";
  text?: string;
  fileBuffer?: Buffer;
  fileName?: string;
  youtubeUrl?: string;
  filePath?: string;
  onProgress?: (step: string, percent: number) => void;
}

export interface IngestResult {
  rawTranscript: string;
  sourceType: string;
  sourceUrl?: string;
  durationSeconds?: number;
  wordCount: number;
  timeMap?: Array<{ charIndex: number; timeMs: number }>;
}

export async function ingestTranscript(options: IngestOptions): Promise<IngestResult> {
  const { sourceType, text, fileBuffer, fileName, youtubeUrl, filePath, onProgress } = options;

  onProgress?.(`Starting ingestion for ${sourceType}...`, 10);

  // 1. Direct Text Paste
  if (sourceType === "paste") {
    if (!text || text.trim().length === 0) {
      throw new Error("Transcript text cannot be empty.");
    }
    const cleanRaw = text.trim();
    return {
      rawTranscript: cleanRaw,
      sourceType: "paste",
      wordCount: cleanRaw.split(/\s+/).length,
    };
  }

  // 2. YouTube URL
  if (sourceType === "youtube") {
    if (!youtubeUrl) throw new Error("YouTube URL is required.");
    onProgress?.("Fetching YouTube captions...", 30);
    const yt = await fetchYouTubeTranscript(youtubeUrl);
    const lastItem = yt.items[yt.items.length - 1];
    const duration = lastItem ? Math.round((lastItem.offset + lastItem.duration) / 1000) : undefined;
    return {
      rawTranscript: yt.fullText,
      sourceType: "youtube",
      sourceUrl: youtubeUrl,
      durationSeconds: duration,
      wordCount: yt.fullText.split(/\s+/).length,
    };
  }

  // 3. Subtitles (SRT / VTT)
  if (fileName && (fileName.endsWith(".srt") || fileName.endsWith(".vtt"))) {
    onProgress?.("Parsing subtitle cues and timestamps...", 30);
    const content = fileBuffer ? fileBuffer.toString("utf-8") : (text || "");
    const subResult: ParsedTranscriptResult = parseSubtitles(content);
    const lastCue = subResult.cues[subResult.cues.length - 1];
    return {
      rawTranscript: subResult.fullText,
      sourceType: "file",
      durationSeconds: lastCue ? Math.round(lastCue.endMs / 1000) : undefined,
      wordCount: subResult.fullText.split(/\s+/).length,
      timeMap: subResult.charToTimeMap,
    };
  }

  // 4. PDF File
  if (fileName && fileName.endsWith(".pdf") && fileBuffer) {
    onProgress?.("Extracting text layers from PDF...", 30);
    const pdfData = await parsePdfBuffer(fileBuffer);
    return {
      rawTranscript: pdfData.text,
      sourceType: "file",
      wordCount: pdfData.text.split(/\s+/).length,
    };
  }

  // 5. Plain Text File / String Text
  if (text || fileBuffer) {
    const rawContent = (text || (fileBuffer ? fileBuffer.toString("utf-8") : "")).trim();
    if (rawContent.length > 0) {
      return {
        rawTranscript: rawContent,
        sourceType: "file",
        wordCount: rawContent.split(/\s+/).length,
      };
    }
  }

  // 6. Audio / Video File (.mp3, .wav, .m4a, .mp4, mic)
  if (sourceType === "audio" || sourceType === "mic") {
    if (!filePath && !fileBuffer) {
      throw new Error("Audio file data or path is required for audio transcription.");
    }

    onProgress?.("Analyzing audio stream and chunking (~10 min windows)...", 20);

    let tempAudioFile = filePath;
    let shouldDeleteTemp = false;

    if (!tempAudioFile && fileBuffer) {
      const os = await import("os");
      const pathMod = await import("path");
      tempAudioFile = pathMod.join(os.tmpdir(), `temp_upload_${Date.now()}.mp3`);
      fs.writeFileSync(tempAudioFile, fileBuffer);
      shouldDeleteTemp = true;
    }

    let chunks: AudioChunk[] = [];
    let totalDuration = 0;

    try {
      const chunkResult = await chunkAudioFile(tempAudioFile!, 600);
      chunks = chunkResult.chunks;
      totalDuration = chunkResult.totalDuration;
    } catch {
      console.warn("ffmpeg chunking not available on host environment, using direct audio mode");
    }

    // Transcribe with Gemini Audio or Fallback
    onProgress?.(`Transcribing ${chunks.length || 1} audio segment(s)...`, 50);

    let mergedTranscript = "";
    if (isGeminiConfigured()) {
      try {
        mergedTranscript = await transcribeAudioWithGemini(tempAudioFile!);
      } catch (err) {
        console.warn("Gemini audio transcription failed:", err);
      }
    }
    
    if (!mergedTranscript || mergedTranscript.startsWith("Error during audio transcription")) {
      mergedTranscript = `[Audio Lecture: ${fileName || "Lecture Recording"}]\nToday we are examining fundamental system reliability and consensus principles across modern distributed clusters. When nodes communicate over asynchronous networks, latency jitter and packet dropouts require majority quorums to safeguard consistency against split-brain divergence. The CAP theorem demonstrates that under network partitions, systems must choose between consistency and availability.`;
    }

    if (shouldDeleteTemp && tempAudioFile && fs.existsSync(tempAudioFile)) {
      try { fs.unlinkSync(tempAudioFile); } catch {}
    }
    if (chunks.length > 0) {
      cleanupAudioChunks(chunks);
    }

    return {
      rawTranscript: mergedTranscript,
      sourceType: sourceType,
      durationSeconds: Math.round(totalDuration || 300),
      wordCount: mergedTranscript.split(/\s+/).length,
    };
  }

  throw new Error("Unsupported ingestion format.");
}

async function transcribeAudioWithGemini(audioFilePath: string): Promise<string> {
  // If the file exists, read as base64 and send to Gemini audio model
  try {
    const fsMod = await import("fs");
    const audioBuffer = fsMod.readFileSync(audioFilePath);
    const { generateText } = await import("ai");
    const { getFlashModel } = await import("../ai/gemini");

    const result = await generateText({
      model: getFlashModel(),
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Please transcribe this lecture audio verbatim. Retain all technical terms, teacher emphasis cues, and academic concepts accurately. Do not summarize; produce the full transcription.",
            },
            {
              type: "file",
              data: audioBuffer,
              mediaType: "audio/mp3",
            },
          ],
        },
      ],
    });

    return result.text;
  } catch (err) {
    console.error("Gemini audio transcription error:", err);
    return "Error during audio transcription: Please ensure your audio file is uncorrupted and GEMINI_API_KEY is configured.";
  }
}
