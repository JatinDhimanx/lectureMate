import { generateObject } from "ai";
import { getFlashModel, isGeminiConfigured } from "../ai/gemini";
import { QuizGenerationResultSchema, type QuizQuestionItem } from "../ai/schemas";

export interface GenerateQuizOptions {
  cleanedText: string;
  concepts: Array<{ name: string; definition: string }>;
  questionCount?: number;
}

export async function generateQuiz(options: GenerateQuizOptions): Promise<QuizQuestionItem[]> {
  const { cleanedText, concepts, questionCount = 10 } = options;

  if (!isGeminiConfigured()) {
    return generateSmartQuiz(cleanedText, concepts, questionCount);
  }

  const conceptList = concepts.map((c) => `- ${c.name}: ${c.definition}`).join("\n");
  const truncated = cleanedText.slice(0, 6000);

  try {
    const result = await generateObject({
      model: getFlashModel(),
      schema: QuizGenerationResultSchema,
      prompt: `You are an expert exam designer creating exactly ${questionCount} quiz questions from the lecture below.

QUESTION TYPES (mix proportionally):
- mcq: 4 answer choices. Distractors MUST be based on REAL student misconceptions — plausible, not obviously wrong.
  Each incorrect option MUST have a "whyWrong" field explaining the misconception.
- true_false: 2 choices. Test a common misconception or nuanced truth.
- short_answer: Open-ended, requires a precise 1-3 sentence answer.

BLOOM LEVELS: Mix remember (20%), understand (50%), apply (30%).

KNOWN CONCEPTS:
${conceptList}

⚠️ GROUNDING RULE: evidenceQuote must be VERBATIM from the transcript below.

TRANSCRIPT:
---
${truncated}
---

Generate exactly ${questionCount} high-quality quiz questions that test deep understanding, not superficial recall.`,
      maxRetries: 1,
    });

    return result.object.questions.slice(0, questionCount);
  } catch (err) {
    console.warn("Gemini generateQuiz error, using smart mock quiz:", err);
    return generateSmartQuiz(cleanedText, concepts, questionCount);
  }
}

/**
 * Smart content-aware quiz generator.
 * Extracts real questions from actual lecture sentences.
 * Produces EXACTLY questionCount questions.
 */
