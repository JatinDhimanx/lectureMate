import { generateObject } from "ai";
import { getFlashModel, isGeminiConfigured } from "../ai/gemini";
import {
  ConceptExtractionResultSchema,
  type ConceptExtractionResult,
  type ExtractedConceptSchema,
} from "../ai/schemas";
import type { z } from "zod";

type ExtractedConcept = z.infer<typeof ExtractedConceptSchema>;

const EXAM_CUE_PATTERNS = [
  /\b(important|very important|extremely important)\b/i,
  /\bremember this\b/i,
  /\bwill (come|appear|be) (on|in) (the )?(exam|test|quiz|midterm|finals)\b/i,
  /\bguarantee (it will|this will)\b/i,
  /\bpay (close|careful) attention\b/i,
  /\bkey (concept|point|term|definition|takeaway)\b/i,
  /\bmake sure you (know|understand|remember)\b/i,
  /\bdo not forget\b/i,
];

function detectExamCue(text: string): boolean {
  return EXAM_CUE_PATTERNS.some((p) => p.test(text));
}

export async function extractConcepts(
  cleanedText: string,
  sections: Array<{ title: string; startChar: number; endChar: number }>
): Promise<ConceptExtractionResult> {
  if (!isGeminiConfigured()) {
    return mockExtractConcepts(cleanedText);
  }

  const examCueDetected = detectExamCue(cleanedText);

  try {
    const result = await generateObject({
      model: getFlashModel(),
      schema: ConceptExtractionResultSchema,
      prompt: `You are an expert educator and knowledge graph architect. Extract all atomic study concepts from the lecture transcript below.

RULES:
1. Each concept must be a single, discrete, learnable idea (not a broad topic).
2. Definition: concise, high-yield, 1-3 sentences suitable for a flashcard back.
3. importanceScore: 0.0-1.0. Boost by:
   - Repeated mentions across sections → +0.15 each repetition
   - Long detailed explanation → +0.1
   - Core definitional concept → base 0.6
4. examCue: true if the speaker explicitly flagged this core academic concept as important.
5. sourceSpan.quote: VERBATIM sentence from the transcript that introduces or defines the concept.
   ⚠️ CRITICAL: The quote MUST exist EXACTLY in the transcript. Do not paraphrase.
6. prerequisites: list names of other concepts from THIS lecture that must be understood first.
7. Extract 5-15 concepts depending on transcript length.
8. CRITICAL - NO EXAM PATTERN OR MARKS FLUFF: Focus EXCLUSIVELY on core subject matter, definitions, theorems, formulas, algorithms, mechanisms, and key points. Do NOT extract administrative or exam-meta details such as "marks allocation", "question paper pattern", "5 marks question", "scheme of examination", "grading criteria", or course logistics.

${examCueDetected ? "⚠️ EXAM CUES DETECTED: This transcript contains explicit emphasis markers. Flag relevant subject-matter concepts with examCue=true.\n" : ""}

SECTIONS:
${sections.map((s, i) => `Section ${i + 1}: "${s.title}" (chars ${s.startChar}-${s.endChar})`).join("\n")}

TRANSCRIPT:
---
${cleanedText}
---`,
      maxRetries: 1,
    });

    const META_EXAM_REGEX = /\b(marks?(\s+allocation|\s+scheme|\s+weightage)?|exam\s+pattern|paper\s+pattern|marking\s+scheme|grading\s+system|syllabus\s+breakdown|section\s+[A-D]\s+pattern|sample\s+paper)\b/i;

    // Post-process: programmatically verify sourceSpan quotes and filter meta-exam noise
    const verifiedConcepts: ExtractedConcept[] = result.object.concepts
      .filter((c) => !META_EXAM_REGEX.test(c.name) && !META_EXAM_REGEX.test(c.definition))
      .map((c) => {
        const quoteFound = cleanedText.includes(c.sourceSpan.quote);
        if (!quoteFound) {
          const firstWords = c.sourceSpan.quote.split(" ").slice(0, 6).join(" ");
          const idx = cleanedText.indexOf(firstWords);
          if (idx !== -1) {
            return {
              ...c,
              sourceSpan: {
                ...c.sourceSpan,
                startChar: idx,
                endChar: idx + c.sourceSpan.quote.length,
              },
            };
          }
        }
        const idx = cleanedText.indexOf(c.sourceSpan.quote);
        return {
          ...c,
          sourceSpan: {
            ...c.sourceSpan,
            startChar: idx >= 0 ? idx : 0,
            endChar: idx >= 0 ? idx + c.sourceSpan.quote.length : 0,
          },
        };
      });

    return { concepts: verifiedConcepts.length > 0 ? verifiedConcepts : result.object.concepts };
  } catch (err) {
    console.warn("Gemini extractConcepts error, using fallback concepts:", err);
    return mockExtractConcepts(cleanedText);
  }
}

