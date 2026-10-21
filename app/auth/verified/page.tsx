"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { BookOpen, CheckCircle2, ArrowRight, ShieldCheck, Mail } from "lucide-react";

function VerifiedContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    if (countdown <= 0) {
      const target = `/auth/login?verified=true${email ? `&email=${encodeURIComponent(email)}` : ""}`;
      router.push(target);
      return;
    }

    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [countdown, router, email]);

  const handleProceed = () => {
    const target = `/auth/login?verified=true${email ? `&email=${encodeURIComponent(email)}` : ""}`;
    router.push(target);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFD] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-[460px]">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-white py-10 px-6 sm:px-10 rounded-3xl border border-slate-200/90 shadow-sm text-center"
        >
          {/* Brand Logo */}
          <Link href="/" className="inline-flex items-center gap-2 mb-6 group">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-sm transition-transform group-hover:scale-105">
              <BookOpen className="w-5 h-5" />
            </div>
            <span className="text-xl font-bold text-slate-900 tracking-tight">
              Lecture<span className="text-indigo-600">Mate</span>
            </span>
          </Link>

          {/* Animated Success Badge */}
          <div className="mx-auto w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 mb-5 relative">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.15, type: "spring", stiffness: 260, damping: 20 }}
            >
              <CheckCircle2 className="w-9 h-9 text-emerald-600" />
            </motion.div>
            <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
            </span>
          </div>

          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Your Email is Verified!
          </h1>
          <p className="mt-2 text-sm text-slate-600 leading-relaxed">
            Your email address has been successfully verified and confirmed. Your account is now active.
          </p>

          {/* Account Details Box */}
          {email && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mt-5 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-center gap-2 text-xs font-semibold text-slate-800"
            >
              <Mail className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="truncate max-w-[280px]">{email}</span>
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            </motion.div>
          )}

          {/* Redirection Notice & Action Button */}
          <div className="mt-8 space-y-3">
            <button
              onClick={handleProceed}
              className="w-full py-3 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-sm transition-all flex items-center justify-center gap-2 group"
            >
              <span>Continue to Sign In</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </button>

            <p className="text-xs text-slate-400 font-medium">
              Redirecting to login in <span className="text-indigo-600 font-bold">{countdown}</span> seconds...
            </p>
          </div>

          <div className="mt-6 pt-5 border-t border-slate-100">
            <Link
              href="/"
              className="text-xs text-slate-500 hover:text-slate-700 transition-colors"
            >
              ← Back to LectureMate Home
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default function VerifiedPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F8FAFD] flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <VerifiedContent />
    </Suspense>
  );
}
