"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload, Video, FileText, Mic, CheckCircle2,
  AlertCircle, Loader2, Sparkles, ChevronRight, X,
  Volume2, Zap, BookOpen, Brain, BarChart2,
  FileUp, Link2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LiveRecorder } from "@/components/upload/LiveRecorder";

type InputTab = "file" | "youtube" | "paste" | "audio";

interface PipelineStep {
  step: string;
  message: string;
  percent: number;
}

const STEP_META: Record<string, { label: string; icon: React.ElementType }> = {
  ingest:  { label: "Ingesting",  icon: FileUp       },
  clean:   { label: "Cleaning",   icon: Sparkles     },
  segment: { label: "Segmenting", icon: BookOpen     },
  concepts:{ label: "Concepts",   icon: Brain        },
  cards:   { label: "Flashcards", icon: Zap          },
  quiz:    { label: "Quiz",       icon: BarChart2    },
  verify:  { label: "Verifying",  icon: CheckCircle2 },
  persist: { label: "Saving",     icon: CheckCircle2 },
};

const ALL_STEPS = ["ingest","clean","segment","concepts","cards","quiz","verify","persist"];

export default function UploadPage() {
  const router = useRouter();
  const [tab, setTab] = useState<InputTab>("file");
  const [text, setText] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [cardCount, setCardCount] = useState(25);
  const [processing, setProcessing] = useState(false);
  const [steps, setSteps] = useState<PipelineStep[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [lectureTitle, setLectureTitle] = useState("");
  const [audioMode, setAudioMode] = useState<"upload" | "record">("upload");
  const [done, setDone] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  const tabs = [
    { id: "file" as InputTab,    label: "Upload File", icon: Upload   },
    { id: "youtube" as InputTab, label: "YouTube",     icon: Video    },
    { id: "paste" as InputTab,   label: "Paste Text",  icon: FileText },
    { id: "audio" as InputTab,   label: "Audio / Mic", icon: Volume2  },
  ];

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (!dropped) return;
    setFile(dropped);
    if (dropped.type.startsWith("audio/") || dropped.type.startsWith("video/")) {
      setTab("audio");
    } else {
      setTab("file");
    }
  }, []);

  const overallProgress = steps.length > 0 ? Math.max(...steps.map((s) => s.percent)) : 0;
  const latestStep = steps[steps.length - 1];

  const handleProcess = async () => {
    setError(null);
    setSteps([]);
    setDone(false);
    setProcessing(true);

    const body: Record<string, unknown> = { cardCount, title: lectureTitle };

    if (tab === "paste") {
      if (!text.trim()) { setError("Please paste a transcript first."); setProcessing(false); return; }
      body.sourceType = "paste";
      body.text = text;
    } else if (tab === "youtube") {
      if (!youtubeUrl.trim()) { setError("Please enter a YouTube URL."); setProcessing(false); return; }
      body.sourceType = "youtube";
      body.youtubeUrl = youtubeUrl;
    } else if (tab === "file") {
      if (!file) { setError("Please select a file to upload."); setProcessing(false); return; }
      body.sourceType = "file";
      const fileData = await file.arrayBuffer();
      body.fileBase64 = Buffer.from(fileData).toString("base64");
      body.fileName = file.name;
    } else if (tab === "audio") {
      if (!file) { setError("Please select or record an audio file."); setProcessing(false); return; }
      body.sourceType = "audio";
      const fileData = await file.arrayBuffer();
      body.fileBase64 = Buffer.from(fileData).toString("base64");
      body.fileName = file.name;
    }

    try {
      const response = await fetch("/api/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        let msg = `Server error ${response.status}`;
        try { const d = await response.json(); if (d?.error) msg = d.error; } catch {
          const t = await response.text(); if (t) msg = t.slice(0, 200);
        }
        throw new Error(msg);
      }

      if (!response.body) throw new Error("No response stream.");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let currentEvent = "";

      while (true) {
        const { done: sd, value } = await reader.read();
        if (sd) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (line.startsWith("event: ")) { currentEvent = line.slice(7).trim(); }
          else if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (currentEvent === "error" || data.error) setError(data.message || data.error || "Error.");
              if (data.step) setSteps(prev => {
                const f = prev.filter(s => s.step !== data.step);
                return [...f, { step: data.step, message: data.message, percent: data.percent }];
              });
              if (data.lectureId) {
                if (data.lecture) {
                  try {
                    localStorage.setItem(`lecture_${data.lectureId}`, JSON.stringify(data.lecture));
                    const rawList = localStorage.getItem("local_lectures_list");
                    const list = rawList ? JSON.parse(rawList) : [];
                    const summary = {
                      id: data.lecture.id,
                      title: data.lecture.title,
                      sourceType: data.lecture.sourceType,
                      wordCount: data.lecture.wordCount,
                      cardCount: data.lecture.cards?.length || 0,
                      quizCount: data.lecture.quizQuestions?.length || 0,
                      qualityReport: data.lecture.qualityReport,
                      createdAt: new Date().toISOString(),
                    };
                    const updatedList = [
                      summary,
                      ...list.filter((l: { id: string }) => l.id !== data.lecture.id),
                    ];
                    localStorage.setItem("local_lectures_list", JSON.stringify(updatedList));
                  } catch (e) {
                    console.warn("Could not cache lecture locally:", e);
                  }
                }
                setDone(true);
                setTimeout(() => router.push(`/lectures/${data.lectureId}`), 1200);
              }
            } catch { /* ignore */ }
          }
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Processing failed. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  const sliderPct = ((cardCount - 10) / 40) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/20">
      {/* Topbar */}
      <div className="sticky top-0 z-20 h-16 flex items-center justify-between px-6 border-b border-slate-200/80 bg-white/80 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center shadow-sm shadow-indigo-500/30">
            <Upload className="w-[18px] h-[18px] text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-900">Upload Lecture</h1>
            <p className="text-[10px] text-slate-400 font-medium">AI-powered study materials generator</p>
          </div>
        </div>
        <span className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200/60 text-emerald-700 text-[10px] font-bold">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          AI Ready
        </span>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 pb-20">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-200/60 text-indigo-700 text-xs font-bold mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            Multi-Format AI Ingestion
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mb-3">
            Turn any lecture into{" "}
            <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              smart study cards
            </span>
          </h2>
          <p className="text-slate-500 text-sm max-w-md mx-auto leading-relaxed">
            Upload PDFs, drop a YouTube link, paste text, or record live — AI handles the rest in seconds.
          </p>
        </motion.div>

        <div className="space-y-5">
          {/* Lecture Title */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm"
          >
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">
              Lecture Title{" "}
              <span className="text-slate-400 font-normal normal-case">(optional)</span>
            </label>
            <input
              type="text"
              placeholder="e.g., CS301 — Memory Hierarchy & Caching Strategies"
              value={lectureTitle}
              onChange={(e) => setLectureTitle(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-400 text-sm transition-all font-medium"
            />
          </motion.div>

          {/* Input Tabs */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden"
          >
            <div className="flex border-b border-slate-100">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={cn(
                    "flex-1 flex flex-col items-center gap-1 py-3.5 text-[10px] sm:text-xs font-semibold transition-all border-b-2",
                    tab === t.id
                      ? "border-indigo-600 text-indigo-600 bg-indigo-50/50"
                      : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                  )}
                >
                  <t.icon className={cn("w-4 h-4", tab === t.id ? "text-indigo-600" : "text-slate-400")} />
                  <span>{t.label}</span>
                </button>
              ))}
            </div>

            <div className="p-5">
              <AnimatePresence mode="wait">
                {/* FILE */}
                {tab === "file" && (
                  <motion.div key="file" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }}>
                    <div
                      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                      onDragLeave={() => setIsDragging(false)}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={cn(
                        "border-2 border-dashed rounded-2xl py-14 px-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all group relative overflow-hidden",
                        isDragging
                          ? "border-indigo-500 bg-indigo-50/60 scale-[1.01]"
                          : "border-slate-200 hover:border-indigo-400 bg-slate-50/60 hover:bg-indigo-50/30"
                      )}
                    >
                      <div
                        className={cn("absolute inset-0 opacity-0 transition-opacity", isDragging ? "opacity-100" : "group-hover:opacity-100")}
                        style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.06) 0%, transparent 70%)" }}
                      />
                      {file ? (
                        <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="flex flex-col items-center gap-3 relative">
                          <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/10">
                            <CheckCircle2 className="w-8 h-8" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-800">{file.name}</p>
                            <p className="text-xs text-slate-500 mt-0.5">{(file.size / 1024).toFixed(1)} KB</p>
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); setFile(null); }}
                            className="flex items-center gap-1 text-xs font-semibold text-rose-500 hover:text-rose-600 px-3 py-1.5 rounded-lg hover:bg-rose-50 transition-colors"
                          >
                            <X className="w-3.5 h-3.5" /> Remove
                          </button>
                        </motion.div>
                      ) : (
                        <div className="relative">
                          <motion.div
                            animate={{ y: [0, -6, 0] }}
                            transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                            className="w-16 h-16 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center mb-4 mx-auto shadow-lg shadow-indigo-500/10 group-hover:shadow-indigo-500/20 transition-shadow"
                          >
                            <Upload className="w-8 h-8" />
                          </motion.div>
                          <p className="text-sm font-bold text-slate-900 mb-1.5">
                            {isDragging ? "Drop it here!" : "Drag & drop your file"}
                          </p>
                          <p className="text-xs text-slate-500 mb-5">PDF, DOCX, PPTX, XLSX, CSV, TXT, MD, SRT · Max 50 MB</p>
                          <span className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-bold shadow-md shadow-indigo-500/25 hover:bg-indigo-700 transition-colors inline-block">
                            Browse Files
                          </span>
                        </div>
                      )}
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      accept=".pdf,.docx,.doc,.pptx,.xlsx,.xls,.csv,.txt,.md,.srt,.vtt"
                      onChange={(e) => setFile(e.target.files?.[0] || null)}
                    />
                  </motion.div>
                )}

                {/* YOUTUBE */}
                {tab === "youtube" && (
                  <motion.div key="youtube" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }} className="space-y-4">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Quick preset:</span>
                      <button
                        type="button"
                        onClick={() => { setYoutubeUrl("https://www.youtube.com/watch?v=kCc8FmEb1nY"); setLectureTitle("Quantum Computing & Shor's Algorithm"); }}
                        className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200/60 text-xs font-semibold transition-colors flex items-center gap-1.5"
                      >
                        <Zap className="w-3 h-3" /> Sample Video
                      </button>
                    </div>
                    <div className="flex items-center gap-3 px-4 py-3.5 rounded-xl bg-slate-50 border border-slate-200 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all">
                      <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center shrink-0">
                        <Video className="w-4 h-4 text-red-600" />
                      </div>
                      <input
                        type="url"
                        placeholder="https://www.youtube.com/watch?v=..."
                        value={youtubeUrl}
                        onChange={(e) => setYoutubeUrl(e.target.value)}
                        className="flex-1 bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none font-medium"
                      />
                      {youtubeUrl && (
                        <button onClick={() => setYoutubeUrl("")} className="text-slate-400 hover:text-slate-600">
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-blue-50 border border-blue-100 text-blue-700">
                      <Link2 className="w-4 h-4 shrink-0 mt-0.5" />
                      <p className="text-xs leading-relaxed">
                        <strong>Caption Extraction:</strong> Automatically fetches English or Hindi subtitles. Works best with educational channels that have verified captions.
                      </p>
                    </div>
                  </motion.div>
                )}

                {/* PASTE */}
                {tab === "paste" && (
                  <motion.div key="paste" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }} className="space-y-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Quick presets:</span>
                      <button
                        type="button"
                        onClick={() => {
                          setText("When you build a system that spans across multiple machines, failures are the norm. Network cables get cut, servers run out of memory.\n\nEric Brewer's CAP Theorem asserts that any distributed data store can provide at most two out of three guarantees: Consistency, Availability, and Partition Tolerance.\n\nConsistency means linearizability — every read must receive the most recent write. Availability means every non-failing node must return a response. Partition tolerance means the system continues despite network message drops.\n\nIn Paxos consensus, a Proposer sends a Prepare request to a majority quorum of Acceptors. Because any two majority quorums overlap by at least one node, the overlapping node guarantees that any newly elected leader sees previously accepted values, preventing split-brain.");
                          setLectureTitle("Distributed Systems: CAP Theorem & Consensus");
                        }}
                        className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/60 text-xs font-semibold transition-colors flex items-center gap-1"
                      >
                        <Zap className="w-3 h-3" /> CS: CAP Theorem
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setText("Today we start Class 12 Physics: Electric Charges and Fields.\n\nElectric charge is a fundamental property of matter. Like charges repel, unlike charges attract.\n\nThree key properties:\n1. Additivity: Total charge is algebraic sum of individual charges.\n2. Conservation: Charge cannot be created or destroyed, only transferred.\n3. Quantization: Q = ne, where e = 1.6 x 10^-19 Coulombs.\n\nCoulomb's Law: Force between two point charges is proportional to the product of their magnitudes and inversely proportional to the square of the distance between them. F = kq1q2/r^2");
                          setLectureTitle("Class 12 Physics: Electric Charges");
                        }}
                        className="px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200/60 text-xs font-semibold transition-colors flex items-center gap-1"
                      >
                        <Zap className="w-3 h-3" /> Physics: Charges
                      </button>
                    </div>
                    <div className="relative">
                      <textarea
                        rows={8}
                        placeholder="Paste your lecture transcript here... (supports plain text, markdown, Hinglish)"
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        className="w-full p-4 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-800 placeholder:text-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 leading-relaxed transition-all"
                      />
                      {text.length > 0 && (
                        <div className="absolute bottom-3 right-3 flex items-center gap-2">
                          <span className="text-[10px] text-slate-400 font-medium bg-white px-2 py-0.5 rounded-md border border-slate-100">
                            {text.split(/\s+/).filter(Boolean).length.toLocaleString()} words
                          </span>
                          <button onClick={() => setText("")} className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-100 transition-colors">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}

                {/* AUDIO */}
                {tab === "audio" && (
                  <motion.div key="audio" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }} className="space-y-4">
                    <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl w-fit">
                      <button
                        type="button"
                        onClick={() => setAudioMode("upload")}
                        className={cn("px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5", audioMode === "upload" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-800")}
                      >
                        <Upload className="w-3.5 h-3.5" /> Upload File
                      </button>
                      <button
                        type="button"
                        onClick={() => setAudioMode("record")}
                        className={cn("px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5", audioMode === "record" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-800")}
                      >
                        <Mic className="w-3.5 h-3.5" /> Live Mic
                      </button>
                    </div>
                    {audioMode === "upload" ? (
                      <div>
                        <div
                          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                          onDragLeave={() => setIsDragging(false)}
                          onDrop={handleDrop}
                          onClick={() => audioInputRef.current?.click()}
                          className={cn("border-2 border-dashed rounded-2xl py-10 flex flex-col items-center justify-center cursor-pointer transition-all", isDragging ? "border-indigo-500 bg-indigo-50/50" : "border-slate-200 hover:border-amber-400 bg-slate-50/50")}
                        >
                          {file ? (
                            <div className="flex flex-col items-center gap-2">
                              <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                              <p className="text-sm font-bold text-slate-800">{file.name}</p>
                              <p className="text-xs text-slate-500">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                              <button onClick={(e) => { e.stopPropagation(); setFile(null); }} className="text-xs text-rose-500 font-semibold flex items-center gap-1 hover:text-rose-600">
                                <X className="w-3 h-3" /> Remove
                              </button>
                            </div>
                          ) : (
                            <>
                              <motion.div
                                animate={{ scale: [1, 1.05, 1] }}
                                transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
                                className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mb-3"
                              >
                                <Volume2 className="w-7 h-7" />
                              </motion.div>
                              <p className="text-sm font-bold text-slate-800">Drop audio or video here</p>
                              <p className="text-xs text-slate-500 mt-1">MP3, WAV, M4A, MP4, WebM</p>
                            </>
                          )}
                        </div>
                        <input
                          ref={audioInputRef}
                          type="file"
                          className="hidden"
                          accept=".mp3,.wav,.m4a,.mp4,.webm"
                          onChange={(e) => setFile(e.target.files?.[0] || null)}
                        />
                      </div>
                    ) : (
                      <LiveRecorder onRecordingComplete={(f) => { setFile(f); setAudioMode("upload"); }} />
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* Generation Settings */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-widest">Generation Settings</h3>
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                <span className="text-xs font-bold text-indigo-600">
                  {cardCount} Cards + {Math.max(5, Math.floor(cardCount / 5))} Questions
                </span>
              </div>
            </div>
            <label className="text-xs font-semibold text-slate-600 block mb-3">Target Flashcard Count</label>
            <input
              type="range"
              min={10}
              max={50}
              step={5}
              value={cardCount}
              onChange={(e) => setCardCount(Number(e.target.value))}
              className="w-full cursor-pointer accent-indigo-600 h-2"
              style={{
                background: `linear-gradient(to right, #4f46e5 0%, #4f46e5 ${sliderPct}%, #E2E8F0 ${sliderPct}%, #E2E8F0 100%)`
              }}
            />
            <div className="flex justify-between mt-2">
              {[10, 20, 30, 40, 50].map(v => (
                <button
                  key={v}
                  onClick={() => setCardCount(v)}
                  className={cn("text-[10px] font-bold transition-colors", cardCount === v ? "text-indigo-600" : "text-slate-400 hover:text-slate-600")}
                >
                  {v}
                </button>
              ))}
            </div>
          </motion.div>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="flex items-start gap-3 px-4 py-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
                <span className="flex-1">{error}</span>
                <button onClick={() => setError(null)} className="text-rose-400 hover:text-rose-600">
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Processing progress */}
          <AnimatePresence>
            {processing && (
              <motion.div
                initial={{ opacity: 0, y: 12, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                className="rounded-2xl border border-indigo-100 bg-white shadow-sm overflow-hidden"
              >
                {/* Shimmer progress bar */}
                <div className="h-1.5 bg-slate-100 relative overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600 absolute top-0 left-0"
                    animate={{ width: `${overallProgress}%` }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                  />
                  <motion.div
                    className="absolute top-0 left-0 h-full w-16 bg-gradient-to-r from-transparent via-white/40 to-transparent"
                    animate={{ x: ["-64px", "800px"] }}
                    transition={{ repeat: Infinity, duration: 1.8, ease: "linear" }}
                  />
                </div>

                <div className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                        className="w-4 h-4 rounded-full border-2 border-indigo-200 border-t-indigo-600"
                      />
                      <span className="text-sm font-bold text-slate-800">
                        {latestStep?.message || "Starting AI pipeline..."}
                      </span>
                    </div>
                    <span className="text-xs font-bold text-indigo-600 font-mono">
                      {Math.round(overallProgress)}%
                    </span>
                  </div>

                  <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
                    {ALL_STEPS.map(stepName => {
                      const meta = STEP_META[stepName];
                      const completed = steps.some(s => s.step === stepName);
                      const isActive = latestStep?.step === stepName;
                      const Icon = meta.icon;
                      return (
                        <motion.div
                          key={stepName}
                          animate={isActive ? { scale: [1, 1.05, 1] } : {}}
                          transition={{ repeat: Infinity, duration: 1.5 }}
                          className={cn(
                            "flex flex-col items-center gap-0.5 px-1 py-2 rounded-xl text-center text-[9px] font-bold border transition-all",
                            completed
                              ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                              : isActive
                              ? "bg-indigo-50 text-indigo-600 border-indigo-100"
                              : "bg-slate-50 text-slate-400 border-slate-100"
                          )}
                        >
                          <Icon className="w-3 h-3" />
                          <span>{meta.label}</span>
                          {(completed || isActive) && (
                            <motion.span
                              animate={isActive ? { opacity: [1, 0.3, 1] } : {}}
                              transition={{ repeat: Infinity, duration: 1 }}
                              className={cn("w-1 h-1 rounded-full", completed && !isActive ? "bg-emerald-500" : "bg-indigo-500")}
                            />
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Done celebration */}
          <AnimatePresence>
            {done && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 p-6 text-center"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 260, damping: 20 }}
                  className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-3"
                >
                  <CheckCircle2 className="w-7 h-7" />
                </motion.div>
                <h3 className="font-bold text-slate-900 text-base mb-1">Study materials ready! 🎉</h3>
                <p className="text-xs text-slate-500">Redirecting to your lecture...</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Submit */}
          <motion.button
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            onClick={handleProcess}
            disabled={processing || done}
            whileHover={{ scale: processing || done ? 1 : 1.01 }}
            whileTap={{ scale: processing || done ? 1 : 0.98 }}
            className={cn(
              "w-full flex items-center justify-center gap-3 py-4 rounded-xl font-bold text-sm text-white shadow-lg transition-all",
              processing || done
                ? "bg-slate-300 cursor-not-allowed shadow-none"
                : "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40"
            )}
          >
            {processing ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> AI is processing your lecture...</>
            ) : done ? (
              <><CheckCircle2 className="w-5 h-5" /> Redirecting...</>
            ) : (
              <><Sparkles className="w-5 h-5" /> Generate {cardCount} Flashcards + Quiz <ChevronRight className="w-5 h-5" /></>
            )}
          </motion.button>

          {/* Feature pills */}
          {!processing && !done && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="flex flex-wrap justify-center gap-2"
            >
              {["✦ Bloom's Taxonomy", "✦ Evidence-grounded", "✦ Spaced Repetition", "✦ Quiz Included"].map(f => (
                <span key={f} className="text-[10px] text-slate-500 font-medium bg-white/80 px-3 py-1.5 rounded-full border border-slate-200/80">{f}</span>
              ))}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}