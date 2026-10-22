"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function DashboardAuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    // 1. Immediately verify active session with server
    let isMounted = true;

    const checkSession = async () => {
      try {
        const res = await fetch("/api/auth/me", {
          cache: "no-store",
          headers: { "Cache-Control": "no-cache" },
        });

        if (!res.ok) {
          if (isMounted) {
            setIsAuthenticated(false);
            window.location.replace("/auth/login?logged_out=1");
          }
          return;
        }

        const data = await res.json();
        if (!data?.user) {
          if (isMounted) {
            setIsAuthenticated(false);
            window.location.replace("/auth/login?logged_out=1");
          }
          return;
        }

        if (isMounted) {
          setIsAuthenticated(true);
        }
      } catch {
        if (isMounted) {
          setIsAuthenticated(false);
          window.location.replace("/auth/login?logged_out=1");
        }
      }
    };

    checkSession();

    // 2. Prevent Back-Forward Cache (bfcache) restoration on browser Back button
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        // Page was loaded from memory cache (Back button after logout)
        window.location.replace("/auth/login?logged_out=1");
      }
    };

    window.addEventListener("pageshow", handlePageShow);

    return () => {
      isMounted = false;
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, [router]);

  // While confirming session, or if unauthenticated, do not expose protected dashboard UI
  if (isAuthenticated === false) {
    return (
      <div className="min-h-screen bg-[#F8FAFD] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}
