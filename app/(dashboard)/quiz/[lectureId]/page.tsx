"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  XCircle,
  HelpCircle,
  ShieldAlert,
  ShieldCheck,
  Maximize2,
  Clock,
  RotateCcw,
  Sparkles,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  BookOpen,
  Check,
  X,
  Flag,
  FileText,
  BarChart2,
  Award,
  Layers,
  ChevronRight,
  Lock,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { DemoLectureData } from "@/lib/db/mock-data";

type Question = DemoLectureData["quizQuestions"][0];

type QuizStage = "setup" | "generating" | "exam" | "results";
type DifficultyLevel = "easy" | "medium" | "hard";

export default function SecureProctoredQuizPage() {
  const params = useParams();
  const router = useRouter();
  const lectureId = (params.lectureId as string) || "d9e8f7a6-b5c4-4d3e-2f1a-0b9c8d7e6f5a";

  // Lecture & stage state
  const [lecture, setLecture] = useState<DemoLectureData | null>(null);
  const [loadingLecture, setLoadingLecture] = useState(true);
  const [stage, setStage] = useState<QuizStage>("setup");

  // Setup configuration state
  const [scope, setScope] = useState<"all" | "custom">("all");
  const [availableTopics, setAvailableTopics] = useState<string[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [questionCount, setQuestionCount] = useState<number>(10);
  const [difficulty, setDifficulty] = useState<DifficultyLevel>("medium");

  // Exam runtime state
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({}); // questionIndex -> optionId
  const [markedForReview, setMarkedForReview] = useState<Record<number, boolean>>({});
  const [visitedQuestions, setVisitedQuestions] = useState<Record<number, boolean>>({ 0: true });

  // Proctoring & security state
  const [violationsCount, setViolationsCount] = useState<number>(0);
  const [showViolationModal, setShowViolationModal] = useState<boolean>(false);
  const [violationMessage, setViolationMessage] = useState<string>("");
  const [terminated, setTerminated] = useState<boolean>(false);
  const [terminationReason, setTerminationReason] = useState<string>("");
  const [showSubmitConfirm, setShowSubmitConfirm] = useState<boolean>(false);

  // Timer state
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);

  // Results state
  const [resultData, setResultData] = useState<{
    totalQuestions: number;
    correctAnswers: number;
    scorePercent: number;
    timeSpentSeconds: number;
    violationsCount: number;
    terminated: boolean;
    terminationReason?: string;
  } | null>(null);
  const [reviewFilter, setReviewFilter] = useState<"all" | "wrong" | "correct">("all");

  const lastViolationTimeRef = useRef<number>(0);
  const examContainerRef = useRef<HTMLDivElement>(null);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 1. Load Lecture Data
  useEffect(() => {
    async function fetchLecture() {
      try {
        const res = await fetch(`/api/lectures/${encodeURIComponent(lectureId)}`);
        if (res.status === 401) {
          router.push(`/auth/login?redirectTo=${encodeURIComponent(window.location.pathname)}`);
          return;
        }
        if (res.status === 403) {
          setErrorMessage("Access Denied: You do not have permission to view or take a quiz on this lecture.");
          setLecture(null);
          return;
        }
        if (res.status === 404) {
          setErrorMessage("Lecture Not Found: The requested lecture does not exist or has been removed.");
          setLecture(null);
          return;
        }
        if (res.ok) {
          const data: DemoLectureData = await res.json();
          setLecture(data);

          // Extract unique topics from sections and concepts
          const topics = Array.from(
            new Set([
              ...data.sections.map((s) => s.title),
              ...data.concepts.map((c) => c.name),
            ])
          ).filter((t) => t && t.length > 2);

          setAvailableTopics(topics);
          setSelectedTopics(topics); // default all checked
        } else {
          setErrorMessage("Unable to load lecture data.");
        }
      } catch (err) {
        console.error("Failed to load lecture:", err);
        setErrorMessage("Network error loading lecture.");
      } finally {
        setLoadingLecture(false);
      }
    }
    fetchLecture();
  }, [lectureId, router]);

  // 2. Timer effect during exam
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (stage === "exam" && timerRunning) {
      interval = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [stage, timerRunning]);

  // 3. Proctoring / Anti-Cheating Event Handlers
  const recordViolation = useCallback(
    (reason: string) => {
      if (stage !== "exam" || terminated) return;

      const now = Date.now();
      // Debounce: ignore multiple blur/visibility events occurring within 1.5 seconds of each other
      if (now - lastViolationTimeRef.current < 1500) {
        return;
      }
      lastViolationTimeRef.current = now;

      setViolationsCount((prev) => {
        const nextCount = prev + 1;

        if (nextCount >= 3) {
          // 3rd strike -> Terminate quiz immediately!
          setTerminated(true);
          setTerminationReason("Terminated: 3 proctoring violations detected (tab switch / screen lock / exited fullscreen).");
          setTimerRunning(false);
          setShowViolationModal(false);

          // Exit fullscreen cleanly
          if (document.fullscreenElement) {
            document.exitFullscreen().catch(() => {});
          }

          // Auto submit
          finalizeQuizSubmission(true, "Terminated: 3 proctoring violations detected");
        } else {
          setViolationMessage(reason);
          setShowViolationModal(true);
        }

        return nextCount;
      });
    },
    [stage, terminated]
  );

  useEffect(() => {
    if (stage !== "exam") return;

    // A. Detect tab switch / laptop screen lock / minimization via visibilitychange
    const handleVisibilityChange = () => {
      if (document.hidden || document.visibilityState === "hidden") {
        recordViolation("Tab change, window minimize, or screen lock detected");
      }
    };

    // B. Detect window blur (user clicking away or alt-tabbing)
    const handleWindowBlur = () => {
      recordViolation("Focus lost: You switched windows or interacted with another application");
    };

    // C. Detect fullscreen exit
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && stage === "exam" && !terminated) {
        recordViolation("Exited Fullscreen mode. Exam must remain in full screen");
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleWindowBlur);
    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleWindowBlur);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, [stage, terminated, recordViolation]);

  // Request Fullscreen Helper
  const enterFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      }
    } catch (err) {
      console.warn("Fullscreen request denied or not supported:", err);
    }
  };

  // Start Quiz: generate customized questions via AI
  const handleStartExam = async () => {
    setStage("generating");

    try {
      const payloadTopics = scope === "all" ? "all" : selectedTopics;

      const res = await fetch(`/api/lectures/${lectureId}/quiz/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selectedTopics: payloadTopics,
          questionCount,
          difficulty,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.questions && data.questions.length > 0) {
          setQuestions(data.questions);
        } else if (lecture?.quizQuestions) {
          setQuestions(lecture.quizQuestions.slice(0, questionCount));
        }
      } else {
        // Fallback to existing lecture questions if available
        if (lecture?.quizQuestions && lecture.quizQuestions.length > 0) {
          setQuestions(lecture.quizQuestions.slice(0, questionCount));
        }
      }
    } catch (err) {
      console.error("Error generating customized quiz:", err);
      if (lecture?.quizQuestions && lecture.quizQuestions.length > 0) {
        setQuestions(lecture.quizQuestions.slice(0, questionCount));
      }
    }

    // Launch into Fullscreen & Exam state
    await enterFullscreen();
    setCurrentIndex(0);
    setUserAnswers({});
    setMarkedForReview({});
    setVisitedQuestions({ 0: true });
    setViolationsCount(0);
    setTerminated(false);
    setElapsedSeconds(0);
    setTimerRunning(true);
    setStage("exam");
  };

  // Option selection (DOES NOT reveal answers!)
  const handleSelectOption = (optionId: string) => {
    if (stage !== "exam" || terminated) return;
    setUserAnswers((prev) => ({
      ...prev,
      [currentIndex]: optionId,
    }));
  };

  const handleClearSelection = () => {
    setUserAnswers((prev) => {
      const copy = { ...prev };
      delete copy[currentIndex];
      return copy;
    });
  };

  const handleToggleMarkForReview = () => {
    setMarkedForReview((prev) => ({
      ...prev,
      [currentIndex]: !prev[currentIndex],
    }));
  };

  const goToQuestion = (index: number) => {
    if (index >= 0 && index < questions.length) {
      setCurrentIndex(index);
      setVisitedQuestions((prev) => ({ ...prev, [index]: true }));
    }
  };

  const handleNext = () => {
    if (currentIndex + 1 < questions.length) {
      goToQuestion(currentIndex + 1);
    } else {
      setShowSubmitConfirm(true);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      goToQuestion(currentIndex - 1);
    }
  };

  // Finalize Submission
  const finalizeQuizSubmission = async (isAutoTerminated = false, reason = "") => {
    setTimerRunning(false);
    if (document.fullscreenElement) {
      try {
        await document.exitFullscreen();
      } catch {}
    }

    // Calculate score
    let correctCount = 0;
    const questionResults = questions.map((q, idx) => {
      const userSelected = userAnswers[idx] || null;
      const correctOpt = q.options.find((o) => o.isCorrect);
      const isCorrect = userSelected ? userSelected === correctOpt?.id : false;
      if (isCorrect) correctCount++;

      return {
        questionId: q.id,
        prompt: q.prompt,
        selectedOptionId: userSelected,
        correctOptionId: correctOpt?.id || "",
        isCorrect,
        explanation: q.explanation,
        bloomLevel: q.bloomLevel,
      };
    });

    const total = questions.length;
    const percent = total > 0 ? Math.round((correctCount / total) * 100) : 0;

    const finalResult = {
      totalQuestions: total,
      correctAnswers: correctCount,
      scorePercent: percent,
      timeSpentSeconds: elapsedSeconds,
      violationsCount: isAutoTerminated ? Math.max(violationsCount, 3) : violationsCount,
      terminated: isAutoTerminated,
      terminationReason: reason,
    };

    setResultData(finalResult);
    setStage("results");
    setShowSubmitConfirm(false);

    // Save to backend analytics
    try {
      await fetch("/api/quiz/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lectureId,
          lectureTitle: lecture?.title || "Lecture Quiz",
          selectedTopics: scope === "all" ? ["All Topics"] : selectedTopics,
          difficulty,
          totalQuestions: total,
          correctAnswers: correctCount,
          scorePercent: percent,
          timeSpentSeconds: elapsedSeconds,
          violationsCount: finalResult.violationsCount,
          terminated: isAutoTerminated,
          terminationReason: reason,
          questionResults,
        }),
      });
    } catch (err) {
      console.error("Failed to persist quiz submission:", err);
    }
  };

  // Format seconds to mm:ss
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // Loading Screen
  if (loadingLecture) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-200/80 text-indigo-600 flex items-center justify-center animate-spin">
            <RotateCcw className="w-6 h-6" />
          </div>
          <p className="text-sm font-semibold text-slate-600">Initializing Exam Environment...</p>
        </div>
      </div>
    );
  }

  if (!lecture) {
    return (
      <div className="flex items-center justify-center min-h-[70vh] px-4">
        <div className="text-center p-8 bg-white rounded-3xl border border-slate-200 shadow-soft max-w-sm">
          {errorMessage?.includes("Access Denied") ? (
            <ShieldAlert className="w-10 h-10 text-rose-500 mx-auto mb-3" />
          ) : (
            <HelpCircle className="w-10 h-10 text-slate-400 mx-auto mb-3" />
          )}
          <h3 className="text-slate-900 font-bold mb-1">
            {errorMessage?.includes("Access Denied") ? "Access Restricted" : "Lecture Not Found"}
          </h3>
          <p className="text-xs text-slate-500 mb-4">
            {errorMessage || "Please upload or select a lecture to access Full Quiz Mode."}
          </p>
          <Link href="/lectures" className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-colors">
            Back to Lectures
          </Link>
        </div>
      </div>
    );
  }

  // =========================================================================
  // STAGE 1: SETUP & CONFIGURATION MODAL / PAGE
  // =========================================================================
  if (stage === "setup") {
    return (
      <div className="px-4 sm:px-8 py-10 max-w-4xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <Link
            href={`/lectures/${lecture.id}`}
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Lecture Study Pack
          </Link>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <Lock className="w-3.5 h-3.5 text-amber-500" /> Secure Proctored Exam Mode
          </span>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-10 shadow-soft space-y-8"
        >
          {/* Header */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                AI
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] tracking-tight">
                Configure Full Quiz Mode
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
              Targeted for <strong>"{lecture.title}"</strong>. Choose whether to generate from all topics or specific key concepts, customize the question volume and difficulty, and enter the secure full-screen testing environment.
            </p>
          </div>

          {/* Section 1: Scope & Topic Selection */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-600" />
                <span>1. Select Quiz Topics / Content Scope</span>
              </label>
              <span className="text-[11px] text-slate-400 font-medium">
                {scope === "all" ? "All Topics Selected" : `${selectedTopics.length} of ${availableTopics.length} Topics Selected`}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setScope("all")}
                className={cn(
                  "p-4 rounded-2xl border text-left transition-all",
                  scope === "all"
                    ? "border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-500/20"
                    : "border-slate-200 hover:border-slate-300 bg-slate-50/50"
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-bold text-slate-900">Entire Upload (All Topics)</span>
                  <div
                    className={cn(
                      "w-4 h-4 rounded-full border flex items-center justify-center",
                      scope === "all" ? "border-indigo-600 bg-indigo-600" : "border-slate-300"
                    )}
                  >
                    {scope === "all" && <Check className="w-2.5 h-2.5 text-white" />}
                  </div>
                </div>
                <p className="text-xs text-slate-500">
                  Comprehensive test synthesizing every section and extracted concept from the lecture.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setScope("custom")}
                className={cn(
                  "p-4 rounded-2xl border text-left transition-all",
                  scope === "custom"
                    ? "border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-500/20"
                    : "border-slate-200 hover:border-slate-300 bg-slate-50/50"
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-bold text-slate-900">Topic-Wise Custom Selection</span>
                  <div
                    className={cn(
                      "w-4 h-4 rounded-full border flex items-center justify-center",
                      scope === "custom" ? "border-indigo-600 bg-indigo-600" : "border-slate-300"
                    )}
                  >
                    {scope === "custom" && <Check className="w-2.5 h-2.5 text-white" />}
                  </div>
                </div>
                <p className="text-xs text-slate-500">
                  Select specific AI-extracted subtopics to target weaker areas and test focused mastery.
                </p>
              </button>
            </div>

            {/* Topic Checklist when Custom is active */}
            {scope === "custom" && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="mt-3 p-4 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-3"
              >
                <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-200">
                  <span className="font-bold text-slate-700">AI-Extracted Topics from this Upload:</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedTopics(availableTopics)}
                      className="text-indigo-600 hover:text-indigo-800 font-semibold"
                    >
                      Select All
                    </button>
                    <span>•</span>
                    <button
                      type="button"
                      onClick={() => setSelectedTopics([])}
                      className="text-slate-500 hover:text-slate-800 font-semibold"
                    >
                      Clear All
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                  {availableTopics.map((topic) => {
                    const isChecked = selectedTopics.includes(topic);
                    return (
                      <label
                        key={topic}
                        className={cn(
                          "flex items-center gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition-colors",
                          isChecked
                            ? "bg-white border-indigo-200 text-slate-900 font-semibold shadow-2xs"
                            : "bg-transparent border-transparent text-slate-600 hover:bg-white/60"
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedTopics((prev) => [...prev, topic]);
                            } else {
                              setSelectedTopics((prev) => prev.filter((t) => t !== topic));
                            }
                          }}
                          className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                        />
                        <span className="truncate">{topic}</span>
                      </label>
                    );
                  })}
                </div>

                {selectedTopics.length === 0 && (
                  <p className="text-xs text-rose-600 font-semibold mt-1">
                    Please select at least 1 topic to generate your quiz.
                  </p>
                )}
              </motion.div>
            )}
          </div>

          {/* Section 2: Question Count & Difficulty */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
            {/* Number of Questions */}
            <div className="space-y-3">
              <label className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-amber-500" />
                <span>2. Number of Questions</span>
              </label>

              <div className="grid grid-cols-4 gap-2">
                {[5, 10, 15, 20].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setQuestionCount(num)}
                    className={cn(
                      "py-2.5 rounded-xl border text-xs font-bold transition-all",
                      questionCount === num
                        ? "border-amber-500 bg-amber-50 text-amber-900 ring-2 ring-amber-400/20"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    {num} Qs
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-500 pt-1">
                <span>Or custom count:</span>
                <input
                  type="number"
                  min={3}
                  max={30}
                  value={questionCount}
                  onChange={(e) => setQuestionCount(Math.min(30, Math.max(3, parseInt(e.target.value) || 5)))}
                  className="w-20 px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
            </div>

            {/* Difficulty Level */}
            <div className="space-y-3">
              <label className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-2">
                <Award className="w-4 h-4 text-purple-600" />
                <span>3. Question Difficulty Level</span>
              </label>

              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { id: "easy", label: "Easy", desc: "Core Definitions" },
                    { id: "medium", label: "Medium", desc: "Trade-offs" },
                    { id: "hard", label: "Hard", desc: "Edge Cases" },
                  ] as const
                ).map((lvl) => (
                  <button
                    key={lvl.id}
                    type="button"
                    onClick={() => setDifficulty(lvl.id)}
                    className={cn(
                      "py-2 px-2 rounded-xl border text-left transition-all",
                      difficulty === lvl.id
                        ? "border-purple-600 bg-purple-50 text-purple-900 ring-2 ring-purple-500/20"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    <span className="block text-xs font-bold capitalize">{lvl.label}</span>
                    <span className="block text-[10px] text-slate-400">{lvl.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Section 3: Proctoring & Anti-Cheating Guarantee Box */}
          <div className="p-4 sm:p-5 rounded-2xl border border-amber-200/80 bg-amber-50/60 flex items-start gap-3.5">
            <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs">
              <p className="font-bold text-amber-950">
                Anti-Cheating & Strict Proctoring Security Rules
              </p>
              <ul className="text-amber-800/90 list-disc list-inside space-y-0.5">
                <li>Exam launches into <strong>Full Screen Mode</strong> automatically.</li>
                <li><strong>No immediate answer reveals:</strong> Options are marked privately; answers & explanations are revealed only after final submission.</li>
                <li><strong>Tab / Screen Detection:</strong> Switching tabs, minimizing the window, or closing/locking your laptop screen triggers a proctoring violation.</li>
                <li><strong>3-Strike Rule:</strong> You will receive up to 2 warnings. On the <strong>3rd violation</strong>, the quiz will be automatically terminated and submitted!</li>
              </ul>
            </div>
          </div>

          {/* Action Button */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
            <span className="text-xs text-slate-400">
              Estimated duration: ~{questionCount * 1.5} minutes • Real-time exam palette included
            </span>

            <button
              type="button"
              disabled={scope === "custom" && selectedTopics.length === 0}
              onClick={handleStartExam}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold text-sm shadow-md shadow-indigo-500/25 transition-all disabled:opacity-50"
            >
              <Maximize2 className="w-4 h-4" />
              <span>Launch Secure Exam (Fullscreen)</span>
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // =========================================================================
  // STAGE 2: AI GENERATION IN PROGRESS
  // =========================================================================
  if (stage === "generating") {
    return (
      <div className="flex items-center justify-center min-h-[75vh] px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-3xl border border-slate-200 bg-white p-8 sm:p-12 text-center max-w-md shadow-soft"
        >
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center mx-auto mb-6 shadow-lg shadow-indigo-500/30 animate-pulse">
            <Sparkles className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 mb-2">
            AI is Generating Your Quiz
          </h2>
          <p className="text-xs text-slate-500 mb-6 leading-relaxed">
            Crafting {questionCount} {difficulty}-level questions targeted strictly at your selected topics with realistic misconception distractors...
          </p>
          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200/50">
            <div className="h-full bg-indigo-600 rounded-full w-2/3 animate-pulse" />
          </div>
          <span className="block text-[11px] text-slate-400 mt-4">
            Securing proctored test environment...
          </span>
        </motion.div>
      </div>
    );
  }

  // =========================================================================
  // STAGE 3: FULL SCREEN EXAM MODE (Left: Quiz, Right: Question Palette)
  // =========================================================================
  const currentQuestion = questions[currentIndex];
  const selectedOptionId = userAnswers[currentIndex];
  const isMarked = Boolean(markedForReview[currentIndex]);

  const answeredTotal = Object.keys(userAnswers).length;
  const markedTotal = Object.values(markedForReview).filter(Boolean).length;
  const unansweredTotal = questions.length - answeredTotal;

  if (stage === "exam") {
    return (
      <div
        ref={examContainerRef}
        className="fixed inset-0 z-50 bg-[#F8FAFC] flex flex-col overflow-hidden text-slate-900 select-none"
      >
        {/* Top Exam Header Bar */}
        <header className="h-16 border-b border-slate-200 bg-white px-4 sm:px-8 flex items-center justify-between shadow-2xs shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
              LM
            </div>
            <div>
              <h2 className="text-xs sm:text-sm font-bold text-slate-900 line-clamp-1 max-w-[200px] sm:max-w-md">
                {lecture.title}
              </h2>
              <div className="flex items-center gap-2 text-[10px] text-slate-500">
                <span className="capitalize font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200/50">
                  {difficulty} Level
                </span>
                <span>•</span>
                <span>{questions.length} Total Questions</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Live Proctoring Badge */}
            <div
              className={cn(
                "hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-colors",
                violationsCount === 0
                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                  : violationsCount === 1
                  ? "bg-amber-50 text-amber-800 border-amber-200"
                  : "bg-rose-50 text-rose-800 border-rose-300"
              )}
            >
              <ShieldAlert className="w-4 h-4" />
              <span>Proctoring: {violationsCount}/3 Violations</span>
            </div>

            {/* Live Timer */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-800 font-mono text-xs sm:text-sm font-bold">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <span>{formatTime(elapsedSeconds)}</span>
            </div>

            {/* Re-enter Fullscreen Button if user exited */}
            {!document.fullscreenElement && (
              <button
                onClick={enterFullscreen}
                className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800 text-white text-xs font-semibold"
                title="Enter Fullscreen"
              >
                <Maximize2 className="w-3.5 h-3.5" /> Fullscreen
              </button>
            )}

            {/* Submit Quiz Trigger Button */}
            <button
              onClick={() => setShowSubmitConfirm(true)}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold shadow-sm transition-all"
            >
              Submit Quiz
            </button>
          </div>
        </header>

        {/* Main Body: Two-Column Split (Left: Quiz, Right: Question Palette) */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* LEFT COLUMN: Main Quiz Question Area (~72% width) */}
          <main className="flex-1 flex flex-col overflow-y-auto p-4 sm:p-8 border-r border-slate-200 bg-white">
            <div className="max-w-3xl w-full mx-auto flex-1 flex flex-col justify-between">
              {/* Question Header */}
              <div>
                <div className="flex items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold px-3 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                      Question {currentIndex + 1} of {questions.length}
                    </span>
                    {isMarked && (
                      <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                        <Flag className="w-3 h-3 text-amber-500 fill-amber-500" /> Marked for Review
                      </span>
                    )}
                  </div>

                  <span className="text-xs font-semibold text-slate-400 capitalize">
                    Single Choice MCQ
                  </span>
                </div>

                {/* Prompt */}
                <h3 className="text-base sm:text-xl font-bold text-slate-900 leading-snug mb-6">
                  {currentQuestion?.prompt}
                </h3>

                {/* Options List (Neutral Selected State - NO ANSWER REVEAL) */}
                <div className="space-y-3">
                  {currentQuestion?.options.map((opt, oIndex) => {
                    const isSelected = selectedOptionId === opt.id;
                    const letter = String.fromCharCode(65 + oIndex); // A, B, C, D

                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => handleSelectOption(opt.id)}
                        className={cn(
                          "w-full text-left flex items-start gap-4 p-4 rounded-2xl border transition-all text-sm",
                          isSelected
                            ? "border-indigo-600 bg-indigo-50/70 ring-2 ring-indigo-500/20 shadow-xs"
                            : "border-slate-200 hover:border-slate-300 bg-slate-50/40 hover:bg-slate-50 text-slate-800"
                        )}
                      >
                        <span
                          className={cn(
                            "w-7 h-7 rounded-full border flex items-center justify-center shrink-0 text-xs font-bold mt-0.5",
                            isSelected
                              ? "border-indigo-600 bg-indigo-600 text-white"
                              : "border-slate-300 bg-white text-slate-600"
                          )}
                        >
                          {letter}
                        </span>

                        <span className="flex-1 font-medium leading-relaxed pt-0.5">
                          {opt.text}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Bottom Navigation & Action Controls */}
              <div className="pt-8 mt-6 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  {selectedOptionId && (
                    <button
                      type="button"
                      onClick={handleClearSelection}
                      className="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 text-xs font-semibold hover:bg-slate-50 transition-colors"
                    >
                      Clear Response
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleToggleMarkForReview}
                    className={cn(
                      "flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-xs font-semibold transition-colors",
                      isMarked
                        ? "bg-amber-100 text-amber-900 border-amber-300"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    <Flag className={cn("w-3.5 h-3.5", isMarked ? "fill-amber-600 text-amber-600" : "")} />
                    <span>{isMarked ? "Unmark Review" : "Mark for Review"}</span>
                  </button>
                </div>

                <div className="flex items-center gap-2 ml-auto">
                  <button
                    type="button"
                    disabled={currentIndex === 0}
                    onClick={handlePrevious}
                    className="flex items-center gap-1 px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold disabled:opacity-40 transition-colors"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Previous
                  </button>

                  <button
                    type="button"
                    onClick={handleNext}
                    className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition-all"
                  >
                    <span>{currentIndex + 1 === questions.length ? "Review & Finish" : "Save & Next"}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </main>

          {/* RIGHT COLUMN: Professional Question Palette (< half width, ~28%) */}
          <aside className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-slate-200 bg-slate-50/80 p-5 flex flex-col justify-between overflow-y-auto shrink-0">
            <div>
              {/* Palette Title & Status Summary */}
              <div className="mb-4">
                <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-2">
                  Question Palette
                </h4>
                <div className="grid grid-cols-2 gap-2 text-[11px] mb-4">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-md bg-emerald-600 shrink-0" />
                    <span className="text-slate-600 font-medium">Answered: <strong>{answeredTotal}</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-md bg-amber-500 shrink-0" />
                    <span className="text-slate-600 font-medium">Review: <strong>{markedTotal}</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-md bg-white border border-slate-300 shrink-0" />
                    <span className="text-slate-600 font-medium">Unanswered: <strong>{unansweredTotal}</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-md ring-2 ring-indigo-600 bg-indigo-50 shrink-0" />
                    <span className="text-slate-600 font-medium">Current</span>
                  </div>
                </div>
              </div>

              {/* Number Buttons Grid */}
              <div className="grid grid-cols-5 gap-2 pb-4">
                {questions.map((_, idx) => {
                  const isCurrent = idx === currentIndex;
                  const isAnswered = Boolean(userAnswers[idx]);
                  const isFlagged = Boolean(markedForReview[idx]);

                  let btnStyle = "bg-white border-slate-200 text-slate-700 hover:border-slate-400";
                  if (isCurrent) {
                    btnStyle = "bg-indigo-50 text-indigo-700 border-indigo-600 ring-2 ring-indigo-500/30 font-extrabold";
                  } else if (isFlagged) {
                    btnStyle = "bg-amber-500 border-amber-600 text-white font-bold";
                  } else if (isAnswered) {
                    btnStyle = "bg-emerald-600 border-emerald-700 text-white font-bold";
                  }

                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => goToQuestion(idx)}
                      className={cn(
                        "h-10 rounded-xl border flex items-center justify-center text-xs transition-all shadow-2xs",
                        btnStyle
                      )}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Bottom Submit Trigger */}
            <div className="pt-4 border-t border-slate-200 space-y-2">
              <button
                type="button"
                onClick={() => setShowSubmitConfirm(true)}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold shadow-md shadow-emerald-500/20 transition-all"
              >
                Submit & Finalize Exam
              </button>
              <p className="text-[10px] text-center text-slate-400">
                Score & detailed explanations will be calculated upon submission.
              </p>
            </div>
          </aside>
        </div>

        {/* PROCTORING VIOLATION ALERT MODAL (IMMOBILE) */}
        <AnimatePresence>
          {showViolationModal && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 border border-rose-200 shadow-2xl text-center space-y-4"
              >
                <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto shadow-inner">
                  <ShieldAlert className="w-8 h-8" />
                </div>

                <div>
                  <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 mb-2">
                    Warning {violationsCount} of 3
                  </span>
                  <h3 className="text-xl font-extrabold text-slate-900">
                    Proctoring Violation Detected!
                  </h3>
                  <p className="text-xs text-rose-600 font-semibold mt-1">
                    {violationMessage}
                  </p>
                  <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                    Leaving the exam tab, switching applications, or closing your laptop screen is strictly prohibited. After <strong>3 warnings</strong>, your exam will be terminated immediately.
                  </p>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={async () => {
                      setShowViolationModal(false);
                      await enterFullscreen();
                    }}
                    className="w-full py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-500/25 transition-all"
                  >
                    I Understand — Return to Fullscreen
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* SUBMIT CONFIRMATION MODAL */}
        <AnimatePresence>
          {showSubmitConfirm && (
            <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-2xl space-y-5"
              >
                <div className="text-center">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">
                    Submit Examination?
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Are you sure you want to finalize your exam answers? Once submitted, your scores and full solutions will be revealed.
                  </p>
                </div>

                {/* Exam Breakdown Checklist */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs">
                  <div className="flex justify-between font-medium">
                    <span className="text-slate-600">Total Questions:</span>
                    <strong className="text-slate-900">{questions.length}</strong>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span className="text-emerald-700">Answered:</span>
                    <strong className="text-emerald-700">{answeredTotal}</strong>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span className="text-amber-700">Marked for Review:</span>
                    <strong className="text-amber-700">{markedTotal}</strong>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span className="text-slate-500">Unanswered Questions:</span>
                    <strong className={unansweredTotal > 0 ? "text-rose-600" : "text-slate-900"}>
                      {unansweredTotal}
                    </strong>
                  </div>
                </div>

                {unansweredTotal > 0 && (
                  <p className="text-[11px] text-amber-700 font-semibold bg-amber-50 p-2.5 rounded-xl border border-amber-200 text-center">
                    ⚠️ You still have {unansweredTotal} unanswered question(s).
                  </p>
                )}

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setShowSubmitConfirm(false)}
                    className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors"
                  >
                    Resume Quiz
                  </button>
                  <button
                    type="button"
                    onClick={() => finalizeQuizSubmission(false)}
                    className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-500/20 transition-all"
                  >
                    Confirm Submission
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // =========================================================================
  // STAGE 4: RESULTS & DIAGNOSTIC REPORT (Score Reveal, Weak Topics, Solutions)
  // =========================================================================
  if (stage === "results" && resultData) {
    const isTerminated = resultData.terminated;
    const percent = resultData.scorePercent;

    return (
      <div className="px-4 sm:px-8 py-10 max-w-4xl mx-auto space-y-8">
        {/* Disqualification Banner if Terminated */}
        {isTerminated && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-5 rounded-3xl bg-rose-50 border border-rose-200 text-rose-950 flex items-start gap-3.5 shadow-soft"
          >
            <ShieldAlert className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold text-rose-900">
                Exam Terminated Due to Proctoring Violations
              </h3>
              <p className="text-xs text-rose-800/90 mt-1 leading-relaxed">
                3 separate violations (tab switching, window focus loss, or screen close) were detected. The test was automatically locked and scored based on submitted answers.
              </p>
            </div>
          </motion.div>
        )}

        {/* Main Score & Diagnostic Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-10 shadow-soft text-center"
        >
          {/* Score Circle */}
          <div className="w-28 h-28 rounded-full mx-auto mb-4 flex flex-col items-center justify-center text-4xl font-extrabold text-indigo-600 border-4 border-indigo-100 bg-indigo-50/70 shadow-inner">
            <span>{percent}%</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] tracking-tight mb-1">
            {isTerminated ? "Examination Locked & Evaluated" : "Diagnostic Evaluation Complete!"}
          </h1>

          <p className="text-xs sm:text-sm text-slate-500 mb-6">
            {resultData.correctAnswers} of {resultData.totalQuestions} questions answered correctly • Completed in {formatTime(resultData.timeSpentSeconds)}
          </p>

          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
            <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-200/80 text-left">
              <span className="text-[11px] font-semibold text-emerald-700 block">Correct</span>
              <span className="text-xl font-bold text-emerald-900">{resultData.correctAnswers}</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-rose-50/60 border border-rose-200/80 text-left">
              <span className="text-[11px] font-semibold text-rose-700 block">Incorrect</span>
              <span className="text-xl font-bold text-rose-900">
                {resultData.totalQuestions - resultData.correctAnswers}
              </span>
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-left">
              <span className="text-[11px] font-semibold text-slate-600 block">Time Spent</span>
              <span className="text-xl font-bold text-slate-900">{formatTime(resultData.timeSpentSeconds)}</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-purple-50/60 border border-purple-200/80 text-left">
              <span className="text-[11px] font-semibold text-purple-700 block">Proctoring Status</span>
              <span className="text-xs font-bold text-purple-900 line-clamp-1 mt-1">
                {resultData.violationsCount === 0 ? "Clean Audit (0)" : `${resultData.violationsCount} Warnings`}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => {
                setStage("setup");
                setQuestions([]);
                setUserAnswers({});
                setMarkedForReview({});
              }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs sm:text-sm font-semibold hover:bg-slate-50 transition-colors"
            >
              <RotateCcw className="w-4 h-4" /> Reconfigure & Retake
            </button>
            <Link
              href={`/study?lecture=${lecture.id}`}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-50 text-purple-700 border border-purple-200 text-xs sm:text-sm font-semibold hover:bg-purple-100 transition-colors"
            >
              Study Flashcards
            </Link>
            <Link
              href={`/lectures/${lecture.id}`}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold shadow-sm transition-all"
            >
              Ask AI Doubt Tutor
            </Link>
          </div>
        </motion.div>

        {/* Question-By-Question Solution Review Section */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-600" />
              <span>Full Diagnostic Review & Solutions ({questions.length})</span>
            </h3>

            {/* Filter buttons */}
            <div className="flex gap-1.5 p-1 bg-slate-100 rounded-xl text-xs font-semibold w-fit">
              <button
                onClick={() => setReviewFilter("all")}
                className={cn("px-3 py-1 rounded-lg transition-colors", reviewFilter === "all" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600")}
              >
                All ({questions.length})
              </button>
              <button
                onClick={() => setReviewFilter("wrong")}
                className={cn("px-3 py-1 rounded-lg transition-colors", reviewFilter === "wrong" ? "bg-white text-rose-700 shadow-xs" : "text-slate-600")}
              >
                Incorrect ({resultData.totalQuestions - resultData.correctAnswers})
              </button>
              <button
                onClick={() => setReviewFilter("correct")}
                className={cn("px-3 py-1 rounded-lg transition-colors", reviewFilter === "correct" ? "bg-white text-emerald-700 shadow-xs" : "text-slate-600")}
              >
                Correct ({resultData.correctAnswers})
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {questions
              .map((q, idx) => {
                const userSelected = userAnswers[idx];
                const correctOpt = q.options.find((o) => o.isCorrect);
                const isCorrect = userSelected === correctOpt?.id;
                return { q, idx, userSelected, correctOpt, isCorrect };
              })
              .filter(({ isCorrect }) => {
                if (reviewFilter === "wrong") return !isCorrect;
                if (reviewFilter === "correct") return isCorrect;
                return true;
              })
              .map(({ q, idx, userSelected, correctOpt, isCorrect }) => (
                <div
                  key={q.id}
                  className={cn(
                    "rounded-3xl border p-5 sm:p-6 bg-white shadow-soft transition-all space-y-4",
                    isCorrect ? "border-emerald-200/90" : "border-rose-200/90"
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white",
                        isCorrect ? "bg-emerald-600" : "bg-rose-600"
                      )}>
                        {idx + 1}
                      </span>
                      <span className="text-xs font-bold text-slate-700">Question {idx + 1}</span>
                    </div>

                    <span className={cn(
                      "text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1",
                      isCorrect ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-rose-50 text-rose-700 border border-rose-200"
                    )}>
                      {isCorrect ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                      {isCorrect ? "Correct" : "Incorrect"}
                    </span>
                  </div>

                  <p className="text-sm sm:text-base font-bold text-slate-900 leading-snug">
                    {q.prompt}
                  </p>

                  {/* Options Evaluation */}
                  <div className="space-y-2">
                    {q.options.map((opt, oIdx) => {
                      const letter = String.fromCharCode(65 + oIdx);
                      const isOptionCorrect = opt.isCorrect;
                      const isUserChoice = userSelected === opt.id;

                      let optCardStyle = "border-slate-100 bg-slate-50/40 text-slate-600";
                      if (isOptionCorrect) {
                        optCardStyle = "border-emerald-300 bg-emerald-50/80 text-emerald-950 font-semibold";
                      } else if (isUserChoice && !isOptionCorrect) {
                        optCardStyle = "border-rose-300 bg-rose-50/80 text-rose-950 font-semibold";
                      }

                      return (
                        <div
                          key={opt.id}
                          className={cn("p-3 rounded-xl border text-xs flex items-start gap-3", optCardStyle)}
                        >
                          <span className={cn(
                            "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5",
                            isOptionCorrect ? "bg-emerald-600 text-white" : isUserChoice ? "bg-rose-600 text-white" : "bg-slate-200 text-slate-700"
                          )}>
                            {isOptionCorrect ? "✓" : isUserChoice ? "✗" : letter}
                          </span>

                          <div className="flex-1">
                            <span className="block">{opt.text}</span>
                            {opt.whyWrong && !isOptionCorrect && (
                              <span className="text-[11px] text-rose-600/90 block mt-1">
                                Why incorrect: {opt.whyWrong}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Explanation & Lecture Evidence */}
                  <div className="p-3.5 rounded-2xl bg-indigo-50/60 border border-indigo-100 text-xs space-y-1.5">
                    <div className="flex items-center gap-1.5 font-bold text-indigo-900">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Conceptual Breakdown & Solution:</span>
                    </div>
                    <p className="text-slate-700 leading-relaxed">{q.explanation}</p>
                    {q.evidenceQuote && (
                      <p className="text-[11px] text-slate-500 italic pt-1 border-t border-indigo-100/60">
                        "{q.evidenceQuote}"
                      </p>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    );
  }

  return null;
}
