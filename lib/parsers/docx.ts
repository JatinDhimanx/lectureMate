import mammoth from "mammoth";
import type { DocumentSegment } from "./types";

export interface ParsedDocxResult {
  text: string;
  segments: DocumentSegment[];
}

export async function parseDocxBuffer(buffer: Buffer): Promise<ParsedDocxResult> {
  try {
    const result = await mammoth.extractRawText({ buffer });
    const rawText = (result.value || "")
      .replace(/\r\n/g, "\n")
      .replace(/\n\s*\n\s*\n/g, "\n\n")
      .trim();

    if (!rawText) {
      throw new Error("This DOCX document appears to be empty or contains only non-text images.");
    }

    const paragraphs = rawText.split(/\n\n+/).filter((p) => p.trim().length > 0);
    const segments: DocumentSegment[] = [];
    let currentOffset = 0;

    paragraphs.forEach((p, idx) => {
      const trimmed = p.trim();
      const isHeading = trimmed.length < 80 && !/[.!?]$/.test(trimmed) && /^[A-Z0-9]/.test(trimmed);

      segments.push({
        segmentId: `docx-p-${idx + 1}`,
        type: isHeading ? "heading" : "paragraph",
        text: trimmed,
        location: {
          startOffset: currentOffset,
          endOffset: currentOffset + trimmed.length,
        },
        metadata: {
          paragraphIndex: idx + 1,
          isHeading,
        },
      });

      currentOffset += trimmed.length + 2;
    });

    return {
      text: rawText,
      segments,
    };
  } catch (error) {
    if (error instanceof Error && error.message.includes("empty")) {
      throw error;
    }
    console.error("Failed to parse DOCX buffer:", error);
    throw new Error("Could not extract readable text from this DOCX file. Please verify it is a valid, uncorrupted document.");
  }
}
