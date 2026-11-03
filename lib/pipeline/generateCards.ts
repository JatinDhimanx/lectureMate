import { generateObject } from "ai";
import { getFlashModel, isGeminiConfigured } from "../ai/gemini";
import { FlashcardGenerationResultSchema, type FlashcardItem } from "../ai/schemas";
import { chunkTextForProcessing } from "./segment";
import { isExecutableCodeSnippet, classifyContentType, sanitizeFlashcard } from "./classifier";
import { isNoiseSentence, scoreAcademicValue } from "./clean";

export interface GenerateCardsOptions {
  cleanedText: string;
  concepts: Array<{ name: string; definition: string }>;
  cardCount: number;
  difficultyMix?: { easy: number; medium: number; hard: number };
  bloomFocus?: ("remember" | "understand" | "apply" | "analyze")[];
  cardTypes?: ("basic" | "cloze" | "why_how" | "worked_example")[];
  onProgress?: (msg: string, percent: number) => void;
}

export async function generateCards(options: GenerateCardsOptions): Promise<FlashcardItem[]> {
  const {
    cleanedText,
    concepts,
    cardCount,
    bloomFocus = ["remember", "understand", "apply", "analyze"],
    cardTypes = ["basic", "cloze", "why_how", "worked_example"],
    onProgress,
  } = options;

  if (!isGeminiConfigured()) {
    const rawCards = generateSmartCards(cleanedText, concepts, cardCount);
    return rawCards.map((card) => {
      const sanitized = sanitizeFlashcard(card);
      return {
        ...card,
        front: sanitized.front,
        back: sanitized.back,
        type: sanitized.type as FlashcardItem["type"],
      };
    });
  }

  const chunks = chunkTextForProcessing(cleanedText, 3500);
  const targetPerChunk = Math.ceil(cardCount / chunks.length);
  const allCards: FlashcardItem[] = [];

  try {
    for (let i = 0; i < chunks.length; i++) {
      onProgress?.(`Generating cards for section ${i + 1}/${chunks.length}...`, 40 + (i / chunks.length) * 30);

      const conceptList = concepts.map((c) => `- ${c.name}: ${c.definition}`).join("\n");

      const result = await generateObject({
        model: getFlashModel(),
        schema: FlashcardGenerationResultSchema,
        prompt: `You are an elite professor and master test constructor. Create exactly ${targetPerChunk} high-yield, premium flashcards from the lecture content below.

ABSOLUTE HIGH-YIELD DIRECTIVES:
1. ONLY CORE ACADEMIC CONCEPTS:
   - Every single flashcard MUST test an essential concept, primary definition, fundamental mechanism, theorem, formula, algorithm step, or key academic distinction.
   - ABSOLUTELY ZERO TRIVIA OR FLUFF: Never generate cards for conversational banter, incidental anecdotes, greetings, attendance, room numbers, or superficial teacher remarks.
   - EXCLUDE META-EXAM NOISE: Never create flashcards about exam pattern, marks weightage, paper format, grading schemes, or syllabus logistics.
2. QUESTION ARCHITECTURE:
   - Definitions → "What is the core definition and role of X?"
   - Comparisons → "What is the crucial difference between X and Y?"
   - Mechanisms / Causes → "Why / How does X operate in Y?"
   - Problem / Algorithm → "What are the key steps or principles of X?"
3. CODE TRACING RULES:
   - "Code Tracing / Output Analysis" questions are ALLOWED ONLY when the section actually contains real, executable programming code.
   - NEVER mislabel arrows (X → Y) or conceptual workflows as code tracing!
4. CITE EXACT VERBATIM QUOTES:
   - The evidenceQuote MUST be an EXACT sentence from the section text below.

BLOOM FOCUS: ${bloomFocus.join(", ")}
CARD TYPES: ${cardTypes.join(", ")}

KNOWN CONCEPTS:
${conceptList}

SECTION TEXT:
---
${chunks[i]}
---

Return a JSON object with a "cards" array of exactly ${targetPerChunk} items.`,
        maxRetries: 1,
      });

      const sanitizedCards = result.object.cards.map((card) => {
        const sanitized = sanitizeFlashcard(card);
        return {
          ...card,
          front: sanitized.front,
          back: sanitized.back,
          type: sanitized.type as FlashcardItem["type"],
        };
      });

      allCards.push(...sanitizedCards);
    }

    if (allCards.length < cardCount) {
      const extra = generateSmartCards(cleanedText, concepts, cardCount - allCards.length);
      allCards.push(...extra);
    }

    return allCards.slice(0, cardCount);
  } catch (err) {
    console.warn("Gemini generateCards error, using smart card generator fallback:", err);
    return generateSmartCards(cleanedText, concepts, cardCount);
  }
}

