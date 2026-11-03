import { generateObject } from "ai";
import { getFlashModel, isGeminiConfigured } from "../ai/gemini";
import { QuizGenerationResultSchema, type QuizQuestionItem } from "../ai/schemas";
import { isNoiseSentence, scoreAcademicValue } from "./clean";

export interface GenerateQuizOptions {
  cleanedText: string;
  concepts: Array<{ name: string; definition: string }>;
  questionCount?: number;
  bloomFocus?: ("remember" | "understand" | "apply" | "analyze")[];
  onProgress?: (msg: string, percent: number) => void;
}

export async function generateQuiz(options: GenerateQuizOptions): Promise<QuizQuestionItem[]> {
  const {
    cleanedText,
    concepts,
    questionCount = 10,
    bloomFocus = ["remember", "understand", "apply", "analyze"],
    onProgress,
  } = options;

  if (!isGeminiConfigured()) {
    return generateSmartQuiz(cleanedText, concepts, questionCount);
  }

  try {
    onProgress?.("Generating comprehension quiz questions...", 75);

    const result = await generateObject({
      model: getFlashModel(),
      schema: QuizGenerationResultSchema,
      prompt: `You are an expert academic examiner and university professor. Create exactly ${questionCount} rigorous, high-yield diagnostic quiz questions testing mastery of the lecture below.

STRICT HIGH-YIELD DIRECTIVES:
1. TEST ONLY ESSENTIAL ACADEMIC CONCEPTS:
   - Every single question MUST test a core principle, definition, theorem, formula, algorithm, trade-off, or mechanism.
   - ABSOLUTELY ZERO TRIVIA OR FLUFF: Never test incidental remarks, classroom logistics, teacher anecdotes, or filler sentences.
   - ZERO META-EXAM QUESTIONS: Strictly DO NOT ask about exam format, marks allocation, paper pattern, grading scheme, or syllabus rules.
2. QUESTION FORMATS:
   - mcq: 4 plausible options (a, b, c, d), exactly ONE is correct. Include distinct whyWrong explanation for each incorrect option.
   - true_false: 2 options (True, False), exactly ONE is correct.
3. REALISTIC DISTRACTORS:
   - Distractors must reflect common student misconceptions or closely related technical alternatives.
4. EXACT EVIDENCE:
   - Cite the exact verbatim sentence from the lecture in evidenceQuote.

BLOOM FOCUS: ${bloomFocus.join(", ")}

KNOWN CONCEPTS:
${concepts.map((c) => `- ${c.name}: ${c.definition}`).join("\n")}

LECTURE TRANSCRIPT:
---
${cleanedText.slice(0, 8000)}
---

Return a JSON object with a "questions" array of exactly ${questionCount} items.`,
      maxRetries: 1,
    });

    const questions = result.object.questions;
    if (questions.length < questionCount) {
      const extra = generateSmartQuiz(cleanedText, concepts, questionCount - questions.length);
      questions.push(...extra);
    }
    return questions.slice(0, questionCount);
  } catch (err) {
    console.warn("Gemini generateQuiz error, using smart mock quiz:", err);
    return generateSmartQuiz(cleanedText, concepts, questionCount);
  }
}

/**
 * Smart content-aware quiz generator.
 * Produces crisp, academic 4-option MCQs and True/False questions based strictly
 * on high-yield sentences, filtering out all noise.
 */
