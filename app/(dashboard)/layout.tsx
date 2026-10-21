import type { Metadata } from "next";
import { Sidebar } from "@/components/layout/Sidebar";

export const metadata: Metadata = {
  title: "LectureMate — Dashboard",
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col md:flex-row h-screen overflow-hidden bg-[#F8FAFC]">
      <Sidebar />
      <main className="flex-1 overflow-y-auto pb-20 md:pb-0 min-w-0">
        {children}
      </main>
    </div>
  );
}
