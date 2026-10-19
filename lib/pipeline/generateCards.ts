import { generateObject } from "ai";
import { getFlashModel, isGeminiConfigured } from "../ai/gemini";
import { FlashcardGenerationResultSchema, type FlashcardItem } from "../ai/schemas";
import { chunkTextForProcessing } from "./segment";
import { isExecutableCodeSnippet, classifyContentType, sanitizeFlashcard } from "./classifier";

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
    // Sanitize any invalid code-tracing cards in application code
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
        prompt: `You are a world-class computer science professor and curriculum designer. Create exactly ${targetPerChunk} high-yield flashcards from the lecture content below.

CLASSIFICATION & STRICT CODE-TRACING RULES:
1. "Code Tracing / Output Analysis" questions are ALLOWED ONLY when the source contains real, executable code (e.g. valid syntax, method calls, loops, variable assignments, print statements).
2. NEVER classify conceptual statements, system descriptions, mathematical models, or arrows (e.g., "Viewpoint variation → projective homography + RPC model...") as code tracing or output prediction!
   - For technique associations like "X → Y + Z", generate a conceptual question (e.g., "Which methods address X?").
3. Always match the question type to the content:
   - Definitions → "What is X?" / "Define X"
   - Comparisons → "What is the difference between X and Y?"
   - Process / Workflow → "Explain the sequence or role of X in Y"
   - Conceptual mechanics → "Why / How does X work?"
   - Code Tracing → Only when actual runnable code is provided.

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

      // Post-process and sanitize LLM cards
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
      const needed = cardCount - allCards.length;
      const extras = generateSmartCards(cleanedText, concepts, needed);
      const sanitizedExtras = extras.map((card) => {
        const sanitized = sanitizeFlashcard(card);
        return {
          ...card,
          front: sanitized.front,
          back: sanitized.back,
          type: sanitized.type as FlashcardItem["type"],
        };
      });
      allCards.push(...sanitizedExtras);
    }

    return allCards.slice(0, cardCount);
  } catch (err) {
    console.warn("Gemini generateCards error, using smart mock cards:", err);
    const mockCards = generateSmartCards(cleanedText, concepts, cardCount);
    return mockCards.map((card) => {
      const sanitized = sanitizeFlashcard(card);
      return {
        ...card,
        front: sanitized.front,
        back: sanitized.back,
        type: sanitized.type as FlashcardItem["type"],
      };
    });
  }
}

/**
 * High-yield, content-aware smart card generator.
 * Uses rigorous content classification to generate accurately typed cards.
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
    .filter((s) => s.length >= 20 && !s.startsWith("PK"));

  const sentences = rawSentences.length > 0 ? rawSentences : [text.trim()];

  interface CardTemplate {
    front: string;
    back: string;
    evidence: string;
    concept: string;
    bloom: FlashcardItem["bloomLevel"];
    type: FlashcardItem["type"];
  }

  const cardPool: CardTemplate[] = [];

  sentences.forEach((sentence, i) => {
    const classification = classifyContentType(sentence);
    const concept = concepts[i % Math.max(concepts.length, 1)]?.name || "Core Concept";

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

    // 2. Process / Workflow (e.g. "Viewpoint variation → projective homography + RPC model...")
    if (classification === "process_workflow") {
      if (sentence.includes("→") || sentence.includes("->")) {
        const parts = sentence.split(/→|->/);
        const lhs = parts[0]?.trim();
        const rhs = parts.slice(1).join(" ").trim();
        if (lhs && rhs) {
          cardPool.push({
            front: `Which methods or models address "${lhs}"?`,
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

    // 3. Comparisons
    if (classification === "comparison") {
      cardPool.push({
        front: `What is the crucial difference or comparison highlighted here: "${sentence.slice(0, 80)}..."?`,
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

    // 5. Definitions
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
        front: `Explain the internal mechanism or behavior of ${term}:`,
        back: sentence,
        evidence: sentence,
        concept: term,
        bloom: "understand",
        type: "why_how",
      });
      return;
    }

    // 6. Causal / Conceptual explanations
    if (/\b(because|therefore|hence|as a result|requires|guarantees|ensures)\b/i.test(sentence)) {
      const words = sentence.split(" ");
      cardPool.push({
        front: `Explain the causal mechanism: Why does "${words.slice(0, 8).join(" ")}..." occur?`,
        back: sentence,
        evidence: sentence,
        concept,
        bloom: "understand",
        type: "why_how",
      });
    }
  });

  // Concepts baseline cards
  concepts.forEach((concept, i) => {
    const evidence = sentences[i % sentences.length] || concept.definition;
    cardPool.push({
      front: `Concept Deep-Dive: What is "${concept.name}" and what fundamental problem does it solve?`,
      back: concept.definition,
      evidence,
      concept: concept.name,
      bloom: "understand",
      type: "basic",
    });

    cardPool.push({
      front: `Tradeoff Analysis: What are the primary performance and design tradeoffs of ${concept.name}?`,
      back: `${concept.name}: ${concept.definition}`,
      evidence,
      concept: concept.name,
      bloom: "analyze",
      type: "why_how",
    });
  });

  // Safety fallback
  const basePool = cardPool.length > 0 ? cardPool : [{
    front: "What is the primary topic and core objective covered in this study material?",
    back: sentences[0] || text.slice(0, 200),
    evidence: sentences[0] || text.slice(0, 200),
    concept: concepts[0]?.name || "Core Overview",
    bloom: "remember" as const,
    type: "basic" as const,
  }];

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
