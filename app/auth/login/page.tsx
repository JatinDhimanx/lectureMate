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
  ArrowLeft,
  KeyRound,
  ShieldCheck,
} from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") || "/dashboard";

  const [mode, setMode] = useState<"login" | "signup" | "forgot" | "verify-signup">("login");

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

  // Email verification state (for new account activation)
  const [verifyEmailAddress, setVerifyEmailAddress] = useState("");
  const [verifyOtp, setVerifyOtp] = useState("");
  const [verifyingEmailOtp, setVerifyingEmailOtp] = useState(false);

  // Forgot password state
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotStep, setForgotStep] = useState<"email" | "otp">("email");
  const [forgotOtp, setForgotOtp] = useState("");
  const [verifyingResetOtp, setVerifyingResetOtp] = useState(false);

  // UI status
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [resendingVerification, setResendingVerification] = useState(false);

  useEffect(() => {
    const verified = searchParams.get("verified");
    const reset = searchParams.get("reset");
    const emailParam = searchParams.get("email");

    if (emailParam) {
      setLoginEmail(emailParam);
    }

    if (verified === "error") {
      setErrorMessage("Verification code expired or invalid. Please request a new code.");
      setMode("login");
    } else if (verified === "locked") {
      const remaining = searchParams.get("remaining") || "15";
      setErrorMessage(`Account temporarily locked due to 5 failed attempts. Please wait ${remaining} minutes.`);
      setMode("login");
    } else if (verified === "true") {
      setSuccessMessage("Your email has been verified successfully! Please sign in with your credentials.");
      setMode("login");
    } else if (reset === "success") {
      setSuccessMessage("Password reset successfully! Please sign in with your new password.");
      setMode("login");
    } else if (searchParams.get("logged_out")) {
      setSuccessMessage("You have been successfully signed out.");
      setMode("login");

      window.history.pushState(null, "", window.location.href);
      const handlePopState = () => {
        window.history.pushState(null, "", window.location.href);
      };
      window.addEventListener("popstate", handlePopState);
      return () => {
        window.removeEventListener("popstate", handlePopState);
      };
    }
  }, [searchParams]);

  // ==========================================
  // HANDLERS: RESEND VERIFICATION OTP
  // ==========================================
  const handleResendVerification = async () => {
    const target = verifyEmailAddress || loginEmail;
    if (!target) return;
    setResendingVerification(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: target }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to resend verification email.");
      }
      setSuccessMessage(
        data.message || `A new 6-digit verification code has been sent to ${target}! Please check your email inbox.`
      );
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to resend verification code."
      );
    } finally {
      setResendingVerification(false);
    }
  };

  // ==========================================
  // HANDLERS: LOGIN
  // ==========================================
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });

      const data = await res.json();
      if (!res.ok) {
        // If user is not verified, strictly redirect to OTP verification screen
        if (data.code === "EMAIL_NOT_VERIFIED") {
          setVerifyEmailAddress(loginEmail.trim().toLowerCase());
          setMode("verify-signup");
          setErrorMessage(data.error || "Please verify your email before signing in.");
          setLoading(false);
          return;
        }
        throw new Error(data.error || "Failed to sign in. Please verify your credentials.");
      }

      setSuccessMessage("Signed in successfully! Loading your study dashboard...");
      setTimeout(() => {
        router.push(redirectTo);
        router.refresh();
      }, 600);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Something went wrong.");
      setLoading(false);
    }
  };

  // ==========================================
  // HANDLERS: SIGNUP
  // ==========================================
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (signupPassword !== signupConfirmPassword) {
      setErrorMessage("Passwords do not match. Please re-enter.");
      return;
    }

    if (signupPassword.length < 6) {
      setErrorMessage("Password must be at least 6 characters long.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: signupFullName,
          email: signupEmail,
          password: signupPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create account.");
      }

      // Transition immediately to the OTP Verification screen for the new user
      setVerifyEmailAddress(signupEmail.trim().toLowerCase());
      setVerifyOtp("");
      setMode("verify-signup");
      setSuccessMessage(
        data.message || `Account created! A 6-digit verification code has been sent to ${signupEmail}.`
      );
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // HANDLERS: VERIFY EMAIL OTP (ACTIVATE ACCOUNT)
  // ==========================================
  const handleVerifyEmailOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanOtp = verifyOtp.trim();
    if (cleanOtp.length < 6) {
      setErrorMessage("Please enter the complete 6-digit verification code.");
      return;
    }

    setVerifyingEmailOtp(true);

    try {
      const res = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: verifyEmailAddress,
          token: cleanOtp,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Invalid or expired verification code.");
      }

      setSuccessMessage("Email verified successfully! Taking you to your dashboard...");
      setTimeout(() => {
        router.push(data.redirectTo || "/dashboard");
        router.refresh();
      }, 700);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to verify email code.");
    } finally {
      setVerifyingEmailOtp(false);
    }
  };

  // ==========================================
  // HANDLERS: FORGOT PASSWORD (STEP 1: SEND OTP)
  // ==========================================
  const handleForgotPassword = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to process password reset request.");
      }

      setForgotStep("otp");
      setForgotOtp("");
      setSuccessMessage(
        "A 6-digit reset code has been sent to your email. Enter it below to proceed."
      );
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // HANDLERS: FORGOT PASSWORD (STEP 2: VERIFY OTP)
  // ==========================================
  const handleVerifyResetCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanOtp = forgotOtp.trim();
    if (cleanOtp.length < 6) {
      setErrorMessage("Please enter the complete 6-digit verification code.");
      return;
    }

    setVerifyingResetOtp(true);
    try {
      const res = await fetch("/api/auth/verify-reset-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail, code: cleanOtp }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Invalid or expired 6-digit code.");
      }

      setSuccessMessage("Code verified successfully! Redirecting to set new password...");
      setTimeout(() => {
        router.push(`/auth/reset-password?email=${encodeURIComponent(forgotEmail)}`);
      }, 700);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to verify code.");
    } finally {
      setVerifyingResetOtp(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFD] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-[440px]">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white py-10 px-6 sm:px-10 rounded-3xl border border-slate-200/90 shadow-sm"
        >
          {/* Logo & Header */}
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex items-center gap-2 mb-4 group">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-sm transition-transform group-hover:scale-105">
                <BookOpen className="w-5 h-5" />
              </div>
              <span className="text-xl font-bold text-slate-900 tracking-tight">
                Lecture<span className="text-indigo-600">Mate</span>
              </span>
            </Link>

            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              {mode === "login" && "Sign in"}
              {mode === "signup" && "Create your account"}
              {mode === "verify-signup" && "Verify your email"}
              {mode === "forgot" && (forgotStep === "otp" ? "Enter verification code" : "Account recovery")}
            </h1>

            <p className="mt-1 text-xs text-slate-500">
              {mode === "login" && "to continue to your LectureMate dashboard"}
              {mode === "signup" && "Turn lectures into active recall flashcards & quizzes"}
              {mode === "verify-signup" && "Enter the 6-digit code sent to your email to activate your account"}
              {mode === "forgot" && (forgotStep === "otp" ? "Enter the 6-digit passcode sent to your email" : "Enter your email to receive password reset instructions")}
            </p>
          </div>

          {/* Feedback Alerts */}
          <AnimatePresence mode="wait">
            {errorMessage && (
              <motion.div
                key="error"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mb-5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex flex-col gap-2"
              >
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
                  <span className="flex-1">{errorMessage}</span>
                </div>
              </motion.div>
            )}

            {successMessage && (
              <motion.div
                key="success"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mb-5 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-start gap-2.5"
              >
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
                <span>{successMessage}</span>
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
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
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
                      setMode("forgot");
                      setForgotEmail(loginEmail);
                      setErrorMessage(null);
                      setSuccessMessage(null);
                    }}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
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
                    placeholder="Enter your password"
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                  >
                    {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setMode("signup");
                    setErrorMessage(null);
                    setSuccessMessage(null);
                  }}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold py-2"
                >
                  Create account
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  className="py-2.5 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <span>Sign in</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* ======================================================
              2. SIGNUP VIEW
          ====================================================== */}
          {mode === "signup" && (
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
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
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
                    onChange={(e) => setSignupEmail(e.target.value)}
                    placeholder="alex@university.edu"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
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
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSignupPassword(!showSignupPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
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
                    placeholder="Repeat password"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setMode("login");
                    setErrorMessage(null);
                    setSuccessMessage(null);
                  }}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold py-2"
                >
                  Sign in instead
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  className="py-2.5 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <span>Next</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* ======================================================
              3. VERIFY SIGNUP OTP VIEW (STRICT MANDATORY GATE)
          ====================================================== */}
          {mode === "verify-signup" && (
            <form onSubmit={handleVerifyEmailOtp} className="space-y-4">
              {/* Target Email Notice */}
              <div className="p-3.5 rounded-2xl bg-indigo-50/80 border border-indigo-100 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase font-bold text-indigo-700 tracking-wider">
                      OTP Sent via Nodemailer
                    </p>
                    <p className="text-xs font-semibold text-slate-900 truncate">
                      {verifyEmailAddress || "Your email"}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setMode("signup");
                    setErrorMessage(null);
                    setSuccessMessage(null);
                  }}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 shrink-0"
                >
                  Change
                </button>
              </div>

              {/* 6-Digit OTP Code Input (Strict manual entry, no autofill) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    6-Digit Security Code (OTP)
                  </label>
                  <button
                    type="button"
                    onClick={handleResendVerification}
                    disabled={resendingVerification}
                    className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold disabled:opacity-50"
                  >
                    {resendingVerification ? "Sending..." : "Resend code"}
                  </button>
                </div>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    maxLength={6}
                    autoFocus
                    autoComplete="off"
                    value={verifyOtp}
                    onChange={(e) => setVerifyOtp(e.target.value.replace(/\D/g, ""))}
                    placeholder="Enter 6-digit code"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base tracking-widest font-mono font-bold text-slate-900 placeholder:tracking-normal placeholder:font-sans placeholder:font-normal placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all text-center"
                  />
                </div>
                <p className="mt-1 text-[11px] text-slate-500">
                  Check your email inbox or spam folder for the 6-digit code.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setMode("login");
                    setErrorMessage(null);
                    setSuccessMessage(null);
                  }}
                  className="text-xs text-slate-600 hover:text-slate-900 font-semibold py-2 flex items-center gap-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
                </button>

                <button
                  type="submit"
                  disabled={verifyingEmailOtp || verifyOtp.length < 6}
                  className="py-2.5 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {verifyingEmailOtp ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <span>Verify & Access Dashboard</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* ======================================================
              4. FORGOT PASSWORD VIEW (Two-Step: Email -> OTP Verification)
          ====================================================== */}
          {mode === "forgot" && (
            <div>
              {forgotStep === "email" ? (
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Account Email
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        required
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        placeholder="student@university.edu"
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
                      />
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setMode("login");
                        setForgotStep("email");
                        setErrorMessage(null);
                        setSuccessMessage(null);
                      }}
                      className="text-xs text-slate-600 hover:text-slate-900 font-semibold py-2 flex items-center gap-1"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" /> Back
                    </button>

                    <button
                      type="submit"
                      disabled={loading || !forgotEmail}
                      className="py-2.5 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {loading ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <span>Send reset code</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleVerifyResetCode} className="space-y-4">
                  {/* Target Email Badge */}
                  <div className="p-3 rounded-2xl bg-indigo-50/80 border border-indigo-100 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                        <Mail className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] uppercase font-bold text-indigo-700 tracking-wider">
                          Code sent to
                        </p>
                        <p className="text-xs font-semibold text-slate-900 truncate">
                          {forgotEmail || "Your account"}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setForgotStep("email");
                        setErrorMessage(null);
                        setSuccessMessage(null);
                      }}
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 shrink-0"
                    >
                      Change
                    </button>
                  </div>

                  {/* 6-Digit OTP Code Input */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-semibold text-slate-700">
                        6-Digit Security Code
                      </label>
                      <button
                        type="button"
                        onClick={() => handleForgotPassword()}
                        disabled={loading}
                        className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold disabled:opacity-50"
                      >
                        {loading ? "Sending..." : "Resend code"}
                      </button>
                    </div>
                    <div className="relative">
                      <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        maxLength={6}
                        autoFocus
                        autoComplete="off"
                        value={forgotOtp}
                        onChange={(e) => setForgotOtp(e.target.value.replace(/\D/g, ""))}
                        placeholder="Enter 6-digit code"
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base tracking-widest font-mono font-bold text-slate-900 placeholder:tracking-normal placeholder:font-sans placeholder:font-normal placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all text-center"
                      />
                    </div>
                    <p className="mt-1 text-[11px] text-slate-500">
                      Check your email inbox or spam folder for the 6-digit code.
                    </p>
                  </div>

                  <div className="pt-2 flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setForgotStep("email");
                        setErrorMessage(null);
                        setSuccessMessage(null);
                      }}
                      className="text-xs text-slate-600 hover:text-slate-900 font-semibold py-2 flex items-center gap-1"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" /> Back
                    </button>

                    <button
                      type="submit"
                      disabled={verifyingResetOtp || forgotOtp.length < 6}
                      className="py-2.5 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {verifyingResetOtp ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <span>Verify & Proceed</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>

                  <div className="text-center pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => {
                        setMode("login");
                        setForgotStep("email");
                        setErrorMessage(null);
                        setSuccessMessage(null);
                      }}
                      className="text-xs text-slate-600 hover:text-slate-900 font-semibold"
                    >
                      ← Back to Sign in
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F8FAFD] flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
