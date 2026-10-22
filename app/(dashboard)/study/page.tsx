"use client";

import { useEffect, useState, useCallback, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  RotateCcw, ChevronRight, X, Bookmark, Edit3, CheckCircle2,
  AlertCircle, Brain, Sparkles, Layers, ArrowLeft, ChevronDown,
  BookOpen, Upload, Plus
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { DemoLectureData } from "@/lib/db/mock-data";
import { previewNextIntervals, sortDueQueue } from "@/lib/fsrs/scheduler";
import type { CardState } from "@/lib/fsrs/scheduler";
import { CardEditorModal } from "@/components/study/CardEditorModal";

type Card = DemoLectureData["cards"][0];
type RatingKey = "again" | "hard" | "good" | "easy";

interface LectureSummary {
  id: string;
  title: string;
  cardCount: number;
  sourceType?: string;
  createdAt?: string;
}

const RATING_STYLES: Record<RatingKey, { border: string; bg: string; text: string; sub: string }> = {
  again: { border: "border-rose-200 hover:border-rose-300", bg: "bg-rose-50 hover:bg-rose-100", text: "text-rose-700", sub: "text-rose-500" },
  hard: { border: "border-amber-200 hover:border-amber-300", bg: "bg-amber-50 hover:bg-amber-100", text: "text-amber-700", sub: "text-amber-500" },
  good: { border: "border-emerald-200 hover:border-emerald-300", bg: "bg-emerald-50 hover:bg-emerald-100", text: "text-emerald-700", sub: "text-emerald-500" },
  easy: { border: "border-indigo-200 hover:border-indigo-300", bg: "bg-indigo-50 hover:bg-indigo-100", text: "text-indigo-700", sub: "text-indigo-500" },
};

function EvidenceDrawer({
  card,
  transcript,
  onClose,
}: {
  card: Card;
  transcript: string;
  onClose: () => void;
}) {
  const beforeQuote = transcript.slice(0, card.evidenceSpan?.startChar || 0);
  const quote = transcript.slice(card.evidenceSpan?.startChar || 0, card.evidenceSpan?.endChar || 100);
  const afterQuote = transcript.slice(card.evidenceSpan?.endChar || 100, (card.evidenceSpan?.endChar || 100) + 400);

  return (
    <motion.div
      initial={{ x: "100%", opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: "100%", opacity: 0 }}
      transition={{ type: "spring", damping: 25 }}
      className="fixed top-0 right-0 h-full w-full sm:w-96 max-w-full bg-white border-l border-slate-200 z-50 flex flex-col shadow-2xl"
    >
      <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Bookmark className="w-5 h-5 text-indigo-600" />
          <span className="text-base font-bold text-slate-900">Source Evidence</span>
        </div>
        <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        <div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Target Card</p>
          <div className="rounded-2xl bg-slate-50 border border-slate-200/80 p-4">
            <p className="text-sm font-bold text-slate-800 mb-1">{card.front}</p>
            <p className="text-xs text-slate-600 leading-relaxed">{card.back}</p>
          </div>
        </div>

        <div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Verbatim Transcript Passage</p>
          <div className="rounded-2xl bg-indigo-50/40 border border-indigo-200/80 p-4 text-xs font-mono leading-relaxed text-slate-700">
            <span className="text-slate-400">...{beforeQuote.slice(-70)}</span>
            <span className="bg-indigo-200/70 text-indigo-900 font-semibold rounded px-1.5 py-0.5 mx-1 border border-indigo-300">
              {quote}
            </span>
            <span className="text-slate-400">{afterQuote.slice(0, 70)}...</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="text-xs font-semibold px-3 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200/60 capitalize">
            {card.type?.replace("_", " ")}
          </span>
          <span className="text-xs font-semibold px-3 py-1 rounded-lg bg-purple-50 text-purple-700 border border-purple-200/60 capitalize">
            {card.bloomLevel}
          </span>
          <span className="text-xs font-semibold px-3 py-1 rounded-lg bg-slate-100 text-slate-600">
            Difficulty {card.difficulty}/5
          </span>
        </div>
      </div>
    </motion.div>
  );
}

export default function StudyPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-slate-400">
          <Brain className="w-10 h-10 text-indigo-500 animate-pulse" />
          <p className="text-sm font-medium">Loading active study queue...</p>
        </div>
      }
    >
      <StudyContent />
    </Suspense>
  );
}

