"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Save, Trash2, Plus, Sparkles, HelpCircle } from "lucide-react";
import type { DemoLectureData } from "@/lib/db/mock-data";

interface CardEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  card?: DemoLectureData["cards"][0] | null;
  lectureId: string;
  onSaved: (card: DemoLectureData["cards"][0]) => void;
  onDeleted?: (cardId: string) => void;
}

export function CardEditorModal({
  isOpen,
  onClose,
  card,
  lectureId,
  onSaved,
  onDeleted,
}: CardEditorModalProps) {
  const isEditing = !!card;
  const [front, setFront] = useState(card?.front || "");
  const [back, setBack] = useState(card?.back || "");
  const [archetype, setArchetype] = useState(card?.type || "basic");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!front.trim() || !back.trim()) return;
    setSaving(true);
    try {
      if (isEditing && card) {
        const res = await fetch(`/api/lectures/${lectureId}/cards`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cardId: card.id, front, back, archetype }),
        });
        const updated = await res.json();
        onSaved(updated);
      } else {
        const res = await fetch(`/api/lectures/${lectureId}/cards`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ front, back, archetype }),
        });
        const created = await res.json();
        onSaved(created);
      }
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!card || !onDeleted) return;
    if (!confirm("Are you sure you want to delete this flashcard?")) return;
    setDeleting(true);
    try {
      await fetch(`/api/lectures/${lectureId}/cards?cardId=${card.id}`, {
        method: "DELETE",
      });
      onDeleted(card.id);
      onClose();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="w-full max-w-lg rounded-3xl bg-white border border-slate-100 shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                {isEditing ? <Sparkles className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
              </div>
              <h3 className="text-base font-bold text-slate-900">
                {isEditing ? "Edit Flashcard" : "Create New Flashcard"}
              </h3>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <div className="p-6 space-y-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                Card Archetype
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "basic", label: "Basic Q/A" },
                  { id: "cloze", label: "Cloze Deletion" },
                  { id: "why_how", label: "Why / How" },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setArchetype(t.id as any)}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                      archetype === t.id
                        ? "bg-indigo-50 border-indigo-300 text-indigo-700 shadow-xs"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                Front (Question / Prompt)
              </label>
              <textarea
                rows={3}
                value={front}
                onChange={(e) => setFront(e.target.value)}
                placeholder="e.g., What are the three guarantees of the CAP theorem?"
                className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none font-sans"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                Back (Answer / Explanation)
              </label>
              <textarea
                rows={4}
                value={back}
                onChange={(e) => setBack(e.target.value)}
                placeholder="e.g., Consistency, Availability, and Partition Tolerance..."
                className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none font-sans"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
            {isEditing && onDeleted ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {deleting ? "Deleting..." : "Delete Card"}
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || !front.trim() || !back.trim()}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold shadow-sm transition-all"
              >
                <Save className="w-3.5 h-3.5" />
                {saving ? "Saving..." : "Save Card"}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
