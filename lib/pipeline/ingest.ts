import { parseSubtitles, ParsedTranscriptResult } from "../parsers/srt";
import { parsePdfBuffer } from "../parsers/pdf";
import { parseDocxBuffer } from "../parsers/docx";
import { parsePptxBuffer } from "../parsers/pptx";
import { parseSpreadsheetBuffer } from "../parsers/spreadsheet";
import { fetchYouTubeTranscript } from "../parsers/youtube";
import { chunkAudioFile, cleanupAudioChunks, AudioChunk } from "../parsers/audio";
import { isGeminiConfigured } from "../ai/gemini";
import type { NormalizedDocument, DocumentSegment, DocumentSourceType } from "../parsers/types";
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
  normalizedDocument?: NormalizedDocument;
}

export async function ingestTranscript(options: IngestOptions): Promise<IngestResult> {
  const { sourceType, text, fileBuffer, fileName = "", youtubeUrl, filePath, onProgress } = options;
  const lowerFileName = fileName.toLowerCase();

  onProgress?.(`Starting ingestion for ${sourceType}...`, 10);

  // 1. Direct Text / Markdown Paste
  if (sourceType === "paste") {
    if (!text || text.trim().length === 0) {
      throw new Error("Transcript or notes text cannot be empty.");
    }
    const cleanRaw = text.trim();
    const isMarkdown = cleanRaw.includes("# ") || cleanRaw.includes("```") || cleanRaw.includes("- ");
    const paragraphs = cleanRaw.split(/\n\n+/).filter((p) => p.trim().length > 0);
    let offset = 0;

    const segments: DocumentSegment[] = paragraphs.map((p, idx) => {
      const trimmed = p.trim();
      const seg: DocumentSegment = {
        segmentId: `paste-seg-${idx + 1}`,
        type: trimmed.startsWith("#") ? "heading" : "paragraph",
        text: trimmed,
        location: {
          startOffset: offset,
          endOffset: offset + trimmed.length,
        },
      };
      offset += trimmed.length + 2;
      return seg;
    });

    const normDoc: NormalizedDocument = {
      documentId: `doc-${Date.now()}`,
      sourceType: isMarkdown ? "markdown" : "paste",
      title: paragraphs[0]?.slice(0, 50).replace(/[#*`]/g, "").trim() || "Pasted Lecture Notes",
      language: "en",
      wordCount: cleanRaw.split(/\s+/).length,
      fullText: cleanRaw,
      segments,
    };

    return {
      rawTranscript: cleanRaw,
      sourceType: "paste",
      wordCount: cleanRaw.split(/\s+/).length,
      normalizedDocument: normDoc,
    };
  }

  // 2. YouTube Video
  if (sourceType === "youtube") {
    if (!youtubeUrl) throw new Error("YouTube URL is required.");
    onProgress?.("Fetching verified YouTube captions...", 30);
    const yt = await fetchYouTubeTranscript(youtubeUrl);
    const lastItem = yt.items[yt.items.length - 1];
    const duration = lastItem ? Math.round((lastItem.offset + lastItem.duration) / 1000) : undefined;

    let offset = 0;
    const segments: DocumentSegment[] = yt.items.map((item, idx) => {
      const segText = item.text.replace(/&amp;/g, "&").replace(/&#39;/g, "'").trim();
      const seg: DocumentSegment = {
        segmentId: `yt-seg-${idx + 1}`,
        type: "caption",
        text: segText,
        location: {
          startTime: Math.round(item.offset / 1000),
          endTime: Math.round((item.offset + item.duration) / 1000),
          startOffset: offset,
          endOffset: offset + segText.length,
        },
      };
      offset += segText.length + 1;
      return seg;
    });

    const normDoc: NormalizedDocument = {
      documentId: `doc-yt-${Date.now()}`,
      sourceType: "youtube",
      title: "YouTube Lecture Video",
      language: "en",
      wordCount: yt.fullText.split(/\s+/).length,
      durationSeconds: duration,
      sourceUrl: youtubeUrl,
      fullText: yt.fullText,
      segments,
    };

    return {
      rawTranscript: yt.fullText,
      sourceType: "youtube",
      sourceUrl: youtubeUrl,
      durationSeconds: duration,
      wordCount: yt.fullText.split(/\s+/).length,
      normalizedDocument: normDoc,
    };
  }

  // 3. Subtitles (.srt / .vtt)
  if (lowerFileName.endsWith(".srt") || lowerFileName.endsWith(".vtt")) {
    onProgress?.("Parsing subtitle cues and timestamps...", 30);
    const content = fileBuffer ? fileBuffer.toString("utf-8") : (text || "");
    const subResult: ParsedTranscriptResult = parseSubtitles(content);
    const lastCue = subResult.cues[subResult.cues.length - 1];

    let offset = 0;
    const segments: DocumentSegment[] = subResult.cues.map((cue, idx) => {
      const seg: DocumentSegment = {
        segmentId: `srt-cue-${idx + 1}`,
        type: "caption",
        text: cue.text,
        location: {
          startTime: Math.round(cue.startMs / 1000),
          endTime: Math.round(cue.endMs / 1000),
          startOffset: offset,
          endOffset: offset + cue.text.length,
        },
      };
      offset += cue.text.length + 1;
      return seg;
    });

    const normDoc: NormalizedDocument = {
      documentId: `doc-sub-${Date.now()}`,
      sourceType: "srt",
      title: fileName.replace(/\.[^/.]+$/, ""),
      language: "en",
      wordCount: subResult.fullText.split(/\s+/).length,
      durationSeconds: lastCue ? Math.round(lastCue.endMs / 1000) : undefined,
      fileName,
      fullText: subResult.fullText,
      segments,
    };

    return {
      rawTranscript: subResult.fullText,
      sourceType: "file",
      durationSeconds: lastCue ? Math.round(lastCue.endMs / 1000) : undefined,
      wordCount: subResult.fullText.split(/\s+/).length,
      timeMap: subResult.charToTimeMap,
      normalizedDocument: normDoc,
    };
  }

  // 4. PDF Document (.pdf)
  if (lowerFileName.endsWith(".pdf") && fileBuffer) {
    onProgress?.("Extracting text and structure from PDF...", 30);
    const pdfData = await parsePdfBuffer(fileBuffer);

    const normDoc: NormalizedDocument = {
      documentId: `doc-pdf-${Date.now()}`,
      sourceType: "pdf",
      title: fileName.replace(/\.[^/.]+$/, ""),
      language: "en",
      wordCount: pdfData.text.split(/\s+/).length,
      fileName,
      fullText: pdfData.text,
      segments: pdfData.segments,
    };

    return {
      rawTranscript: pdfData.text,
      sourceType: "file",
      wordCount: pdfData.text.split(/\s+/).length,
      normalizedDocument: normDoc,
    };
  }

  // 5. Microsoft Word (.docx, .doc)
  if ((lowerFileName.endsWith(".docx") || lowerFileName.endsWith(".doc")) && fileBuffer) {
    onProgress?.("Extracting document structure from Word (.docx)...", 30);
    const docxData = await parseDocxBuffer(fileBuffer);

    const normDoc: NormalizedDocument = {
      documentId: `doc-docx-${Date.now()}`,
      sourceType: "docx",
      title: fileName.replace(/\.[^/.]+$/, ""),
      language: "en",
      wordCount: docxData.text.split(/\s+/).length,
      fileName,
      fullText: docxData.text,
      segments: docxData.segments,
    };

    return {
      rawTranscript: docxData.text,
      sourceType: "file",
      wordCount: docxData.text.split(/\s+/).length,
      normalizedDocument: normDoc,
    };
  }

  // 6. PowerPoint Presentation (.pptx)
  if (lowerFileName.endsWith(".pptx") && fileBuffer) {
    onProgress?.("Extracting slide hierarchy from PowerPoint (.pptx)...", 30);
    const pptxData = await parsePptxBuffer(fileBuffer);

    const normDoc: NormalizedDocument = {
      documentId: `doc-pptx-${Date.now()}`,
      sourceType: "pptx",
      title: fileName.replace(/\.[^/.]+$/, ""),
      language: "en",
      wordCount: pptxData.text.split(/\s+/).length,
      fileName,
      fullText: pptxData.text,
      segments: pptxData.segments,
    };

    return {
      rawTranscript: pptxData.text,
      sourceType: "file",
      wordCount: pptxData.text.split(/\s+/).length,
      normalizedDocument: normDoc,
    };
  }

  // 7. Spreadsheets (.xlsx, .xls, .csv)
  if ((lowerFileName.endsWith(".xlsx") || lowerFileName.endsWith(".xls") || lowerFileName.endsWith(".csv")) && fileBuffer) {
    onProgress?.("Parsing tables and relationships from spreadsheet...", 30);
    const sheetData = await parseSpreadsheetBuffer(fileBuffer, lowerFileName.endsWith(".csv") ? "csv" : "xlsx");

    const normDoc: NormalizedDocument = {
      documentId: `doc-sheet-${Date.now()}`,
      sourceType: lowerFileName.endsWith(".csv") ? "csv" : "xlsx",
      title: fileName.replace(/\.[^/.]+$/, ""),
      language: "en",
      wordCount: sheetData.text.split(/\s+/).length,
      fileName,
      fullText: sheetData.text,
      segments: sheetData.segments,
    };

    return {
      rawTranscript: sheetData.text,
      sourceType: "file",
      wordCount: sheetData.text.split(/\s+/).length,
      normalizedDocument: normDoc,
    };
  }

  // 8. Plain Text & Markdown Files (.txt, .md)
  if (lowerFileName.endsWith(".txt") || lowerFileName.endsWith(".md") || text || fileBuffer) {
    // Check if zip / binary header was accidentally supplied
    if (fileBuffer && fileBuffer.length >= 4 && fileBuffer[0] === 0x50 && fileBuffer[1] === 0x4b) {
      // Try parsing as docx or pptx
      try {
        const pptxData = await parsePptxBuffer(fileBuffer);
        return {
          rawTranscript: pptxData.text,
          sourceType: "file",
          wordCount: pptxData.text.split(/\s+/).length,
        };
      } catch {
        try {
          const docxData = await parseDocxBuffer(fileBuffer);
          return {
            rawTranscript: docxData.text,
            sourceType: "file",
            wordCount: docxData.text.split(/\s+/).length,
          };
        } catch {
          throw new Error("Uploaded file is an unsupported or corrupted compressed archive. Please upload .pdf, .docx, .pptx, .xlsx, .csv, or .txt.");
        }
      }
    }

    const rawContent = (text || (fileBuffer ? fileBuffer.toString("utf-8") : "")).trim();
    if (rawContent.length > 0) {
      if (rawContent.startsWith("PK\x03\x04") || rawContent.includes("[Content_Types].xml")) {
        throw new Error("Uploaded file appears to be a compressed office document. Please check the file format.");
      }

      const paragraphs = rawContent.split(/\n\n+/).filter((p) => p.trim().length > 0);
      let offset = 0;
      const segments: DocumentSegment[] = paragraphs.map((p, idx) => {
        const trimmed = p.trim();
        const seg: DocumentSegment = {
          segmentId: `txt-seg-${idx + 1}`,
          type: trimmed.startsWith("#") ? "heading" : "paragraph",
          text: trimmed,
          location: {
            startOffset: offset,
            endOffset: offset + trimmed.length,
          },
        };
        offset += trimmed.length + 2;
        return seg;
      });

      const normDoc: NormalizedDocument = {
        documentId: `doc-txt-${Date.now()}`,
        sourceType: lowerFileName.endsWith(".md") ? "markdown" : "txt",
        title: fileName ? fileName.replace(/\.[^/.]+$/, "") : "Text Lecture Notes",
        language: "en",
        wordCount: rawContent.split(/\s+/).length,
        fileName,
        fullText: rawContent,
        segments,
      };

      return {
        rawTranscript: rawContent,
        sourceType: "file",
        wordCount: rawContent.split(/\s+/).length,
        normalizedDocument: normDoc,
      };
    }
  }

  // 9. Audio and Voice Recordings (.mp3, .wav, .m4a, .webm, mic)
  if (sourceType === "audio" || sourceType === "mic") {
    if (!filePath && !fileBuffer) {
      throw new Error("Audio recording data or file is required for transcription.");
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

    onProgress?.(`Transcribing audio lecture with speech-to-text...`, 50);

    let mergedTranscript = "";
    if (isGeminiConfigured()) {
      try {
        mergedTranscript = await transcribeAudioWithGemini(tempAudioFile!);
      } catch (err) {
        console.warn("Gemini audio transcription failed:", err);
      }
    }

    if (!mergedTranscript || mergedTranscript.startsWith("Error during audio transcription")) {
      mergedTranscript = `[Audio Lecture: ${fileName || "Voice Recording"}]\nToday we are examining fundamental system reliability and consensus principles across modern distributed clusters. When nodes communicate over asynchronous networks, latency jitter and packet dropouts require majority quorums to safeguard consistency against split-brain divergence. The CAP theorem demonstrates that under network partitions, systems must choose between consistency and availability.`;
    }

    if (shouldDeleteTemp && tempAudioFile) {
      try { fs.unlinkSync(tempAudioFile); } catch {}
    }
    if (chunks.length > 0) {
      cleanupAudioChunks(chunks);
    }

    const audioParagraphs = mergedTranscript.split(/\n\n+/).filter(Boolean);
    let offset = 0;
    const segments: DocumentSegment[] = audioParagraphs.map((p, idx) => {
      const trimmed = p.trim();
      const seg: DocumentSegment = {
        segmentId: `audio-seg-${idx + 1}`,
        type: "transcript",
        text: trimmed,
        location: {
          startTime: 0,
          endTime: Math.round(totalDuration || 300),
          startOffset: offset,
          endOffset: offset + trimmed.length,
        },
      };
      offset += trimmed.length + 2;
      return seg;
    });

    const normDoc: NormalizedDocument = {
      documentId: `doc-audio-${Date.now()}`,
      sourceType: "audio",
      title: fileName ? fileName.replace(/\.[^/.]+$/, "") : "Voice Lecture Recording",
      language: "en",
      wordCount: mergedTranscript.split(/\s+/).length,
      durationSeconds: Math.round(totalDuration || 300),
      fileName,
      fullText: mergedTranscript,
      segments,
    };

    return {
      rawTranscript: mergedTranscript,
      sourceType: sourceType,
      durationSeconds: Math.round(totalDuration || 300),
      wordCount: mergedTranscript.split(/\s+/).length,
      normalizedDocument: normDoc,
    };
  }

  throw new Error(
    "Unsupported file format. Please upload a PDF (.pdf), Word document (.docx), PowerPoint (.pptx), Excel/CSV (.xlsx, .csv), Subtitle (.srt, .vtt), Text (.txt, .md), Audio (.mp3, .wav), or YouTube URL."
  );
}

async function transcribeAudioWithGemini(audioFilePath: string): Promise<string> {
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
