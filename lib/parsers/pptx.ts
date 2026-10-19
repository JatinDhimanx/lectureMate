import JSZip from "jszip";
import type { DocumentSegment } from "./types";

export interface ParsedPptxResult {
  text: string;
  slideCount: number;
  segments: DocumentSegment[];
}

export async function parsePptxBuffer(buffer: Buffer): Promise<ParsedPptxResult> {
  const zip = await JSZip.loadAsync(buffer);
  const slideEntries: { name: string; num: number }[] = [];

  // Match slides like ppt/slides/slide1.xml
  zip.forEach((relativePath) => {
    const match = relativePath.match(/^ppt\/slides\/slide(\d+)\.xml$/i);
    if (match) {
      slideEntries.push({
        name: relativePath,
        num: parseInt(match[1], 10),
      });
    }
  });

  if (slideEntries.length === 0) {
    throw new Error("No slide content discovered in this PowerPoint (.pptx) file.");
  }

  // Sort by slide number
  slideEntries.sort((a, b) => a.num - b.num);

  const segments: DocumentSegment[] = [];
  const fullTextParts: string[] = [];
  let currentOffset = 0;

  for (const entry of slideEntries) {
    const file = zip.file(entry.name);
    if (!file) continue;
    const xml = await file.async("text");

    // Extract all text inside <a:t>...</a:t>
    const textMatches = xml.match(/<a:t[^>]*>(.*?)<\/a:t>/gi) || [];
    const slideTexts = textMatches
      .map((t) => t.replace(/<[^>]+>/g, "").trim())
      .filter((t) => t.length > 0);

    const slideContent = slideTexts.join(" ");
    if (!slideContent) continue;

    const slideTitle = slideTexts[0] || `Slide ${entry.num}`;
    const formattedSlide = `[Slide ${entry.num}: ${slideTitle}]\n${slideContent}`;
    fullTextParts.push(formattedSlide);

    segments.push({
      segmentId: `slide-${entry.num}`,
      type: "slide",
      text: formattedSlide,
      location: {
        slide: entry.num,
        startOffset: currentOffset,
        endOffset: currentOffset + formattedSlide.length,
      },
      metadata: {
        slideNumber: entry.num,
        title: slideTitle,
      },
    });

    currentOffset += formattedSlide.length + 2;
  }

  const text = fullTextParts.join("\n\n").trim();
  return {
    text,
    slideCount: slideEntries.length,
    segments,
  };
}
