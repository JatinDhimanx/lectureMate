import { parseSync, Cue } from "subtitle";

export interface ParsedCaptionCue {
  startMs: number;
  endMs: number;
  text: string;
}

export interface ParsedTranscriptResult {
  fullText: string;
  cues: ParsedCaptionCue[];
  charToTimeMap: Array<{ charIndex: number; timeMs: number }>;
}

export function parseSubtitles(content: string): ParsedTranscriptResult {
  let nodes: ReturnType<typeof parseSync> = [];
  try {
    nodes = parseSync(content);
  } catch {
    // Malformed SRT or plain text without timestamp headers
    return {
      fullText: content.trim(),
      cues: [],
      charToTimeMap: [],
    };
  }

  const cues: ParsedCaptionCue[] = [];
  const charToTimeMap: Array<{ charIndex: number; timeMs: number }> = [];

  let fullText = "";

  for (const node of nodes) {
    if (node.type === "cue") {
      const cue = node.data as Cue;
      const cleanCueText = cue.text
        .replace(/<[^>]*>/g, "") // strip HTML tags from VTT/SRT
        .replace(/\s+/g, " ")
        .trim();

      if (!cleanCueText) continue;

      const cueStartChar = fullText.length > 0 ? fullText.length + 1 : 0;
      if (fullText.length > 0) fullText += " ";
      fullText += cleanCueText;

      cues.push({
        startMs: cue.start,
        endMs: cue.end,
        text: cleanCueText,
      });

      charToTimeMap.push({
        charIndex: cueStartChar,
        timeMs: cue.start,
      });
    }
  }

  // Fallback if no cue nodes were parsed (e.g. plain text or malformed)
  if (cues.length === 0) {
    fullText = content.trim();
  }

  return {
    fullText,
    cues,
    charToTimeMap,
  };
}
