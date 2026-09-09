import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LANDLENS — Intelligent Land Record Digitization",
  description: "AI-powered digitization of India's legacy land records — SIH 2026",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
