"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, Send, Sparkles, Bot, User, RefreshCw, BookOpen, Quote } from "lucide-react";

interface Message {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp: string;
}

export function LectureQAModule({
  lectureId,
  lectureTitle,
  suggestedConcepts = [],
  cleanTranscript,
  concepts,
}: {
  lectureId: string;
  lectureTitle: string;
  suggestedConcepts?: string[];
  cleanTranscript?: string;
  concepts?: Array<{ name: string; definition: string }>;
}) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      sender: "ai",
      text: `Hello! I have studied the full transcript for "${lectureTitle}". Ask me anything about what the professor explained, key formulas, concepts, or exam cues!`,
      timestamp: "Just now",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSend = async (questionText?: string) => {
    const q = questionText || input.trim();
    if (!q || loading) return;

    const userMsg: Message = {
      id: "user-" + Date.now(),
      sender: "user",
      text: q,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!questionText) setInput("");
    setLoading(true);

    try {
      const res = await fetch(`/api/lectures/${lectureId}/qa`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lectureId,
          question: q,
          lectureTitle,
          transcript: cleanTranscript,
          concepts,
        }),
      });

      const data = await res.json();
      const aiMsg: Message = {
        id: "ai-" + Date.now(),
        sender: "ai",
        text: data.answer || "I could not find a clear reference in the lecture transcript.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: "err-" + Date.now(),
          sender: "ai",
          text: "Sorry, I had trouble retrieving the explanation from the lecture. Please try again.",
          timestamp: "Just now",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-3xl border border-slate-100 bg-white shadow-soft overflow-hidden flex flex-col h-[600px]">
      {/* Header */}
      <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-indigo-50/60 to-purple-50/60">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span>Ask the Lecture</span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                AI Q&A
              </span>
            </h3>
            <p className="text-[11px] text-slate-500">Grounded exclusively in this lecture transcript</p>
          </div>
        </div>
      </div>

      {/* Suggested chips */}
      {suggestedConcepts.length > 0 && (
        <div className="px-5 py-2.5 bg-slate-50/80 border-b border-slate-100 flex items-center gap-2 overflow-x-auto text-xs">
          <span className="text-slate-400 font-medium shrink-0 flex items-center gap-1 text-[11px]">
            <Sparkles className="w-3 h-3 text-indigo-500" /> Ask about:
          </span>
          {suggestedConcepts.map((concept, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(`Can you explain "${concept}" from this lecture and how it was applied?`)}
              className="px-2.5 py-1 rounded-xl bg-white border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/40 text-slate-700 text-[11px] font-medium shrink-0 transition-colors shadow-2xs"
            >
              {concept}
            </button>
          ))}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {messages.map((m) => (
          <motion.div
            key={m.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex items-start gap-3 ${m.sender === "user" ? "flex-row-reverse" : "flex-row"}`}
          >
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold ${
                m.sender === "user"
                  ? "bg-slate-800 text-white"
                  : "bg-indigo-600 text-white shadow-xs"
              }`}
            >
              {m.sender === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>

            <div
              className={`max-w-[82%] sm:max-w-[75%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed ${
                m.sender === "user"
                  ? "bg-indigo-600 text-white shadow-sm rounded-tr-none"
                  : "bg-slate-50 border border-slate-100 text-slate-800 rounded-tl-none whitespace-pre-wrap"
              }`}
            >
              <p>{m.text}</p>
              <span
                className={`block text-[10px] mt-2 font-medium ${
                  m.sender === "user" ? "text-indigo-200" : "text-slate-400"
                }`}
              >
                {m.timestamp}
              </span>
            </div>
          </motion.div>
        ))}

        {loading && (
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 rounded-tl-none flex items-center gap-2 text-xs text-slate-500">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-600" />
              <span>Analyzing transcript and synthesizing answer...</span>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="p-3 sm:p-4 border-t border-slate-100 bg-white flex items-center gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question about this lecture..."
          className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="w-10 h-10 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white flex items-center justify-center shrink-0 shadow-md shadow-indigo-500/25 disabled:opacity-50 transition-all"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
