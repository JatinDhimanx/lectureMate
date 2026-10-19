"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  Sparkles,
  ArrowRight,
  Play,
  Check,
  FileText,
  Layers,
  HelpCircle,
  BarChart2,
  MessageSquare,
  Upload,
  Video,
  ChevronRight,
  ChevronLeft,
  X,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Zap,
  RotateCw,
  Send,
  Star,
  Flame,
  BrainCircuit,
  GraduationCap
} from "lucide-react";

export default function LandingPage() {
  const router = useRouter();

  // Interactive Hero & Playground State
  const [activeUploadTab, setActiveUploadTab] = useState<"file" | "youtube" | "paste">("file");
  const [askInput, setAskInput] = useState("");
  const [askAnswer, setAskAnswer] = useState<string | null>(null);
  const [flashcardFlipped, setFlashcardFlipped] = useState(false);
  const [flashcardIndex, setFlashcardIndex] = useState(0);
  const [quizAnswer, setQuizAnswer] = useState<number | null>(null);
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [watchDemoOpen, setWatchDemoOpen] = useState(false);

  // Playground interactive flashcards
  const sampleCards = [
    {
      q: "What is a Database?",
      a: "An organized collection of structured data or information stored electronically in a computer system, usually controlled by a DBMS.",
      difficulty: "Good · 4d",
      category: "CS 101"
    },
    {
      q: "What does the CAP Theorem state?",
      a: "A distributed system can guarantee at most two of three properties: Consistency, Availability, and Partition Tolerance.",
      difficulty: "Easy · 12d",
      category: "Systems"
    },
    {
      q: "What is Spaced Repetition (FSRS)?",
      a: "A mathematical memory algorithm that schedules reviews right before you forget, maximizing long-term retention with minimal study time.",
      difficulty: "Hard · 1d",
      category: "Cognitive Science"
    }
  ];

  // Handle Question Answering simulation
  const handleAskQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!askInput.trim()) return;
    setAskAnswer(`Based on the lecture text: "${askInput}" is directly covered in Section 3.2. Key takeaway: Modern storage engines balance write amplification through LSM-trees and WAL logging.`);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] selection:bg-indigo-500/20 selection:text-indigo-900 font-sans relative overflow-x-hidden">
      {/* Background Ambient Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[600px] pointer-events-none -z-10 overflow-hidden">
        <div className="absolute -top-40 -left-20 w-[550px] h-[550px] bg-purple-200/40 rounded-full blur-3xl" />
        <div className="absolute top-10 right-0 w-[500px] h-[500px] bg-blue-200/35 rounded-full blur-3xl" />
        <div className="absolute top-80 left-1/3 w-[450px] h-[450px] bg-indigo-100/50 rounded-full blur-3xl" />
      </div>

      {/* ─────────────────────────────────────────────────────────────
          NAVBAR
      ───────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          {/* Logo matching screenshot */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 flex items-center justify-center shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-xl tracking-tight text-[#0F172A] leading-none">
                LectureMate
              </span>
              <span className="text-[11px] font-medium text-slate-500 tracking-wide mt-1">
                From Lectures to Learning
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <Link href="#home" className="text-indigo-600 font-semibold transition-colors">
              Home
            </Link>
            <Link href="#features" className="hover:text-indigo-600 transition-colors">
              Features
            </Link>
            <Link href="#how-it-works" className="hover:text-indigo-600 transition-colors">
              How it Works
            </Link>
            <Link href="#demo" className="hover:text-indigo-600 transition-colors">
              About
            </Link>
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="hidden sm:inline-flex px-5 py-2.5 rounded-xl border border-slate-200 hover:border-slate-300 text-slate-700 font-medium text-sm transition-all hover:bg-slate-50"
            >
              Sign In
            </Link>
            <Link
              href="/upload"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-medium text-sm shadow-md shadow-indigo-500/25 transition-all hover:shadow-lg hover:shadow-indigo-500/35 hover:-translate-y-0.5 active:translate-y-0"
            >
              Get Started
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* ─────────────────────────────────────────────────────────────
          HERO SECTION
      ───────────────────────────────────────────────────────────── */}
      <section id="home" className="pt-10 pb-20 px-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* Left Column: Headlines & CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="lg:col-span-5 flex flex-col items-start"
          >
            {/* Pill Tag from Screenshot */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-50/90 border border-purple-200/80 text-purple-700 text-xs font-semibold mb-6 shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-purple-600" />
              <span>Transform Your Lectures with AI</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-[54px] font-extrabold text-[#0F172A] tracking-tight leading-[1.15] mb-5">
              Turn Lectures into{" "}
              <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 bg-clip-text text-transparent">
                Flashcards, Quizzes
              </span>{" "}
              & More
            </h1>

            {/* Description Paragraph */}
            <p className="text-slate-600 text-base sm:text-lg leading-relaxed mb-8 max-w-xl">
              Upload a transcript, PDF, DOCX or YouTube lecture and let AI create concise summaries, flashcards, quizzes and answers from your lecture content — in seconds.
            </p>

            {/* Buttons */}
            <div className="flex flex-wrap items-center gap-4 mb-8">
              <Link
                href="/upload"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold text-base shadow-lg shadow-indigo-500/25 transition-all hover:shadow-xl hover:shadow-indigo-500/35 hover:-translate-y-0.5 active:translate-y-0"
              >
                Get Started for Free
                <ArrowRight className="w-4 h-4" />
              </Link>

              <button
                onClick={() => setWatchDemoOpen(true)}
                className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 font-semibold text-base shadow-sm transition-all hover:border-slate-300 hover:shadow"
              >
                <div className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center">
                  <Play className="w-3 h-3 fill-current ml-0.5" />
                </div>
                Watch Demo
              </button>
            </div>

            {/* Checkmark Features Row */}
            <div className="flex flex-wrap items-center gap-6 text-xs sm:text-sm font-medium text-slate-700">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </div>
                <span>Supports PDF, DOCX, YouTube</span>
              </div>

              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </div>
                <span>AI-Powered</span>
              </div>

              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </div>
                <span>Free to Use</span>
              </div>
            </div>
          </motion.div>

          {/* Right Column: Hero Visual Graphic with Floating Cards matching screenshot */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.15 }}
            className="lg:col-span-7 relative"
          >
            {/* Playful Handwritten Annotation & Arrow */}
            <div className="absolute -left-12 -bottom-10 z-30 hidden sm:flex flex-col items-center pointer-events-none">
              <svg
                width="70"
                height="60"
                viewBox="0 0 100 80"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="text-indigo-600 -rotate-12"
              >
                <path
                  d="M15 65 C 30 10, 60 15, 80 40 M 80 40 L 65 35 M 80 40 L 70 52"
                  stroke="currentColor"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <div className="bg-indigo-50/95 border border-indigo-200/80 rounded-2xl px-3.5 py-2 shadow-md shadow-indigo-500/10 -rotate-3 text-center">
                <p className="text-xs font-bold text-indigo-700 tracking-tight leading-tight">
                  One Lecture
                </p>
                <p className="text-[11px] font-semibold text-purple-600">
                  Multiple Study Tools
                </p>
                <p className="text-[10px] font-medium text-slate-500 italic">
                  Smarter Learning!
                </p>
              </div>
            </div>

            {/* Sparkle accents around the mockup */}
            <div className="absolute -top-4 left-1/4 text-indigo-500 animate-pulse pointer-events-none">
              <Sparkles className="w-6 h-6" />
            </div>
            <div className="absolute top-2 right-12 text-purple-400 animate-bounce pointer-events-none">
              <Sparkles className="w-5 h-5" />
            </div>

            {/* Main Mockup Canvas Container */}
            <div className="relative z-10 bg-white/95 rounded-[32px] p-4 sm:p-6 shadow-2xl border border-slate-100 backdrop-blur-sm">
              {/* App Mockup Header */}
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-indigo-600 flex items-center justify-center">
                    <BookOpen className="w-3.5 h-3.5 text-white" />
                  </div>
                  <span className="font-bold text-sm text-slate-900">LectureMate</span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
                    <span className="text-xs">🔔</span>
                  </div>
                  <div className="w-7 h-7 rounded-full bg-slate-700 text-white flex items-center justify-center text-xs font-bold">
                    N
                  </div>
                </div>
              </div>

              {/* Grid: Mini Sidebar + Upload Area */}
              <div className="grid grid-cols-12 gap-4">
                {/* Mini Sidebar */}
                <div className="col-span-3 hidden sm:flex flex-col gap-1 pr-2 border-r border-slate-100 text-xs font-medium text-slate-600">
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-indigo-50 text-indigo-600 font-semibold">
                    <span className="w-2 h-2 rounded-full bg-indigo-600" />
                    Home
                  </div>
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-slate-50 text-slate-600">
                    <Upload className="w-3.5 h-3.5" />
                    Upload
                  </div>
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-slate-50 text-slate-600">
                    <FileText className="w-3.5 h-3.5" />
                    Summary
                  </div>
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-slate-50 text-slate-600">
                    <Layers className="w-3.5 h-3.5" />
                    Flashcards
                  </div>
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-slate-50 text-slate-600">
                    <HelpCircle className="w-3.5 h-3.5" />
                    Quiz
                  </div>
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-slate-50 text-slate-600">
                    <MessageSquare className="w-3.5 h-3.5" />
                    Ask Lecture
                  </div>
                </div>

                {/* Main Upload Box inside Mockup */}
                <div className="col-span-12 sm:col-span-9 flex flex-col">
                  <div className="mb-3">
                    <h3 className="font-bold text-slate-900 text-base">
                      Upload Your Lecture Material
                    </h3>
                    <p className="text-xs text-slate-500">
                      Supports PDF, DOCX, TXT or YouTube links
                    </p>
                  </div>

                  {/* Tabs */}
                  <div className="flex items-center gap-2 p-1 bg-slate-100/80 rounded-xl mb-4 text-xs font-medium">
                    <button
                      onClick={() => setActiveUploadTab("file")}
                      className={`flex-1 py-1.5 rounded-lg transition-all ${
                        activeUploadTab === "file"
                          ? "bg-white text-indigo-600 shadow-sm font-semibold"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      Upload File
                    </button>
                    <button
                      onClick={() => setActiveUploadTab("youtube")}
                      className={`flex-1 py-1.5 rounded-lg transition-all ${
                        activeUploadTab === "youtube"
                          ? "bg-white text-indigo-600 shadow-sm font-semibold"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      YouTube Link
                    </button>
                    <button
                      onClick={() => setActiveUploadTab("paste")}
                      className={`flex-1 py-1.5 rounded-lg transition-all ${
                        activeUploadTab === "paste"
                          ? "bg-white text-indigo-600 shadow-sm font-semibold"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      Paste Text
                    </button>
                  </div>

                  {/* Dropzone Container */}
                  <div className="border-2 border-dashed border-indigo-200/90 hover:border-indigo-400 bg-indigo-50/20 rounded-2xl p-6 flex flex-col items-center justify-center text-center transition-all group cursor-pointer">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                      <Upload className="w-6 h-6" />
                    </div>
                    <p className="text-xs font-semibold text-slate-800 mb-1">
                      Drag & drop your file here
                    </p>
                    <p className="text-[11px] text-slate-500 mb-3">
                      Supports PDF, DOCX, TXT (Max 50MB)
                    </p>
                    <Link
                      href="/upload"
                      className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition-all"
                    >
                      Choose File
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* ─────────────────────────────────────────────────────────────
                FLOATING SIDE CARDS CASCADING ON THE RIGHT (from screenshot)
            ───────────────────────────────────────────────────────────── */}
            {/* 1. AI Summary Floating Card */}
            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -top-8 -right-4 sm:-right-8 w-56 sm:w-64 bg-white/95 rounded-2xl p-3.5 shadow-xl border border-rose-100 backdrop-blur-md z-20 pointer-events-auto"
            >
              <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-rose-50">
                <div className="w-6 h-6 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center">
                  <FileText className="w-3.5 h-3.5" />
                </div>
                <span className="font-bold text-xs text-rose-700">AI Summary</span>
              </div>
              <div className="space-y-1.5">
                <div className="h-2 bg-slate-200/80 rounded-full w-full" />
                <div className="h-2 bg-slate-200/80 rounded-full w-5/6" />
                <div className="h-2 bg-slate-200/60 rounded-full w-3/4" />
              </div>
            </motion.div>

            {/* 2. Flashcards Floating Card (Interactive 3D Flip) */}
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
              className="absolute top-28 -right-6 sm:-right-10 w-60 sm:w-72 bg-white/95 rounded-2xl p-4 shadow-xl border border-emerald-100 backdrop-blur-md z-20 cursor-pointer"
              onClick={() => setFlashcardFlipped(!flashcardFlipped)}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
                    <Layers className="w-3.5 h-3.5" />
                  </div>
                  <span className="font-bold text-xs text-emerald-700">Flashcards</span>
                </div>
                <span className="text-[10px] font-semibold text-slate-400">
                  {flashcardIndex + 1}/{sampleCards.length}
                </span>
              </div>

              <div className="bg-emerald-50/40 rounded-xl p-3 border border-emerald-100/60 min-h-[64px] flex flex-col justify-center">
                <p className="text-xs font-semibold text-slate-800">
                  {flashcardFlipped
                    ? sampleCards[flashcardIndex].a
                    : sampleCards[flashcardIndex].q}
                </p>
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-[10px] text-emerald-600 font-medium">
                    {flashcardFlipped ? "✓ Answer verified" : "Click to flip card"}
                  </span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 font-bold">
                    {sampleCards[flashcardIndex].difficulty}
                  </span>
                </div>
              </div>

              {/* Navigation pagination */}
              <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-100 text-slate-400">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFlashcardIndex((prev) => (prev > 0 ? prev - 1 : sampleCards.length - 1));
                    setFlashcardFlipped(false);
                  }}
                  className="hover:text-slate-700 p-0.5"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="text-[10px] text-slate-500">&lt; {flashcardIndex + 1}/10 &gt;</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFlashcardIndex((prev) => (prev < sampleCards.length - 1 ? prev + 1 : 0));
                    setFlashcardFlipped(false);
                  }}
                  className="hover:text-slate-700 p-0.5"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>

            {/* 3. Quiz Floating Card */}
            <motion.div
              animate={{ y: [0, -7, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1.2 }}
              className="absolute -bottom-10 right-4 sm:right-6 w-60 sm:w-72 bg-white/95 rounded-2xl p-4 shadow-xl border border-amber-100 backdrop-blur-md z-20"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center">
                    <HelpCircle className="w-3.5 h-3.5" />
                  </div>
                  <span className="font-bold text-xs text-amber-700">Quiz</span>
                </div>
                <span className="text-[10px] text-amber-600 font-semibold">Q1</span>
              </div>

              <p className="text-[11px] font-semibold text-slate-800 mb-2">
                Which property ensures every read receives the most recent write?
              </p>

              <div className="space-y-1.5 mb-2.5">
                {[
                  { id: 0, text: "Consistency" },
                  { id: 1, text: "Availability" }
                ].map((option) => (
                  <button
                    key={option.id}
                    onClick={() => {
                      setQuizAnswer(option.id);
                      setQuizSubmitted(false);
                    }}
                    className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-[11px] border transition-all ${
                      quizAnswer === option.id
                        ? "bg-indigo-50 border-indigo-400 text-indigo-900 font-medium"
                        : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <div
                      className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                        quizAnswer === option.id
                          ? "border-indigo-600 bg-indigo-600"
                          : "border-slate-300"
                      }`}
                    >
                      {quizAnswer === option.id && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                    <span>{option.text}</span>
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between">
                {quizSubmitted ? (
                  <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                    <Check className="w-3 h-3 stroke-[3]" /> Correct!
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-400">Select answer</span>
                )}
                <button
                  onClick={() => setQuizSubmitted(true)}
                  className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-semibold transition-all shadow-sm"
                >
                  Submit
                </button>
              </div>
            </motion.div>

            {/* 4. Ask the Lecture Floating Bar */}
            <motion.div
              animate={{ y: [0, 6, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
              className="absolute -bottom-16 left-6 sm:left-14 w-64 sm:w-80 bg-white/95 rounded-2xl p-3 shadow-xl border border-sky-100 backdrop-blur-md z-30"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-5 h-5 rounded-md bg-sky-100 text-sky-600 flex items-center justify-center">
                  <MessageSquare className="w-3 h-3" />
                </div>
                <span className="font-bold text-xs text-sky-800">Ask the Lecture</span>
              </div>
              <form onSubmit={handleAskQuestion} className="flex items-center gap-1.5">
                <input
                  type="text"
                  placeholder="Type your question..."
                  value={askInput}
                  onChange={(e) => setAskInput(e.target.value)}
                  className="flex-1 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <button
                  type="submit"
                  className="w-8 h-8 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center shadow-sm shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
              {askAnswer && (
                <p className="mt-2 text-[10px] text-slate-600 bg-sky-50 p-2 rounded-lg border border-sky-100 leading-tight">
                  {askAnswer}
                </p>
              )}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          FEATURE CARDS ROW (5 Cards matching screenshot)
      ───────────────────────────────────────────────────────────── */}
      <section id="features" className="py-16 px-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
          {/* 1. Smart Summary */}
          <motion.div
            whileHover={{ y: -6 }}
            className="bg-white rounded-3xl p-6 shadow-soft hover:shadow-card-hover border border-slate-100 transition-all flex flex-col items-center text-center group"
          >
            <div className="w-14 h-14 rounded-2xl bg-purple-50 group-hover:bg-purple-100 text-purple-600 flex items-center justify-center mb-4 transition-colors">
              <FileText className="w-7 h-7" />
            </div>
            <h3 className="font-bold text-slate-900 text-base mb-2">Smart Summary</h3>
            <p className="text-slate-500 text-xs leading-relaxed">
              Get concise and accurate summaries of your lectures.
            </p>
          </motion.div>

          {/* 2. AI Flashcards */}
          <motion.div
            whileHover={{ y: -6 }}
            className="bg-white rounded-3xl p-6 shadow-soft hover:shadow-card-hover border border-slate-100 transition-all flex flex-col items-center text-center group"
          >
            <div className="w-14 h-14 rounded-2xl bg-rose-50 group-hover:bg-rose-100 text-rose-500 flex items-center justify-center mb-4 transition-colors">
              <Layers className="w-7 h-7" />
            </div>
            <h3 className="font-bold text-slate-900 text-base mb-2">AI Flashcards</h3>
            <p className="text-slate-500 text-xs leading-relaxed">
              Generate question-answer based flashcards automatically.
            </p>
          </motion.div>

          {/* 3. Practice Quizzes */}
          <motion.div
            whileHover={{ y: -6 }}
            className="bg-white rounded-3xl p-6 shadow-soft hover:shadow-card-hover border border-slate-100 transition-all flex flex-col items-center text-center group"
          >
            <div className="w-14 h-14 rounded-2xl bg-amber-50 group-hover:bg-amber-100 text-amber-500 flex items-center justify-center mb-4 transition-colors">
              <HelpCircle className="w-7 h-7" />
            </div>
            <h3 className="font-bold text-slate-900 text-base mb-2">Practice Quizzes</h3>
            <p className="text-slate-500 text-xs leading-relaxed">
              Create topic-wise quizzes to test your understanding.
            </p>
          </motion.div>

          {/* 4. Adaptive Learning */}
          <motion.div
            whileHover={{ y: -6 }}
            className="bg-white rounded-3xl p-6 shadow-soft hover:shadow-card-hover border border-slate-100 transition-all flex flex-col items-center text-center group"
          >
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 group-hover:bg-emerald-100 text-emerald-500 flex items-center justify-center mb-4 transition-colors">
              <BarChart2 className="w-7 h-7" />
            </div>
            <h3 className="font-bold text-slate-900 text-base mb-2">Adaptive Learning</h3>
            <p className="text-slate-500 text-xs leading-relaxed">
              Identify weak topics and get targeted practice.
            </p>
          </motion.div>

          {/* 5. Ask the Lecture */}
          <motion.div
            whileHover={{ y: -6 }}
            className="bg-white rounded-3xl p-6 shadow-soft hover:shadow-card-hover border border-slate-100 transition-all flex flex-col items-center text-center group"
          >
            <div className="w-14 h-14 rounded-2xl bg-sky-50 group-hover:bg-sky-100 text-sky-500 flex items-center justify-center mb-4 transition-colors">
              <MessageSquare className="w-7 h-7" />
            </div>
            <h3 className="font-bold text-slate-900 text-base mb-2">Ask the Lecture</h3>
            <p className="text-slate-500 text-xs leading-relaxed">
              Ask questions and get answers from your lecture content.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          HOW IT WORKS SECTION (4 Simple Steps matching screenshot)
      ───────────────────────────────────────────────────────────── */}
      <section id="how-it-works" className="py-20 px-6 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <div className="inline-block px-4 py-1.5 rounded-full bg-purple-50 border border-purple-200/80 text-purple-700 text-xs font-semibold uppercase tracking-wider mb-4">
            HOW IT WORKS
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0F172A] tracking-tight mb-3">
            From Lecture to Learning in 4 Simple Steps
          </h2>
          <p className="text-slate-500 text-sm sm:text-base max-w-2xl mx-auto">
            Upload your content, let AI process it, and get personalized study materials instantly.
          </p>
        </div>

        {/* 4 Steps Container */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative">
          {/* Step 1 */}
          <div className="flex flex-col items-center text-center relative group">
            <div className="w-14 h-14 rounded-full bg-indigo-600 text-white font-bold text-lg flex items-center justify-center shadow-lg shadow-indigo-500/25 mb-4 group-hover:scale-110 transition-transform">
              1
            </div>
            <h4 className="font-bold text-slate-900 text-base mb-1">Upload</h4>
            <p className="text-xs text-slate-500 leading-relaxed max-w-[220px]">
              Provide your lecture content (PDF, DOCX, TXT or YouTube link).
            </p>

            {/* Connecting Arrow for Desktop */}
            <div className="hidden md:block absolute top-7 -right-4 text-slate-300">
              <ChevronRight className="w-6 h-6" />
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex flex-col items-center text-center relative group">
            <div className="w-14 h-14 rounded-full bg-blue-600 text-white font-bold text-lg flex items-center justify-center shadow-lg shadow-blue-500/25 mb-4 group-hover:scale-110 transition-transform">
              2
            </div>
            <h4 className="font-bold text-slate-900 text-base mb-1">Process</h4>
            <p className="text-xs text-slate-500 leading-relaxed max-w-[220px]">
              AI extracts and analyzes the lecture content.
            </p>

            {/* Connecting Arrow for Desktop */}
            <div className="hidden md:block absolute top-7 -right-4 text-slate-300">
              <ChevronRight className="w-6 h-6" />
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex flex-col items-center text-center relative group">
            <div className="w-14 h-14 rounded-full bg-emerald-600 text-white font-bold text-lg flex items-center justify-center shadow-lg shadow-emerald-500/25 mb-4 group-hover:scale-110 transition-transform">
              3
            </div>
            <h4 className="font-bold text-slate-900 text-base mb-1">Generate</h4>
            <p className="text-xs text-slate-500 leading-relaxed max-w-[220px]">
              Get summaries, flashcards, quizzes and answers.
            </p>

            {/* Connecting Arrow for Desktop */}
            <div className="hidden md:block absolute top-7 -right-4 text-slate-300">
              <ChevronRight className="w-6 h-6" />
            </div>
          </div>

          {/* Step 4 */}
          <div className="flex flex-col items-center text-center group">
            <div className="w-14 h-14 rounded-full bg-purple-600 text-white font-bold text-lg flex items-center justify-center shadow-lg shadow-purple-500/25 mb-4 group-hover:scale-110 transition-transform">
              4
            </div>
            <h4 className="font-bold text-slate-900 text-base mb-1">Learn</h4>
            <p className="text-xs text-slate-500 leading-relaxed max-w-[220px]">
              Practice, track performance and get targeted revision.
            </p>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          INTERACTIVE LIVE DEMO & STUDY HUB
      ───────────────────────────────────────────────────────────── */}
      <section id="demo" className="py-20 px-6 max-w-7xl mx-auto">
        <div className="bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-900 rounded-[36px] p-8 sm:p-14 text-white relative overflow-hidden shadow-2xl">
          {/* Background Ambient Stars */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-3xl mx-auto text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold mb-4">
              <Zap className="w-3.5 h-3.5 text-indigo-400" />
              <span>Free Spaced Repetition (FSRS v5) Algorithm</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-4">
              Ready to Turn Any Lecture into High-Yield Mastery?
            </h2>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
              Never get overwhelmed by 2-hour recordings or 80-page slide decks again. LectureMate automatically extracts key principles, verifies transcript grounding, and schedules reviews right before you forget.
            </p>
          </div>

          {/* Interactive Feature Highlights inside Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur text-left">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center mb-4">
                <BrainCircuit className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-white text-base mb-1">Verifiable Evidence</h4>
              <p className="text-xs text-slate-300">
                Every generated flashcard links to exact timestamps in your lecture recording.
              </p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur text-left">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center mb-4">
                <Flame className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-white text-base mb-1">Adaptive Quizzes</h4>
              <p className="text-xs text-slate-300">
                Diagnostic multiple-choice questions with misconception explanations.
              </p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur text-left">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-4">
                <GraduationCap className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-white text-base mb-1">Concept Graphs</h4>
              <p className="text-xs text-slate-300">
                Interactive prerequisite maps that glow as your topic mastery improves.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/upload"
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-white text-indigo-900 font-bold text-base hover:bg-slate-100 transition-all shadow-lg shadow-black/20 text-center"
            >
              Upload Your First Lecture Free
            </Link>
            <Link
              href="/dashboard"
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-indigo-600/60 hover:bg-indigo-600 border border-white/20 text-white font-semibold text-base transition-all text-center"
            >
              Explore Sample Dashboard
            </Link>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          FOOTER
      ───────────────────────────────────────────────────────────── */}
      <footer className="border-t border-slate-200 bg-white py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold text-slate-900 text-sm">LectureMate</p>
              <p className="text-[11px] text-slate-500">From Lectures to Learning</p>
            </div>
          </div>

          <div className="flex items-center gap-6 text-xs text-slate-500 font-medium">
            <Link href="/upload" className="hover:text-indigo-600 transition-colors">
              Upload
            </Link>
            <Link href="/dashboard" className="hover:text-indigo-600 transition-colors">
              Dashboard
            </Link>
            <Link href="/study" className="hover:text-indigo-600 transition-colors">
              Study Cards
            </Link>
            <Link href="/quiz" className="hover:text-indigo-600 transition-colors">
              Practice Quiz
            </Link>
            <Link href="/map" className="hover:text-indigo-600 transition-colors">
              Concept Map
            </Link>
          </div>

          <p className="text-xs text-slate-400">
            © {new Date().getFullYear()} LectureMate. All rights reserved.
          </p>
        </div>
      </footer>

      {/* ─────────────────────────────────────────────────────────────
          WATCH DEMO VIDEO / MODAL
      ───────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {watchDemoOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 max-w-2xl w-full shadow-2xl border border-slate-100 relative"
            >
              <button
                onClick={() => setWatchDemoOpen(false)}
                className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Play className="w-4 h-4 fill-current ml-0.5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">LectureMate Demo Walkthrough</h3>
                  <p className="text-xs text-slate-500">See how lecture audio and PDFs turn into active study materials</p>
                </div>
              </div>

              <div className="bg-slate-950 rounded-2xl aspect-video flex flex-col items-center justify-center text-white relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 pointer-events-none" />
                <div className="w-16 h-16 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-xl mb-3 group-hover:scale-110 transition-transform cursor-pointer">
                  <Play className="w-7 h-7 fill-current ml-1" />
                </div>
                <p className="text-sm font-semibold text-slate-200 z-10">
                  Interactive Lecture Processing Demo
                </p>
                <p className="text-xs text-slate-400 z-10 mt-1">
                  1-Click Upload → Smart Summary → 3D Cards → FSRS Scheduler
                </p>
              </div>

              <div className="mt-6 flex justify-end">
                <Link
                  href="/upload"
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-md transition-all"
                >
                  Try It Yourself Now →
                </Link>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
