import { z } from "zod";

// ==========================================
// 1. CLEANING & TRANSLATION SCHEMA
// ==========================================
export const CleaningResultSchema = z.object({
  cleanedText: z.string().describe("The cleaned transcript with filler words removed, ASR errors fixed, and translated to clean academic English if requested."),
  detectedLanguage: z.string().describe("Detected primary language (e.g. 'en', 'hi', 'hinglish')"),
  summary: z.string().describe("A 2-3 sentence overview of the lecture's core themes."),
  wordCount: z.number().int().describe("Estimated word count of cleaned text"),
});
export type CleaningResult = z.infer<typeof CleaningResultSchema>;

// ==========================================
// 2. SEGMENTATION SCHEMA
// ==========================================
export const SectionSchema = z.object({
  title: z.string().describe("Section or subtopic title"),
  summary: z.string().describe("1-2 sentence synopsis of this section"),
  startChar: z.number().int().describe("Starting character offset in the cleaned transcript"),
  endChar: z.number().int().describe("Ending character offset in the cleaned transcript"),
  startTimeSeconds: z.number().optional().describe("Estimated starting time in seconds"),
  endTimeSeconds: z.number().optional().describe("Estimated ending time in seconds"),
});

export const SegmentationResultSchema = z.object({
  sections: z.array(SectionSchema).min(1).describe("List of semantic sections ordered sequentially"),
});
export type SegmentationResult = z.infer<typeof SegmentationResultSchema>;

// ==========================================
// 3. CONCEPT EXTRACTION SCHEMA
// ==========================================
export const ExtractedConceptSchema = z.object({
  name: z.string().describe("Canonical concept name (e.g., 'CAP Theorem', 'Quorum')"),
  definition: z.string().describe("Concise, high-yield academic definition"),
  importanceScore: z.number().min(0).max(1).describe("Importance from 0.0 to 1.0 based on core value, repetition, and exam cues"),
  examCue: z.boolean().describe("True if the speaker explicitly gave an exam cue or emphasis ('important', 'will come in exam', 'remember this')"),
  sourceSpan: z.object({
    startChar: z.number().int(),
    endChar: z.number().int(),
    quote: z.string().describe("Verbatim excerpt introducing or defining this concept"),
  }),
  prerequisites: z.array(z.string()).describe("Names of foundational concepts required to understand this concept"),
});

export const ConceptExtractionResultSchema = z.object({
  concepts: z.array(ExtractedConceptSchema).min(2),
});
export type ConceptExtractionResult = z.infer<typeof ConceptExtractionResultSchema>;

// ==========================================
// 4. FLASHCARD GENERATION SCHEMA
// ==========================================
export const FlashcardSchema = z.object({
  type: z.enum(["basic", "cloze", "why_how", "worked_example"]).describe("Flashcard archetype"),
  front: z.string().describe("Question, cloze prompt with {{c1::cloze}}, or problem statement"),
  back: z.string().describe("Answer, explanation, or worked solution"),
  bloomLevel: z.enum(["remember", "understand", "apply", "analyze"]).describe("Bloom taxonomy cognitive level"),
  difficulty: z.number().int().min(1).max(5).describe("Difficulty rating from 1 (fundamental) to 5 (advanced synthesis)"),
  conceptName: z.string().describe("The primary concept this card tests"),
  evidenceQuote: z.string().describe("A strict verbatim sentence or passage from the transcript that directly answers and justifies the card"),
  evidenceSpan: z.object({
    startChar: z.number().int().default(0),
    endChar: z.number().int().default(0),
  }).default({ startChar: 0, endChar: 0 }),
  tags: z.array(z.string()).default([]),
});

export const FlashcardGenerationResultSchema = z.object({
  cards: z.array(FlashcardSchema).min(1),
});
export type FlashcardItem = z.infer<typeof FlashcardSchema>;
export type FlashcardGenerationResult = z.infer<typeof FlashcardGenerationResultSchema>;

// ==========================================
// 5. QUIZ GENERATION SCHEMA
// ==========================================
export const QuizOptionSchema = z.object({
  id: z.string(),
  text: z.string(),
  isCorrect: z.boolean(),
  whyWrong: z.string().optional().describe("For incorrect options, a one-line explanation of the student misconception behind this distractor"),
});

export const QuizQuestionSchema = z.object({
  questionType: z.enum(["mcq", "true_false", "short_answer"]),
  prompt: z.string(),
  correctAnswer: z.string(),
  options: z.array(QuizOptionSchema).describe("List of options. For MCQ: 4 options; for true_false: 2 options"),
  explanation: z.string().describe("Detailed explanation of why the correct answer is right"),
  evidenceQuote: z.string().describe("Verbatim excerpt from transcript verifying the answer"),
  evidenceSpan: z.object({
    startChar: z.number().int().default(0),
    endChar: z.number().int().default(0),
  }).default({ startChar: 0, endChar: 0 }),
  bloomLevel: z.enum(["remember", "understand", "apply", "analyze"]).default("understand"),
  conceptName: z.string(),
});

export const QuizGenerationResultSchema = z.object({
  questions: z.array(QuizQuestionSchema).min(1),
});
export type QuizQuestionItem = z.infer<typeof QuizQuestionSchema>;
export type QuizGenerationResult = z.infer<typeof QuizGenerationResultSchema>;

// ==========================================
// 6. VERIFICATION SCHEMA
// ==========================================
export const CardVerificationItemSchema = z.object({
  cardIndex: z.number().int(),
  groundedness: z.number().min(0).max(1).describe("Does the evidence quote fully support the front and back without hallucination?"),
  clarity: z.number().min(0).max(1).describe("Is the question phrasing unambiguous and academically crisp?"),
  uniqueness: z.number().min(0).max(1).describe("Is this distinct from other generated cards?"),
  passesThreshold: z.boolean().describe("True if card meets quality bar (e.g. groundedness >= 0.85, clarity >= 0.8)"),
  failureReason: z.string().optional().describe("If rejected, why (e.g. 'ungrounded claim', 'duplicate of card 3')"),
});

export const CardVerificationResultSchema = z.object({
  evaluations: z.array(CardVerificationItemSchema),
});
export type CardVerificationResult = z.infer<typeof CardVerificationResultSchema>;
