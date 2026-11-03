import { generateObject } from "ai";
import { getFlashModel, isGeminiConfigured } from "../ai/gemini";
import { CleaningResultSchema, type CleaningResult } from "../ai/schemas";

export interface CleanOptions {
  rawTranscript: string;
  keepOriginalLanguage?: boolean;
  targetLanguage?: string;
}

// 1. Inline filler words and disfluencies
const FILLER_WORDS_REGEX =
  /\b(um+|uh+|er+|ah+|like\s+I\s+said|you\s+know\s+what|basically|literally|right\s+so|okay\s+so|so\s+yeah|and\s+stuff|kind\s+of|sort\s+of|actually|to\s+be\s+honest|as\s+you\s+know)\b/gi;

// 2. Comprehensive noise patterns (Classroom banter, mic/screen checks, attendance, YouTube fluff, Hinglish chatter)
export const NOISE_PATTERNS = [
  // Audio, Video, Screen sharing checks
  /\b(can\s+you\s+hear\s+me|am\s+i\s+audible|is\s+my\s+screen\s+visible|screen\s+visible|audio\s+check|mic\s+check|sound\s+check)\b/i,
  /\b(turn\s+on\s+your\s+cam(era)?|mute\s+your\s+mic(rophone)?|unmute\s+yourself|you\s+are\s+on\s+mute|please\s+mute)\b/i,
  /\b(awaaz\s+aa\s+rahi\s+hai|screen\s+dikh\s+rahi\s+hai|voice\s+break\s+ho\s+rahi\s+hai|network\s+issue|lag\s+ho\s+raha\s+hai)\b/i,

  // Greetings, opening, and closing pleasantries
  /\b(good\s+morning(\s+everyone|\s+class|\s+students|\s+all)?|good\s+afternoon|good\s+evening|welcome\s+back(\s+to\s+class)?|hello\s+everyone|hi\s+guys|namaste(\s+dosto)?)\b/i,
  /\b(chalo\s+shuru\s+karte\s+hain|let's\s+get\s+started|that's\s+all\s+for\s+today|class\s+is\s+dismissed|have\s+a\s+nice\s+day|see\s+you\s+tomorrow)\b/i,

  // Classroom banter, attendance, roll call
  /\b(mark\s+your\s+attendance|attendance\s+link|roll\s+call|present\s+sir|present\s+ma'am|absent\s+today|chat\s+box\s+mein\s+attendance)\b/i,
  /\b(open\s+page\s+number|turn\s+to\s+page|sit\s+down|keep\s+quiet|stop\s+talking|listen\s+carefully|dhyan\s+se\s+suno)\b/i,

  // Course logistics, assignment deadlines & exam-meta fluff
  /\b(submit\s+assignment|homework\s+submission|due\s+date\s+is|deadline\s+is|kal\s+submit\s+karna|last\s+date\s+of\s+submission)\b/i,
  /\b(internal\s+marks|external\s+marks|marks\s+distribution|exam\s+pattern|paper\s+pattern|weightage|grading\s+scheme|viva\s+date)\b/i,
  /\b(will\s+come\s+for\s+\d+\s+marks|\d+\s+marks\s+question|syllabus\s+breakdown|unit\s+test\s+next)\b/i,

  // Social media & YouTube promos
  /\b(like\s+and\s+subscribe|like\s+share\s+and\s+subscribe|subscribe\s+to\s+(the\s+)?channel|hit\s+the\s+bell\s+icon)\b/i,
  /\b(leave\s+a\s+comment\s+below|give\s+a\s+thumbs\s+up|link\s+in\s+description|telegram\s+channel|download\s+pdf\s+from\s+link)\b/i,
  /\b(sponsored\s+by|follow\s+us\s+on|share\s+with\s+your\s+friends)\b/i,

  // Conversational filler questions & interjections
  /\b(samajh\s+aaya(\s+sabko)?|theek\s+hai\s+na|kisi\s+ko\s+koi\s+doubt|koi\s+question\s+hai|batao\s+bhai|bolo\s+haan\s+ya\s+na)\b/i,
  /\b(does\s+that\s+make\s+sense|are\s+you\s+getting\s+my\s+point|are\s+you\s+with\s+me|any\s+doubts\s+so\s+far)\b/i,
  /\b(wait\s+a\s+minute|give\s+me\s+a\s+second|let\s+me\s+check|one\s+second|hold\s+on)\b/i,
];

/**
 * Returns true if the sentence is conversational chatter, greeting, admin noise, or promotional fluff.
 */
export function isNoiseSentence(sentence: string): boolean {
  const trimmed = sentence.trim();
  if (trimmed.length < 12) return true; // Trivial 1-2 word utterances ("Okay", "Yes sir", "Sure", etc.)
  if (/^(yes|no|yeah|okay|right|fine|sure|hello|hi|sir|ma'am|ok)\b/i.test(trimmed) && trimmed.length < 25) {
    return true;
  }
  return NOISE_PATTERNS.some((pattern) => pattern.test(trimmed));
}

/**
 * Scores the academic informational value of a sentence (higher = core high-yield concept).
 */
export function scoreAcademicValue(sentence: string): number {
  if (isNoiseSentence(sentence)) return -10;

  let score = 0;
  const clean = sentence.trim();

  // 1. Core Definitional Constructs (+5)
  if (/\b(is\s+defined\s+as|refers\s+to|means\s+that|is\s+known\s+as|called\s+a|characterized\s+by|states\s+that)\b/i.test(clean)) {
    score += 5;
  }

  // 2. Theorems, Principles, Laws, Axioms, Formulas (+5)
  if (/\b(theorem|law\s+of|principle|formula|equation|hypothesis|axiom|rule|property|model)\b/i.test(clean)) {
    score += 5;
  }

  // 3. Mechanisms, Cause & Effect (+4)
  if (/\b(because|therefore|leads\s+to|results\s+in|mechanism\s+of|enables|responsible\s+for|causes|determines|depends\s+on)\b/i.test(clean)) {
    score += 4;
  }

  // 4. Algorithms, Workflows, Sequential Steps (+4)
  if (/\b(algorithm|procedure|workflow|process|technique|method|step\s+\d+|phase|stages?|protocol)\b/i.test(clean)) {
    score += 4;
  }

  // 5. Crucial Comparisons, Trade-offs & Differences (+4)
  if (/\b(difference\s+between|in\s+contrast|unlike|whereas|compared\s+to|advantage|disadvantage|trade-?off)\b/i.test(clean)) {
    score += 4;
  }

  // 6. Quantitative / Formal Indicators (+3)
  if (/[=<>±×÷√∫∑∏]|\b(O\([^)]+\)|SI\s+unit|measured\s+in|proportional\s+to|inversely)\b/i.test(clean)) {
    score += 3;
  }

  // 7. Capitalized Technical Terms (+2)
  if (/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3}\b/.test(clean)) {
    score += 2;
  }

  // Optimal sentence length check (penalize overly short or run-on rambling)
  if (clean.length >= 35 && clean.length <= 250) {
    score += 2;
  }

  return score;
}

