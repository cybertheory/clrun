import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SmoothScroll } from "@/components/smooth-scroll";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "clrun — The Interactive CLI for AI Agents",
  description:
    "Persistent. Deterministic. Project-Scoped Execution. The production-grade CLI substrate for AI coding agents.",
  keywords: [
    "CLI",
    "AI agents",
    "terminal",
    "interactive",
    "deterministic",
    "PTY",
    "execution",
    "developer tools",
  ],
  openGraph: {
    title: "clrun — The Interactive CLI for AI Agents",
    description:
      "Persistent. Deterministic. Project-Scoped Execution.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "clrun — The Interactive CLI for AI Agents",
    description:
      "Persistent. Deterministic. Project-Scoped Execution.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <SmoothScroll>{children}</SmoothScroll>
      </body>
    </html>
  );
}
