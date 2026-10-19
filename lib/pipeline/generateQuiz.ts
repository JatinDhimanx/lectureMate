import { generateObject } from "ai";
import { getFlashModel, isGeminiConfigured } from "../ai/gemini";
import { QuizGenerationResultSchema, type QuizQuestionItem } from "../ai/schemas";

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
      prompt: `You are an expert academic examiner. Create exactly ${questionCount} rigorous verification quiz questions testing knowledge from the lecture below.

BLOOM FOCUS: ${bloomFocus.join(", ")}

QUESTION FORMATS:
1. mcq: 4 plausible options (a, b, c, d), exactly ONE is correct.
   - Include whyWrong explanation for each incorrect option.
2. true_false: 2 options (True, False), exactly ONE is correct.
3. short_answer: Conceptual open-ended question. Options array can be empty.

RULES:
- Questions must test deep understanding, trade-offs, and critical definitions.
- Distractors must be realistic and reflect common student misconceptions.
- Cite the EXACT sentence from the lecture in evidenceQuote.

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
 * Produces crisp, academic 4-option MCQs and True/False questions with step-by-step explanations.
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

  const allSentences = rawSentences.length > 0 ? rawSentences : [text.trim()];

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
    if (def && def.term.length > 2) {
      const c1 = concepts[(i + 1) % Math.max(concepts.length, 1)];
      const c2 = concepts[(i + 2) % Math.max(concepts.length, 1)];
      const c3 = concepts[(i + 3) % Math.max(concepts.length, 1)];

      pool.push({
        type: "mcq",
        prompt: `Which of the following correctly defines "${def.term}" according to the material?`,
        correct: def.def,
        options: [
          { id: "a", text: def.def, isCorrect: true },
          { id: "b", text: c1 ? `It refers to ${c1.name}: ${c1.definition.slice(0, 90)}` : "It represents the opposite constraint in the system", isCorrect: false, whyWrong: `This relates to ${c1?.name || "a different concept"}, not ${def.term}.` },
          { id: "c", text: c2 ? `It requires ${c2.definition.slice(0, 90)}` : "An outdated protocol no longer used in standard implementations", isCorrect: false, whyWrong: "This describes an adjacent mechanism, not this definition." },
          { id: "d", text: c3 ? `A theoretical model where ${c3.definition.slice(0, 80)}` : "A client-side failure recovery technique", isCorrect: false, whyWrong: "This confuses the term with general client recovery." },
        ],
        explanation: `Correct: "${def.term}" is defined in the lecture as: "${def.def}".`,
        evidence: sentence,
        concept: def.term,
        bloom: "remember",
      });
    }
  });

  // 2. High-Yield Concept MCQs
  concepts.forEach((concept, i) => {
    const evidenceSentence = allSentences.find(s =>
      s.toLowerCase().includes(concept.name.toLowerCase().split(" ")[0])
    ) || allSentences[i % allSentences.length];

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

  // 3. Factual True/False Questions
  allSentences.forEach((sentence, i) => {
    if (sentence.length < 40 || sentence.length > 180) return;
    const concept = concepts[i % Math.max(concepts.length, 1)]?.name || "Core Principles";

    if (/\b(is|are|must|always|cannot|requires|ensures|guarantees)\b/i.test(sentence)) {
      pool.push({
        type: "true_false",
        prompt: `True or False: According to the lecture, "${sentence}"`,
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

  // Fallback
  if (pool.length === 0) {
    const firstSent = allSentences[0];
    pool.push({
      type: "mcq",
      prompt: "What is the primary objective of this lecture?",
      correct: firstSent,
      options: [
        { id: "a", text: firstSent, isCorrect: true },
        { id: "b", text: "To replace modern distributed paradigms with single-host systems", isCorrect: false, whyWrong: "Contradicts standard architecture." },
        { id: "c", text: "To optimize purely hardware-level bus timings", isCorrect: false, whyWrong: "Off-topic." },
        { id: "d", text: "To establish that networking failures never occur in production", isCorrect: false, whyWrong: "Networks are inherently fallible." },
      ],
      explanation: `The core premise begins with: ${firstSent}`,
      evidence: firstSent,
      concept: concepts[0]?.name || "Introduction",
      bloom: "understand",
    });
  }

  // Generate exactly `count` questions
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
