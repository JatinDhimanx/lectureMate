"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Map, ArrowRight, Network, Sparkles, Brain } from "lucide-react";

interface LectureSummary {
  id: string;
  title: string;
  sourceType: string;
  cardCount: number;
}

export default function ConceptMapIndexPage() {
  const [lectures, setLectures] = useState<LectureSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/lectures")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setLectures(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="px-6 sm:px-10 py-10 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Interactive Prerequisite Trees</span>
          </div>
          <h1 className="text-3xl font-extrabold text-[#0F172A] tracking-tight">Interactive Concept Maps</h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-1">
            Explore dependency graphs and mastery heatmaps extracted from your lectures.
          </p>
        </div>

        <Link
          href="/upload"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold text-sm shadow-md shadow-indigo-500/20 hover:shadow-lg transition-all self-start sm:self-auto"
        >
          New Lecture Map
        </Link>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <div key={i} className="h-40 rounded-3xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      ) : lectures.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center rounded-3xl border border-slate-100 bg-white shadow-soft p-8">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4">
            <Network className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">No concept maps available</h2>
          <p className="text-slate-500 text-sm mb-6 max-w-md leading-relaxed">
            Upload a lecture to visualize concept prerequisites, mastery heatmaps, and relationships in React Flow.
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
              whileHover={{ y: -4 }}
              className="rounded-3xl border border-slate-100 bg-white p-7 shadow-soft hover:shadow-card-hover transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                    {l.cardCount} Flashcards
                  </span>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Dynamic Graph</span>
                  </div>
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2 line-clamp-2">
                  {l.title}
                </h3>
                <p className="text-xs text-slate-500 mb-6 leading-relaxed">
                  Interactive node connections with prerequisite paths and live mastery coloring.
                </p>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400 capitalize">{l.sourceType} source</span>
                <Link
                  href={`/map/${l.id}`}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition-all"
                >
                  Open Graph Map <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