function StudyContent() {
  const searchParams = useSearchParams();
  const lectureParam = searchParams.get("lecture");

  const [availableLectures, setAvailableLectures] = useState<LectureSummary[]>([]);
  const [selectedLectureId, setSelectedLectureId] = useState<string | null>(lectureParam);
  const [lecture, setLecture] = useState<DemoLectureData | null>(null);
  const [queue, setQueue] = useState<Card[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [intervals, setIntervals] = useState<Record<string, { label: string }>>({});
  const [reviewedCount, setReviewedCount] = useState(0);
  const [sessionDone, setSessionDone] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deckSelectorOpen, setDeckSelectorOpen] = useState(false);
  const startTimeRef = useRef<number>(Date.now());

  const populateQueue = useCallback((data: DemoLectureData) => {
    if (!data.cards || data.cards.length === 0) {
      setQueue([]);
      return;
    }
    const now = new Date();
    const due = data.cards.filter(
      (c) => new Date(c.dueDate) <= now || c.fsrsState === "New"
    );
    // If due cards exist, prioritize them; otherwise supply all cards for study/cramming
    const cardsToStudy = due.length > 0 ? sortDueQueue(due) : data.cards;
    setQueue(cardsToStudy as unknown as Card[]);
  }, []);

  const loadLectureData = useCallback(async (id: string) => {
    setLoading(true);
    setSessionDone(false);
    setCurrentIndex(0);
    setReviewedCount(0);

    let foundData: DemoLectureData | null = null;

    // 1. Check localStorage first for instant response
    try {
      const cached = localStorage.getItem(`lecture_${id}`);
      if (cached) {
        const parsed: DemoLectureData = JSON.parse(cached);
        if (parsed && parsed.id === id && Array.isArray(parsed.cards) && parsed.cards.length > 0) {
          foundData = parsed;
          setLecture(parsed);
          populateQueue(parsed);
          setLoading(false);
        }
      }
    } catch {}

    // 2. Fetch from server API
    try {
      const res = await fetch(`/api/lectures/${encodeURIComponent(id)}`);
      if (res.ok) {
        const serverData: DemoLectureData = await res.json();
        foundData = serverData;
        setLecture(serverData);
        populateQueue(serverData);
        try {
          localStorage.setItem(`lecture_${id}`, JSON.stringify(serverData));
        } catch {}
      } else if (!foundData) {
        // If specific ID 404'd, check if any other cached lecture exists
        try {
          const rawList = localStorage.getItem("local_lectures_list");
          if (rawList) {
            const list: LectureSummary[] = JSON.parse(rawList);
            const fallback = list.find((l) => l.id !== id);
            if (fallback) {
              const fallbackCached = localStorage.getItem(`lecture_${fallback.id}`);
              if (fallbackCached) {
                const parsed = JSON.parse(fallbackCached);
                setLecture(parsed);
                populateQueue(parsed);
                setSelectedLectureId(fallback.id);
              }
            }
          }
        } catch {}
      }
    } catch (err) {
      console.warn("[study] Failed to fetch lecture data:", err);
    } finally {
      setLoading(false);
    }
  }, [populateQueue]);

  // Initial load of lectures & deck selection
  useEffect(() => {
    let isCancelled = false;

    async function init() {
      let localList: LectureSummary[] = [];
      try {
        const raw = localStorage.getItem("local_lectures_list");
        if (raw) localList = JSON.parse(raw);
      } catch {}

      let serverList: LectureSummary[] = [];
      try {
        const res = await fetch("/api/lectures");
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) serverList = data;
        }
      } catch {}

      // Merge server + local lectures, newest first
      const merged: LectureSummary[] = [...serverList];
      for (const loc of localList) {
        if (!merged.some((m) => m.id === loc.id)) {
          merged.push(loc);
        }
      }

      if (isCancelled) return;
      setAvailableLectures(merged);

      // Select target lecture:
      // Priority: 1) query param, 2) first uploaded lecture (newest upload), 3) sample demo
      let targetId = lectureParam;
      if (!targetId && merged.length > 0) {
        targetId = merged[0].id;
      }
      if (!targetId) {
        targetId = "d9e8f7a6-b5c4-4d3e-2f1a-0b9c8d7e6f5a";
      }

      setSelectedLectureId(targetId);
      await loadLectureData(targetId);
    }

    init();

    return () => {
      isCancelled = true;
    };
  }, [lectureParam, loadLectureData]);

  const handleSelectDeck = (deckId: string) => {
    setSelectedLectureId(deckId);
    setDeckSelectorOpen(false);
    loadLectureData(deckId);
  };

  const currentCard = queue[currentIndex];

  useEffect(() => {
    if (!currentCard) return;
    const state: CardState = {
      state: currentCard.fsrsState,
      dueDate: currentCard.dueDate,
      stability: currentCard.stability,
      difficulty: currentCard.fsrsDifficulty,
      elapsedDays: currentCard.elapsedDays,
      scheduledDays: currentCard.scheduledDays,
      reps: currentCard.reps,
      lapses: currentCard.lapses,
      lastReview: null,
    };
    const previews = previewNextIntervals(state);
    setIntervals(previews);
    setFlipped(false);
    startTimeRef.current = Date.now();
  }, [currentCard]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (editModalOpen) return;
      if (evidenceOpen) {
        if (e.key === "Escape") setEvidenceOpen(false);
        return;
      }
      if (e.key === " " || e.key === "Enter") { e.preventDefault(); setFlipped((f) => !f); }
      if (e.key === "s" || e.key === "S") setEvidenceOpen((o) => !o);
      if (e.key === "e" || e.key === "E") setEditModalOpen(true);
      if (flipped) {
        if (e.key === "1") submitRating("again");
        if (e.key === "2") submitRating("hard");
        if (e.key === "3") submitRating("good");
        if (e.key === "4") submitRating("easy");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [flipped, evidenceOpen, editModalOpen, currentCard]);

  const submitRating = useCallback(async (rating: RatingKey) => {
    if (!currentCard || !lecture) return;
    const duration = Date.now() - startTimeRef.current;
    const targetLectureId = lecture.id;
    const cardId = currentCard.id;

    try {
      await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lectureId: targetLectureId,
          cardId,
          rating,
          reviewDurationMs: duration,
        }),
      });
    } catch {}

    // Update local cache
    try {
      const cached = localStorage.getItem(`lecture_${targetLectureId}`);
      if (cached) {
        const parsed: DemoLectureData = JSON.parse(cached);
        const cardIdx = parsed.cards.findIndex((c) => c.id === cardId);
        if (cardIdx !== -1) {
          parsed.cards[cardIdx].reps = (parsed.cards[cardIdx].reps || 0) + 1;
          localStorage.setItem(`lecture_${targetLectureId}`, JSON.stringify(parsed));
        }
      }
    } catch {}

    setReviewedCount((r) => r + 1);
    if (currentIndex + 1 >= queue.length) {
      setSessionDone(true);
    } else {
      setCurrentIndex((i) => i + 1);
    }
  }, [currentCard, lecture, currentIndex, queue.length]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3 animate-pulse shadow-sm">
            <Brain className="w-7 h-7" />
          </div>
          <p className="text-slate-700 text-sm font-semibold">Preparing your active recall deck...</p>
          <p className="text-slate-400 text-xs mt-1">Applying FSRS v5 spaced repetition schedule</p>
        </div>
      </div>
    );
  }

  // State A: User has zero lectures uploaded yet
  if (availableLectures.length === 0 && !lecture) {
    return (
      <div className="flex items-center justify-center min-h-[70vh] px-6 py-12">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-3xl p-8 sm:p-12 shadow-soft border border-slate-100 text-center max-w-md w-full"
        >
          <div className="w-20 h-20 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-5 shadow-sm">
            <Layers className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-2">
            No Flashcards Yet
          </h2>
          <p className="text-slate-500 text-sm mb-6 leading-relaxed">
            Upload a document, lecture recording, or pasted notes to instantly generate active recall flashcards with source verification.
          </p>
          <div className="flex justify-center">
            <Link
              href="/upload"
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-sm font-bold shadow-md shadow-indigo-500/20 hover:shadow-lg transition-all inline-flex items-center gap-2"
            >
              <Upload className="w-4 h-4" /> Upload Material
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  // State B: Session finished or all cards caught up
  if (sessionDone || queue.length === 0) {
    const hasCardsInDeck = Boolean(lecture?.cards && lecture.cards.length > 0);

    return (
      <div className="flex items-center justify-center min-h-[70vh] px-6 py-12">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-3xl p-8 sm:p-12 shadow-soft border border-slate-100 text-center max-w-md w-full"
        >
          <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-5 shadow-sm">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-2">
            {reviewedCount > 0 ? "Session Completed! 🎉" : "All Caught Up! 🎉"}
          </h2>
          <p className="text-slate-500 text-sm mb-6 leading-relaxed">
            {reviewedCount > 0
              ? `You reviewed ${reviewedCount} card${reviewedCount > 1 ? "s" : ""}. Next reviews scheduled by FSRS v5.`
              : hasCardsInDeck
              ? `All ${lecture!.cards.length} cards in this deck are scheduled for future review. You can study ahead now in Cram Mode.`
              : "No cards found in this deck."}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {hasCardsInDeck && (
              <button
                onClick={() => {
                  setQueue(lecture!.cards as unknown as Card[]);
                  setCurrentIndex(0);
                  setReviewedCount(0);
                  setSessionDone(false);
                }}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-sm font-semibold shadow-sm transition-all inline-flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" /> Study All {lecture!.cards.length} Cards
              </button>
            )}
            <Link
              href="/dashboard"
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors inline-flex items-center justify-center"
            >
              Back to Dashboard
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  const progress = ((currentIndex + 1) / Math.max(queue.length, 1)) * 100;

  return (
    <div className="flex flex-col items-center justify-center min-h-full px-4 sm:px-6 py-8 sm:py-10 relative">
      <AnimatePresence>
        {evidenceOpen && lecture && currentCard && (
          <EvidenceDrawer
            card={currentCard}
            transcript={lecture.cleanTranscript}
            onClose={() => setEvidenceOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Deck Selector & Actions Bar */}
      <div className="w-full max-w-xl mb-4 flex items-center justify-between gap-3">
        {/* Deck Dropdown */}
        <div className="relative">
          <button
            onClick={() => setDeckSelectorOpen((o) => !o)}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-slate-200/90 text-xs font-bold text-slate-700 hover:border-indigo-300 hover:bg-slate-50/80 shadow-xs transition-all max-w-[240px] sm:max-w-xs truncate"
          >
            <BookOpen className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <span className="truncate">{lecture?.title || "Current Lecture Deck"}</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-0.5" />
          </button>

          {deckSelectorOpen && availableLectures.length > 0 && (
            <div className="absolute left-0 top-full mt-2 w-72 sm:w-80 bg-white rounded-2xl border border-slate-200 shadow-xl z-30 p-2 max-h-72 overflow-y-auto">
              <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 flex items-center justify-between">
                <span>Select Lecture Deck</span>
                <span className="text-[10px] lowercase text-slate-400 font-normal">{availableLectures.length} total</span>
              </div>
              <div className="py-1">
                {availableLectures.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleSelectDeck(item.id)}
                    className={cn(
                      "w-full text-left px-3 py-2.5 rounded-xl text-xs flex items-center justify-between transition-colors",
                      item.id === selectedLectureId
                        ? "bg-indigo-50 text-indigo-700 font-bold"
                        : "text-slate-700 hover:bg-slate-50"
                    )}
                  >
                    <span className="truncate pr-2">{item.title}</span>
                    <span className="shrink-0 text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold">
                      {item.cardCount} cards
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <Link
          href="/upload"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors shrink-0"
        >
          <Plus className="w-3.5 h-3.5" /> Upload More
        </Link>
      </div>

      {/* Progress & Header */}
      <div className="w-full max-w-xl mb-6">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-2.5">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/60 font-bold">
              Card {currentIndex + 1} of {queue.length}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setEditModalOpen(true)}
              className="flex items-center gap-1 text-slate-500 hover:text-slate-900 transition-colors"
            >
              <Edit3 className="w-3.5 h-3.5" /> Edit
            </button>
            <button
              onClick={() => setEvidenceOpen((o) => !o)}
              className="flex items-center gap-1 text-indigo-600 hover:text-indigo-800 transition-colors"
            >
              <Bookmark className="w-3.5 h-3.5" /> Source Proof (S)
            </button>
          </div>
        </div>

        <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
          <motion.div
            className="h-2 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Card Editor Modal */}
      {lecture && (
        <CardEditorModal
          isOpen={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          card={currentCard}
          lectureId={lecture.id}
          onSaved={(updated) => {
            setQueue((prev) =>
              prev.map((c) => (c.id === updated.id ? { ...c, ...updated } : c))
            );
          }}
          onDeleted={(cardId) => {
            setQueue((prev) => prev.filter((c) => c.id !== cardId));
          }}
        />
      )}

      {/* Flashcard 3D Flip Container */}
      <div className="w-full max-w-xl perspective-1000 mb-6" style={{ perspective: "1000px" }}>
        <motion.div
          className="relative w-full cursor-pointer select-none"
          style={{ transformStyle: "preserve-3d" }}
          animate={{ rotateY: flipped ? 180 : 0 }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.2}
          onDragEnd={(_e, info) => {
            if (flipped) {
              if (info.offset.x > 80) submitRating("good");
              else if (info.offset.x < -80) submitRating("again");
            }
          }}
          transition={{ duration: 0.45, type: "spring", stiffness: 140, damping: 18 }}
          onClick={() => setFlipped((f) => !f)}
        >
          {/* Front of Card */}
          <div
            className="w-full rounded-3xl border border-slate-200 bg-white p-5 sm:p-8 min-h-[220px] sm:min-h-[260px] flex flex-col justify-between shadow-soft hover:shadow-card-hover transition-shadow"
            style={{ backfaceVisibility: "hidden" }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200/60 capitalize">
                  {currentCard?.type?.replace("_", " ")}
                </span>
                <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-purple-50 text-purple-700 border border-purple-200/60 capitalize">
                  {currentCard?.bloomLevel}
                </span>
              </div>
              <span className="text-xs text-slate-400 font-medium">Click to flip ↷</span>
            </div>

            <p className="text-lg sm:text-2xl font-bold text-slate-900 leading-snug my-auto">
              {currentCard?.front}
            </p>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
              <span>Space / Tap to reveal</span>
              <span>Evidence verified ✓</span>
            </div>
          </div>

          {/* Back of Card */}
          <div
            className="absolute inset-0 rounded-3xl border-2 border-indigo-500/40 bg-white p-5 sm:p-8 min-h-[220px] sm:min-h-[260px] flex flex-col justify-between shadow-soft"
            style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
          >
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider">Answer</span>
              </div>
              <p className="text-sm sm:text-lg font-semibold text-slate-800 leading-relaxed">
                {currentCard?.back}
              </p>
            </div>

            {currentCard?.evidenceQuote && (
              <div className="mt-4 pt-3 border-t border-slate-100">
                <p className="text-xs text-slate-500 italic line-clamp-2">
                  Source: "{currentCard.evidenceQuote}"
                </p>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* FSRS Rating Buttons */}
      <AnimatePresence>
        {flipped && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="grid grid-cols-4 gap-1.5 sm:gap-3 w-full max-w-xl"
          >
            {(["again", "hard", "good", "easy"] as RatingKey[]).map((rating, i) => {
              const style = RATING_STYLES[rating];
              return (
                <button
                  key={rating}
                  onClick={() => submitRating(rating)}
                  className={cn(
                    "flex flex-col items-center gap-0.5 py-2.5 sm:py-3 px-1 sm:px-2 rounded-2xl border shadow-xs transition-all",
                    style.border,
                    style.bg
                  )}
                >
                  <span className={cn("text-[11px] sm:text-xs font-extrabold capitalize", style.text)}>
                    {rating}
                  </span>
                  <span className={cn("text-[10px] sm:text-[11px] font-bold", style.sub)}>
                    {intervals[rating]?.label || "–"}
                  </span>
                  <span className="text-[9px] sm:text-[10px] text-slate-400 font-mono mt-0.5">[{i + 1}]</span>
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {!flipped && (
        <button
          onClick={() => setFlipped(true)}
          className="flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-sm font-bold shadow-md shadow-indigo-500/20 hover:shadow-lg transition-all"
        >
          Show Answer <ChevronRight className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
