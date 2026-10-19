import { generateObject } from "ai";
import { getFlashModel, isGeminiConfigured } from "../ai/gemini";
import { SegmentationResultSchema, type SegmentationResult } from "../ai/schemas";

const MAX_SECTION_CHARS = 2500;

export async function segmentTranscript(cleanedText: string): Promise<SegmentationResult> {
  if (!isGeminiConfigured()) {
    return mockSegment(cleanedText);
  }

  try {
    const result = await generateObject({
      model: getFlashModel(),
      schema: SegmentationResultSchema,
      prompt: `You are an expert curriculum designer. Analyze the cleaned lecture transcript below and divide it into cohesive semantic sections (2–8 sections depending on content density).

RULES:
1. Each section should cover a single coherent subtopic or concept cluster.
2. Sections should be 300–2000 words each.
3. The startChar and endChar must be EXACT character offsets within the provided text string below.
4. Every character of the transcript must be covered — sections must be contiguous and non-overlapping.
5. Estimate startTimeSeconds and endTimeSeconds based on typical speech rate (130 words/minute) if timestamps are unavailable.

TRANSCRIPT (${cleanedText.length} characters):
---
${cleanedText}
---`,
      maxRetries: 2,
    });

    // Validate char offsets are within bounds
    const validated = result.object.sections.map((sec, i) => ({
      ...sec,
      startChar: Math.max(0, sec.startChar),
      endChar: Math.min(cleanedText.length, sec.endChar),
      orderIndex: i,
    }));

    return { sections: validated };
  } catch (err) {
    console.warn("Gemini segmentTranscript error, using fallback segmentation:", err);
    return mockSegment(cleanedText);
  }
}

function mockSegment(text: string): SegmentationResult {
  const chunkSize = Math.ceil(text.length / 4);
  const sections = [];
  const titles = [
    "Introduction & Core Concepts",
    "Key Definitions and Properties",
    "Technical Deep Dive",
    "Summary & Applications",
  ];
  const words = text.split(/\s+/).length;
  const wordsPerSec = 130 / 60;

  for (let i = 0; i < 4; i++) {
    const startChar = i * chunkSize;
    const endChar = Math.min(text.length, (i + 1) * chunkSize);
    const sectionWords = (endChar - startChar) / 5;
    const startTime = Math.round((startChar / text.length) * (words / wordsPerSec));
    const endTime = Math.round((endChar / text.length) * (words / wordsPerSec));

    sections.push({
      title: titles[i] || `Section ${i + 1}`,
      summary: `This section covers key ideas from the lecture. Topics include definitions, properties, and related concepts relevant to understanding the core subject.`,
      startChar,
      endChar,
      startTimeSeconds: startTime,
      endTimeSeconds: endTime,
      orderIndex: i,
    });
  }

  return { sections };
}

export function chunkTextForProcessing(text: string, maxChars = MAX_SECTION_CHARS): string[] {
  if (text.length <= maxChars) return [text];

  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= maxChars) {
      chunks.push(remaining);
      break;
    }
    // Try to break at paragraph or sentence boundary
    let breakAt = remaining.lastIndexOf("\n\n", maxChars);
    if (breakAt < maxChars * 0.5) {
      breakAt = remaining.lastIndexOf(". ", maxChars);
    }
    if (breakAt < maxChars * 0.5) {
      breakAt = maxChars;
    }
    chunks.push(remaining.slice(0, breakAt).trim());
    remaining = remaining.slice(breakAt).trim();
  }

  return chunks;
}
