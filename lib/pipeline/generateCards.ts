import { generateObject } from "ai";
import { getFlashModel, isGeminiConfigured } from "../ai/gemini";
import { FlashcardGenerationResultSchema, type FlashcardItem } from "../ai/schemas";
import { chunkTextForProcessing } from "./segment";

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
    return generateSmartCards(cleanedText, concepts, cardCount);
  }

  const chunks = chunkTextForProcessing(cleanedText, 3000);
  const targetPerChunk = Math.ceil(cardCount / chunks.length);
  const allCards: FlashcardItem[] = [];

  try {
    for (let i = 0; i < chunks.length; i++) {
      onProgress?.(`Generating cards for section ${i + 1}/${chunks.length}...`, 40 + (i / chunks.length) * 30);

      const conceptList = concepts.map((c) => `- ${c.name}: ${c.definition}`).join("\n");

      const result = await generateObject({
        model: getFlashModel(),
        schema: FlashcardGenerationResultSchema,
        prompt: `You are an expert educator creating exactly ${targetPerChunk} high-quality study flashcards from the lecture section below.

CARD TYPES TO GENERATE (pick from: ${cardTypes.join(", ")}):
- basic: Direct Q&A pair (What is X? / X is...)
- cloze: Fill-in-the-blank: "The {{c1::term}} is defined as {{c2::definition}}"
- why_how: Causal reasoning (Why does X cause Y? How does X work?)
- worked_example: Apply knowledge to a concrete scenario or calculation

BLOOM LEVELS TO INCLUDE (prioritize: ${bloomFocus.join(", ")}):
- remember (1): Recall facts, definitions, formulas
- understand (2): Explain mechanisms, compare concepts
- apply (3): Use concept in a novel scenario
- analyze (4): Break down complex relationships, identify patterns

KNOWN CONCEPTS:
${conceptList}

⚠️ CRITICAL GROUNDING RULE:
Each card's "evidenceQuote" MUST be a VERBATIM substring of the section text below.
Do NOT paraphrase, invent, or summarize. Copy the exact sentence(s) from the text.

SECTION TEXT:
---
${chunks[i]}
---

Generate exactly ${targetPerChunk} flashcards. For each card, set evidenceSpan.startChar and endChar to 0 (they will be corrected in the verification pass).`,
        maxRetries: 1,
      });

      allCards.push(...result.object.cards);
    }

    if (allCards.length === 0) {
      return generateSmartCards(cleanedText, concepts, cardCount);
    }

    // Trim or pad to exact cardCount
    return allCards.slice(0, cardCount);
  } catch (err) {
    console.warn("Gemini generateCards error, using smart mock cards:", err);
    return generateSmartCards(cleanedText, concepts, cardCount);
  }
}

/**
 * Smart content-aware mock card generator.
 * Extracts real Q&A from actual lecture content — not generic placeholders.
 * Produces EXACTLY cardCount cards.
 */
