"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence, type Variants } from "framer-motion";
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
  ChevronDown,
  X,
  CheckCircle2,
  Clock,
  Zap,
  RotateCw,
  Star,
  Flame,
  BrainCircuit,
  GraduationCap,
  Globe,
  Menu,
  Map,
  Mic,
  PlayCircle,
  FileUp,
  Clipboard,
} from "lucide-react";

// ─── Animation Variants ──────────────────────────────────────────────────────
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 32 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
};
const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.5 } },
};
const staggerChildren: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

// ─── FAQ Data ─────────────────────────────────────────────────────────────────
const faqs = [
  {
    q: "What file formats does LectureMate support?",
    a: "LectureMate supports PDF, DOCX, TXT, SRT/VTT caption files, audio/video files (MP3, MP4, etc.), and YouTube URLs. You can also paste raw text directly.",
  },
  {
    q: "How is the FSRS spaced repetition different from Anki?",
    a: "LectureMate uses FSRS v5, the same modern algorithm available in Anki's latest version — but it's pre-configured and automatically tuned to your lecture content. No manual card creation needed.",
  },
  {
    q: "Are the AI-generated flashcards accurate?",
    a: "Yes. Every generated flashcard is programmatically verified against your original lecture text with exact character offsets. If the AI cannot ground a fact, it's discarded — no hallucinations.",
  },
  {
    q: "Is LectureMate free to use?",
    a: "Yes, LectureMate is completely free. You can upload lectures, generate flashcards, quizzes, summaries, and concept maps without any subscription.",
  },
  {
    q: "Can I use it for non-lecture content like textbooks or articles?",
    a: "Absolutely. Any text-based content — lecture transcripts, textbook chapters, research papers, or meeting notes — can be processed by LectureMate.",
  },
  {
    q: "How does the Concept Map feature work?",
    a: "After processing your lecture, LectureMate builds an interactive prerequisite dependency graph using React Flow. Topics glow with a mastery heatmap (emerald → amber → indigo) as you review cards.",
  },
];

// ─── Testimonials ─────────────────────────────────────────────────────────────
const testimonials = [
  {
    name: "Priya Sharma",
    role: "Medical Student, AIIMS Delhi",
    avatar: "PS",
    color: "from-purple-500 to-indigo-600",
    text: "I uploaded a 3-hour anatomy lecture and had 80 verified flashcards in under 2 minutes. The FSRS scheduler tells me exactly when to review each card. My retention has gone up dramatically.",
    stars: 5,
  },
  {
    name: "Arjun Mehta",
    role: "CS Undergrad, IIT Bombay",
    avatar: "AM",
    color: "from-indigo-500 to-blue-600",
    text: "The concept map feature is genuinely impressive. It shows prerequisite relationships between topics — I can see exactly which concepts I need to understand before moving to advanced material.",
    stars: 5,
  },
  {
    name: "Sofia Chen",
    role: "MBA Student, ISB Hyderabad",
    avatar: "SC",
    color: "from-pink-500 to-purple-600",
    text: "I was skeptical about AI-generated quizzes, but the misconception explanations are incredibly specific. It doesn't just say 'wrong', it explains exactly why a distractor is incorrect.",
    stars: 5,
  },
];

// ─── Feature Sections ─────────────────────────────────────────────────────────
const featureSections = [
  {
    badge: "Smart Summary",
    badgeColor: "bg-purple-100 text-purple-700",
    title: "From 3-hour lectures to 5-minute reads",
    description:
      "LectureMate's AI reads your entire lecture and extracts the essential concepts, key definitions, and important takeaways. Get a structured, hierarchical summary — not a random paragraph.",
    bullets: [
      "Hierarchical section-by-section breakdown",
      "Key terms highlighted and defined",
      "Main arguments and supporting evidence",
      "Exam-ready bullet points",
    ],
    visual: "summary",
    accent: "#7C3AED",
    accentLight: "#EDE9FE",
    icon: FileText,
  },
  {
    badge: "AI Flashcards",
    badgeColor: "bg-rose-100 text-rose-700",
    title: "Flashcards that are verified — not hallucinated",
    description:
      "Every single flashcard is backed by an exact quote from your lecture. LectureMate checks the AI's output against your source material with character-level precision before showing you any card.",
    bullets: [
      "100% source-grounded — no hallucinations",
      "Exact timestamp / page references",
      "FSRS v5 scheduling built-in",
      "3D flip animations with evidence drawer",
    ],
    visual: "flashcard",
    accent: "#E11D48",
    accentLight: "#FFF1F2",
    icon: Layers,
  },
  {
    badge: "Practice Quizzes",
    badgeColor: "bg-amber-100 text-amber-700",
    title: "Adaptive quizzes that expose your blind spots",
    description:
      "Multiple-choice questions with wrong answers designed around real misconceptions. Each distractor comes with a specific explanation of why it's wrong — the most effective way to correct misunderstandings.",
    bullets: [
      "Topic-wise quiz breakdown",
      "Misconception-based distractor options",
      "Instant feedback with source reference",
      "Adaptive difficulty based on performance",
    ],
    visual: "quiz",
    accent: "#D97706",
    accentLight: "#FFFBEB",
    icon: HelpCircle,
  },
  {
    badge: "Concept Maps",
    badgeColor: "bg-emerald-100 text-emerald-700",
    title: "See how your knowledge connects",
    description:
      "Interactive prerequisite dependency graphs built from your lecture content. As you review flashcards and pass quizzes, nodes glow with a mastery heatmap — so you always know what to study next.",
    bullets: [
      "Interactive React Flow graph visualization",
      "Prerequisite dependency tracking",
      "Mastery heatmap (emerald → amber → indigo)",
      "Zoom, pan and focus on any concept",
    ],
    visual: "map",
    accent: "#059669",
    accentLight: "#ECFDF5",
    icon: Map,
  },
];

