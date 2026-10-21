"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Brain,
  BookOpen,
  Flame,
  TrendingUp,
  ArrowRight,
  Clock,
  Sparkles,
  Upload,
  Trash2,
  RefreshCw,
  AlertCircle,
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

interface DashboardStats {
  dueToday: number;
  totalCards: number;
  streak: number;
  retentionRate: number;
  newCards: number;
  learningCards: number;
  reviewCards: number;
  totalLectures: number;
}

function StatBadge({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
}) {
  const styles: Record<
    string,
    { bg: string; iconBg: string; text: string; iconColor: string }
  > = {
    indigo: {
      bg: "bg-indigo-50/60 border-indigo-100/80",
      iconBg: "bg-indigo-100 text-indigo-600",
      text: "text-indigo-950",
      iconColor: "text-indigo-600",
    },
    amber: {
      bg: "bg-amber-50/60 border-amber-100/80",
      iconBg: "bg-amber-100 text-amber-600",
      text: "text-amber-950",
      iconColor: "text-amber-600",
    },
    emerald: {
      bg: "bg-emerald-50/60 border-emerald-100/80",
      iconBg: "bg-emerald-100 text-emerald-600",
      text: "text-emerald-950",
      iconColor: "text-emerald-600",
    },
    violet: {
      bg: "bg-purple-50/60 border-purple-100/80",
      iconBg: "bg-purple-100 text-purple-600",
      text: "text-purple-950",
      iconColor: "text-purple-600",
    },
  };

  const style = styles[color] || styles.indigo;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -3 }}
      className={cn(
        "p-6 rounded-3xl border bg-white shadow-soft transition-all flex flex-col justify-between",
        style.bg
      )}
    >
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          {label}
        </span>
        <div
          className={cn(
            "w-9 h-9 rounded-xl flex items-center justify-center shadow-xs",
            style.iconBg
          )}
        >
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <p className={cn("text-3xl font-extrabold tracking-tight", style.text)}>
        {value}
      </p>
    </motion.div>
  );
}

