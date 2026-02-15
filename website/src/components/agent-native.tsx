"use client";

import { motion } from "framer-motion";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// ─── YAML response examples shown in the section ────────────────────────────

const examples = [
  {
    label: "Rich Error Context",
    caption: "When an agent uses a stale session ID, clrun doesn't just fail — it tells the agent exactly what's alive and how to recover.",
    yaml: `---
error: "Session not found: a1b2c3d4-..."
hints:
  list_sessions: clrun status
  start_new: clrun <command>
  active_sessions: f5e6d7c8-...
  note: Found 1 active session(s). Use one of the IDs above.`,
  },
  {
    label: "Input Validation Warnings",
    caption: "Detects when a shell variable was likely expanded to empty by the calling agent's shell, and tells it how to fix the quoting.",
    yaml: `---
terminal_id: f5e6d7c8-...
input: ""
warnings:
  - >-
    Input is empty. If you intended to send a shell
    variable like $MY_VAR, use single quotes:
    clrun <id> 'echo $MY_VAR'
hints:
  send_more: clrun <id> '<next command>'`,
  },
  {
    label: "Contextual Next Actions",
    caption: "Every response includes hints — the exact commands the agent should consider next, formatted as copy-pasteable strings.",
    yaml: `---
terminal_id: f5e6d7c8-...
command: npm init
output: "package name: (my-project)"
status: running
hints:
  send_input: clrun <id> '<response>'
  override: clrun input <id> '<text>' --override
  kill: clrun kill <id>
  note: >-
    Use single quotes for shell variables:
    clrun <id> 'echo $VAR'`,
  },
];

const principles = [
  {
    number: "01",
    title: "Every error is a lesson",
    description:
      "No blind failures. Every error response includes the reason, available alternatives, and the exact command to recover. An agent should never be stuck wondering what went wrong.",
  },
  {
    number: "02",
    title: "Every response is a menu",
    description:
      "Hints aren't suggestions — they're the complete set of valid next actions. The agent always knows its options without needing to read documentation mid-flow.",
  },
  {
    number: "03",
    title: "Runtime assertions catch bugs before agents see them",
    description:
      "Output is validated at the boundary. ANSI escape codes, shell prompt leaks, and formatting artifacts are caught and stripped with warnings — never silently passed through.",
  },
  {
    number: "04",
    title: "Warnings correct, they don't block",
    description:
      "When clrun detects suspicious input — like a likely shell-expanded variable — it executes the command AND returns a warning explaining what probably happened and how to fix it.",
  },
  {
    number: "05",
    title: "Output is pure signal",
    description:
      "Shell prompts, echoed commands, ANSI codes, and stale buffer content are stripped. The output field contains only what the command actually produced. Nothing else.",
  },
  {
    number: "06",
    title: "State is always recoverable",
    description:
      "Sessions suspend and auto-restore. Crashes are detected. Buffers persist. An agent can pick up exactly where it left off, even across process restarts.",
  },
];

const containerVariants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
};

export function AgentNative() {
  return (
    <section className="py-32 px-6 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-zinc-900/30 to-transparent" />

      <div className="relative max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-8"
        >
          <Badge
            variant="outline"
            className="mb-6 text-sm px-4 py-1.5 border-border/50"
          >
            Agent-Native Design
          </Badge>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-6">
            Designed for
            <br />
            <span className="text-muted-foreground">high-context agents</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            Most CLI tools return a string and an exit code. clrun returns structured
            context — what happened, what went wrong, and exactly what to do next.
            Every response is designed to keep the agent in full control.
          </p>
        </motion.div>

        {/* Principles grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-50px" }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mt-16 mb-24"
        >
          {principles.map((p) => (
            <motion.div key={p.number} variants={itemVariants}>
              <Card className="h-full border-border/40 bg-card/50 backdrop-blur-sm hover:bg-card/80 hover:border-border/60 transition-all duration-300 group">
                <CardHeader className="p-6">
                  <span className="font-mono text-xs text-zinc-600 mb-3 block">
                    {p.number}
                  </span>
                  <CardTitle className="text-lg font-semibold mb-3">
                    {p.title}
                  </CardTitle>
                  <CardDescription className="text-sm text-muted-foreground leading-relaxed">
                    {p.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* Response examples */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h3 className="text-2xl sm:text-3xl font-bold tracking-tight mb-4">
            See it in action
          </h3>
          <p className="text-base text-muted-foreground max-w-2xl mx-auto">
            Real responses from clrun. Every error teaches. Every success guides.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {examples.map((ex, i) => (
            <motion.div
              key={ex.label}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="flex flex-col"
            >
              <div className="rounded-t-lg border border-b-0 border-border/40 bg-zinc-900/80 px-4 py-3 flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
                <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
                <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
                <span className="ml-2 text-xs font-mono text-zinc-500">
                  {ex.label}
                </span>
              </div>
              <div className="rounded-b-lg border border-border/40 bg-zinc-950/80 backdrop-blur-sm px-5 py-4 flex-1">
                <pre className="text-xs font-mono text-zinc-400 whitespace-pre-wrap leading-relaxed overflow-x-auto">
                  {ex.yaml}
                </pre>
              </div>
              <p className="text-xs text-muted-foreground mt-3 px-1 leading-relaxed">
                {ex.caption}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Bottom statement */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-20 text-center"
        >
          <div className="inline-block rounded-xl border border-border/30 bg-zinc-900/40 backdrop-blur-sm px-8 py-6 max-w-2xl">
            <p className="text-base text-zinc-300 leading-relaxed">
              The difference between a tool that works with AI agents and a tool
              {" "}<em className="text-zinc-100">designed</em> for AI agents is
              context. clrun never leaves an agent guessing.
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
