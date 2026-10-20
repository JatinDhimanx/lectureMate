"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  Mail,
  Lock,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  RefreshCw,
  User,
  Inbox,
  ArrowLeft,
  KeyRound,
  Send,
} from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") || "/dashboard";

  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login");

  // Login form state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Signup form state
  const [signupFullName, setSignupFullName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirmPassword, setSignupConfirmPassword] = useState("");
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [signupSentConfirmation, setSignupSentConfirmation] = useState(false);

  // Forgot password state
  const [forgotEmail, setForgotEmail] = useState("");
  const [directResetUrl, setDirectResetUrl] = useState<string | null>(null);

  // Verification status
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const [resendingVerification, setResendingVerification] = useState(false);

  // Existing account alert
  const [userAlreadyExists, setUserAlreadyExists] = useState(false);

  // UI status
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const verified = searchParams.get("verified");
    if (verified === "error") {
      setErrorMessage("Verification link expired or invalid. Please request a new one.");
    } else if (verified === "true") {
      setSuccessMessage("Email verified successfully! You can now sign in with your credentials.");
    }
  }, [searchParams]);

  // Switch to login tab and prefill email
  const switchToLoginWithEmail = (email: string) => {
    setLoginEmail(email);
    setMode("login");
    setUserAlreadyExists(false);
    setErrorMessage(null);
    setSuccessMessage("Please enter your password to sign in.");
  };

  // ==========================================
  // HANDLERS: LOGIN
  // ==========================================
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setUserAlreadyExists(false);
    setUnverifiedEmail(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (res.status === 403 || data.code === "EMAIL_NOT_VERIFIED") {
          setUnverifiedEmail(loginEmail);
          throw new Error(
            data.error ||
              "Email not verified! Please check your email inbox and verify your email before logging in."
          );
        }
        throw new Error(
          data.error || "Failed to sign in. Please verify your credentials."
        );
      }

      setSuccessMessage("Signed in successfully! Redirecting to dashboard...");
      setTimeout(() => {
        router.push(redirectTo);
        router.refresh();
      }, 700);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // HANDLERS: RESEND VERIFICATION EMAIL
  // ==========================================
  const handleResendVerification = async () => {
    if (!unverifiedEmail) return;
    setResendingVerification(true);
    setErrorMessage(null);
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: unverifiedEmail }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to resend verification link.");
      }
      setSuccessMessage(
        data.message || "A new verification link has been sent to your email!"
      );
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to resend verification."
      );
    } finally {
      setResendingVerification(false);
    }
  };

  // ==========================================
  // HANDLERS: SIGNUP (SUPABASE EMAIL CONFIRMATION)
  // ==========================================
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setUserAlreadyExists(false);

    if (signupPassword !== signupConfirmPassword) {
      setErrorMessage("Passwords do not match. Please re-enter.");
      return;
    }

    if (signupPassword.length < 6) {
      setErrorMessage("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: signupEmail,
          password: signupPassword,
          fullName: signupFullName,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        // Check if account already exists
        if (
          res.status === 409 ||
          data.code === "USER_ALREADY_EXISTS" ||
          (data.error && data.error.toLowerCase().includes("already exists")) ||
          (data.error && data.error.toLowerCase().includes("already registered"))
        ) {
          setUserAlreadyExists(true);
          throw new Error("An account with this email already exists.");
        }
        throw new Error(data.error || "Failed to register account.");
      }

      if (data.hasSession) {
        setSuccessMessage("Account created successfully! Preparing your workspace...");
        setTimeout(() => {
          router.push(redirectTo);
          router.refresh();
        }, 800);
      } else {
        // Confirmation email dispatched
        setSignupSentConfirmation(true);
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // HANDLERS: FORGOT PASSWORD
  // ==========================================
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setDirectResetUrl(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to send reset link.");
      }

      if (data.resetUrl) {
        setDirectResetUrl(data.resetUrl);
      }

      setSuccessMessage(
        data.message || "Password reset instructions have been sent to your email inbox."
      );
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-indigo-50/20 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-gradient-to-br from-indigo-200/30 via-purple-200/20 to-transparent rounded-full blur-3xl pointer-events-none" />

      {/* Header / Brand */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center z-10">
        <Link href="/" className="inline-flex items-center gap-2.5 mb-6 group">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25 group-hover:scale-105 transition-transform">
            <BookOpen className="w-6 h-6" />
          </div>
          <span className="text-2xl font-black text-slate-900 tracking-tight">
            Lecture<span className="text-indigo-600">Mate</span>
          </span>
        </Link>
        <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          {mode === "login"
            ? "Welcome back"
            : mode === "signup"
            ? "Create your account"
            : "Reset your password"}
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          {mode === "login"
            ? "Access your lectures, smart flashcards, and quizzes"
            : mode === "signup"
            ? "Transform lectures into active mastery with verified access"
            : "Enter your email to receive recovery instructions"}
        </p>
      </div>

      {/* Main Form Container */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 z-10">
        <div className="bg-white py-8 px-6 sm:px-10 shadow-xl shadow-slate-200/60 rounded-3xl border border-slate-100">
          {/* Mode Switcher Tabs (Only in login or signup mode) */}
          {mode !== "forgot" && (
            <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-2xl mb-6">
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setErrorMessage(null);
                  setSuccessMessage(null);
                  setUserAlreadyExists(false);
                  setUnverifiedEmail(null);
                  setSignupSentConfirmation(false);
                }}
                className={`py-2 text-xs font-semibold rounded-xl transition-all ${
                  mode === "login"
                    ? "bg-white text-indigo-600 shadow-sm"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Log In
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("signup");
                  setErrorMessage(null);
                  setSuccessMessage(null);
                  setUserAlreadyExists(false);
                  setUnverifiedEmail(null);
                  setSignupSentConfirmation(false);
                }}
                className={`py-2 text-xs font-semibold rounded-xl transition-all ${
                  mode === "signup"
                    ? "bg-white text-indigo-600 shadow-sm"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                Sign Up
              </button>
            </div>
          )}

          {/* Feedback alerts */}
          <AnimatePresence>
            {/* Account Already Exists Highlight Banner */}
            {userAlreadyExists && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mb-5 p-4 rounded-2xl bg-amber-50 border border-amber-200/80 text-amber-950 space-y-2 text-xs"
              >
                <div className="flex items-center gap-2 font-bold text-amber-900">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Account Already Exists!</span>
                </div>
                <p className="text-amber-800 leading-relaxed">
                  An account with <strong>{signupEmail}</strong> is already registered.
                </p>
                <button
                  type="button"
                  onClick={() => switchToLoginWithEmail(signupEmail)}
                  className="w-full py-2 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition-colors shadow-xs flex items-center justify-center gap-1.5"
                >
                  <span>Click Here to Log In</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            )}

            {/* Email Not Verified Alert Banner */}
            {unverifiedEmail && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mb-5 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 space-y-2 text-xs"
              >
                <div className="flex items-center gap-2 font-bold text-amber-900">
                  <Mail className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Email Verification Required</span>
                </div>
                <p className="text-amber-800 leading-relaxed">
                  Please verify your email before logging in. A confirmation link was sent to <strong>{unverifiedEmail}</strong>.
                </p>
                <div className="pt-1 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={handleResendVerification}
                    disabled={resendingVerification}
                    className="py-1.5 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-[11px] transition-colors flex items-center gap-1.5 disabled:opacity-60 shadow-xs"
                  >
                    {resendingVerification ? (
                      <RefreshCw className="w-3 h-3 animate-spin" />
                    ) : (
                      <Send className="w-3 h-3" />
                    )}
                    <span>Resend Verification Email</span>
                  </button>
                  <span className="text-[11px] text-amber-700 font-medium">Check Spam folder</span>
                </div>
              </motion.div>
            )}

            {!userAlreadyExists && !unverifiedEmail && errorMessage && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3 text-red-700 text-xs font-medium"
              >
                <AlertCircle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
                <span>{errorMessage}</span>
              </motion.div>
            )}

            {successMessage && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mb-5 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex flex-col gap-2 text-emerald-800 text-xs font-medium"
              >
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
                  <span>{successMessage}</span>
                </div>
                {directResetUrl && mode === "forgot" && (
                  <div className="pt-2 border-t border-emerald-200/60 mt-1">
                    <Link
                      href={directResetUrl}
                      className="inline-flex items-center gap-1.5 font-bold text-xs text-indigo-700 hover:text-indigo-900 bg-white px-3 py-1.5 rounded-lg border border-indigo-100 shadow-xs hover:shadow-sm transition-all"
                    >
                      <KeyRound className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Click here to reset your password directly</span>
                      <ArrowRight className="w-3 h-3 text-indigo-600" />
                    </Link>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* ======================================================
              1. LOGIN VIEW
          ====================================================== */}
          {mode === "login" && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="student@university.edu"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setForgotEmail(loginEmail);
                      setMode("forgot");
                      setErrorMessage(null);
                      setSuccessMessage(null);
                    }}
                    className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showLoginPassword ? "text" : "password"}
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold text-sm shadow-md shadow-indigo-500/25 transition-all hover:shadow-lg disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
              >
                {loading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* ======================================================
              2. SIGNUP VIEW (SUPABASE EMAIL CONFIRMATION)
          ====================================================== */}
          {mode === "signup" && (
            <div>
              {signupSentConfirmation ? (
                /* Confirmation Email Sent State */
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-6 space-y-4"
                >
                  <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                    <Inbox className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Check Your Email</h3>
                    <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                      We have sent an activation link to:
                    </p>
                    <p className="text-sm font-bold text-indigo-600 mt-1">{signupEmail}</p>
                    <p className="text-xs text-slate-400 mt-3 leading-relaxed">
                      Please click the link in your email to confirm your account. After confirming, you can sign in below.
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      setMode("login");
                      setLoginEmail(signupEmail);
                      setSignupSentConfirmation(false);
                    }}
                    className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition-all mt-4"
                  >
                    Go to Log In
                  </button>
                </motion.div>
              ) : (
                /* Standard Sign Up Form */
                <form onSubmit={handleSignup} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Full Name
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        value={signupFullName}
                        onChange={(e) => setSignupFullName(e.target.value)}
                        placeholder="Alex Morgan"
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        required
                        value={signupEmail}
                        onChange={(e) => {
                          setSignupEmail(e.target.value);
                          if (userAlreadyExists) setUserAlreadyExists(false);
                        }}
                        placeholder="scholar@university.edu"
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type={showSignupPassword ? "text" : "password"}
                        required
                        value={signupPassword}
                        onChange={(e) => setSignupPassword(e.target.value)}
                        placeholder="At least 6 characters"
                        className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSignupPassword(!showSignupPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showSignupPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="password"
                        required
                        value={signupConfirmPassword}
                        onChange={(e) => setSignupConfirmPassword(e.target.value)}
                        placeholder="Repeat your password"
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold text-sm shadow-md shadow-indigo-500/25 transition-all hover:shadow-lg disabled:opacity-50 flex items-center justify-center gap-2 mt-4"
                  >
                    {loading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <span>Create Account</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* ======================================================
              3. FORGOT PASSWORD VIEW
          ====================================================== */}
          {mode === "forgot" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <button
                  type="button"
                  onClick={() => {
                    setMode("login");
                    setErrorMessage(null);
                    setSuccessMessage(null);
                  }}
                  className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
                  title="Back to login"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-bold text-slate-700">Back to Log In</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-100 text-xs text-indigo-900 leading-relaxed">
                Enter your account email address below. We'll send you a secure link to reset your password.
              </div>

              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Account Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="student@university.edu"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !forgotEmail}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold text-sm shadow-md shadow-indigo-500/25 transition-all hover:shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <KeyRound className="w-4 h-4" />
                      <span>Send Password Reset Link</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
