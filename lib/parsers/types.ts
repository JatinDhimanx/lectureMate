/**
 * Unified Normalized Document Model
 * Represents extracted and structured text from any supported source
 * (PDF, DOCX, PPTX, XLSX, CSV, TXT, MD, SRT, VTT, Audio, YouTube, Paste).
 */

export type DocumentSourceType =
  | "pdf"
  | "docx"
  | "pptx"
  | "xlsx"
  | "csv"
  | "txt"
  | "markdown"
  | "srt"
  | "audio"
  | "youtube"
  | "paste";

export interface DocumentSegmentLocation {
  page?: number | null;
  slide?: number | null;
  sheet?: string | null;
  startTime?: number | null; // seconds
  endTime?: number | null; // seconds
  startOffset: number;
  endOffset: number;
}

export interface DocumentSegment {
  segmentId: string;
  type: "heading" | "paragraph" | "slide" | "table" | "caption" | "transcript";
  text: string;
  location: DocumentSegmentLocation;
  metadata?: Record<string, unknown>;
}

export interface NormalizedDocument {
  documentId: string;
  sourceType: DocumentSourceType;
  title: string;
  language: string;
  wordCount: number;
  durationSeconds?: number;
  sourceUrl?: string;
  fileName?: string;
  fullText: string;
  segments: DocumentSegment[];
}