/**
 * Strips all noise, conversational chatter, and filler words from raw text,
 * retaining strictly high-yield academic sentences.
 */
export function removeNoiseAndChatter(raw: string): string {
  // First clean inline filler words
  const preCleaned = raw.replace(FILLER_WORDS_REGEX, " ");

  // Split into sentences (handling periods, question marks, exclamation marks, and newlines)
  const sentences = preCleaned
    .split(/(?<=[.?!])\s+|\n+/)
    .map((s) => s.trim().replace(/\s{2,}/g, " "))
    .filter((s) => s.length > 0);

  // Keep only non-noise sentences that carry academic weight
  const keptSentences = sentences.filter((s) => {
    if (isNoiseSentence(s)) return false;
    return true;
  });

  if (keptSentences.length === 0) {
    // If all got filtered (e.g., short input), return the cleaned raw text as fallback
    return preCleaned.replace(/\s{2,}/g, " ").trim();
  }

  return keptSentences.join(" ");
}

export async function cleanTranscript(options: CleanOptions): Promise<CleaningResult> {
  const { rawTranscript, keepOriginalLanguage = false, targetLanguage = "en" } = options;

  // Pre-filter noise and conversational chatter first
  const noiseFilteredText = removeNoiseAndChatter(rawTranscript);

  if (!isGeminiConfigured()) {
    const cleaned = noiseFilteredText.replace(/\s{2,}/g, " ").trim();
    const words = cleaned.split(/\s+/);

    // Extract top sentences to form a genuine high-yield summary
    const sentences = cleaned.split(/(?<=[.?!])\s+/).filter((s) => s.length >= 25);
    const scoredSentences = sentences
      .map((s) => ({ s, score: scoreAcademicValue(s) }))
      .sort((a, b) => b.score - a.score);

    const topSentences = scoredSentences.slice(0, 3).map((item) => item.s);
    const summary = topSentences.length > 0
      ? topSentences.join(" ")
      : cleaned.slice(0, 200).replace(/\n/g, " ") + "...";

    return {
      cleanedText: cleaned,
      detectedLanguage: "en",
      summary,
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
      prompt: `You are an elite academic curriculum editor and learning engineer.
YOUR MISSION: Clean the lecture transcript and produce a refined, 100% HIGH-YIELD study document containing ONLY the critical, essential academic material. ABSOLUTELY ZERO NOISE, ZERO FLUFF, ZERO TRIVIAL BANTER.

STRICT FILTERING DIRECTIVES:
1. AGGRESSIVELY PURGE ALL CHATTER & FLUFF:
   - Eliminate all greetings ("hello", "good morning", "welcome back", "namaste"), attendance announcements, screen/audio checks ("am I audible", "screen visible"), and outro promos ("like and subscribe", "join telegram").
   - Strip all administrative and exam-meta logistics: assignment due dates, room numbers, viva dates, question paper patterns, marks allocation ("5 marks question"), syllabus breakdown, and grading criteria.
   - Delete all personal teacher anecdotes, casual jokes, and conversational filler ("samajh aaya?", "you know", "like I said").
2. EXTRACT ONLY HIGH-YIELD ACADEMIC CORE:
   - Retain all essential definitions, core concepts, formulas, scientific laws, theorems, algorithms, mechanisms, workflows, comparisons, and direct technical examples.
   - Ensure the explanations are crystal-clear, logically sequenced, and academically rigorous.
3. REMOVE DISFLUENCIES & FIX ASR SPEECH RECOGNITION TYPOS:
   - Remove "um", "uh", "you know", "basically", "so yeah".
   - Fix technical terms and capitalize proper nouns.
4. ${langInstruction}
5. High-Yield Summary: Write an executive 2-4 sentence summary of the key subject-matter takeaways.

TRANSCRIPT:
---
${noiseFilteredText}
---

Return a JSON object: cleanedText, detectedLanguage, summary, wordCount.`,
      maxRetries: 2,
    });

    return result.object;
  } catch (err) {
    console.warn("Gemini cleanTranscript error, using fallback cleaner:", err);
    const cleaned = noiseFilteredText.replace(/\s{2,}/g, " ").trim();
    const words = cleaned.split(/\s+/);
    return {
      cleanedText: cleaned,
      detectedLanguage: "en",
      summary: noiseFilteredText.slice(0, 200).replace(/\n/g, " ") + "...",
      wordCount: words.length,
    };
  }
}
