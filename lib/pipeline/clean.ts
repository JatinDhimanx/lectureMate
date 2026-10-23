import { generateObject } from "ai";
import { getFlashModel, isGeminiConfigured } from "../ai/gemini";
import { CleaningResultSchema, type CleaningResult } from "../ai/schemas";

export interface CleanOptions {
  rawTranscript: string;
  keepOriginalLanguage?: boolean;
  targetLanguage?: string;
}

const FILLER_WORDS_REGEX =
  /\b(um+|uh+|er+|ah+|like\s+I\s+said|you\s+know\s+what|basically|literally|right\s+so|okay\s+so|so\s+yeah|and\s+stuff|good\s+morning(\s+everyone)?|can\s+you\s+hear\s+me|welcome\s+back|don't\s+forget\s+to\s+like|subscribe\s+to\s+(the\s+)?channel)\b/gi;

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
      prompt: `You are an expert lecture editor and curriculum specialist.
TASK: Clean and extract ONLY the essential, high-yield academic content from the raw lecture transcript.

STRICT INSTRUCTIONS:
1. FILTER OUT ALL UNIMPORTANT NOISE & CHATTER:
   - Completely remove casual conversational remarks, personal anecdotes, introductory greetings ("hello everyone", "can you hear me", "welcome to class"), and video outro banter ("like and subscribe", "hit the bell icon").
   - Eliminate all administrative chatter: attendance announcements, assignment due dates, exam room logistics, syllabus administrative notes, and course management remarks.
2. PRESERVE ONLY HIGH-YIELD ESSENTIAL ACADEMIC CONTENT:
   - Retain all core concepts, definitions, mechanisms, theorems, formulas, algorithms, principles, and direct subject-matter examples.
   - Keep the academic explanations thorough, accurate, and logically coherent while omitting repetitive rambling.
3. Clean speech disfluencies:
   - Remove filler words ("um", "uh", "er", "you know", "like", "basically", "so yeah").
   - Fix ASR speech recognition typos and punctuation so technical terms and proper nouns are capitalized correctly.
4. ${langInstruction}
5. Summary: Provide a clear, high-yield summary highlighting ONLY the main subject matter takeaways.

RAW TRANSCRIPT:
---
${rawTranscript}
---

Return a JSON object matching the schema: cleanedText, detectedLanguage, summary (focused purely on core learning objectives), wordCount.`,
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
