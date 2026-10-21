"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sliders,
  Lock,
  Eye,
  EyeOff,
  User,
  LogOut,
  Save,
  Check,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Shield,
} from "lucide-react";

export default function SettingsPage() {
  // Current user info
  const [user, setUser] = useState<{ id: string; email: string; name: string } | null>(null);

  // FSRS settings
  const [retentionRate, setRetentionRate] = useState(0.9);
  const [maxInterval, setMaxInterval] = useState(365);
  const [savedSettings, setSavedSettings] = useState(false);

  // Password update state
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data?.user) setUser(data.user);
      })
      .catch(() => {});

    const storedRetention = localStorage.getItem("fsrs_retention");
    if (storedRetention) setRetentionRate(parseFloat(storedRetention));

    const storedMax = localStorage.getItem("fsrs_max_interval");
    if (storedMax) setMaxInterval(parseInt(storedMax));
  }, []);

  const handleSaveFsrs = () => {
    localStorage.setItem("fsrs_retention", retentionRate.toString());
    localStorage.setItem("fsrs_max_interval", maxInterval.toString());
    setSavedSettings(true);
    setTimeout(() => setSavedSettings(false), 2000);
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match. Please re-enter.");
      return;
    }

    setPasswordLoading(true);

    try {
      const res = await fetch("/api/auth/update-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword, confirmPassword }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update password.");
      }

      setPasswordSuccess("Password updated successfully!");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: unknown) {
      setPasswordError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // ignore
    }
    window.location.href = "/auth/login";
  };

  return (
    <div className="px-4 sm:px-10 py-6 sm:py-10 max-w-4xl mx-auto space-y-6 sm:space-y-8">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 text-purple-700 text-xs font-semibold mb-2">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Account & Study Engine Configuration</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] tracking-tight">Settings & Preferences</h1>
        <p className="text-slate-500 text-xs sm:text-sm mt-1">
          Manage your account credentials, security, and tune your FSRS v5 spaced repetition algorithm.
        </p>
      </div>

      <div className="space-y-6">
        {/* ======================================================
            1. ACCOUNT PROFILE & SIGN OUT
        ====================================================== */}
        <div className="rounded-3xl border border-slate-200/80 bg-white p-5 sm:p-7 shadow-soft flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white font-extrabold text-lg sm:text-xl flex items-center justify-center shadow-md shadow-indigo-500/20 shrink-0">
              {user?.name ? user.name.charAt(0).toUpperCase() : user?.email ? user.email.charAt(0).toUpperCase() : "U"}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">{user?.name || "Student"}</h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Active
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">{user?.email || "Signed In"}</p>
              <p className="text-[11px] text-slate-400 mt-1 font-mono">User ID: {user?.id || "Session active"}</p>
            </div>
          </div>

          <button
            onClick={handleSignOut}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-rose-200 bg-rose-50/70 hover:bg-rose-100/80 text-rose-700 font-semibold text-xs sm:text-sm transition-all shadow-xs"
          >
            <LogOut className="w-4 h-4 text-rose-600" />
            <span>Sign Out of Account</span>
          </button>
        </div>

        {/* ======================================================
            2. UPDATE PASSWORD (REPLACED GEMINI API)
        ====================================================== */}
        <div className="rounded-3xl border border-slate-200/80 bg-white p-5 sm:p-7 shadow-soft">
          <div className="flex items-center gap-3.5 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <Lock className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Account Password & Security</h2>
              <p className="text-xs text-slate-400">Update your account login password</p>
            </div>
          </div>

          <form onSubmit={handleUpdatePassword} className="space-y-4 max-w-lg">
            <AnimatePresence>
              {passwordError && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2"
                >
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                  <span>{passwordError}</span>
                </motion.div>
              )}

              {passwordSuccess && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{passwordSuccess}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? "text" : "password"}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter at least 6 characters"
                  className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={passwordLoading}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs sm:text-sm shadow-sm transition-all disabled:opacity-50"
            >
              {passwordLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Shield className="w-4 h-4" />
                  <span>Update Password</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* ======================================================
            3. FSRS SPACED REPETITION SETTINGS
        ====================================================== */}
        <div className="rounded-3xl border border-slate-200/80 bg-white p-5 sm:p-7 shadow-soft">
          <div className="flex items-center gap-3.5 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
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

          <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-100 mt-6">
            <button
              onClick={handleSaveFsrs}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-indigo-500/20 transition-all hover:shadow-lg"
            >
              {savedSettings ? (
                <>
                  <Check className="w-4 h-4 text-white" />
                  Saved Parameters!
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save FSRS Settings
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
