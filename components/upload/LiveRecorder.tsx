"use client";

import { useState, useRef, useEffect } from "react";
import { Mic, Square, Play, Pause, RotateCcw, Upload, Volume2 } from "lucide-react";
import { motion } from "framer-motion";

interface LiveRecorderProps {
  onRecordingComplete: (audioFile: File) => void;
}

export function LiveRecorder({ onRecordingComplete }: LiveRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isRecording && !isPaused) {
      timerRef.current = setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording, isPaused]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const url = URL.createObjectURL(blob);
        setAudioBlob(blob);
        setAudioUrl(url);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(250);
      setIsRecording(true);
      setIsPaused(false);
      setSeconds(0);
      setAudioUrl(null);
      setAudioBlob(null);
    } catch (err) {
      console.error("Microphone access denied or error:", err);
      alert("Microphone access is required to record live lecture audio.");
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      if (isPaused) {
        mediaRecorderRef.current.resume();
        setIsPaused(false);
      } else {
        mediaRecorderRef.current.pause();
        setIsPaused(true);
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
    }
  };

  const resetRecording = () => {
    setIsRecording(false);
    setIsPaused(false);
    setSeconds(0);
    setAudioUrl(null);
    setAudioBlob(null);
  };

  const submitRecording = () => {
    if (!audioBlob) return;
    const file = new File([audioBlob], `lecture-recording-${Date.now()}.webm`, {
      type: "audio/webm",
    });
    onRecordingComplete(file);
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remaining = secs % 60;
    return `${mins.toString().padStart(2, "0")}:${remaining.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 rounded-3xl border border-slate-200 bg-slate-50/70 text-center">
      {/* Microphone Status Indicator */}
      <div className="relative mb-6">
        <motion.div
          animate={
            isRecording && !isPaused
              ? { scale: [1, 1.25, 1], opacity: [0.3, 0.7, 0.3] }
              : { scale: 1, opacity: 0.1 }
          }
          transition={{ repeat: Infinity, duration: 1.8 }}
          className="absolute inset-0 rounded-full bg-rose-500 blur-xl"
        />
        <div
          className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all ${
            isRecording
              ? "bg-rose-100 border-2 border-rose-500 text-rose-600 shadow-lg shadow-rose-500/20"
              : "bg-indigo-50 border border-indigo-200 text-indigo-600 shadow-sm"
          }`}
        >
          <Mic className={`w-8 h-8 ${isRecording && !isPaused ? "animate-pulse" : ""}`} />
        </div>
      </div>

      {/* Timer Display */}
      <div className="text-3xl font-mono font-extrabold text-slate-900 mb-2">
        {formatTime(seconds)}
      </div>
      <p className="text-xs text-slate-500 mb-6 font-medium">
        {isRecording
          ? isPaused
            ? "Recording paused"
            : "Recording live audio... (auto-chunked for LLM)"
          : audioUrl
          ? "Recording finished! Preview audio below."
          : "Click start to record your lecture in real-time."}
      </p>

      {/* Audio Playback Preview */}
      {audioUrl && (
        <div className="w-full max-w-sm mb-6 bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
          <audio src={audioUrl} controls className="w-full" />
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        {!isRecording && !audioUrl && (
          <button
            type="button"
            onClick={startRecording}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-indigo-500/20 transition-all"
          >
            <Mic className="w-4 h-4" /> Start Recording
          </button>
        )}

        {isRecording && (
          <>
            <button
              type="button"
              onClick={pauseRecording}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-100 transition-colors"
            >
              {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
              {isPaused ? "Resume" : "Pause"}
            </button>
            <button
              type="button"
              onClick={stopRecording}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm transition-all"
            >
              <Square className="w-4 h-4 fill-current" /> Stop
            </button>
          </>
        )}

        {audioUrl && (
          <>
            <button
              type="button"
              onClick={resetRecording}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-100 transition-colors"
            >
              <RotateCcw className="w-4 h-4" /> Re-record
            </button>
            <button
              type="button"
              onClick={submitRecording}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-all"
            >
              <Upload className="w-4 h-4" /> Use This Recording
            </button>
          </>
        )}
      </div>
    </div>
  );
}
