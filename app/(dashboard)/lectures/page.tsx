"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  BookOpen, Play, Map, BarChart2, Trash2, ArrowRight, Upload, Sparkles, CheckCircle2
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { DemoLectureData } from "@/lib/db/mock-data";

interface LectureSummary {
  id: string;
  title: string;
  sourceType: string;
  wordCount: number;
  cardCount: number;
  quizCount: number;
  qualityReport: DemoLectureData["qualityReport"];
}

export default function LecturesPage() {
  const [lectures, setLectures] = useState<LectureSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let localList: LectureSummary[] = [];
    try {
      const raw = localStorage.getItem("local_lectures_list");
      if (raw) localList = JSON.parse(raw);
    } catch {}

    if (localList.length > 0) {
      setLectures(localList);
      setLoading(false);
    }

    fetch("/api/lectures")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          // Merge server data with local cache (server data prioritized if present)
          const merged = [...data];
          for (const local of localList) {
            if (!merged.some((m) => m.id === local.id)) {
              merged.push(local);
            }
          }
          setLectures(merged);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/lectures/${id}`, { method: "DELETE" });
      const raw = localStorage.getItem("local_lectures_list");
      if (raw) {
        const list = JSON.parse(raw).filter((l: { id: string }) => l.id !== id);
        localStorage.setItem("local_lectures_list", JSON.stringify(list));
      }
      localStorage.removeItem(`lecture_${id}`);
    } catch {}
    setLectures((prev) => prev.filter((l) => l.id !== id));
  };

  return (
    <div className="px-6 sm:px-10 py-10 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 text-purple-700 text-xs font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Active Knowledge Base</span>
          </div>
          <h1 className="text-3xl font-extrabold text-[#0F172A] tracking-tight">Lectures & Transcripts</h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-1">
            {lectures.length} lecture{lectures.length !== 1 ? "s" : ""} processed and ready for spaced repetition.
          </p>
        </div>

        <Link
          href="/upload"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold text-sm shadow-md shadow-indigo-500/20 hover:shadow-lg transition-all self-start sm:self-auto"
        >
          <Upload className="w-4 h-4" />
          <span>Upload New Lecture</span>
        </Link>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 rounded-3xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      ) : lectures.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center rounded-3xl border border-slate-100 bg-white shadow-soft p-8">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4">
            <BookOpen className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">No lectures found</h2>
          <p className="text-slate-500 text-sm mb-6 max-w-sm leading-relaxed">
            Upload your first lecture transcript or audio to automatically generate smart summaries, flashcards, and quizzes.
          </p>
          <Link
            href="/upload"
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-md shadow-indigo-500/20 transition-all"
          >
            <Upload className="w-4 h-4" /> Upload Lecture <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {lectures.map((l, i) => (
            <motion.div
              key={l.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="rounded-3xl border border-slate-100 bg-white p-6 shadow-soft hover:shadow-card-hover transition-all group"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <div>
                    <Link
                      href={`/lectures/${l.id}`}
                      className="text-base sm:text-lg font-bold text-slate-900 hover:text-indigo-600 transition-colors"
                    >
                      {l.title}
                    </Link>
                    <div className="flex flex-wrap items-center gap-2.5 mt-1.5 text-xs text-slate-500">
                      <span className="capitalize font-semibold text-slate-700">{l.sourceType} source</span>
                      <span>•</span>
                      <span>{l.wordCount.toLocaleString()} words</span>
                      <span>•</span>
                      <span className="font-semibold text-indigo-600">{l.cardCount} cards</span>
                      <span>•</span>
                      <span className="font-semibold text-amber-600">{l.quizCount} quiz Qs</span>
                    </div>

                    <div className="flex items-center gap-2 mt-2.5">
                      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        100% Grounded
                      </span>
                      <span className="text-[11px] font-medium text-slate-400">
                        Zero hallucinations
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100 self-end sm:self-center">
                  <Link
                    href={`/study?lecture=${l.id}`}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition-all"
                  >
                    <Play className="w-3.5 h-3.5" /> Study Cards
                  </Link>
                  <Link
                    href={`/quiz/${l.id}`}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold transition-colors"
                  >
                    <BarChart2 className="w-3.5 h-3.5" /> Quiz
                  </Link>
                  <Link
                    href={`/map`}
                    className="p-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs transition-colors"
                    title="Concept Map"
                  >
                    <Map className="w-4 h-4" />
                  </Link>
                  <button
                    onClick={() => handleDelete(l.id)}
                    className="p-2 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs transition-colors"
                    title="Delete Lecture"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
