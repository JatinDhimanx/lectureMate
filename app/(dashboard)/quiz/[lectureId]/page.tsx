"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, X, ChevronRight, BarChart2, RotateCcw, AlertCircle, HelpCircle } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { DemoLectureData } from "@/lib/db/mock-data";

type Question = DemoLectureData["quizQuestions"][0];

export default function QuizPage() {
  const params = useParams();
  const [lecture, setLecture] = useState<DemoLectureData | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);
  const [scores, setScores] = useState<boolean[]>([]);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const id = (params.lectureId as string) || "d9e8f7a6-b5c4-4d3e-2f1a-0b9c8d7e6f5a";
      try {
        const res = await fetch(`/api/lectures/${id}`);
        if (res.ok) {
          const data: DemoLectureData = await res.json();
          setLecture(data);
          setQuestions(data.quizQuestions);
        }
      } catch {}
      setLoading(false);
    }
    load();
  }, [params.lectureId]);

  const q = questions[current];
  const correctOption = q?.options.find((o) => o.isCorrect);

  const handleSelect = (optionId: string) => {
    if (answered) return;
    setSelected(optionId);
    setAnswered(true);
    const isCorrect = q.options.find((o) => o.id === optionId)?.isCorrect ?? false;
    setScores((prev) => [...prev, isCorrect]);
  };

  const next = () => {
    if (current + 1 >= questions.length) {
      setDone(true);
    } else {
      setCurrent((c) => c + 1);
      setSelected(null);
      setAnswered(false);
    }
  };

  const restart = () => {
    setCurrent(0);
    setSelected(null);
    setAnswered(false);
    setScores([]);
    setDone(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center animate-pulse">
          <HelpCircle className="w-6 h-6" />
        </div>
      </div>
    );
  }

  if (!lecture || questions.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center p-8 bg-white rounded-3xl border border-slate-100 shadow-soft max-w-sm">
          <AlertCircle className="w-10 h-10 text-slate-400 mx-auto mb-3" />
          <p className="text-slate-800 font-bold mb-1">No quiz questions found</p>
          <p className="text-xs text-slate-500 mb-4">Upload a lecture to generate quiz questions.</p>
          <Link href="/upload" className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold">
            Upload Lecture
          </Link>
        </div>
      </div>
    );
  }

  const correctCount = scores.filter(Boolean).length;
  const percent = Math.round((correctCount / questions.length) * 100);

  if (done) {
    return (
      <div className="flex items-center justify-center h-full px-6 py-12">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-lg bg-white rounded-3xl p-8 sm:p-10 border border-slate-100 shadow-soft text-center"
        >
          <div className="w-24 h-24 rounded-full mx-auto mb-5 flex items-center justify-center text-4xl font-extrabold text-indigo-600 border-4 border-indigo-100 bg-indigo-50 shadow-inner">
            {percent}%
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-1">Diagnostic Complete!</h2>
          <p className="text-slate-500 text-sm mb-6">
            {correctCount} / {questions.length} correct
            {percent >= 80 ? " — Outstanding recall! 🎉" : percent >= 60 ? " — Solid progress! 📚" : " — Review source concepts 💪"}
          </p>

          <div className="grid grid-cols-2 gap-3 mb-6">
            {scores.map((s, i) => (
              <div
                key={i}
                className={cn(
                  "rounded-2xl p-3.5 border text-left",
                  s ? "bg-emerald-50/70 border-emerald-200" : "bg-rose-50/70 border-rose-200"
                )}
              >
                <div className="flex items-center gap-2 mb-1">
                  {s ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <X className="w-4 h-4 text-rose-600" />
                  )}
                  <span className={cn("text-xs font-bold", s ? "text-emerald-800" : "text-rose-800")}>
                    Question {i + 1}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 line-clamp-1">{questions[i]?.prompt}</p>
              </div>
            ))}
          </div>

          {/* Weak Topic Detection & Targeted Revision Analysis */}
          {scores.some((s) => !s) && (
            <div className="mb-6 p-4 rounded-2xl bg-amber-50/80 border border-amber-200/80 text-left">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                  ⚠️ Weak Topic Detection & Targeted Revision
                </span>
              </div>
              <p className="text-[11px] text-amber-800 leading-relaxed mb-3">
                Based on your diagnostic answers, the following concepts need reinforcement before your exam:
              </p>
              <div className="space-y-2">
                {questions
                  .map((q, idx) => ({ q, idx, passed: scores[idx] }))
                  .filter((item) => !item.passed)
                  .map(({ q, idx }) => (
                    <div key={idx} className="p-2.5 rounded-xl bg-white border border-amber-200/60 text-xs">
                      <span className="font-bold text-slate-800 block">Q{idx + 1}: {q.prompt}</span>
                      {q.options.find((o) => !o.isCorrect && o.whyWrong) && (
                        <span className="text-[11px] text-rose-600 block mt-1">
                          Key fix: {q.options.find((o) => !o.isCorrect && o.whyWrong)?.whyWrong}
                        </span>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-3 justify-center">
            <button
              onClick={restart}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs sm:text-sm font-semibold hover:bg-slate-50 transition-colors"
            >
              <RotateCcw className="w-4 h-4" /> Retry Quiz
            </button>
            <Link
              href={`/study?lecture=${lecture.id}`}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-50 text-purple-700 border border-purple-200 text-xs sm:text-sm font-semibold hover:bg-purple-100 transition-colors"
            >
              Targeted Flashcards
            </Link>
            <Link
              href={`/lectures/${lecture.id}`}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold shadow-sm transition-all"
            >
              Ask the Lecture (Q&A)
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-full px-6 py-10">
      {/* Progress */}
      <div className="w-full max-w-xl mb-6">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-2.5">
          <span>Question {current + 1} of {questions.length}</span>
          <span className="capitalize px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200/60 font-bold">
            {q?.bloomLevel}
          </span>
        </div>
        <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
          <motion.div
            className="h-2 bg-gradient-to-r from-amber-500 to-indigo-600 rounded-full"
            animate={{ width: `${((current + 1) / questions.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Question Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={current}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 mb-6 shadow-soft"
        >
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 capitalize">
              {q?.questionType?.replace("_", " ")}
            </span>
          </div>

          <p className="text-lg sm:text-xl font-bold text-slate-900 leading-snug mb-6">
            {q?.prompt}
          </p>

          <div className="space-y-3">
            {q?.options.map((opt) => {
              const isSelected = selected === opt.id;
              const isCorrect = opt.isCorrect;
              const showResult = answered;

              let optClass = "border-slate-200 hover:border-indigo-400 bg-slate-50/60 hover:bg-indigo-50/20 text-slate-800";
              if (showResult && isCorrect) optClass = "border-emerald-300 bg-emerald-50/90 text-emerald-950 font-semibold shadow-xs";
              else if (showResult && isSelected && !isCorrect) optClass = "border-rose-300 bg-rose-50/90 text-rose-950";

              return (
                <button
                  key={opt.id}
                  onClick={() => handleSelect(opt.id)}
                  className={cn(
                    "w-full text-left flex items-start gap-3.5 p-4 rounded-2xl border transition-all text-sm",
                    optClass
                  )}
                >
                  <span className="w-6 h-6 rounded-full border border-current flex items-center justify-center shrink-0 text-xs font-bold mt-0.5">
                    {showResult && isCorrect ? "✓" : showResult && isSelected ? "✗" : opt.id.toUpperCase()}
                  </span>
                  <div className="flex-1">
                    <p className="leading-snug">{opt.text}</p>
                    {showResult && !isCorrect && opt.whyWrong && (
                      <p className="mt-2 text-xs text-rose-700 bg-rose-100/70 p-2.5 rounded-xl leading-relaxed">
                        💡 <span className="font-bold">Misconception:</span> {opt.whyWrong}
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {answered && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "mt-5 p-4 rounded-2xl border text-xs leading-relaxed",
                scores[scores.length - 1]
                  ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                  : "bg-rose-50 border-rose-200 text-rose-900"
              )}
            >
              <p className="font-bold text-sm mb-1">
                {scores[scores.length - 1] ? "✓ Correct!" : "✗ Needs Review"}
              </p>
              <p className="opacity-90">{q?.explanation}</p>
              {q?.evidenceQuote && (
                <p className="mt-2 opacity-70 italic">
                  Source: "{q.evidenceQuote.slice(0, 120)}..."
                </p>
              )}
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>

      {answered && (
        <motion.button
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={next}
          className="flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-sm font-bold shadow-md shadow-indigo-500/20 hover:shadow-lg transition-all"
        >
          {current + 1 >= questions.length ? "See Results" : "Next Question"} <ChevronRight className="w-4 h-4" />
        </motion.button>
      )}
    </div>
  );
}
