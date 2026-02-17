"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Terminal } from "lucide-react";

const installTabs = [
  { id: "node", label: "Node.js", command: "npx clrun echo hello world" },
  { id: "python", label: "Python", command: "uvx clrun-cli echo hello world" },
] as const;

export function Hero() {
  const [activeTab, setActiveTab] = useState<"node" | "python">("node");

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-background/80" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-800/30 via-transparent to-transparent" />

      {/* Grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />

      <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mb-8"
        >
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border/50 bg-card/50 text-sm text-muted-foreground backdrop-blur-sm">
            <Terminal className="w-4 h-4" />
            Open Source &middot; Node.js &amp; Python
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight leading-[1.1] mb-6"
        >
          The{" "}
          <span className="italic bg-gradient-to-r from-white via-zinc-300 to-zinc-500 bg-clip-text text-transparent">
            Interactive
          </span>{" "}
          CLI
          <br />
          for AI Agents
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.35 }}
          className="text-lg sm:text-xl md:text-2xl text-muted-foreground font-light tracking-wide mb-12"
        >
          Now Agents can Interact and Manage Long-Running, Stateful, TUI sessions in parallel
        </motion.p>

        {/* Code block with language tabs */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.5 }}
          className="mb-12"
        >
          <div className="inline-block rounded-xl border border-border/50 bg-zinc-900/80 backdrop-blur-sm overflow-hidden shadow-2xl shadow-black/20">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border/30">
              <div className="w-3 h-3 rounded-full bg-red-500/70" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
              <div className="w-3 h-3 rounded-full bg-green-500/70" />
              <div className="ml-auto flex items-center gap-1 rounded-lg bg-zinc-800/80 p-0.5">
                {installTabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-3 py-1 rounded-md text-xs font-mono transition-all ${
                      activeTab === tab.id
                        ? "bg-zinc-700 text-zinc-100 shadow-sm"
                        : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="px-6 py-5 font-mono text-left min-w-[340px] sm:min-w-[460px]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15 }}
                  className="flex items-center gap-2"
                >
                  <span className="text-zinc-500">$</span>
                  <span className="text-emerald-400 text-sm sm:text-base">
                    {installTabs.find((t) => t.id === activeTab)?.command}
                  </span>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.65 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Button
            size="lg"
            className="h-12 px-8 text-base font-medium gap-2 rounded-xl"
            asChild
          >
            <a href="https://github.com/cybertheory/clrun">
              Get Started
              <ArrowRight className="w-4 h-4" />
            </a>
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="h-12 px-8 text-base font-medium rounded-xl border-border/50 bg-card/30 backdrop-blur-sm"
            asChild
          >
            <a href="https://github.com/cybertheory/clrun">
              View on GitHub
            </a>
          </Button>
        </motion.div>
      </div>
    </section>
  );
}