function generateSmartQuiz(
  text: string,
  concepts: Array<{ name: string; definition: string }>,
  count: number
): QuizQuestionItem[] {
  const sentences = text
    .split(/(?<=[.?!])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 20);

  const allSentences = sentences.length > 0 ? sentences : [text.trim()];

  // Extract key terms defined in the text
  function findDefinition(sentence: string): { term: string; def: string } | null {
    const m = sentence.match(/([A-Z][^.,:]{2,50})\s+(?:is|are|means|refers to|defined as|states that)\s+([^.!?]{10,200})/);
    if (m) return { term: m[1].trim(), def: m[2].trim() };
    return null;
  }

  // Build question pool from real content
  interface QTemplate {
    type: QuizQuestionItem["questionType"];
    prompt: string;
    correct: string;
    options: QuizQuestionItem["options"];
    explanation: string;
    evidence: string;
    concept: string;
    bloom: QuizQuestionItem["bloomLevel"];
  }

  const pool: QTemplate[] = [];

  // 1. Definition-based MCQ questions
  allSentences.forEach((sentence, i) => {
    const def = findDefinition(sentence);
    if (def) {
      const nextConcept = concepts[(i + 1) % Math.max(concepts.length, 1)];
      const nextNextConcept = concepts[(i + 2) % Math.max(concepts.length, 1)];
      const prevConcept = concepts[(i - 1 + concepts.length) % Math.max(concepts.length, 1)];
      pool.push({
        type: "mcq",
        prompt: `What does "${def.term}" mean?`,
        correct: def.def,
        options: [
          { id: "a", text: def.def, isCorrect: true },
          { id: "b", text: nextConcept?.definition || `A property related to ${nextConcept?.name || "the system"}`, isCorrect: false, whyWrong: `This describes ${nextConcept?.name || "a different concept"}, not ${def.term}.` },
          { id: "c", text: nextNextConcept?.definition?.slice(0, 100) || "The inverse condition where the system cannot guarantee a response", isCorrect: false, whyWrong: "This confuses the concept with its inverse or prerequisite." },
          { id: "d", text: prevConcept?.definition?.slice(0, 100) || "A system property that only applies under partition conditions", isCorrect: false, whyWrong: "This applies to a related but distinct system property." },
        ],
        explanation: `${def.term} is defined as: ${def.def}`,
        evidence: sentence,
        concept: def.term,
        bloom: "remember",
      });
    }
  });

  // 2. True/False questions from factual statements
  allSentences.forEach((sentence, i) => {
    if (sentence.length < 40 || sentence.length > 200) return;
    const concept = concepts[i % Math.max(concepts.length, 1)];
    // Only create T/F for definitional/factual sentences
    if (/\b(is|are|always|never|must|cannot|guarantees)\b/i.test(sentence)) {
      pool.push({
        type: "true_false",
        prompt: `True or False: "${sentence.slice(0, 120)}"`,
        correct: "True",
        options: [
          { id: "true", text: "True", isCorrect: true },
          { id: "false", text: "False", isCorrect: false, whyWrong: `The lecture explicitly states this. Refer to: "${sentence.slice(0, 80)}"` },
        ],
        explanation: `This is true according to the lecture: ${sentence}`,
        evidence: sentence,
        concept: concept?.name || "Core Concept",
        bloom: "remember",
      });
    }
  });

  // 3. Short-answer questions from concept definitions
  concepts.forEach((concept) => {
    const evidenceSentence = allSentences.find(s =>
      s.toLowerCase().includes(concept.name.toLowerCase().split(" ")[0])
    ) || allSentences[0];

    pool.push({
      type: "short_answer",
      prompt: `In your own words, explain what "${concept.name}" means and why it matters.`,
      correct: concept.definition,
      options: [],
      explanation: `A strong answer defines ${concept.name} as: ${concept.definition}`,
      evidence: evidenceSentence,
      concept: concept.name,
      bloom: "understand",
    });

    pool.push({
      type: "short_answer",
      prompt: `How does "${concept.name}" relate to the main topics covered in this lecture?`,
      correct: concept.definition,
      options: [],
      explanation: `${concept.name}: ${concept.definition}`,
      evidence: evidenceSentence,
      concept: concept.name,
      bloom: "analyze",
    });
  });

  // 4. Concept comparison MCQ
  if (concepts.length >= 2) {
    for (let i = 0; i < Math.min(concepts.length - 1, 3); i++) {
      const a = concepts[i];
      const b = concepts[i + 1];
      const evidence = allSentences[i % allSentences.length];
      pool.push({
        type: "mcq",
        prompt: `How is "${a.name}" different from "${b.name}"?`,
        correct: `${a.name} focuses on ${a.definition.slice(0, 80)}..., while ${b.name} concerns ${b.definition.slice(0, 80)}...`,
        options: [
          { id: "a", text: `${a.name} focuses on ${a.definition.slice(0, 60)}...`, isCorrect: true },
          { id: "b", text: `They are equivalent concepts with different names`, isCorrect: false, whyWrong: "They address distinct aspects of the topic." },
          { id: "c", text: `${b.name} is a subset of ${a.name}`, isCorrect: false, whyWrong: "They are independent concepts at the same level." },
          { id: "d", text: `Neither applies in this context`, isCorrect: false, whyWrong: "Both are explicitly defined and relevant in this lecture." },
        ],
        explanation: `${a.name}: ${a.definition.slice(0, 100)}. ${b.name}: ${b.definition.slice(0, 100)}.`,
        evidence,
        concept: a.name,
        bloom: "analyze",
      });
    }
  }

  // Fallback if pool is empty
  if (pool.length === 0) {
    const fallbackSentence = allSentences[0] || text.slice(0, 200);
    pool.push({
      type: "short_answer",
      prompt: "Summarize the main concepts covered in this lecture in 2-3 sentences.",
      correct: fallbackSentence,
      options: [],
      explanation: `A strong answer would cover: ${fallbackSentence}`,
      evidence: fallbackSentence,
      concept: "Main Topic",
      bloom: "understand",
    });
  }

  // Produce exactly `count` questions
  const result: QuizQuestionItem[] = [];
  for (let i = 0; i < count; i++) {
    const template = pool[i % pool.length];
    const evidence = template.evidence;
    const rawIdx = text.indexOf(evidence);
    const startChar = rawIdx >= 0 ? rawIdx : 0;

    result.push({
      questionType: template.type,
      prompt: template.prompt,
      correctAnswer: template.correct,
      options: template.options,
      explanation: template.explanation,
      evidenceQuote: evidence,
      evidenceSpan: { startChar, endChar: startChar + evidence.length },
      bloomLevel: template.bloom,
      conceptName: template.concept,
    });
  }

  return result;
}
