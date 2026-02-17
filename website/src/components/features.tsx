"use client";

import { motion } from "framer-motion";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Layers,
  ListOrdered,
  ShieldCheck,
  RefreshCw,
  FolderLock,
  Activity,
  GitBranch,
  Users,
  Cpu,
  Braces,
  Eye,
  Zap,
} from "lucide-react";

const features = [
  {
    icon: Layers,
    title: "Persistent Interactive Execution",
    description:
      "Full PTY sessions that persist independently of your agent process. Commands stay alive, buffers stay intact, state stays consistent.",
  },
  {
    icon: ListOrdered,
    title: "Deterministic Input Queues",
    description:
      "Every input is queued with explicit priority ordering. Higher priority sends first. Same priority follows FIFO. No ambiguity.",
  },
  {
    icon: Zap,
    title: "Priority + Override Control",
    description:
      "Queue inputs with priority levels for ordered multi-step flows. Use override to cancel all pending inputs and force immediate execution.",
  },
  {
    icon: RefreshCw,
    title: "Crash Recovery",
    description:
      "Automatic detection of orphaned sessions on restart. Dead processes are marked as detached. Buffer logs remain readable. No data loss.",
  },
  {
    icon: FolderLock,
    title: "Project-Scoped Execution",
    description:
      "All state lives in .clrun/ at your project root. No global state, no home directory pollution. Every project is isolated.",
  },
  {
    icon: Braces,
    title: "Structured YAML Output",
    description:
      "Every command returns structured YAML. Every session, queue entry, and event is machine-readable. Built for programmatic consumption.",
  },
  {
    icon: Cpu,
    title: "AI-Native CLI Workflows",
    description:
      "Designed from the ground up for AI coding agents. Available as both npm and pip packages. Built-in skill files teach agents how to use the tool without configuration.",
  },
  {
    icon: Eye,
    title: "Agent Observability",
    description:
      "Append-only buffer logs and structured event ledger provide full visibility into execution history. Every action is auditable.",
  },
  {
    icon: GitBranch,
    title: "Git-Trackable Execution History",
    description:
      "Optionally commit .clrun/ledger/ to git. Enable AI agents to reason about past execution across sessions and team members.",
  },
  {
    icon: Users,
    title: "Multi-Agent Safe Design",
    description:
      "Runtime locking prevents state corruption. File-based communication enables multiple agents to interact with the same execution substrate.",
  },
  {
    icon: ShieldCheck,
    title: "Infrastructure-Grade Architecture",
    description:
      "Clean separation of concerns. Lock manager, queue engine, PTY manager, buffer system, and ledger all operate independently.",
  },
  {
    icon: Activity,
    title: "Real-Time Session Monitoring",
    description:
      "Tail and head commands provide instant access to terminal output. Status command shows live session states and queue depths.",
  },
];

const containerVariants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.06,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
};

export function Features() {
  return (
    <section className="py-32 px-6">
      <div className="max-w-6xl mx-auto">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-20"
        >
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-6">
            Built for the age of
            <br />
            <span className="text-muted-foreground">autonomous coding</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Every feature designed to give AI agents reliable, observable,
            deterministic control over interactive command execution.
          </p>
        </motion.div>

        {/* Feature grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-50px" }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
        >
          {features.map((feature) => (
            <motion.div key={feature.title} variants={itemVariants}>
              <Card className="h-full border-border/40 bg-card/50 backdrop-blur-sm hover:bg-card/80 hover:border-border/60 transition-all duration-300 group">
                <CardHeader className="p-6">
                  <div className="w-10 h-10 rounded-lg bg-zinc-800/80 border border-border/30 flex items-center justify-center mb-4 group-hover:bg-zinc-700/80 transition-colors">
                    <feature.icon className="w-5 h-5 text-zinc-300" />
                  </div>
                  <CardTitle className="text-lg font-semibold mb-2">
                    {feature.title}
                  </CardTitle>
                  <CardDescription className="text-sm text-muted-foreground leading-relaxed">
                    {feature.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
