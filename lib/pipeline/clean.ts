import { generateObject } from "ai";
import { getFlashModel, isGeminiConfigured } from "../ai/gemini";
import { CleaningResultSchema, type CleaningResult } from "../ai/schemas";

export interface CleanOptions {
  rawTranscript: string;
  keepOriginalLanguage?: boolean;
  targetLanguage?: string;
}

const FILLER_WORDS_REGEX =
  /\b(um+|uh+|er+|ah+|like\s+I\s+said|you\s+know\s+what|basically|literally|right\s+so|okay\s+so|so\s+yeah|and\s+stuff)\b/gi;

export async function cleanTranscript(options: CleanOptions): Promise<CleaningResult> {
  const { rawTranscript, keepOriginalLanguage = false, targetLanguage = "en" } = options;

  if (!isGeminiConfigured()) {
    // Mock cleaner: remove common fillers via regex
    const cleaned = rawTranscript
      .replace(FILLER_WORDS_REGEX, "")
      .replace(/\s{2,}/g, " ")
      .trim();
    const words = cleaned.split(/\s+/);
    return {
      cleanedText: cleaned,
      detectedLanguage: "en",
      summary:
        "This lecture covers core distributed systems concepts including the CAP Theorem, consensus protocols, and quorum theory.",
      wordCount: words.length,
    };
  }

  try {
    const langInstruction = keepOriginalLanguage
      ? "Preserve the original language of the speaker. Do not translate."
      : `Convert any Hinglish, Hindi, or mixed-language content to clean academic English. Output language: ${targetLanguage}.`;

    const result = await generateObject({
      model: getFlashModel(),
      schema: CleaningResultSchema,
      prompt: `You are an expert lecture editor and educational content specialist.

TASK: Clean and normalize the following raw lecture transcript.

INSTRUCTIONS:
1. Remove filler words and hesitations: "um", "uh", "er", "you know", "like" (when not meaningful), "basically", "right so", "okay so".
2. Fix obvious Automatic Speech Recognition (ASR) errors. E.g. "the cap their um" → "the CAP theorem".
3. Fix run-on sentences. Add punctuation where the speaker pauses logically.
4. Correct technical terminology (e.g., capitalize proper nouns like "Paxos", "CAP Theorem", "FSRS").
5. ${langInstruction}
6. CRITICAL: Do NOT paraphrase or change the meaning of any passage. Do NOT summarize or remove technical content.
7. Preserve all exam cues and emphasis markers ("important", "remember this", "will come in exam").

RAW TRANSCRIPT:
---
${rawTranscript}
---

Return a JSON object matching the schema: cleanedText, detectedLanguage, summary (2-3 sentences), wordCount.`,
      maxRetries: 2,
    });

    return result.object;
  } catch (err) {
    console.warn("Gemini cleanTranscript error, using fallback cleaner:", err);
    const cleaned = rawTranscript
      .replace(FILLER_WORDS_REGEX, "")
      .replace(/\s{2,}/g, " ")
      .trim();
    const words = cleaned.split(/\s+/);
    return {
      cleanedText: cleaned,
      detectedLanguage: "en",
      summary: rawTranscript.slice(0, 200).replace(/\n/g, " ") + "...",
      wordCount: words.length,
    };
  }
}