// ─── Stats ────────────────────────────────────────────────────────────────────
const stats = [
  { value: "10×", label: "Faster study prep", sub: "vs manual note-taking" },
  { value: "100%", label: "Source grounded", sub: "no hallucinated facts" },
  { value: "5+", label: "Input formats", sub: "PDF, DOCX, YouTube & more" },
  { value: "FSRS v5", label: "Spaced repetition", sub: "science-backed scheduling" },
];

// ─── Visual Mockups ───────────────────────────────────────────────────────────
function SummaryVisual() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-6 font-sans">
      <div className="flex items-center gap-2 mb-5 pb-4 border-b border-slate-100">
        <div className="w-8 h-8 rounded-xl bg-purple-600 flex items-center justify-center">
          <FileText className="w-4 h-4 text-white" />
        </div>
        <div>
          <p className="font-bold text-slate-900 text-sm">AI Summary</p>
          <p className="text-xs text-slate-500">Database Systems Lecture 4</p>
        </div>
        <div className="ml-auto px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 text-xs font-semibold border border-emerald-200">
          ✓ Generated
        </div>
      </div>
      <div className="space-y-4">
        <div>
          <p className="text-xs font-bold text-slate-800 uppercase tracking-wide mb-2">§1 — B-Tree Indexes</p>
          <div className="space-y-1.5">
            {["B-Tree maintains sorted order enabling O(log n) searches", "Leaf nodes store actual row pointers + key values", "Non-leaf nodes act as routing guides for traversal"].map((t, i) => (
              <div key={i} className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-1.5 shrink-0" />
                <p className="text-xs text-slate-600">{t}</p>
              </div>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs font-bold text-slate-800 uppercase tracking-wide mb-2">§2 — WAL Logging</p>
          <div className="space-y-1.5">
            {["Write-ahead log ensures crash recovery", "LSM-trees trade read performance for write throughput"].map((t, i) => (
              <div key={i} className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 shrink-0" />
                <p className="text-xs text-slate-600">{t}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="pt-2 border-t border-slate-100">
          <p className="text-[11px] text-slate-400 flex items-center gap-1">
            <Clock className="w-3 h-3" /> 2h 14m lecture → 3 min summary · 12 key points
          </p>
        </div>
      </div>
    </div>
  );
}

function FlashcardVisual() {
  const [flipped, setFlipped] = useState(false);
  return (
    <div className="space-y-3">
      <div
        className="bg-white rounded-2xl border border-rose-200 shadow-xl p-6 cursor-pointer select-none"
        onClick={() => setFlipped(!flipped)}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-rose-100 flex items-center justify-center">
              <Layers className="w-3.5 h-3.5 text-rose-500" />
            </div>
            <span className="text-xs font-bold text-rose-700">Flashcard #24</span>
          </div>
          <span className="text-[11px] text-slate-400">{flipped ? "Answer" : "Click to flip"}</span>
        </div>
        <div className="bg-rose-50/60 rounded-xl p-4 min-h-[80px] flex flex-col justify-center border border-rose-100">
          {!flipped ? (
            <p className="text-sm font-semibold text-slate-800">What does the CAP Theorem state about distributed systems?</p>
          ) : (
            <div>
              <p className="text-sm font-semibold text-slate-800 mb-2">A distributed system can guarantee at most <strong>two</strong> of: Consistency, Availability, and Partition Tolerance.</p>
              <p className="text-[11px] text-slate-500 border-t border-rose-100 pt-2 mt-2">
                📌 Source: "...CAP theorem proves that in a distributed system..." — Lecture 4, 31:42
              </p>
            </div>
          )}
        </div>
        <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500">
          <span>CS 101 · Systems</span>
          <div className="flex gap-1">
            {["Again", "Hard", "Good", "Easy"].map((r) => (
              <span key={r} className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 cursor-pointer transition-colors">{r}</span>
            ))}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-2 text-center text-[11px]">
        {[{ l: "Again", t: "10m", c: "bg-red-50 text-red-600 border-red-100" }, { l: "Hard", t: "1d", c: "bg-orange-50 text-orange-600 border-orange-100" }, { l: "Good", t: "4d", c: "bg-emerald-50 text-emerald-600 border-emerald-100" }, { l: "Easy", t: "12d", c: "bg-blue-50 text-blue-600 border-blue-100" }].map((r) => (
          <div key={r.l} className={`rounded-xl px-2 py-1.5 border ${r.c} font-medium`}>
            <div className="font-bold">{r.l}</div>
            <div className="opacity-80">{r.t}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function QuizVisual() {
  const [selected, setSelected] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const options = [
    { text: "Consistency", correct: true },
    { text: "Availability", correct: false, why: "Availability means every request gets a response — but that response may not reflect the latest data." },
    { text: "Partition Tolerance", correct: false, why: "Partition Tolerance means the system keeps running even if network packets are dropped." },
    { text: "Durability", correct: false, why: "Durability (from ACID) ensures committed transactions survive crashes — unrelated to read freshness." },
  ];
  return (
    <div className="bg-white rounded-2xl border border-amber-200 shadow-xl p-6">
      <div className="flex items-center gap-2 mb-5">
        <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center">
          <HelpCircle className="w-3.5 h-3.5 text-amber-500" />
        </div>
        <span className="text-xs font-bold text-amber-700">Practice Quiz · Q7 of 20</span>
        <div className="ml-auto text-[11px] text-slate-500">Score: 6/6 ✓</div>
      </div>
      <p className="text-sm font-semibold text-slate-800 mb-4">Which CAP property ensures every read receives the most recent write?</p>
      <div className="space-y-2 mb-4">
        {options.map((o, i) => (
          <button
            key={i}
            onClick={() => { if (!submitted) setSelected(i); }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left text-xs transition-all ${submitted
                ? o.correct
                  ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                  : selected === i
                    ? "bg-red-50 border-red-300 text-red-800"
                    : "bg-slate-50 border-slate-200 text-slate-500"
                : selected === i
                  ? "bg-amber-50 border-amber-400 text-amber-900 font-medium"
                  : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-amber-50 hover:border-amber-200"
              }`}
          >
            <div className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center ${selected === i ? "border-amber-500 bg-amber-500" : "border-slate-300"}`}>
              {selected === i && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
            </div>
            <span>{o.text}</span>
            {submitted && !o.correct && selected === i && <span className="ml-auto text-red-500 text-[10px]">✗</span>}
            {submitted && o.correct && <span className="ml-auto text-emerald-500 text-[10px]">✓</span>}
          </button>
        ))}
      </div>
      {submitted && selected !== null && !options[selected].correct && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-3 text-[11px] text-amber-800">
          <strong>Why wrong:</strong> {options[selected].why}
        </div>
      )}
      <button
        onClick={() => setSubmitted(true)}
        disabled={selected === null}
        className="w-full py-2 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white text-sm font-semibold transition-all"
      >
        {submitted ? "Next Question →" : "Submit Answer"}
      </button>
    </div>
  );
}

function MapVisual() {
  const nodes = [
    { id: "db", label: "Databases", x: 50, y: 20, mastery: "high" },
    { id: "idx", label: "Indexes", x: 20, y: 55, mastery: "high" },
    { id: "wal", label: "WAL Logging", x: 80, y: 55, mastery: "medium" },
    { id: "cap", label: "CAP Theorem", x: 50, y: 75, mastery: "low" },
    { id: "lsm", label: "LSM Trees", x: 15, y: 85, mastery: "none" },
  ];
  const colors: Record<string, string> = {
    high: "bg-emerald-100 border-emerald-400 text-emerald-800",
    medium: "bg-amber-100 border-amber-400 text-amber-800",
    low: "bg-indigo-100 border-indigo-400 text-indigo-800",
    none: "bg-slate-100 border-slate-300 text-slate-600",
  };
  return (
    <div className="bg-white rounded-2xl border border-emerald-200 shadow-xl p-6">
      <div className="flex items-center gap-2 mb-5">
        <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center">
          <Map className="w-3.5 h-3.5 text-emerald-600" />
        </div>
        <span className="text-xs font-bold text-emerald-700">Concept Map · Database Systems</span>
      </div>
      <div className="relative bg-slate-50 rounded-xl border border-slate-200 overflow-hidden" style={{ height: 220 }}>
        <svg className="absolute inset-0 w-full h-full" style={{ zIndex: 0 }}>
          {[["db", "idx"], ["db", "wal"], ["idx", "lsm"], ["cap", "wal"]].map(([a, b], i) => {
            const from = nodes.find(n => n.id === a)!;
            const to = nodes.find(n => n.id === b)!;
            return (
              <line
                key={i}
                x1={`${from.x}%`} y1={`${from.y}%`}
                x2={`${to.x}%`} y2={`${to.y}%`}
                stroke="#CBD5E1" strokeWidth={1.5} strokeDasharray="4,3"
              />
            );
          })}
        </svg>
        {nodes.map((node) => (
          <div
            key={node.id}
            className={`absolute border rounded-xl px-2.5 py-1.5 text-[11px] font-semibold shadow-sm ${colors[node.mastery]}`}
            style={{ left: `${node.x}%`, top: `${node.y}%`, transform: "translate(-50%,-50%)", zIndex: 1, whiteSpace: "nowrap" }}
          >
            {node.label}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-4 mt-4 text-[11px] font-medium">
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" /> Mastered</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" /> Learning</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-indigo-400 inline-block" /> Started</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-slate-300 inline-block" /> Not Yet</span>
      </div>
    </div>
  );
}

const visualMap: Record<string, React.ReactNode> = {
  summary: <SummaryVisual />,
  flashcard: <FlashcardVisual />,
  quiz: <QuizVisual />,
  map: <MapVisual />,
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"file" | "youtube" | "paste">("file");

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] font-sans overflow-x-hidden">

      {/* ═══════════════════════════════════════════════════════════════════
          NAVBAR — sticky, Odoo-style clean white with border
      ═══════════════════════════════════════════════════════════════════ */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-lg border-b border-slate-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-[68px] flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group shrink-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
              <BookOpen className="w-4.5 h-4.5 text-white" style={{ width: 18, height: 18 }} />
            </div>
            <span className="font-extrabold text-xl text-[#0F172A] tracking-tight">LectureMate</span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-1">
            {[
              { label: "Features", href: "#features" },
              { label: "How It Works", href: "#how-it-works" },
              { label: "Flashcards", href: "#flashcards" },
              { label: "Quizzes", href: "#quizzes" },
              { label: "Concept Maps", href: "#maps" },
              { label: "FAQ", href: "#faq" },
            ].map((n) => (
              <Link
                key={n.label}
                href={n.href}
                className="px-3.5 py-2 text-sm font-medium text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
              >
                {n.label}
              </Link>
            ))}
          </nav>

          {/* CTA Buttons */}
          <div className="hidden lg:flex items-center gap-3">
            <Link href="/auth/login" className="px-4 py-2 text-sm font-semibold text-slate-700 hover:text-indigo-600 transition-colors">
              Sign In
            </Link>
            <Link
              href="/auth/login"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold text-sm shadow-lg shadow-indigo-500/25 transition-all hover:-translate-y-0.5 hover:shadow-indigo-500/35"
            >
              Get Started Free
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Mobile Hamburger */}
          <button
            className="lg:hidden p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="lg:hidden border-t border-slate-100 bg-white px-6 py-4 space-y-1"
            >
              {["Features", "How It Works", "FAQ"].map((l) => (
                <Link key={l} href={`#${l.toLowerCase().replace(" ", "-")}`} onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2.5 text-sm font-medium text-slate-700 hover:text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors">
                  {l}
                </Link>
              ))}
              <div className="pt-3 flex flex-col gap-2">
                <Link href="/auth/login" className="px-4 py-2.5 text-center text-sm font-semibold text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">Sign In</Link>
                <Link href="/auth/login" className="px-4 py-2.5 text-center text-sm font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors">Get Started Free</Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* ═══════════════════════════════════════════════════════════════════
          HERO — Odoo-style: big headline left, interactive mockup right
      ═══════════════════════════════════════════════════════════════════ */}
      <section id="home" className="relative overflow-hidden">
        {/* Ambient blobs */}
        <div className="absolute -top-40 -left-40 w-[700px] h-[700px] bg-indigo-200/30 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-20 right-0 w-[500px] h-[500px] bg-purple-200/25 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-6 pt-20 pb-28 lg:pb-36 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left: Copy */}
          <motion.div
            variants={staggerChildren}
            initial="hidden"
            animate="visible"
            className="flex flex-col items-start"
          >
            {/* Badge */}
            <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold mb-6 uppercase tracking-widest">
              <Sparkles className="w-3.5 h-3.5" />
              AI-Powered Learning — Free Forever
            </motion.div>

            {/* Headline — Odoo uses huge, bold, impactful text */}
            <motion.h1 variants={fadeUp} className="text-5xl sm:text-6xl lg:text-[64px] font-extrabold text-[#0F172A] tracking-tight leading-[1.08] mb-6">
              Turn any lecture into{" "}
              <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 bg-clip-text text-transparent">
                mastery
              </span>
              {" "}in minutes
            </motion.h1>

            <motion.p variants={fadeUp} className="text-lg sm:text-xl text-slate-600 leading-relaxed mb-10 max-w-lg">
              Upload a PDF, DOCX, audio file, or YouTube link — LectureMate's AI instantly generates verified summaries, flashcards, adaptive quizzes, and interactive concept maps.
            </motion.p>

            {/* Feature check-pills */}
            <motion.div variants={fadeUp} className="flex flex-wrap gap-3 mb-10">
              {["PDF, DOCX, YouTube", "FSRS Spaced Repetition", "Verified Flashcards", "Concept Maps", "100% Free"].map((f) => (
                <div key={f} className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-full border border-slate-200 text-xs font-semibold text-slate-700 shadow-sm">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  {f}
                </div>
              ))}
            </motion.div>

            {/* CTAs */}
            <motion.div variants={fadeUp} className="flex flex-wrap gap-4">
              <Link
                href="/upload"
                className="inline-flex items-center gap-2.5 px-7 py-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold text-base shadow-xl shadow-indigo-500/30 transition-all hover:-translate-y-1 hover:shadow-indigo-500/40"
              >
                Start For Free
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2.5 px-7 py-4 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 font-bold text-base shadow-sm transition-all hover:border-slate-300"
              >
                <Play className="w-4 h-4 text-indigo-600" />
                Live Demo
              </Link>
            </motion.div>

            {/* Social proof */}
            <motion.p variants={fadeUp} className="mt-8 text-xs text-slate-400 font-medium">
              No credit card required · Works offline · Open source
            </motion.p>
          </motion.div>

          {/* Right: Interactive Upload Mockup */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="relative"
          >
            {/* Main mockup card */}
            <div className="bg-white rounded-[28px] border border-slate-200 shadow-2xl overflow-hidden">
              {/* Chrome bar */}
              <div className="bg-slate-50 border-b border-slate-200 px-5 py-3.5 flex items-center gap-3">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-amber-400" />
                  <div className="w-3 h-3 rounded-full bg-emerald-400" />
                </div>
                <div className="flex-1 bg-white rounded-lg border border-slate-200 px-3 py-1.5 text-[11px] text-slate-400 font-mono">
                  lecturemate.ai/upload
                </div>
                <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-xs">J</div>
              </div>

              {/* App content */}
              <div className="p-6">
                <div className="mb-4">
                  <h3 className="font-bold text-slate-900 text-base mb-1">Upload Your Lecture</h3>
                  <p className="text-xs text-slate-500">Supports PDF, DOCX, TXT, YouTube URLs, SRT, audio & video files</p>
                </div>

                {/* Tabs */}
                <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl mb-5">
                  {(["file", "youtube", "paste"] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${activeTab === tab ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                        }`}
                    >
                      {tab === "file" && <FileUp className="w-3.5 h-3.5" />}
                      {tab === "youtube" && <PlayCircle className="w-3.5 h-3.5" />}
                      {tab === "paste" && <Clipboard className="w-3.5 h-3.5" />}
                      {tab === "file" ? "Upload File" : tab === "youtube" ? "YouTube" : "Paste Text"}
                    </button>
                  ))}
                </div>

                {/* Drop zone */}
                <div className="border-2 border-dashed border-indigo-200 hover:border-indigo-400 bg-indigo-50/30 rounded-2xl p-8 flex flex-col items-center text-center transition-colors group cursor-pointer">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-100 flex items-center justify-center mb-3 group-hover:bg-indigo-200 group-hover:scale-110 transition-all">
                    {activeTab === "file" && <FileUp className="w-7 h-7 text-indigo-600" />}
                    {activeTab === "youtube" && <PlayCircle className="w-7 h-7 text-red-500" />}
                    {activeTab === "paste" && <Clipboard className="w-7 h-7 text-indigo-600" />}
                  </div>
                  <p className="font-semibold text-slate-700 text-sm mb-1">
                    {activeTab === "file" && "Drag & drop your file here"}
                    {activeTab === "youtube" && "Paste a YouTube URL"}
                    {activeTab === "paste" && "Paste your lecture text"}
                  </p>
                  <p className="text-xs text-slate-400 mb-4">
                    {activeTab === "file" && "PDF, DOCX, TXT, SRT, MP3, MP4 · Max 50MB"}
                    {activeTab === "youtube" && "Public YouTube lecture or recorded class"}
                    {activeTab === "paste" && "Transcripts, notes, or any text content"}
                  </p>
                  <Link href="/upload" className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow transition-all">
                    {activeTab === "file" ? "Choose File" : activeTab === "youtube" ? "Import Video" : "Process Text"}
                  </Link>
                </div>

                {/* Processing steps preview */}
                <div className="mt-5 grid grid-cols-4 gap-2">
                  {[
                    { icon: FileText, label: "Summary", color: "text-purple-600 bg-purple-50" },
                    { icon: Layers, label: "Flashcards", color: "text-rose-500 bg-rose-50" },
                    { icon: HelpCircle, label: "Quiz", color: "text-amber-500 bg-amber-50" },
                    { icon: Map, label: "Map", color: "text-emerald-500 bg-emerald-50" },
                  ].map((item) => (
                    <div key={item.label} className="flex flex-col items-center gap-1.5 py-2">
                      <div className={`w-8 h-8 rounded-xl ${item.color} flex items-center justify-center`}>
                        <item.icon className="w-4 h-4" />
                      </div>
                      <span className="text-[10px] font-semibold text-slate-600">{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Floating badge cards */}
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -top-5 -right-5 bg-white border border-indigo-100 shadow-xl rounded-2xl px-4 py-3"
            >
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900">80 cards generated</p>
                  <p className="text-[10px] text-emerald-600">100% source verified</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              animate={{ y: [0, 7, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              className="absolute -bottom-5 -left-5 bg-white border border-purple-100 shadow-xl rounded-2xl px-4 py-3"
            >
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-100 flex items-center justify-center">
                  <Zap className="w-4 h-4 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900">Next review in 4 days</p>
                  <p className="text-[10px] text-slate-500">FSRS v5 scheduled</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          STATS BAR — Odoo style number block
      ═══════════════════════════════════════════════════════════════════ */}
      <section className="bg-[#0F172A] py-16">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="text-center lg:border-r lg:last:border-r-0 border-white/10"
            >
              <p className="text-4xl sm:text-5xl font-extrabold text-white mb-1">{s.value}</p>
              <p className="text-base font-semibold text-indigo-300 mb-0.5">{s.label}</p>
              <p className="text-xs text-slate-500">{s.sub}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          FEATURES BENTO GRID — Odoo-style feature overview
      ═══════════════════════════════════════════════════════════════════ */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerChildren}
            className="text-center mb-16"
          >
            <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-600 text-xs font-bold uppercase tracking-widest mb-5">
              <Sparkles className="w-3.5 h-3.5" />
              Everything You Need
            </motion.div>
            <motion.h2 variants={fadeUp} className="text-4xl sm:text-5xl font-extrabold text-[#0F172A] tracking-tight mb-5">
              One lecture. Five study tools.
            </motion.h2>
            <motion.p variants={fadeUp} className="text-lg text-slate-500 max-w-2xl mx-auto">
              LectureMate transforms your raw lecture content into a complete active learning toolkit — automatically, in seconds.
            </motion.p>
          </motion.div>

          {/* Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Large card: Smart Summary */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              whileHover={{ y: -4 }}
              className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 p-8 shadow-sm hover:shadow-xl transition-all group"
            >
              <div className="flex items-start justify-between mb-6">
                <div className="w-14 h-14 rounded-2xl bg-purple-50 group-hover:bg-purple-100 flex items-center justify-center transition-colors">
                  <FileText className="w-7 h-7 text-purple-600" />
                </div>
                <span className="px-3 py-1 rounded-full bg-purple-50 border border-purple-200 text-purple-700 text-xs font-bold">AI Summary</span>
              </div>
              <h3 className="text-2xl font-extrabold text-slate-900 mb-3">Smart, structured summaries</h3>
              <p className="text-slate-500 text-base leading-relaxed mb-6">
                Get hierarchical section-by-section breakdowns with key terms, main arguments, and exam-ready bullet points — not just a wall of text.
              </p>
              <div className="flex flex-wrap gap-2">
                {["Section breakdown", "Key definitions", "Exam bullets", "Main arguments"].map((t) => (
                  <span key={t} className="px-3 py-1 bg-slate-100 rounded-full text-xs font-semibold text-slate-600">{t}</span>
                ))}
              </div>
            </motion.div>

            {/* FSRS Card */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              whileHover={{ y: -4 }}
              className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-3xl p-8 shadow-sm hover:shadow-xl transition-all group text-white"
            >
              <div className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center mb-6">
                <RotateCw className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-2xl font-extrabold mb-3">FSRS v5 Spaced Repetition</h3>
              <p className="text-indigo-200 text-sm leading-relaxed mb-6">
                The same science-backed scheduling algorithm used in Anki's latest version — automatically tuned to your content.
              </p>
              <div className="grid grid-cols-2 gap-2">
                {[{ l: "Again", t: "10m", c: "bg-red-500/20 text-red-200" }, { l: "Good", t: "4d", c: "bg-emerald-500/20 text-emerald-200" }, { l: "Hard", t: "1d", c: "bg-orange-500/20 text-orange-200" }, { l: "Easy", t: "12d", c: "bg-blue-500/20 text-blue-200" }].map((r) => (
                  <div key={r.l} className={`${r.c} rounded-xl p-2 text-center`}>
                    <div className="text-xs font-bold">{r.l}</div>
                    <div className="text-xs opacity-80">{r.t}</div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Concept Maps */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.15 }}
              whileHover={{ y: -4 }}
              className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm hover:shadow-xl transition-all group"
            >
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 group-hover:bg-emerald-100 flex items-center justify-center mb-6 transition-colors">
                <Map className="w-7 h-7 text-emerald-600" />
              </div>
              <h3 className="text-2xl font-extrabold text-slate-900 mb-3">Interactive Concept Maps</h3>
              <p className="text-slate-500 text-sm leading-relaxed">
                React Flow prerequisite graphs with mastery heatmaps. See exactly which topics you've mastered and what to study next.
              </p>
            </motion.div>

            {/* Adaptive Quizzes */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              whileHover={{ y: -4 }}
              className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm hover:shadow-xl transition-all group"
            >
              <div className="w-14 h-14 rounded-2xl bg-amber-50 group-hover:bg-amber-100 flex items-center justify-center mb-6 transition-colors">
                <HelpCircle className="w-7 h-7 text-amber-500" />
              </div>
              <h3 className="text-2xl font-extrabold text-slate-900 mb-3">Adaptive Quizzes</h3>
              <p className="text-slate-500 text-sm leading-relaxed">
                Multiple-choice questions with misconception-based distractors. Each wrong answer explains specifically why it's incorrect.
              </p>
            </motion.div>

            {/* Multi-format ingestion - large */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.25 }}
              whileHover={{ y: -4 }}
              className="lg:col-span-3 bg-[#0F172A] rounded-3xl p-8 shadow-sm hover:shadow-xl transition-all"
            >
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                <div>
                  <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center mb-6">
                    <Globe className="w-7 h-7 text-indigo-400" />
                  </div>
                  <h3 className="text-2xl font-extrabold text-white mb-3">5+ input formats supported</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    From raw PDFs to 3-hour YouTube recordings — LectureMate ingests everything. Audio and video files are automatically chunked in 10-minute segments via ffmpeg for accurate transcription.
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { icon: FileText, label: "PDF / DOCX", color: "bg-purple-500/20 text-purple-300 border-purple-500/20" },
                    { icon: PlayCircle, label: "YouTube", color: "bg-red-500/20 text-red-300 border-red-500/20" },
                    { icon: Mic, label: "Audio / Video", color: "bg-blue-500/20 text-blue-300 border-blue-500/20" },
                    { icon: Video, label: "MP4 / MOV", color: "bg-indigo-500/20 text-indigo-300 border-indigo-500/20" },
                    { icon: Clipboard, label: "Paste Text", color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/20" },
                    { icon: FileUp, label: "SRT / VTT", color: "bg-amber-500/20 text-amber-300 border-amber-500/20" },
                  ].map((f) => (
                    <div key={f.label} className={`${f.color} border rounded-2xl p-3 flex flex-col items-center text-center gap-2`}>
                      <f.icon className="w-5 h-5" />
                      <span className="text-[10px] font-bold">{f.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          HOW IT WORKS — Odoo-style numbered steps
      ═══════════════════════════════════════════════════════════════════ */}
      <section id="how-it-works" className="py-24 bg-slate-50 px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerChildren}
            className="text-center mb-20"
          >
            <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-slate-200 text-slate-600 text-xs font-bold uppercase tracking-widest mb-5 shadow-sm">
              <Zap className="w-3.5 h-3.5 text-indigo-500" />
              How It Works
            </motion.div>
            <motion.h2 variants={fadeUp} className="text-4xl sm:text-5xl font-extrabold text-[#0F172A] tracking-tight mb-5">
              From lecture to mastery in 4 steps
            </motion.h2>
            <motion.p variants={fadeUp} className="text-lg text-slate-500 max-w-2xl mx-auto">
              No setup, no manual card creation, no configuration. Just upload and learn.
            </motion.p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 relative">
            {/* Connecting line */}
            <div className="hidden lg:block absolute top-10 left-[12.5%] right-[12.5%] h-0.5 bg-gradient-to-r from-indigo-200 via-purple-200 to-emerald-200" />

            {[
              { num: "01", title: "Upload", desc: "Drag-and-drop any lecture file, paste a YouTube URL, or type raw text. LectureMate handles PDF, DOCX, TXT, SRT, MP3, MP4, and more.", icon: Upload, color: "bg-indigo-600 shadow-indigo-500/25" },
              { num: "02", title: "Process", desc: "The AI extracts, cleans, and segments your content into logical topics. Audio is transcribed and chunked. Every fact is traced to an exact source.", icon: BrainCircuit, color: "bg-blue-600 shadow-blue-500/25" },
              { num: "03", title: "Generate", desc: "Summaries, flashcards, quiz questions, and a concept map are generated simultaneously — all source-grounded and misconception-tested.", icon: Sparkles, color: "bg-purple-600 shadow-purple-500/25" },
              { num: "04", title: "Learn", desc: "Study with 3D flip cards, take adaptive quizzes, explore your concept graph, and trust FSRS to schedule reviews exactly when you need them.", icon: GraduationCap, color: "bg-emerald-600 shadow-emerald-500/25" },
            ].map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.12 }}
                className="flex flex-col items-center text-center relative"
              >
                <div className={`relative w-20 h-20 rounded-2xl ${step.color} shadow-lg flex items-center justify-center mb-6 z-10`}>
                  <step.icon className="w-9 h-9 text-white" />
                  <div className="absolute -top-2.5 -right-2.5 w-7 h-7 rounded-full bg-white border-2 border-slate-100 shadow-sm flex items-center justify-center">
                    <span className="text-[10px] font-extrabold text-slate-700">{step.num}</span>
                  </div>
                </div>
                <h4 className="text-xl font-extrabold text-slate-900 mb-3">{step.title}</h4>
                <p className="text-sm text-slate-500 leading-relaxed max-w-[240px]">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          FEATURE DEEP-DIVES — Odoo-style alternating sections
      ═══════════════════════════════════════════════════════════════════ */}
      {featureSections.map((feature, i) => (
        <section
          key={i}
          id={["summary", "flashcards", "quizzes", "maps"][i]}
          className={`py-24 px-6 ${i % 2 === 1 ? "bg-slate-50" : "bg-white"}`}
        >
          <div className="max-w-7xl mx-auto">
            <div className={`grid grid-cols-1 lg:grid-cols-2 gap-16 items-center ${i % 2 === 1 ? "lg:[&>*:first-child]:order-2" : ""}`}>
              {/* Text */}
              <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={staggerChildren}
              >
                <motion.div variants={fadeUp} className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold border mb-6 ${feature.badgeColor} border-current/20`}>
                  <feature.icon className="w-3.5 h-3.5" />
                  {feature.badge}
                </motion.div>
                <motion.h2 variants={fadeUp} className="text-4xl sm:text-[42px] font-extrabold text-[#0F172A] tracking-tight leading-[1.1] mb-6">
                  {feature.title}
                </motion.h2>
                <motion.p variants={fadeUp} className="text-lg text-slate-500 leading-relaxed mb-8">
                  {feature.description}
                </motion.p>
                <motion.ul variants={staggerChildren} className="space-y-3.5 mb-10">
                  {feature.bullets.map((b, j) => (
                    <motion.li key={j} variants={fadeUp} className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ backgroundColor: `${feature.accent}20` }}>
                        <Check className="w-3 h-3" style={{ color: feature.accent, strokeWidth: 3 }} />
                      </div>
                      <span className="text-slate-700 text-base font-medium">{b}</span>
                    </motion.li>
                  ))}
                </motion.ul>
                <motion.div variants={fadeUp}>
                  <Link
                    href="/upload"
                    className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl font-bold text-sm text-white shadow-lg transition-all hover:-translate-y-0.5"
                    style={{ background: `linear-gradient(135deg, ${feature.accent}, ${feature.accent}cc)`, boxShadow: `0 8px 24px ${feature.accent}30` }}
                  >
                    Try {feature.badge}
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </motion.div>
              </motion.div>

              {/* Visual */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="relative"
              >
                <div className="absolute inset-0 rounded-3xl blur-2xl opacity-20" style={{ background: feature.accent }} />
                <div className="relative">
                  {visualMap[feature.visual]}
                </div>
              </motion.div>
            </div>
          </div>
        </section>
      ))}

      {/* ═══════════════════════════════════════════════════════════════════
          TESTIMONIALS
      ═══════════════════════════════════════════════════════════════════ */}
      <section className="py-24 px-6 bg-[#0F172A]">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerChildren}
            className="text-center mb-16"
          >
            <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 text-white text-xs font-bold uppercase tracking-widest mb-5">
              <Star className="w-3.5 h-3.5 text-amber-400" />
              Student Stories
            </motion.div>
            <motion.h2 variants={fadeUp} className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight mb-5">
              Built for serious learners
            </motion.h2>
            <motion.p variants={fadeUp} className="text-lg text-slate-400 max-w-xl mx-auto">
              Students at top universities use LectureMate to cut study time in half without sacrificing depth.
            </motion.p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-white/5 border border-white/10 rounded-3xl p-8 hover:bg-white/8 transition-colors"
              >
                <div className="flex items-center gap-1 mb-5">
                  {Array.from({ length: t.stars }).map((_, j) => (
                    <Star key={j} className="w-4 h-4 text-amber-400 fill-amber-400" />
                  ))}
                </div>
                <p className="text-slate-300 text-base leading-relaxed mb-6">&ldquo;{t.text}&rdquo;</p>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${t.color} flex items-center justify-center text-white text-sm font-bold`}>
                    {t.avatar}
                  </div>
                  <div>
                    <p className="font-bold text-white text-sm">{t.name}</p>
                    <p className="text-slate-500 text-xs">{t.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          FAQ — Odoo-style accordion
      ═══════════════════════════════════════════════════════════════════ */}
      <section id="faq" className="py-24 px-6 bg-white">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerChildren}
            className="text-center mb-16"
          >
            <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-600 text-xs font-bold uppercase tracking-widest mb-5">
              <HelpCircle className="w-3.5 h-3.5" />
              FAQ
            </motion.div>
            <motion.h2 variants={fadeUp} className="text-4xl sm:text-5xl font-extrabold text-[#0F172A] tracking-tight mb-5">
              Frequently asked questions
            </motion.h2>
          </motion.div>

          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="border border-slate-200 rounded-2xl overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-6 py-5 text-left hover:bg-slate-50 transition-colors"
                >
                  <span className="font-bold text-slate-900 text-base pr-4">{faq.q}</span>
                  <div className={`w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center shrink-0 transition-transform ${openFaq === i ? "rotate-180" : ""}`}>
                    <ChevronDown className="w-4 h-4 text-slate-600" />
                  </div>
                </button>
                <AnimatePresence>
                  {openFaq === i && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="overflow-hidden"
                    >
                      <div className="px-6 pb-5 text-slate-500 text-sm leading-relaxed border-t border-slate-100 pt-4">
                        {faq.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          CTA BANNER — Odoo-style bold gradient call to action
      ═══════════════════════════════════════════════════════════════════ */}
      <section className="py-24 px-6 bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerChildren}
          >
            <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/15 border border-white/20 text-white text-xs font-bold uppercase tracking-widest mb-6">
              <Flame className="w-3.5 h-3.5 text-orange-300" />
              Start Learning Smarter Today
            </motion.div>
            <motion.h2 variants={fadeUp} className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-[1.08] mb-6">
              Your next exam starts here.
            </motion.h2>
            <motion.p variants={fadeUp} className="text-xl text-indigo-200 leading-relaxed mb-10 max-w-2xl mx-auto">
              Stop re-reading notes. Start active recall with AI-verified flashcards, science-backed scheduling, and adaptive quizzes — all from your existing lecture material.
            </motion.p>
            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/upload"
                className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-white text-indigo-700 font-extrabold text-lg shadow-2xl shadow-black/20 hover:bg-indigo-50 transition-all hover:-translate-y-1"
              >
                Upload Your First Lecture
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/25 text-white font-bold text-lg transition-all"
              >
                Explore Demo Dashboard
              </Link>
            </motion.div>
            <motion.p variants={fadeUp} className="mt-8 text-indigo-300 text-sm font-medium">
              Free forever · No credit card · No account required to try
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          FOOTER — Odoo-style rich footer with columns
      ═══════════════════════════════════════════════════════════════════ */}
      <footer className="bg-[#0F172A] border-t border-white/5 pt-16 pb-8 px-6">
        <div className="max-w-7xl mx-auto">
          {/* Top Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-10 mb-16">
            {/* Brand */}
            <div className="col-span-2 lg:col-span-2">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-white" />
                </div>
                <span className="font-extrabold text-xl text-white">LectureMate</span>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed mb-6 max-w-xs">
                Turn any lecture into verified flashcards, adaptive quizzes, and interactive concept maps — powered by AI and FSRS spaced repetition.
              </p>
              <div className="flex gap-3">
                {["GitHub", "Twitter"].map((s) => (
                  <div key={s} className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-400 text-xs font-medium hover:text-white hover:bg-white/10 cursor-pointer transition-colors">
                    {s}
                  </div>
                ))}
              </div>
            </div>

            {/* Product */}
            <div>
              <p className="font-bold text-white text-sm mb-4 uppercase tracking-wider">Product</p>
              <div className="space-y-3">
                {[
                  { label: "Upload Lecture", href: "/upload" },
                  { label: "Study Flashcards", href: "/study" },
                  { label: "Practice Quiz", href: "/quiz" },
                  { label: "Concept Map", href: "/map" },
                  { label: "Dashboard", href: "/dashboard" },
                ].map((l) => (
                  <Link key={l.label} href={l.href} className="block text-slate-400 text-sm hover:text-white transition-colors">
                    {l.label}
                  </Link>
                ))}
              </div>
            </div>

            {/* Tech */}
            <div>
              <p className="font-bold text-white text-sm mb-4 uppercase tracking-wider">Technology</p>
              <div className="space-y-3">
                {["Next.js 16", "Google Gemini AI", "FSRS v5", "Drizzle + Supabase", "React Flow", "Framer Motion"].map((t) => (
                  <p key={t} className="text-slate-400 text-sm">{t}</p>
                ))}
              </div>
            </div>

            {/* Formats */}
            <div>
              <p className="font-bold text-white text-sm mb-4 uppercase tracking-wider">Supported</p>
              <div className="space-y-3">
                {["PDF & DOCX", "YouTube URLs", "Audio (MP3, M4A)", "Video (MP4, MOV)", "SRT / VTT captions", "Plain text"].map((f) => (
                  <p key={f} className="text-slate-400 text-sm">{f}</p>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom Row */}
          <div className="border-t border-white/10 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-slate-500 text-xs">
              © {new Date().getFullYear()} LectureMate. MIT License. Built with ❤️ for students.
            </p>
            <div className="flex items-center gap-6">
              {["Privacy", "Terms", "Open Source"].map((l) => (
                <span key={l} className="text-slate-500 text-xs hover:text-slate-300 cursor-pointer transition-colors">{l}</span>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