/**
 * High-yield, content-aware smart card generator.
 * Selects only top-scoring academic sentences (definitions, theorems, formulas, mechanisms)
 * and purges all conversational noise.
 */
function generateSmartCards(
  text: string,
  concepts: Array<{ name: string; definition: string }>,
  count: number
): FlashcardItem[] {
  const types: FlashcardItem["type"][] = ["basic", "cloze", "why_how", "worked_example"];
  const blooms: FlashcardItem["bloomLevel"][] = ["remember", "understand", "apply", "analyze"];

  const rawSentences = text
    .split(/(?<=[.?!;])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 25 && !s.startsWith("PK"));

  // Aggressively filter out conversational noise & rank by academic score
  const scoredSentences = rawSentences
    .map((s) => ({ s, score: scoreAcademicValue(s) }))
    .filter((item) => item.score > 0 && !isNoiseSentence(item.s))
    .sort((a, b) => b.score - a.score);

  const sentences =
    scoredSentences.length > 0
      ? scoredSentences.map((item) => item.s)
      : rawSentences.filter((s) => !isNoiseSentence(s));

  const validSentences = sentences.length > 0 ? sentences : [text.trim()];

  interface CardTemplate {
    front: string;
    back: string;
    evidence: string;
    concept: string;
    bloom: FlashcardItem["bloomLevel"];
    type: FlashcardItem["type"];
  }

  const cardPool: CardTemplate[] = [];

  validSentences.forEach((sentence, i) => {
    const classification = classifyContentType(sentence);
    const concept = concepts[i % Math.max(concepts.length, 1)]?.name || "Core Principle";

    // 1. Genuine Code Tracing (ONLY when sentence contains executable code!)
    if (classification === "code_tracing" || classification === "debugging") {
      cardPool.push({
        front: `Code Tracing / Output Analysis:\nWhat will happen when evaluating the following code, and why?\n"${sentence.slice(0, 120)}"`,
        back: sentence,
        evidence: sentence,
        concept: "Code Execution",
        bloom: "apply",
        type: "worked_example",
      });
      return;
    }

    // 2. Process / Workflow
    if (classification === "process_workflow") {
      if (sentence.includes("→") || sentence.includes("->")) {
        const parts = sentence.split(/→|->/);
        const lhs = parts[0]?.trim();
        const rhs = parts.slice(1).join(" ").trim();
        if (lhs && rhs) {
          cardPool.push({
            front: `Which methods or mechanisms address "${lhs}"?`,
            back: rhs,
            evidence: sentence,
            concept: lhs.slice(0, 30),
            bloom: "understand",
            type: "basic",
          });
          return;
        }
      }
      cardPool.push({
        front: `Explain the process workflow outlined here: "${sentence.slice(0, 80)}..."`,
        back: sentence,
        evidence: sentence,
        concept,
        bloom: "understand",
        type: "why_how",
      });
      return;
    }

    // 3. Comparisons & Contrasts
    if (classification === "comparison") {
      cardPool.push({
        front: `What is the crucial distinction or trade-off highlighted here: "${sentence.slice(0, 80)}..."?`,
        back: sentence,
        evidence: sentence,
        concept,
        bloom: "analyze",
        type: "why_how",
      });
      return;
    }

    // 4. Exception / Error rules
    const exMatch = sentence.match(/([A-Za-z0-9_]+Exception|[A-Za-z0-9_]+Error)/);
    if (exMatch) {
      const exName = exMatch[1];
      cardPool.push({
        front: `Under what specific conditions is ${exName} triggered, and how can it be avoided?`,
        back: sentence,
        evidence: sentence,
        concept: exName,
        bloom: "analyze",
        type: "worked_example",
      });
      return;
    }

    // 5. Definitions, Laws & Theorems
    const defMatch = sentence.match(/([A-Z][a-zA-Z0-9\s-_]{2,45})\s+(?:is|are|means|refers to|defined as|states that)\s+([^.!?]{10,240})/);
    if (defMatch) {
      const term = defMatch[1].trim();
      const def = defMatch[2].trim();
      cardPool.push({
        front: `What is the core definition and technical role of "${term}"?`,
        back: `${term}: ${def}`,
        evidence: sentence,
        concept: term,
        bloom: "remember",
        type: "basic",
      });

      cardPool.push({
        front: `Explain the fundamental principle and behavior of ${term}:`,
        back: sentence,
        evidence: sentence,
        concept: term,
        bloom: "understand",
        type: "why_how",
      });
      return;
    }

    // 6. Causal / Mechanisms
    if (/\b(because|therefore|hence|as a result|requires|guarantees|ensures|enables|determines)\b/i.test(sentence)) {
      const words = sentence.split(" ");
      cardPool.push({
        front: `Explain the causal mechanism: Why does "${words.slice(0, 8).join(" ")}..." occur?`,
        back: sentence,
        evidence: sentence,
        concept,
        bloom: "understand",
        type: "why_how",
      });
      return;
    }

    // 7. Core Technical Statement
    cardPool.push({
      front: `Explain the key principle articulated here: "${sentence.slice(0, 90)}..."`,
      back: sentence,
      evidence: sentence,
      concept,
      bloom: "understand",
      type: "basic",
    });
  });

  // Concepts baseline cards for high-yield mastery
  concepts.forEach((concept, i) => {
    const evidence = validSentences[i % validSentences.length] || concept.definition;
    cardPool.push({
      front: `Concept Mastery: What is "${concept.name}" and what fundamental problem does it solve?`,
      back: concept.definition,
      evidence,
      concept: concept.name,
      bloom: "understand",
      type: "basic",
    });

    cardPool.push({
      front: `Tradeoff Analysis: What are the primary performance advantages and design tradeoffs of ${concept.name}?`,
      back: `${concept.name}: ${concept.definition}`,
      evidence,
      concept: concept.name,
      bloom: "analyze",
      type: "why_how",
    });
  });

  const basePool =
    cardPool.length > 0
      ? cardPool
      : [
          {
            front: "What is the primary topic and core objective covered in this study material?",
            back: validSentences[0] || text.slice(0, 200),
            evidence: validSentences[0] || text.slice(0, 200),
            concept: concepts[0]?.name || "Core Principle",
            bloom: "remember" as const,
            type: "basic" as const,
          },
        ];

  const result: FlashcardItem[] = [];
  for (let i = 0; i < count; i++) {
    const template = basePool[i % basePool.length];
    const evidence = template.evidence;
    const rawIdx = text.indexOf(evidence);
    const startChar = rawIdx >= 0 ? rawIdx : 0;
    const cycleNum = Math.floor(i / basePool.length);

    let front = template.front;
    let bloom = template.bloom;
    let type = template.type;

    if (cycleNum > 0) {
      bloom = blooms[(i + cycleNum) % blooms.length];
      type = types[(i + cycleNum) % types.length];
    }

    result.push({
      type,
      front,
      back: template.back,
      bloomLevel: bloom,
      difficulty: Math.min(5, Math.max(1, (i % 5) + 1)),
      conceptName: template.concept,
      evidenceQuote: evidence,
      evidenceSpan: { startChar, endChar: startChar + evidence.length },
      tags: [template.concept, bloom, type],
    });
  }

  return result;
}
