import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { Sidebar } from "@/components/layout/Sidebar";
import { DashboardAuthGuard } from "@/components/auth/DashboardAuthGuard";

export const metadata: Metadata = {
  title: "LectureMate — Dashboard",
};

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 1. Server-side session verification: blocks unauthenticated requests before rendering
  const user = await getCurrentUser();
  if (!user) {
    redirect("/auth/login?logged_out=1");
  }

  return (
    <DashboardAuthGuard>
      <div className="flex flex-col md:flex-row h-screen overflow-hidden bg-[#F8FAFC]">
        <Sidebar />
        <main className="flex-1 overflow-y-auto pb-20 md:pb-0 min-w-0">
          {children}
        </main>
      </div>
    </DashboardAuthGuard>
  );
}
