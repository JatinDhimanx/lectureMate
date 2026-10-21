import { NextRequest, NextResponse } from "next/server";
import { generateObject } from "ai";
import { getFlashModel, isGeminiConfigured } from "@/lib/ai/gemini";
import { QuizGenerationResultSchema, type QuizQuestionItem } from "@/lib/ai/schemas";
import { repo } from "@/lib/db/repo";
import { getCurrentUser } from "@/lib/auth/get-current-user";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const {
      selectedTopics = "all", // "all" or string[] of topic names
      questionCount = 10,
      difficulty = "medium", // "easy" | "medium" | "hard"
    } = body;

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized. Please sign in." }, { status: 401 });
    }

    const count = Math.min(Math.max(Number(questionCount) || 10, 3), 30);
    const lecture = await repo.getLectureById(id, user.id);

    if (!lecture) {
      return NextResponse.json({ error: "Lecture not found or access denied." }, { status: 404 });
    }

    // Filter concepts and sections by selected topics if specific topics were requested
    let targetConcepts = lecture.concepts;
    let targetSections = lecture.sections;

    if (Array.isArray(selectedTopics) && selectedTopics.length > 0 && !selectedTopics.includes("all")) {
      const topicSet = new Set(selectedTopics.map((t: string) => t.toLowerCase().trim()));
      targetConcepts = lecture.concepts.filter(
        (c) => topicSet.has(c.name.toLowerCase().trim()) || topicSet.has(c.id)
      );
      targetSections = lecture.sections.filter(
        (s) => topicSet.has(s.title.toLowerCase().trim()) || topicSet.has(s.id)
      );

      // Fallback if no direct match
      if (targetConcepts.length === 0) {
        targetConcepts = lecture.concepts;
      }
    }

    // Gather transcript context
    let contextText = lecture.cleanTranscript;
    if (targetSections.length > 0 && targetSections.length < lecture.sections.length) {
      const sectionSnippets = targetSections.map((s) => {
        const start = Math.max(0, s.startChar);
        const end = Math.min(contextText.length, s.endChar);
        return contextText.slice(start, end);
      });
      contextText = sectionSnippets.join("\n\n---\n\n");
    }

    const difficultyPromptMap = {
      easy: "EASY: Focus on clear definitions, fundamental facts, primary principles, and direct recall. Distractors should be distinct and easily distinguishable.",
      medium: "MEDIUM: Focus on conceptual understanding, comparisons, mechanics, and trade-offs. Distractors should reflect subtle common student misconceptions.",
      hard: "HARD: Focus on higher-order synthesis, edge cases, subtle distinctions, failure modes, and scenario analysis. Distractors must be deeply plausible and test rigorous comprehension.",
    };

    const diffInstruction = difficultyPromptMap[difficulty as keyof typeof difficultyPromptMap] || difficultyPromptMap.medium;

    if (!isGeminiConfigured()) {
      // Content-aware smart mock quiz generator
      const mockQuestions = generateSmartCustomQuiz(
        contextText,
        targetConcepts,
        count,
        difficulty as "easy" | "medium" | "hard"
      );
      return NextResponse.json({
        questions: mockQuestions,
        selectedTopics,
        difficulty,
        totalQuestions: mockQuestions.length,
      });
    }

    const prompt = `You are a world-class academic examiner designing a professional secure exam.
Create exactly ${count} rigorous multiple-choice questions (MCQs) for this exam.

DIFFICULTY LEVEL:
${diffInstruction}

EXAM RULES:
1. Every question must be a multiple-choice question with 4 options (A, B, C, D), exactly ONE is correct.
2. For each distractor, provide a specific 'whyWrong' explanation showing the misconception.
3. Test ONLY core subject matter, definitions, mechanisms, derivations, and application.
4. ABSOLUTE PROHIBITION: NEVER ask questions about exam pattern, marks allocation, syllabus layout, grading rules, or administrative instructions!
5. Quote the verbatim evidence sentence from the lecture in evidenceQuote.

TEST TOPICS & CONCEPTS:
${targetConcepts.map((c) => `- ${c.name}: ${c.definition}`).join("\n")}

LECTURE CONTENT EXCERPT:
---
${contextText.slice(0, 15000)}
---

Return a JSON object with a "questions" array of exactly ${count} items.`;

    const result = await generateObject({
      model: getFlashModel(),
      schema: QuizGenerationResultSchema,
      prompt,
      maxRetries: 1,
    });

    let questions = result.object.questions;
    if (questions.length < count) {
      const extra = generateSmartCustomQuiz(
        contextText,
        targetConcepts,
        count - questions.length,
        difficulty as "easy" | "medium" | "hard"
      );
      questions = [...questions, ...extra];
    }

    // Ensure format compatibility
    const formattedQuestions = questions.slice(0, count).map((q, idx) => ({
      id: `custom-q-${id}-${idx}-${Date.now()}`,
      conceptId: lecture.concepts[0]?.id || "c-0",
      questionType: q.questionType || "mcq",
      prompt: q.prompt,
      correctAnswer: q.correctAnswer,
      options: q.options.map((opt, oIdx) => ({
        id: opt.id || String.fromCharCode(97 + oIdx),
        text: opt.text,
        isCorrect: opt.isCorrect,
        whyWrong: opt.whyWrong,
      })),
      explanation: q.explanation,
      evidenceQuote: q.evidenceQuote || "",
      evidenceSpan: q.evidenceSpan || { startChar: 0, endChar: 0 },
      bloomLevel: q.bloomLevel || (difficulty === "easy" ? "remember" : difficulty === "hard" ? "analyze" : "understand"),
    }));

    return NextResponse.json({
      questions: formattedQuestions,
      selectedTopics,
      difficulty,
      totalQuestions: formattedQuestions.length,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to generate customized quiz";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * Smart content-aware custom quiz generator when AI key is absent
 */
function generateSmartCustomQuiz(
  text: string,
  concepts: Array<{ name: string; definition: string }>,
  count: number,
  difficulty: "easy" | "medium" | "hard"
): QuizQuestionItem[] {
  const questions: QuizQuestionItem[] = [];

  const sentences = text
    .split(/(?<=[.?!])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 25 && !s.toLowerCase().includes("marks") && !s.toLowerCase().includes("pattern"));

  const sourceConcepts = concepts.length > 0 ? concepts : [
    { name: "Core Principles", definition: sentences[0] || "Foundational concepts from the lecture." }
  ];

  for (let i = 0; i < count; i++) {
    const concept = sourceConcepts[i % sourceConcepts.length];
    const otherConcepts = sourceConcepts.filter((c) => c.name !== concept.name);
    const relatedSentence = sentences.find((s) => s.includes(concept.name)) || sentences[i % sentences.length] || concept.definition;

    let prompt = "";
    let correctText = "";
    let distractors: string[] = [];

    if (difficulty === "easy") {
      prompt = `What is the primary definition of "${concept.name}" as presented in the lecture?`;
      correctText = concept.definition;
      distractors = [
        otherConcepts[0]?.definition || "An external communication protocol unrelated to internal state coordination.",
        otherConcepts[1]?.definition || "A temporary storage buffer used only during initialization.",
        "A deprecated legacy specification superseded by modern architectures.",
      ];
    } else if (difficulty === "hard") {
      prompt = `In the context of "${concept.name}", which statement accurately evaluates its operational constraints and failure boundaries?`;
      correctText = `It guarantees correct state transitions provided that ${concept.definition.slice(0, 80).toLowerCase()} is strictly maintained.`;
      distractors = [
        `It guarantees zero-latency execution regardless of concurrent network partition states.`,
        `It bypasses invariant verification whenever input throughput exceeds baseline thresholds.`,
        `It delegates conflict resolution entirely to client-side heuristics without consensus.`,
      ];
    } else {
      // medium
      prompt = `Which of the following best characterizes the role and mechanism of "${concept.name}"?`;
      correctText = concept.definition;
      distractors = [
        `It serves as an auxiliary logging mechanism without impacting execution logic.`,
        otherConcepts[0]?.definition || "It acts as a synchronous lock on all secondary subsystems.",
        "It eliminates the need for data replication across nodes.",
      ];
    }

    const options = [
      { id: "a", text: correctText, isCorrect: true },
      { id: "b", text: distractors[0], isCorrect: false, whyWrong: "Misinterprets the scope or core mechanism of this concept." },
      { id: "c", text: distractors[1], isCorrect: false, whyWrong: "Confuses this concept with an unrelated subsystem." },
      { id: "d", text: distractors[2], isCorrect: false, whyWrong: "Overgeneralizes or asserts an unverified absolute claim." },
    ];

    // Shuffle options predictably
    const shift = i % 4;
    const shuffled = [...options.slice(shift), ...options.slice(0, shift)].map((opt, idx) => ({
      ...opt,
      id: String.fromCharCode(97 + idx),
    }));

    questions.push({
      questionType: "mcq",
      prompt,
      correctAnswer: correctText,
      options: shuffled,
      explanation: `From the lecture: ${concept.definition}`,
      evidenceQuote: relatedSentence.slice(0, 150),
      evidenceSpan: { startChar: 0, endChar: 0 },
      conceptName: concept.name,
      bloomLevel: difficulty === "easy" ? "remember" : difficulty === "hard" ? "analyze" : "understand",
    });
  }

  return questions;
}
