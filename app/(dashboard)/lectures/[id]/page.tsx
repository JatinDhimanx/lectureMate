"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  BookOpen, Brain, BarChart2, Map, ArrowLeft, Play, CheckCircle,
  AlertCircle, Trash2, Star, FileText, Edit3, Plus, Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { DemoLectureData } from "@/lib/db/mock-data";
import { CardEditorModal } from "@/components/study/CardEditorModal";

import { LectureQAModule } from "@/components/study/LectureQAModule";
import { TopicQuizModule } from "@/components/study/TopicQuizModule";
import { MessageSquare } from "lucide-react";

type ActiveTab = "overview" | "cards" | "quiz" | "qa" | "transcript";

export default function LectureDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [lecture, setLecture] = useState<DemoLectureData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>("overview");
  const [editingCard, setEditingCard] = useState<DemoLectureData["cards"][0] | null | undefined>(undefined);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/lectures/${params.id}`);
        if (res.ok) setLecture(await res.json());
      } catch {}
      setLoading(false);
    }
    load();
  }, [params.id]);

  if (loading) {
    return (
      <div className="px-6 sm:px-10 py-10 max-w-6xl mx-auto">
        <div className="space-y-4">
          <div className="h-8 w-64 bg-slate-200 rounded-2xl animate-pulse" />
          <div className="h-4 w-48 bg-slate-100 rounded-xl animate-pulse" />
          <div className="grid grid-cols-3 gap-4 mt-6">
            {[1, 2, 3].map((i) => <div key={i} className="h-28 bg-slate-100 rounded-3xl animate-pulse" />)}
          </div>
        </div>
      </div>
    );
  }

  if (!lecture) {
    return (
      <div className="px-6 sm:px-10 py-10 max-w-6xl mx-auto">
        <div className="text-center py-20 bg-white rounded-3xl border border-slate-100 shadow-soft max-w-md mx-auto">
          <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-800">Lecture not found</h2>
          <p className="text-slate-500 text-xs sm:text-sm mt-1 mb-4">The requested lecture does not exist or was deleted.</p>
          <Link href="/lectures" className="text-indigo-600 hover:text-indigo-700 text-xs font-bold">
            ← Back to all lectures
          </Link>
        </div>
      </div>
    );
  }

  const { qualityReport: qr } = lecture;
  const dueCards = lecture.cards.filter(
    (c) => new Date(c.dueDate) <= new Date() || c.fsrsState === "New"
  );

  const tabs: { id: ActiveTab; label: string; icon: React.ElementType }[] = [
    { id: "overview", label: "Overview", icon: Star },
    { id: "cards", label: `Cards (${lecture.cards.length})`, icon: Brain },
    { id: "quiz", label: `Quiz (${lecture.quizQuestions.length})`, icon: BarChart2 },
    { id: "qa", label: "Ask Lecture", icon: MessageSquare },
    { id: "transcript", label: "Transcript", icon: FileText },
  ];

  return (
    <div className="px-6 sm:px-10 py-10 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 mb-8">
        <div className="flex items-start gap-4">
          <Link href="/lectures" className="mt-1 p-2 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-slate-800 shadow-xs transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] tracking-tight">{lecture.title}</h1>
            <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-500 font-medium">
              <span className="capitalize font-bold text-slate-700">{lecture.sourceType} source</span>
              <span>•</span>
              <span>{lecture.wordCount.toLocaleString()} words</span>
              <span>•</span>
              <span className="font-semibold text-indigo-600">{lecture.cards.length} flashcards</span>
              <span>•</span>
              <span className="font-semibold text-amber-600">{lecture.quizQuestions.length} quiz questions</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end sm:self-auto">
          <Link
            href={`/study?lecture=${lecture.id}`}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs sm:text-sm font-bold shadow-md shadow-indigo-500/20 hover:shadow-lg transition-all"
          >
            <Play className="w-4 h-4" /> Study ({dueCards.length} due)
          </Link>
          <Link
            href={`/map`}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs sm:text-sm font-semibold hover:bg-slate-50 transition-colors shadow-xs"
          >
            <Map className="w-4 h-4" /> Concept Map
          </Link>
        </div>
      </div>

      {/* Quality Report Banner */}
      {qr && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 sm:p-5 flex items-center gap-6 flex-wrap shadow-xs"
        >
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-600" />
            <span className="text-sm text-emerald-950 font-bold">Verifiable Evidence Audit</span>
          </div>
          <div className="text-xs text-slate-600 flex flex-wrap gap-4 font-medium">
            <span>Generated: <strong className="text-slate-900">{qr.totalGenerated}</strong></span>
            <span>Kept: <strong className="text-emerald-700">{qr.cardsKept}</strong></span>
            <span>Duplicates dropped: <strong className="text-amber-700">{qr.duplicatesRemoved}</strong></span>
            <span>Hallucinations dropped: <strong className="text-rose-700">{qr.ungroundedDropped}</strong></span>
          </div>
          <div className="text-xs font-bold text-indigo-700 sm:ml-auto bg-white/80 px-3 py-1 rounded-lg border border-indigo-100">
            Avg Groundedness: {(qr.averageGroundedness * 100).toFixed(0)}%
          </div>
        </motion.div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 p-1.5 bg-slate-100 rounded-2xl mb-6 w-fit">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all",
              activeTab === t.id
                ? "bg-white text-indigo-600 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            <t.icon className="w-4 h-4" />
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-3xl border border-slate-100 bg-white p-6 sm:p-7 shadow-soft">
            <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-600" />
              <span>Lecture Sections ({lecture.sections.length})</span>
            </h3>
            <div className="space-y-3">
              {lecture.sections.map((s) => (
                <div key={s.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:bg-indigo-50/20 transition-colors">
                  <p className="text-sm font-bold text-slate-800">{s.title}</p>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">{s.summary}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-100 bg-white p-6 sm:p-7 shadow-soft">
            <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-600" />
              <span>Extracted Core Concepts ({lecture.concepts.length})</span>
            </h3>
            <div className="space-y-3">
              {lecture.concepts.slice(0, 6).map((c) => (
                <div key={c.id} className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-100 hover:bg-purple-50/20 transition-colors">
                  <div
                    className="w-2.5 h-2.5 rounded-full mt-1.5 shrink-0"
                    style={{
                      backgroundColor: c.masteryScore > 0.8 ? "#10B981" : c.masteryScore > 0.5 ? "#F59E0B" : "#6366F1"
                    }}
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-slate-900">{c.name}</p>
                      {c.examCue && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                          Exam Cue
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">{c.definition}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === "cards" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500">
              {lecture.cards.length} cards traceable to exact transcript positions
            </p>
            <button
              onClick={() => setEditingCard(null)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" /> Add Card
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {lecture.cards.map((card) => (
              <motion.div
                key={card.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-3xl border border-slate-100 bg-white p-5 shadow-soft hover:shadow-card-hover transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200/60 capitalize">
                        {card.type.replace("_", " ")}
                      </span>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200/60 capitalize">
                        {card.bloomLevel}
                      </span>
                      <span className={cn(
                        "text-[11px] font-bold px-2 py-0.5 rounded-md border",
                        card.fsrsState === "New" ? "bg-slate-100 text-slate-600 border-slate-200" :
                        card.fsrsState === "Learning" ? "bg-amber-50 text-amber-700 border-amber-200" :
                        "bg-emerald-50 text-emerald-700 border-emerald-200"
                      )}>
                        {card.fsrsState}
                      </span>
                    </div>
                    <button
                      onClick={() => setEditingCard(card)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                      title="Edit Card"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-sm font-bold text-slate-900 mb-2">{card.front}</p>
                  <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">{card.back}</p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100">
                  <p className="text-[11px] text-slate-400 italic line-clamp-1">
                    "{card.evidenceQuote.slice(0, 90)}..."
                  </p>
                </div>
              </motion.div>
            ))}
          </div>

          {editingCard !== undefined && (
            <CardEditorModal
              isOpen={true}
              onClose={() => setEditingCard(undefined)}
              card={editingCard}
              lectureId={lecture.id}
              onSaved={(savedCard) => {
                setLecture((prev) => {
                  if (!prev) return prev;
                  const exists = prev.cards.some((c) => c.id === savedCard.id);
                  const newCards = exists
                    ? prev.cards.map((c) => (c.id === savedCard.id ? savedCard : c))
                    : [...prev.cards, savedCard];
                  return { ...prev, cards: newCards };
                });
              }}
              onDeleted={(cardId) => {
                setLecture((prev) => {
                  if (!prev) return prev;
                  return { ...prev, cards: prev.cards.filter((c) => c.id !== cardId) };
                });
              }}
            />
          )}
        </div>
      )}

      {activeTab === "quiz" && (
        <TopicQuizModule
          questions={lecture.quizQuestions}
          lectureId={lecture.id}
          lectureTitle={lecture.title}
        />
      )}

      {activeTab === "qa" && (
        <LectureQAModule
          lectureId={lecture.id}
          lectureTitle={lecture.title}
          suggestedConcepts={lecture.concepts.slice(0, 5).map((c) => c.name)}
        />
      )}

      {activeTab === "transcript" && (
        <div className="rounded-3xl border border-slate-100 bg-white p-8 shadow-soft">
          <p className="text-xs sm:text-sm text-slate-700 leading-loose whitespace-pre-wrap font-mono">
            {lecture.cleanTranscript}
          </p>
        </div>
      )}
    </div>
  );
}
