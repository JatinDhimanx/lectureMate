import type { DocumentSegment } from "./types";

export interface ParsedPdfResult {
  text: string;
  numPages: number;
  segments: DocumentSegment[];
}

export async function parsePdfBuffer(buffer: Buffer): Promise<ParsedPdfResult> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParsePkg = require("pdf-parse");

  let rawText = "";
  let numPages = 1;

  // Handle both standard function export (v1.x) and class export (v2.x)
  if (typeof pdfParsePkg === "function") {
    const data = await pdfParsePkg(buffer);
    rawText = (data.text || "")
      .replace(/\r\n/g, "\n")
      .replace(/\n\s*\n\s*\n/g, "\n\n")
      .trim();
    numPages = data.numpages || 1;
  } else if (pdfParsePkg && typeof pdfParsePkg.PDFParse === "function") {
    const parser = new pdfParsePkg.PDFParse({ data: buffer });
    try {
      const textResult = await parser.getText();
      rawText = (typeof textResult === "string" ? textResult : (textResult?.text || ""))
        .replace(/\r\n/g, "\n")
        .replace(/\n\s*\n\s*\n/g, "\n\n")
        .trim();
      const info = await parser.getInfo().catch(() => null);
      numPages = info?.total || 1;
    } finally {
      if (typeof parser.destroy === "function") {
        await parser.destroy().catch(() => {});
      }
    }
  } else {
    throw new Error("Unable to initialize PDF parser: unsupported library structure.");
  }

  if (!rawText || rawText.trim().length === 0) {
    throw new Error(
      "PDF has no readable text. It may be a scanned image-only PDF without an embedded text layer, or password protected."
    );
  }

  // Create page-approximate or paragraph segments for source-aware traceability
  const paragraphs = rawText.split(/\n\n+/).filter((p) => p.trim().length > 0);
  const segments: DocumentSegment[] = [];
  let currentOffset = 0;

  paragraphs.forEach((p, idx) => {
    const trimmed = p.trim();
    const approxPage = Math.min(numPages, Math.max(1, Math.ceil(((idx + 1) / paragraphs.length) * numPages)));

    segments.push({
      segmentId: `pdf-seg-${idx + 1}`,
      type: trimmed.length < 80 && !/[.!?]$/.test(trimmed) ? "heading" : "paragraph",
      text: trimmed,
      location: {
        page: approxPage,
        startOffset: currentOffset,
        endOffset: currentOffset + trimmed.length,
      },
      metadata: {
        approximatePage: approxPage,
      },
    });

    currentOffset += trimmed.length + 2;
  });

  return {
    text: rawText,
    numPages,
    segments,
  };
}