function generateSmartQuiz(
  text: string,
  concepts: Array<{ name: string; definition: string }>,
  count: number
): QuizQuestionItem[] {
  const rawSentences = text
    .split(/(?<=[.?!])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 25 && !s.startsWith("PK"));

  // Filter out all noise and rank by academic score
  const scoredSentences = rawSentences
    .map((s) => ({ s, score: scoreAcademicValue(s) }))
    .filter((item) => item.score > 0 && !isNoiseSentence(item.s))
    .sort((a, b) => b.score - a.score);

  const sentences =
    scoredSentences.length > 0
      ? scoredSentences.map((item) => item.s)
      : rawSentences.filter((s) => !isNoiseSentence(s));

  const allSentences = sentences.length > 0 ? sentences : [text.trim()];

  function findDefinition(sentence: string): { term: string; def: string } | null {
    const m = sentence.match(/([A-Z][a-zA-Z0-9\s-]{2,45})\s+(?:is|are|means|refers to|defined as|states that)\s+([^.!?]{10,220})/);
    if (m) return { term: m[1].trim(), def: m[2].trim() };
    return null;
  }

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

  // 1. Definition-based 4-Option MCQs
  allSentences.forEach((sentence, i) => {
    const def = findDefinition(sentence);
    if (def && def.term.length > 2 && !isNoiseSentence(def.term) && !isNoiseSentence(def.def)) {
      const c1 = concepts[(i + 1) % Math.max(concepts.length, 1)];
      const c2 = concepts[(i + 2) % Math.max(concepts.length, 1)];
      const c3 = concepts[(i + 3) % Math.max(concepts.length, 1)];

      pool.push({
        type: "mcq",
        prompt: `Which of the following correctly defines "${def.term}" according to the study material?`,
        correct: def.def,
        options: [
          { id: "a", text: def.def, isCorrect: true },
          { id: "b", text: c1 ? `It refers to ${c1.name}: ${c1.definition.slice(0, 90)}` : "It represents the opposite constraint in the system", isCorrect: false, whyWrong: `This relates to ${c1?.name || "a different concept"}, not ${def.term}.` },
          { id: "c", text: c2 ? `It requires ${c2.definition.slice(0, 90)}` : "An outdated protocol no longer used in standard implementations", isCorrect: false, whyWrong: "This describes an adjacent mechanism, not this definition." },
          { id: "d", text: c3 ? `A theoretical model where ${c3.definition.slice(0, 80)}` : "A client-side failure recovery technique", isCorrect: false, whyWrong: "This confuses the term with general client recovery." },
        ],
        explanation: `Correct: "${def.term}" is defined in the material as: "${def.def}".`,
        evidence: sentence,
        concept: def.term,
        bloom: "remember",
      });
    }
  });

  // 2. High-Yield Concept MCQs
  concepts.forEach((concept, i) => {
    if (isNoiseSentence(concept.name) || isNoiseSentence(concept.definition)) return;

    const evidenceSentence =
      allSentences.find((s) => s.toLowerCase().includes(concept.name.toLowerCase().split(" ")[0])) ||
      allSentences[i % allSentences.length];

    const otherConcept1 = concepts[(i + 1) % concepts.length];
    const otherConcept2 = concepts[(i + 2) % concepts.length];

    pool.push({
      type: "mcq",
      prompt: `In the context of this study topic, what is the primary role or significance of "${concept.name}"?`,
      correct: concept.definition,
      options: [
        { id: "a", text: concept.definition, isCorrect: true },
        { id: "b", text: otherConcept1 ? otherConcept1.definition : "It guarantees that all operations are processed synchronously without latency.", isCorrect: false, whyWrong: `This is the definition of ${otherConcept1?.name || "another mechanism"}.` },
        { id: "c", text: otherConcept2 ? otherConcept2.definition : "It acts as a secondary cache for transient read requests.", isCorrect: false, whyWrong: "This does not match the role explained in the material." },
        { id: "d", text: "It is only required when working with legacy single-threaded architectures.", isCorrect: false, whyWrong: "This is factually incorrect and unsupported by the text." },
      ],
      explanation: `According to the lecture, ${concept.name} is key because: ${concept.definition}`,
      evidence: evidenceSentence,
      concept: concept.name,
      bloom: "understand",
    });
  });

  // 3. Factual True/False Questions (Strictly high-value sentences)
  allSentences.forEach((sentence, i) => {
    if (sentence.length < 40 || sentence.length > 200 || isNoiseSentence(sentence)) return;
    const concept = concepts[i % Math.max(concepts.length, 1)]?.name || "Core Principle";

    if (/\b(is|are|must|always|cannot|requires|ensures|guarantees|leads to|results in)\b/i.test(sentence)) {
      pool.push({
        type: "true_false",
        prompt: `True or False: According to the study material, "${sentence}"`,
        correct: "True",
        options: [
          { id: "true", text: "True", isCorrect: true },
          { id: "false", text: "False", isCorrect: false, whyWrong: `The lecture explicitly verifies this statement.` },
        ],
        explanation: `This is directly affirmed by the lecture text: "${sentence}"`,
        evidence: sentence,
        concept,
        bloom: "remember",
      });
    }
  });

  // Fallback if pool is empty
  const basePool =
    pool.length > 0
      ? pool
      : [
          {
            type: "true_false" as const,
            prompt: `True or False: The material provides a structured framework for understanding ${concepts[0]?.name || "this topic"}.`,
            correct: "True",
            options: [
              { id: "true", text: "True", isCorrect: true },
              { id: "false", text: "False", isCorrect: false, whyWrong: "The material does provide this structured overview." },
            ],
            explanation: "The uploaded material provides a structured foundational explanation of the topic.",
            evidence: allSentences[0] || text.slice(0, 150),
            concept: concepts[0]?.name || "Core Topic",
            bloom: "remember" as const,
          },
        ];

  const results: QuizQuestionItem[] = [];
  for (let i = 0; i < count; i++) {
    const item = basePool[i % basePool.length];
    const rawIdx = text.indexOf(item.evidence);
    const startChar = rawIdx >= 0 ? rawIdx : 0;

    results.push({
      questionType: item.type,
      prompt: item.prompt,
      options: item.options,
      correctAnswer: item.correct,
      explanation: item.explanation,
      evidenceQuote: item.evidence,
      evidenceSpan: { startChar, endChar: startChar + item.evidence.length },
      conceptName: item.concept,
      bloomLevel: item.bloom,
    });
  }

  return results;
}
