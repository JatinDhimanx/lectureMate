import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LectureMate — Turn Lectures into Flashcards, Quizzes & More",
  description: "Upload a transcript, PDF, DOCX or YouTube lecture and let AI create concise summaries, flashcards, quizzes and answers from your lecture content in seconds.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="min-h-screen bg-[#F8FAFC] text-[#0F172A] antialiased selection:bg-indigo-500/20 selection:text-indigo-900">
        {children}
      </body>
    </html>
  );
}
