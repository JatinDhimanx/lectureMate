"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  XCircle,
  HelpCircle,
  Sparkles,
  RotateCcw,
  Eye,
  ExternalLink,
  BookOpen,
  Award,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { DemoLectureData } from "@/lib/db/mock-data";

type Question = DemoLectureData["quizQuestions"][0];

interface TopicQuizModuleProps {
  questions: Question[];
  lectureId: string;
  lectureTitle: string;
}

export function TopicQuizModule({
  questions,
  lectureId,
  lectureTitle,
}: TopicQuizModuleProps) {
  // Map of questionId -> selectedOptionId
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  // Map of questionId -> boolean (whether correct answer / solution is revealed)
  const [revealedSolutions, setRevealedSolutions] = useState<Record<string, boolean>>({});
  // Track questions answered correctly
  const [solvedCorrectly, setSolvedCorrectly] = useState<Record<string, boolean>>({});

  if (!questions || questions.length === 0) {
    return (
      <div className="rounded-3xl border border-slate-100 bg-white p-10 text-center shadow-soft">
        <HelpCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h3 className="text-base font-bold text-slate-800">No Quiz Questions Available</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
          No practice questions were generated for this lecture yet.
        </p>
      </div>
    );
  }

  const handleOptionClick = (question: Question, optionId: string) => {
    const selectedOpt = question.options.find((o) => o.id === optionId);
    if (!selectedOpt) return;

    setSelectedAnswers((prev) => ({ ...prev, [question.id]: optionId }));

    if (selectedOpt.isCorrect) {
      // Correct option clicked -> automatically reveal explanation and mark solved
      setRevealedSolutions((prev) => ({ ...prev, [question.id]: true }));
      setSolvedCorrectly((prev) => ({ ...prev, [question.id]: true }));
    }
  };

  const handleRevealSolution = (questionId: string) => {
    setRevealedSolutions((prev) => ({ ...prev, [questionId]: true }));
  };

  const handleResetQuestion = (questionId: string) => {
    setSelectedAnswers((prev) => {
      const copy = { ...prev };
      delete copy[questionId];
      return copy;
    });
    setRevealedSolutions((prev) => {
      const copy = { ...prev };
      delete copy[questionId];
      return copy;
    });
    setSolvedCorrectly((prev) => {
      const copy = { ...prev };
      delete copy[questionId];
      return copy;
    });
  };

  const handleResetAll = () => {
    setSelectedAnswers({});
    setRevealedSolutions({});
    setSolvedCorrectly({});
  };

  const totalQuestions = questions.length;
  const answeredCount = Object.keys(selectedAnswers).length;
  const correctCount = Object.keys(solvedCorrectly).length;
  const progressPercent = Math.round((correctCount / totalQuestions) * 100);

  return (
    <div className="space-y-6">
      {/* Top Banner / Controls */}
      <div className="rounded-3xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-soft flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200/70">
              <Sparkles className="w-3 h-3 text-amber-500" />
              Interactive MCQs
            </span>
            <span className="text-xs text-slate-500 font-medium">
              Click an option to test your recall — answers are revealed when you select the correct choice!
            </span>
          </div>
          <div className="flex items-center gap-4 mt-2">
            <div className="text-xs font-semibold text-slate-700">
              Score: <strong className="text-emerald-600 font-bold">{correctCount}</strong> / {totalQuestions} Solved
            </div>
            <div className="w-28 sm:w-36 bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200/50">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            {correctCount === totalQuestions && totalQuestions > 0 && (
              <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                <Award className="w-3.5 h-3.5" /> All Solved!
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-end sm:self-auto shrink-0">
          {(answeredCount > 0 || Object.keys(revealedSolutions).length > 0) && (
            <button
              onClick={handleResetAll}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 text-xs font-semibold transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset All
            </button>
          )}
          <Link
            href={`/quiz/${lectureId}`}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs font-bold shadow-sm shadow-amber-500/20 hover:shadow-md transition-all"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Full Proctored Quiz Mode</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Questions List */}
      <div className="space-y-5">
        {questions.map((q, idx) => {
          const selectedOptId = selectedAnswers[q.id];
          const isRevealed = Boolean(revealedSolutions[q.id]);
          const isCorrectlySolved = Boolean(solvedCorrectly[q.id]);
          const selectedOpt = q.options.find((o) => o.id === selectedOptId);
          const isWrongSelection = Boolean(selectedOpt && !selectedOpt.isCorrect);

          return (
            <motion.div
              key={q.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.04 }}
              className="rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-7 shadow-soft transition-all"
            >
              {/* Question Header */}
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200/60">
                    Q{idx + 1} of {totalQuestions}
                  </span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 capitalize">
                    {q.questionType?.replace("_", " ") || "Multiple Choice"}
                  </span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 capitalize">
                    {q.bloomLevel}
                  </span>
                </div>

                {/* Question Status Badge */}
                <div className="flex items-center gap-2">
                  {isCorrectlySolved ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Solved
                    </span>
                  ) : isWrongSelection ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                      <XCircle className="w-3.5 h-3.5 text-rose-600" /> Try Again
                    </span>
                  ) : null}

                  {selectedOptId && (
                    <button
                      onClick={() => handleResetQuestion(q.id)}
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                      title="Reset this question"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Prompt */}
              <p className="text-base sm:text-lg font-bold text-slate-900 mb-5 leading-snug">
                {q.prompt}
              </p>

              {/* MCQ Options */}
              <div className="space-y-2.5 mb-4">
                {q.options.map((opt, optIndex) => {
                  const letter = String.fromCharCode(65 + optIndex); // A, B, C, D
                  const isThisSelected = selectedOptId === opt.id;
                  const isCorrectChoice = opt.isCorrect;

                  // Styling logic:
                  // Before selection: Clean neutral MCQ button.
                  // After selection:
                  // If solution is revealed and this is the correct one: Green!
                  // If this option is clicked and wrong: Red!
                  // Otherwise neutral.
                  let buttonStyle = "bg-white border-slate-200 text-slate-700 hover:border-indigo-300 hover:bg-indigo-50/20";
                  let badgeStyle = "border-slate-300 text-slate-600 bg-slate-50";

                  if (isRevealed && isCorrectChoice) {
                    buttonStyle = "bg-emerald-50/90 border-emerald-300 text-emerald-950 font-medium shadow-xs";
                    badgeStyle = "border-emerald-500 bg-emerald-500 text-white font-bold";
                  } else if (isThisSelected && !isCorrectChoice) {
                    buttonStyle = "bg-rose-50/90 border-rose-300 text-rose-950 shadow-xs";
                    badgeStyle = "border-rose-500 bg-rose-500 text-white font-bold";
                  } else if (isThisSelected && !isRevealed) {
                    buttonStyle = "bg-indigo-50/80 border-indigo-300 text-indigo-950 font-medium";
                    badgeStyle = "border-indigo-600 bg-indigo-600 text-white font-bold";
                  }

                  return (
                    <div key={opt.id} className="space-y-1.5">
                      <button
                        onClick={() => handleOptionClick(q, opt.id)}
                        className={cn(
                          "w-full flex items-start gap-3 p-3.5 rounded-2xl border text-left text-xs sm:text-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/20",
                          buttonStyle
                        )}
                      >
                        <span
                          className={cn(
                            "w-6 h-6 rounded-full border flex items-center justify-center shrink-0 text-xs font-bold mt-0.5 transition-colors",
                            badgeStyle
                          )}
                        >
                          {isRevealed && isCorrectChoice ? (
                            "✓"
                          ) : isThisSelected && !isCorrectChoice ? (
                            "✗"
                          ) : (
                            letter
                          )}
                        </span>
                        <div className="flex-1 pt-0.5">
                          <span className="leading-snug">{opt.text}</span>
                        </div>
                        {isRevealed && isCorrectChoice && (
                          <span className="shrink-0 text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full mt-0.5">
                            Correct Answer
                          </span>
                        )}
                      </button>

                      {/* Misconception hint for selected wrong option */}
                      {isThisSelected && !isCorrectChoice && opt.whyWrong && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          className="ml-9 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 leading-relaxed"
                        >
                          <span className="font-bold text-rose-900 block mb-0.5">
                            💡 Why this is incorrect:
                          </span>
                          {opt.whyWrong}
                        </motion.div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Reveal Solution / Help footer */}
              {!isRevealed ? (
                <div className="flex items-center justify-between pt-2">
                  <p className="text-[11px] text-slate-400">
                    {selectedOptId
                      ? "Keep guessing or click 'Reveal Answer' to see the explanation."
                      : "Select an option to test your knowledge."}
                  </p>
                  <button
                    onClick={() => handleRevealSolution(q.id)}
                    className="flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-indigo-600 transition-colors py-1 px-2.5 rounded-lg hover:bg-slate-50"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Reveal Answer</span>
                  </button>
                </div>
              ) : (
                /* Solution revealed card */
                <AnimatePresence>
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-emerald-50/70 to-teal-50/50 border border-emerald-200/80 text-xs leading-relaxed"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="font-bold text-emerald-950 text-xs sm:text-sm">
                        Answer & Key Concept Explanation
                      </span>
                    </div>

                    <p className="text-slate-700 text-xs sm:text-sm leading-relaxed mb-3">
                      {q.explanation}
                    </p>

                    {q.evidenceQuote && (
                      <div className="p-3 rounded-xl bg-white/80 border border-emerald-200/60 text-slate-600 text-xs font-mono italic">
                        <span className="font-bold text-emerald-900 not-italic block text-[11px] font-sans mb-1">
                          Lecture Transcript Evidence:
                        </span>
                        "{q.evidenceQuote.slice(0, 150)}..."
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