export default function DashboardPage() {
  const [lectures, setLectures] = useState<LectureSummary[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    dueToday: 0,
    totalCards: 0,
    streak: 3,
    retentionRate: 92,
    newCards: 0,
    learningCards: 0,
    reviewCards: 0,
    totalLectures: 0,
  });
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Live data fetcher
  const fetchLiveDashboard = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard/stats");
      if (res.ok) {
        const data = await res.json();
        setStats({
          dueToday: data.dueToday ?? 0,
          totalCards: data.totalCards ?? 0,
          streak: data.streak ?? 1,
          retentionRate: data.retentionRate ?? 92,
          newCards: data.newCards ?? 0,
          learningCards: data.learningCards ?? 0,
          reviewCards: data.reviewCards ?? 0,
          totalLectures: data.totalLectures ?? 0,
        });
        if (Array.isArray(data.lectures)) {
          setLectures(data.lectures);
        }
      }
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLiveDashboard();
  }, [fetchLiveDashboard]);

  // Live Delete Lecture from Dashboard
  const handleDeleteLecture = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this lecture?")) return;

    setDeletingId(id);
    try {
      const res = await fetch(`/api/lectures/${id}`, { method: "DELETE" });
      if (res.ok) {
        // Refresh live stats immediately
        await fetchLiveDashboard();
      }
    } catch (err) {
      console.error("Delete error:", err);
    } finally {
      setDeletingId(null);
    }
  };

  const dueCards = [
    { label: "New Cards", count: stats.newCards, color: "text-indigo-600", bg: "bg-indigo-50/70" },
    { label: "Learning", count: stats.learningCards, color: "text-amber-600", bg: "bg-amber-50/70" },
    { label: "Review", count: stats.reviewCards, color: "text-emerald-600", bg: "bg-emerald-50/70" },
  ];

  return (
    <div className="px-4 sm:px-8 py-6 sm:py-10 max-w-6xl mx-auto space-y-6 sm:space-y-8">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>FSRS v5 Cognitive Scheduler</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] tracking-tight">
            Study Command Center
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-1">
            Real-time memory retention, flashcard queues, and lecture packs.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            onClick={fetchLiveDashboard}
            className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
            title="Refresh Live Data"
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          </button>
          <Link
            href="/upload"
            className="inline-flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold text-xs sm:text-sm shadow-md shadow-indigo-500/20 hover:shadow-lg transition-all"
          >
            <Upload className="w-4 h-4" />
            <span>Upload Material</span>
          </Link>
        </div>
      </div>

      {/* 4 Stat Badges */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        <StatBadge label="Due Today" value={stats.dueToday} icon={Clock} color="indigo" />
        <StatBadge label="Total Cards" value={stats.totalCards} icon={Brain} color="violet" />
        <StatBadge label="Day Streak" value={`${stats.streak}d`} icon={Flame} color="amber" />
        <StatBadge label="Retention Rate" value={`${stats.retentionRate}%`} icon={TrendingUp} color="emerald" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Spaced Repetition Queue */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-2 rounded-3xl border border-slate-100 bg-white p-5 sm:p-8 shadow-soft flex flex-col justify-between"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">Today's Spaced Repetition Queue</h2>
              <p className="text-xs text-slate-500 mt-0.5">Optimized for long-term retention using FSRS algorithm</p>
            </div>
            {stats.dueToday > 0 && (
              <Link
                href="/study"
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold shadow-md shadow-indigo-500/20 transition-all hover:shadow-lg self-start sm:self-auto"
              >
                Study Now <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              {dueCards.map((dc) => (
                <div key={dc.label} className={cn("rounded-2xl p-4 text-center transition-all", dc.bg)}>
                  <p className={cn("text-2xl sm:text-3xl font-extrabold", dc.color)}>{dc.count}</p>
                  <p className="text-xs font-medium text-slate-600 mt-1">{dc.label}</p>
                </div>
              ))}
            </div>

            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">
                    Active Knowledge Base: {stats.totalLectures} lecture{stats.totalLectures !== 1 ? "s" : ""}
                  </p>
                  <p className="text-xs text-slate-500">Short daily sessions maintain 90%+ retrieval speed</p>
                </div>
              </div>
              <Link
                href="/study"
                className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
              >
                Start Session →
              </Link>
            </div>
          </div>
        </motion.div>

        {/* Recent Lectures */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-3xl border border-slate-100 bg-white p-6 sm:p-8 shadow-soft flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-slate-900">Recent Lectures</h2>
              <Link href="/lectures" className="text-xs font-semibold text-indigo-600 hover:text-indigo-700">
                View all ({lectures.length})
              </Link>
            </div>

            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 rounded-2xl bg-slate-100 animate-pulse" />
                ))}
              </div>
            ) : lectures.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
                  <BookOpen className="w-6 h-6" />
                </div>
                <p className="text-sm font-bold text-slate-800">No lectures yet</p>
                <p className="text-xs text-slate-500 mt-1 mb-4">Upload your first recording or slides</p>
                <Link
                  href="/upload"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-colors"
                >
                  Upload Now
                </Link>
              </div>
            ) : (
              <div className="space-y-2.5">
                {lectures.slice(0, 4).map((l) => (
                  <div
                    key={l.id}
                    className="flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all group"
                  >
                    <Link
                      href={`/lectures/${l.id}`}
                      className="flex items-start gap-3 flex-1 min-w-0"
                    >
                      <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <BookOpen className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs sm:text-sm font-bold text-slate-800 truncate group-hover:text-indigo-600 transition-colors">
                          {l.title}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {l.cardCount} cards · {l.quizCount} quiz questions
                        </p>
                      </div>
                    </Link>

                    <button
                      onClick={(e) => handleDeleteLecture(e, l.id)}
                      disabled={deletingId === l.id}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors opacity-100 sm:opacity-0 sm:group-hover:opacity-100 shrink-0 ml-2"
                      title="Delete Lecture"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-4 mt-4 border-t border-slate-100">
            <Link
              href="/upload"
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-indigo-200 text-indigo-600 text-xs font-bold hover:bg-indigo-50 transition-colors"
            >
              <Upload className="w-3.5 h-3.5" /> Add New Lecture
            </Link>
          </div>
        </motion.div>
      </div>

      {/* Revision Recommendation */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="rounded-3xl border border-amber-200/80 bg-amber-50/50 p-6 shadow-sm"
      >
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-amber-900">Active Spaced Repetition Overview</p>
            <p className="text-xs sm:text-sm text-amber-800/80 mt-1">
              {stats.totalCards > 0
                ? `You have ${stats.totalCards} cards generated across ${stats.totalLectures} lecture packs. Reviewing them regularly prevents forgetting curve degradation.`
                : "Upload study materials or lecture notes to automatically generate active-recall cards and verification quizzes."}
            </p>
            {stats.dueToday > 0 && (
              <Link
                href="/study"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-900 mt-3 hover:underline"
              >
                Start Focused Review ({stats.dueToday} cards) <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
