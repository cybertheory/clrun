"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";

const languages = [
  {
    id: "node",
    label: "Node.js",
    icon: "⬢",
    install: "npm install -g clrun",
    installAlt: "npx clrun <command>",
    installLabel: "Or use without installing:",
    badge: "npm",
    link: "https://www.npmjs.com/package/clrun",
    features: [
      "Uses node-pty for native PTY management",
      "Works with npm, npx, yarn, pnpm",
      "Zero-config — just run npx clrun",
    ],
  },
  {
    id: "python",
    label: "Python",
    icon: "🐍",
    install: "pip install clrun-cli",
    installAlt: "pipx install clrun-cli",
    installLabel: "Or with pipx:",
    badge: "PyPI",
    link: "https://pypi.org/project/clrun-cli/",
    features: [
      "Uses pexpect — no native compilation needed",
      "Works on macOS and Linux out of the box",
      "Same CLI interface, same YAML output",
    ],
  },
] as const;

export function Install() {
  const [active, setActive] = useState<"node" | "python">("node");
  const lang = languages.find((l) => l.id === active)!;

  return (
    <section className="py-24 px-6 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-zinc-900/20 to-transparent" />

      <div className="relative max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <Badge
            variant="outline"
            className="mb-6 text-sm px-4 py-1.5 border-border/50"
          >
            Available on npm &amp; PyPI
          </Badge>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-4">
            One CLI.{" "}
            <span className="text-muted-foreground">Two runtimes.</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Same commands, same YAML output, same agent skills — choose the
            runtime that fits your stack.
          </p>
        </motion.div>

        {/* Language toggle */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex justify-center mb-8"
        >
          <div className="inline-flex rounded-xl border border-border/40 bg-zinc-900/60 backdrop-blur-sm p-1 gap-1">
            {languages.map((l) => (
              <button
                key={l.id}
                onClick={() => setActive(l.id as "node" | "python")}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  active === l.id
                    ? "bg-zinc-700/80 text-white shadow-sm"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <span>{l.icon}</span>
                {l.label}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Install card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="rounded-xl border border-border/40 bg-zinc-900/60 backdrop-blur-sm overflow-hidden"
          >
            <div className="p-6 sm:p-8">
              {/* Primary install */}
              <div className="rounded-lg border border-border/30 bg-zinc-950/80 px-5 py-4 font-mono text-sm mb-3">
                <span className="text-zinc-500">$ </span>
                <span className="text-emerald-400">{lang.install}</span>
              </div>

              {/* Alt install */}
              <p className="text-xs text-muted-foreground mb-2 pl-1">
                {lang.installLabel}
              </p>
              <div className="rounded-lg border border-border/30 bg-zinc-950/80 px-5 py-4 font-mono text-sm mb-6">
                <span className="text-zinc-500">$ </span>
                <span className="text-zinc-300">{lang.installAlt}</span>
              </div>

              {/* Features */}
              <ul className="space-y-2.5">
                {lang.features.map((f) => (
                  <li
                    key={f}
                    className="flex items-start gap-2.5 text-sm text-muted-foreground"
                  >
                    <span className="text-emerald-500 mt-0.5">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>

            {/* Footer */}
            <div className="border-t border-border/30 px-6 sm:px-8 py-4 flex items-center justify-between">
              <a
                href={lang.link}
                className="text-xs font-mono text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                View on {lang.badge} →
              </a>
              <span className="text-xs text-muted-foreground font-mono">
                v1.1.0
              </span>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Compatibility note */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="text-center text-xs text-muted-foreground mt-6"
        >
          Both versions produce identical YAML output, use the same{" "}
          <code className="bg-zinc-800 px-1.5 py-0.5 rounded">.clrun/</code>{" "}
          state format, and install the same agent skills.
        </motion.p>
      </div>
    </section>
  );
}
