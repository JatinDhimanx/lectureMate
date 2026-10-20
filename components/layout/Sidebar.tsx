"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  BookOpen,
  Brain,
  BarChart3,
  Map,
  Settings,
  Sparkles,
  Upload,
  ChevronLeft,
  ChevronRight,
  Bell,
  Search,
  LogOut,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Home" },
  { href: "/upload", icon: Upload, label: "Upload" },
  { href: "/lectures", icon: BookOpen, label: "Lectures" },
  { href: "/study", icon: Brain, label: "Flashcards" },
  { href: "/quiz", icon: BarChart3, label: "Quiz" },
  { href: "/map", icon: Map, label: "Concept Map" },
  { href: "/settings", icon: Settings, label: "Settings" },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [user, setUser] = useState<{ id: string; email: string; name: string } | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data?.user) setUser(data.user);
      })
      .catch(() => {});
  }, []);

  const handleSignOut = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // ignore
    }
    window.location.href = "/auth/login";
  };

  const initial = user?.name
    ? user.name.charAt(0).toUpperCase()
    : user?.email
    ? user.email.charAt(0).toUpperCase()
    : "U";

  return (
    <motion.aside
      animate={{ width: collapsed ? 72 : 240 }}
      transition={{ duration: 0.2, ease: "easeInOut" }}
      className="flex flex-col h-screen border-r border-slate-200/80 bg-white shrink-0 z-30 shadow-[1px_0_10px_rgba(0,0,0,0.02)]"
    >
      {/* Logo */}
      <div className="h-16 flex items-center gap-3 px-4 border-b border-slate-100">
        <Link href="/" className="flex items-center gap-2.5 overflow-hidden">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center shrink-0 shadow-sm shadow-indigo-500/20">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col"
            >
              <span className="font-bold text-slate-900 text-base leading-tight tracking-tight">
                LectureMate
              </span>
              <span className="text-[10px] text-slate-400 font-medium">
                Lectures to Learning
              </span>
            </motion.div>
          )}
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href + "/"));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all group",
                isActive
                  ? "bg-indigo-50/80 text-indigo-700 font-bold"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              )}
            >
              <item.icon
                className={cn(
                  "w-4 h-4 shrink-0",
                  isActive ? "text-indigo-600" : "text-slate-400"
                )}
              />
              {!collapsed && (
                <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  {item.label}
                </motion.span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom User / Toggle */}
      <div className="p-3 border-t border-slate-100 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          {!collapsed ? (
            <div className="flex items-center gap-2.5 overflow-hidden flex-1 mr-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-sm">
                {initial}
              </div>
              <div className="flex flex-col truncate flex-1">
                <span className="text-xs font-bold text-slate-800 truncate">
                  {user?.name || "Student"}
                </span>
                <span className="text-[10px] text-slate-400 truncate">
                  {user?.email || "Account"}
                </span>
              </div>
              <button
                onClick={handleSignOut}
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                title="Sign out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={handleSignOut}
              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors mx-auto"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all shrink-0"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </motion.aside>
  );
}

export function Topbar({ title }: { title?: string }) {
  const [user, setUser] = useState<{ id: string; email: string; name: string } | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data?.user) setUser(data.user);
      })
      .catch(() => {});
  }, []);

  const initial = user?.name
    ? user.name.charAt(0).toUpperCase()
    : user?.email
    ? user.email.charAt(0).toUpperCase()
    : "U";

  return (
    <div className="h-16 flex items-center justify-between px-6 border-b border-slate-200/80 bg-white/90 backdrop-blur shrink-0 sticky top-0 z-20">
      <div className="flex items-center gap-4">
        <h1 className="text-base font-bold text-slate-900">{title}</h1>
      </div>
      <div className="flex items-center gap-3">
        <div className="relative hidden sm:block">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search lectures or concepts..."
            className="pl-9 pr-4 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-64"
          />
        </div>
        <button className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 flex items-center justify-center hover:bg-slate-100 transition-colors relative">
          <Bell className="w-4 h-4" />
          <span className="w-2 h-2 rounded-full bg-indigo-600 absolute top-1.5 right-1.5" />
        </button>
        <Link
          href="/settings"
          className="flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-200"
          title="Account Settings"
        >
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
            {initial}
          </div>
          {user?.name && (
            <span className="text-xs font-semibold text-slate-700 hidden md:inline truncate max-w-[120px]">
              {user.name}
            </span>
          )}
        </Link>
      </div>
    </div>
  );
}