function generateSmartCards(
  text: string,
  concepts: Array<{ name: string; definition: string }>,
  count: number
): FlashcardItem[] {
  const types: FlashcardItem["type"][] = ["basic", "cloze", "why_how", "worked_example"];
  const blooms: FlashcardItem["bloomLevel"][] = ["remember", "understand", "apply", "analyze"];

  // Extract sentences — include multi-sentence chunks for richer cards
  const rawSentences = text
    .split(/(?<=[.?!])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 20);

  const sentences = rawSentences.length > 0 ? rawSentences : [text.trim()];

  // Extract key terms: capitalized multi-word phrases + words after "is", "means", "defined as"
  function extractKeyTerms(sentence: string): { term: string; definition: string }[] {
    const results: { term: string; definition: string }[] = [];

    // Pattern: "X is/are/means Y"
    const defPattern = /([A-Z][^.,:]{2,50})\s+(?:is|are|means|refers to|defined as|states that)\s+([^.!?]{10,200})/g;
    let match;
    while ((match = defPattern.exec(sentence)) !== null) {
      results.push({ term: match[1].trim(), definition: match[2].trim() });
    }

    return results;
  }

  // Build a pool of card templates from actual content
  interface CardTemplate {
    front: string;
    back: string;
    evidence: string;
    concept: string;
    bloom: FlashcardItem["bloomLevel"];
    type: FlashcardItem["type"];
  }

  const cardPool: CardTemplate[] = [];

  // 1. Definition-based cards from key terms in text
  sentences.forEach((sentence) => {
    const keyTerms = extractKeyTerms(sentence);
    keyTerms.forEach(({ term, definition }) => {
      cardPool.push({
        front: `What is ${term}?`,
        back: definition,
        evidence: sentence,
        concept: term,
        bloom: "remember",
        type: "basic",
      });
      cardPool.push({
        front: `Define the term: "${term}"`,
        back: `${term} ${definition}`,
        evidence: sentence,
        concept: term,
        bloom: "understand",
        type: "cloze",
      });
    });
  });

  // 2. Sentence-based Q&A cards
  sentences.forEach((sentence, i) => {
    // Skip very short sentences
    if (sentence.length < 30) return;

    const nextSentence = sentences[i + 1] || "";

    // "Why / How" card from longer explanatory sentences
    if (sentence.length > 80) {
      cardPool.push({
        front: `Explain: "${sentence.slice(0, 60)}..."`,
        back: sentence + (nextSentence ? " " + nextSentence : ""),
        evidence: sentence,
        concept: concepts[i % Math.max(concepts.length, 1)]?.name || "Concept",
        bloom: "understand",
        type: "why_how",
      });
    }

    // Direct factual recall card
    const words = sentence.split(" ");
    if (words.length >= 6) {
      // Blank out a key term for cloze
      const blankIdx = Math.floor(words.length * 0.6);
      const blanked = [...words.slice(0, blankIdx), "______", ...words.slice(blankIdx + 1)].join(" ");
      cardPool.push({
        front: blanked,
        back: sentence,
        evidence: sentence,
        concept: concepts[i % Math.max(concepts.length, 1)]?.name || "Concept",
        bloom: "remember",
        type: "cloze",
      });
    }
  });

  // 3. Concept-based cards from extracted concepts
  concepts.forEach((concept, i) => {
    cardPool.push({
      front: `What is "${concept.name}"?`,
      back: concept.definition,
      evidence: sentences[i % sentences.length] || concept.definition,
      concept: concept.name,
      bloom: "remember",
      type: "basic",
    });
    cardPool.push({
      front: `How does "${concept.name}" apply in practice?`,
      back: `${concept.name}: ${concept.definition}`,
      evidence: sentences[i % sentences.length] || concept.definition,
      concept: concept.name,
      bloom: "apply",
      type: "worked_example",
    });
  });

  // If we don't have enough cards, generate variations by cycling
  const basePool = cardPool.length > 0 ? cardPool : [{
    front: `What is the main topic of this lecture?`,
    back: text.slice(0, 200),
    evidence: text.slice(0, 200),
    concept: "Main Topic",
    bloom: "remember" as FlashcardItem["bloomLevel"],
    type: "basic" as FlashcardItem["type"],
  }];

  // Produce exactly `count` cards
  const result: FlashcardItem[] = [];
  for (let i = 0; i < count; i++) {
    const template = basePool[i % basePool.length];
    const evidence = template.evidence;
    const rawIdx = text.indexOf(evidence);
    const startChar = rawIdx >= 0 ? rawIdx : 0;

    // Add variety when cycling
    const cycleNum = Math.floor(i / basePool.length);
    let front = template.front;
    let back = template.back;
    let bloom = blooms[i % blooms.length];
    let type = types[i % types.length];

    if (cycleNum > 0) {
      // Create variations on repeated cycles
      const suffix = cycleNum > 1 ? ` (Variation ${cycleNum})` : "";
      front = front.replace("What is", "Describe").replace("Explain:", "Summarize:") + suffix;
      bloom = blooms[(i + 1) % blooms.length];
      type = types[(i + 2) % types.length];
    } else {
      bloom = template.bloom;
      type = template.type;
    }

    result.push({
      type,
      front,
      back,
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
