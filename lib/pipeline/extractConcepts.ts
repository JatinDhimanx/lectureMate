import { generateObject } from "ai";
import { getFlashModel, isGeminiConfigured } from "../ai/gemini";
import {
  ConceptExtractionResultSchema,
  type ConceptExtractionResult,
  type ExtractedConceptSchema,
} from "../ai/schemas";
import { isNoiseSentence, scoreAcademicValue } from "./clean";
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

const META_EXAM_REGEX =
  /\b(marks?(\s+allocation|\s+scheme|\s+weightage)?|exam\s+pattern|paper\s+pattern|marking\s+scheme|grading\s+system|syllabus\s+breakdown|section\s+[A-D]\s+pattern|sample\s+paper|due\s+date|attendance)\b/i;

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
      prompt: `You are an expert educator, senior professor, and curriculum architect.
TASK: Extract all essential, high-yield academic concepts from the cleaned lecture transcript below.

STRICT HIGH-YIELD RULES:
1. ONLY CORE CONCEPTS: Extract discrete, learnable subject-matter ideas (theorems, laws, mechanisms, definitions, formulas, algorithms, principles).
2. DEFINITION: Concise, rigorous, 1-3 sentences capturing the core mechanism and why it matters.
3. ABSOLUTELY ZERO FLUFF:
   - NEVER extract administrative chatter, attendance, assignments, exam format, or conversational filler as concepts.
   - Strictly avoid superficial phrases like "Introduction", "General Overview", or "Important Tip".
4. IMPORTANCE SCORE: 0.0 - 1.0. High-yield core concepts should score 0.75 - 1.0.
5. EXAM CUE: true only if the concept represents an essential examinable subject principle.
6. SOURCE SPAN: The quote MUST exist verbatim in the transcript.
7. PREREQUISITES: List other concepts from this lecture that build the foundation for this one.

${examCueDetected ? "⚠️ EXAM EMPHASIS DETECTED: Highlight key examinable concepts with examCue=true.\n" : ""}

SECTIONS:
${sections.map((s, i) => `Section ${i + 1}: "${s.title}" (chars ${s.startChar}-${s.endChar})`).join("\n")}

TRANSCRIPT:
---
${cleanedText}
---`,
      maxRetries: 1,
    });

    // Post-process: verify quotes and purge all noise & meta-exam concepts
    const verifiedConcepts: ExtractedConcept[] = result.object.concepts
      .filter((c) => {
        if (META_EXAM_REGEX.test(c.name) || META_EXAM_REGEX.test(c.definition)) return false;
        if (isNoiseSentence(c.name) || isNoiseSentence(c.definition)) return false;
        return true;
      })
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

    // Keep only high-yield concepts sorted by importanceScore descending
    const highYieldConcepts = verifiedConcepts
      .filter((c) => (c.importanceScore ?? 0.7) >= 0.5)
      .sort((a, b) => (b.importanceScore ?? 0) - (a.importanceScore ?? 0));

    return { concepts: highYieldConcepts.length > 0 ? highYieldConcepts : verifiedConcepts };
  } catch (err) {
    console.warn("Gemini extractConcepts error, using fallback concepts:", err);
    return mockExtractConcepts(cleanedText);
  }
}

/**
 * Smart content-aware concept extractor for local execution.
 * Evaluates sentences using academic scoring and extracts strictly high-yield definitions,
 * theorems, formulas, algorithms, and technical mechanisms.
 */
function mockExtractConcepts(text: string): ConceptExtractionResult {
  const sentences = text
    .split(/(?<=[.?!])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 20 && s.length <= 500);

  if (sentences.length === 0) {
    const fallback = text.trim().slice(0, 200);
    return {
      concepts: [
        {
          name: "Core Principle",
          definition: fallback,
          importanceScore: 0.85,
          examCue: false,
          sourceSpan: { startChar: 0, endChar: fallback.length, quote: fallback },
          prerequisites: [],
        },
      ],
    };
  }

  // Score sentences using academic density
  interface ScoredSentence {
    s: string;
    score: number;
    idx: number;
  }

  const scored: ScoredSentence[] = sentences
    .map((s, i) => {
      if (isNoiseSentence(s) || META_EXAM_REGEX.test(s)) return null;
      let score = scoreAcademicValue(s);
      if (detectExamCue(s)) score += 3;
      return { s, score, idx: i };
    })
    .filter((item): item is ScoredSentence => item !== null && item.score > 0);

  scored.sort((a, b) => b.score - a.score);

  // Pick top high-yield sentences as concept sources (up to 10)
  const topSentences = scored.slice(0, Math.min(10, scored.length));

  function extractConceptName(sentence: string, fallbackIdx: number): string {
    // 1. Definition patterns: "X is defined as...", "X refers to..."
    const defMatch = sentence.match(/^([A-Z][a-zA-Z0-9\s-_]{2,40})\s+(?:is|are|means|refers|states|asserts|represents)/);
    if (defMatch) return defMatch[1].trim();

    // 2. Theorem / Law / Principle patterns: "Newton's Second Law", "CAP Theorem"
    const lawMatch = sentence.match(/\b([A-Z][a-zA-Z0-9'’-]+(?:\s+[A-Z][a-zA-Z0-9'’-]+)*\s+(?:Theorem|Law|Principle|Model|Algorithm|Paradox|Rule|Equation))\b/i);
    if (lawMatch) return lawMatch[1].trim();

    // 3. Capitalized technical phrases (up to 3 words)
    const capMatch = sentence.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2})\b/);
    if (capMatch && capMatch[1].length > 4) return capMatch[1].trim();

    // 4. First meaningful technical term
    const cleanWords = sentence.replace(/[^a-zA-Z\s]/g, "").trim().split(/\s+/).slice(0, 3);
    return cleanWords.join(" ") || `Core Concept ${fallbackIdx + 1}`;
  }

  const concepts: ExtractedConcept[] = topSentences.map((item, i) => {
    const sentence = item.s;
    const name = extractConceptName(sentence, i);
    const charIdx = text.indexOf(sentence);
    const startChar = charIdx >= 0 ? charIdx : 0;

    const nextSentence = sentences[item.idx + 1] || "";
    const definition =
      nextSentence && !isNoiseSentence(nextSentence)
        ? `${sentence} ${nextSentence}`.slice(0, 350)
        : sentence.slice(0, 300);

    const importanceScore = Math.min(0.98, Math.max(0.65, 0.6 + item.score * 0.04));

    return {
      name,
      definition: definition.trim(),
      importanceScore,
      examCue: detectExamCue(sentence),
      sourceSpan: { startChar, endChar: startChar + sentence.length, quote: sentence },
      prerequisites: i > 0 ? [extractConceptName(topSentences[0].s, 0)] : [],
    };
  });

  return { concepts };
}
