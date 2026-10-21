"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  HelpCircle,
  ArrowRight,
  Sparkles,
  Award,
  ShieldCheck,
  Clock,
  RotateCcw,
  CheckCircle2,
  Lock,
} from "lucide-react";
import type { QuizAttemptLog } from "@/lib/db/repo";

interface LectureSummary {
  id: string;
  title: string;
  sourceType: string;
  quizCount: number;
}

export default function QuizIndexPage() {
  const [lectures, setLectures] = useState<LectureSummary[]>([]);
  const [analytics, setAnalytics] = useState<{
    attempts: QuizAttemptLog[];
    stats: {
      totalAttempts: number;
      averageScore: number;
      highestScore: number;
      totalQuestionsSolved: number;
    };
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/lectures").then((r) => r.json()),
      fetch("/api/quiz/analytics").then((r) => r.json()).catch(() => null),
    ])
      .then(([lectureData, analyticsData]) => {
        if (Array.isArray(lectureData)) setLectures(lectureData);
        if (analyticsData && analyticsData.stats) setAnalytics(analyticsData);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="px-4 sm:px-8 py-6 sm:py-10 max-w-6xl mx-auto space-y-6 sm:space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-semibold mb-2">
            <Lock className="w-3.5 h-3.5 text-amber-500" />
            <span>AI Proctored Examination Suite</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] tracking-tight">
            Adaptive Diagnostic Quizzes & Exams
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-1">
            Test deep concept recall in secure full-screen mode with topic selection, question palettes, and anti-cheating proctoring.
          </p>
        </div>

        <Link
          href="/upload"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold text-sm shadow-md shadow-indigo-500/20 hover:shadow-lg transition-all self-start sm:self-auto"
        >
          Upload New Material
        </Link>
      </div>

      {/* Analytics Stats Overview */}
      {analytics && analytics.stats.totalAttempts > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-soft">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
              Tests Completed
            </span>
            <span className="text-2xl font-extrabold text-slate-900">
              {analytics.stats.totalAttempts}
            </span>
          </div>

          <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-soft">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
              Average Score
            </span>
            <span className="text-2xl font-extrabold text-indigo-600">
              {analytics.stats.averageScore}%
            </span>
          </div>

          <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-soft">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
              Highest Score
            </span>
            <span className="text-2xl font-extrabold text-emerald-600">
              {analytics.stats.highestScore}%
            </span>
          </div>

          <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-soft">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
              Questions Solved
            </span>
            <span className="text-2xl font-extrabold text-purple-600">
              {analytics.stats.totalQuestionsSolved}
            </span>
          </div>
        </div>
      )}

      {/* Available Lectures Grid */}
      <div>
        <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <span>Available Lecture Quizzes</span>
        </h2>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2].map((i) => (
              <div key={i} className="h-44 rounded-3xl bg-slate-100 animate-pulse" />
            ))}
          </div>
        ) : lectures.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center rounded-3xl border border-slate-200/80 bg-white shadow-soft p-8">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
              <HelpCircle className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">No quizzes available yet</h3>
            <p className="text-slate-500 text-sm mb-6 max-w-md leading-relaxed">
              Upload your lecture notes, PDFs, or YouTube lectures to automatically generate proctored practice exams.
            </p>
            <Link
              href="/upload"
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-md shadow-indigo-500/20 transition-all"
            >
              Upload Lecture <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {lectures.map((l, i) => (
              <motion.div
                key={l.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                whileHover={{ y: -3 }}
                className="rounded-3xl border border-slate-200/80 bg-white p-7 shadow-soft hover:shadow-card-hover transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200/60">
                      {l.quizCount || 3} Base Questions
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200/60">
                      <Lock className="w-3 h-3 text-purple-500" />
                      Proctored Mode
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 mb-2 line-clamp-2">
                    {l.title}
                  </h3>
                  <p className="text-xs text-slate-500 mb-6 leading-relaxed">
                    Customizable topic scope, question volume, difficulty levels, full-screen anti-cheating, and instant post-exam analytics.
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-400 capitalize">
                    {l.sourceType} source
                  </span>
                  <Link
                    href={`/quiz/${l.id}`}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-xs font-bold shadow-sm transition-all"
                  >
                    <span>Full Quiz Mode</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Proctored Exam Attempts */}
      {analytics && analytics.attempts.length > 0 && (
        <div className="space-y-4 pt-4">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Award className="w-4 h-4 text-indigo-600" />
            <span>Recent Exam Attempts & Analytics</span>
          </h2>

          <div className="space-y-3">
            {analytics.attempts.slice(0, 5).map((att) => (
              <div
                key={att.id}
                className="p-4 sm:p-5 rounded-2xl border border-slate-200/80 bg-white shadow-soft flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-slate-900">{att.lectureTitle}</span>
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200">
                      {att.difficulty}
                    </span>
                    {att.terminated && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200">
                        Terminated (Violations)
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">
                    {att.correctAnswers}/{att.totalQuestions} Correct • Completed in {Math.round(att.timeSpentSeconds / 60)} min • Violations: {att.violationsCount}
                  </p>
                </div>

                <div className="flex items-center gap-4 self-end sm:self-auto">
                  <div className="text-right">
                    <span className="text-xl font-extrabold text-indigo-600 block">
                      {att.scorePercent}%
                    </span>
                    <span className="text-[10px] text-slate-400">Final Score</span>
                  </div>
                  <Link
                    href={`/quiz/${att.lectureId}`}
                    className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
                    title="Retake Exam"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
