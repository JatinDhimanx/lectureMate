"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Sliders, Key, ShieldCheck, Database, Save, RotateCcw, Check, Sparkles } from "lucide-react";

export default function SettingsPage() {
  const [retentionRate, setRetentionRate] = useState(0.9);
  const [maxInterval, setMaxInterval] = useState(365);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    localStorage.setItem("fsrs_retention", retentionRate.toString());
    localStorage.setItem("fsrs_max_interval", maxInterval.toString());
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="px-6 sm:px-10 py-10 max-w-4xl mx-auto">
      <div className="mb-8">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 text-purple-700 text-xs font-semibold mb-2">
          <Sparkles className="w-3.5 h-3.5" />
          <span>FSRS Engine & API Configuration</span>
        </div>
        <h1 className="text-3xl font-extrabold text-[#0F172A] tracking-tight">Settings & Preferences</h1>
        <p className="text-slate-500 text-xs sm:text-sm mt-1">
          Tune your FSRS v5 spaced repetition parameters and Gemini AI integration.
        </p>
      </div>

      <div className="space-y-6">
        {/* FSRS Spaced Repetition Settings */}
        <div className="rounded-3xl border border-slate-100 bg-white p-7 shadow-soft">
          <div className="flex items-center gap-3.5 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Sliders className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">FSRS Spaced Repetition Parameters</h2>
              <p className="text-xs text-slate-400">Free Spaced Repetition Scheduler (v5 algorithm)</p>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Target Retention Rate: <span className="text-indigo-600 font-extrabold">{Math.round(retentionRate * 100)}%</span>
                </label>
                <span className="text-xs font-semibold text-slate-400">Default: 90%</span>
              </div>
              <input
                type="range"
                min="0.75"
                max="0.97"
                step="0.01"
                value={retentionRate}
                onChange={(e) => setRetentionRate(parseFloat(e.target.value))}
                className="w-full accent-indigo-600 cursor-pointer"
              />
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                Higher retention increases review frequency. 90% is empirically the optimal balance between study workload and long-term retention.
              </p>
            </div>

            <div className="pt-5 border-t border-slate-100">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Maximum Review Interval: <span className="text-indigo-600 font-extrabold">{maxInterval} days</span>
                </label>
              </div>
              <input
                type="range"
                min="30"
                max="730"
                step="30"
                value={maxInterval}
                onChange={(e) => setMaxInterval(parseInt(e.target.value))}
                className="w-full accent-indigo-600 cursor-pointer"
              />
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                Caps the longest interval a card can be scheduled into the future.
              </p>
            </div>
          </div>
        </div>

        {/* Gemini API Key info */}
        <div className="rounded-3xl border border-slate-100 bg-white p-7 shadow-soft">
          <div className="flex items-center gap-3.5 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Key className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Google Gemini Integration</h2>
              <p className="text-xs text-slate-400">Gemini 2.0 Flash for structured card extraction and misconception diagnostics</p>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs text-slate-600 space-y-3">
            <div className="flex items-center gap-2 text-emerald-700 font-bold">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Offline Verified Fallback Active</span>
            </div>
            <p className="leading-relaxed">
              To use live Gemini Flash generation, add your API key in <code className="text-indigo-600 bg-indigo-50 font-semibold px-2 py-0.5 rounded-lg border border-indigo-200/60">.env.local</code> as:
            </p>
            <pre className="p-3 rounded-xl bg-white text-indigo-950 font-mono text-[11px] border border-slate-200">
              GEMINI_API_KEY=AIzaSy...
            </pre>
            <p className="text-slate-500 leading-relaxed">
              When omitted, LectureMate seamlessly operates with deterministic verified sample extraction so all study tools, cards, and quizzes remain fully functional.
            </p>
          </div>
        </div>

        {/* Save button */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-7 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-sm font-bold shadow-md shadow-indigo-500/20 transition-all hover:shadow-lg"
          >
            {saved ? (
              <>
                <Check className="w-4 h-4 text-white" />
                Saved Preferences!
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