/**
 * Smart mock: extracts real concepts from the text by identifying key terms,
 * definitions, and important sentences — not generic placeholders.
 */
function mockExtractConcepts(text: string): ConceptExtractionResult {
  const sentences = text
    .split(/(?<=[.?!])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 15 && s.length <= 500);

  if (sentences.length === 0) {
    const fallback = text.trim().slice(0, 200);
    return {
      concepts: [{
        name: "Core Concept",
        definition: fallback,
        importanceScore: 0.8,
        examCue: false,
        sourceSpan: { startChar: 0, endChar: fallback.length, quote: fallback },
        prerequisites: [],
      }],
    };
  }

  // Score sentences by informativeness (longer, with key indicators = more important)
  const definitionIndicators = /\b(is|are|means|defined as|refers to|known as|called|states that|theorem|law|principle|property|concept|formula|equation|process|method|algorithm)\b/i;
  const importanceIndicators = /\b(important|key|critical|must|always|never|fundamental|core|primary|main|central|essential)\b/i;

  interface ScoredSentence { s: string; score: number; idx: number }
  const scored: ScoredSentence[] = sentences.map((s, i) => {
    let score = 0;
    if (definitionIndicators.test(s)) score += 3;
    if (importanceIndicators.test(s) || detectExamCue(s)) score += 2;
    if (s.includes(":")) score += 1; // definitions often use colons
    if (/[A-Z][a-zA-Z]+/.test(s)) score += 1; // proper nouns / technical terms
    score += Math.min(s.length / 100, 2); // moderate length preference
    return { s, score, idx: i };
  });

  scored.sort((a, b) => b.score - a.score);

  // Pick top sentences as concept sources (up to 8)
  const topSentences = scored.slice(0, Math.min(8, scored.length));

  // Extract concept name from a sentence: look for capitalized terms or the first noun phrase
  function extractConceptName(sentence: string, fallbackIdx: number): string {
    // Look for "X is defined as" or "X refers to" pattern
    const defMatch = sentence.match(/^([A-Z][^.,:]{3,40})\s+(is|are|means|refers|states|asserts)/);
    if (defMatch) return defMatch[1].trim();

    // Look for capitalized multi-word terms (technical names)
    const capMatch = sentence.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3})\b/);
    if (capMatch && capMatch[1].length > 3) return capMatch[1].trim();

    // Fall back to first few meaningful words
    const words = sentence.replace(/[^a-zA-Z\s]/g, "").trim().split(/\s+/).slice(0, 4);
    return words.join(" ") || `Concept ${fallbackIdx + 1}`;
  }

  const concepts: ExtractedConcept[] = topSentences.map((item, i) => {
    const sentence = item.s;
    const name = extractConceptName(sentence, i);
    const charIdx = text.indexOf(sentence);
    const startChar = charIdx >= 0 ? charIdx : 0;

    // Build definition from the sentence and the next sentence (if available)
    const nextSentence = sentences[item.idx + 1] || "";
    const definition = nextSentence
      ? `${sentence} ${nextSentence}`.slice(0, 400)
      : sentence.slice(0, 300);

    return {
      name,
      definition: definition.trim(),
      importanceScore: Math.min(0.95, 0.5 + item.score * 0.07),
      examCue: detectExamCue(sentence),
      sourceSpan: { startChar, endChar: startChar + sentence.length, quote: sentence },
      prerequisites: i > 0 ? [topSentences[0].s.split(" ").slice(0, 3).join(" ")] : [],
    };
  });

  return { concepts };
}
