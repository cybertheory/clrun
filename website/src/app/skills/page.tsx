import type { Metadata } from "next";
import { Navbar } from "@/components/navbar";
import { SkillViewer } from "@/components/skill-viewer";

export const metadata: Metadata = {
  title: "Agent Skills — clrun",
  description:
    "Browse and download built-in AI agent skill files for clrun. Includes skills for Claude Code, OpenClaw, and a general CLI reference.",
};

const skills = [
  {
    slug: "clrun-skill",
    filename: "clrun-skill.md",
    label: "Core Skill",
    title: "clrun — CLI Skill Reference",
    description:
      "Complete CLI reference written for AI consumption. Covers all commands, queue behavior, session lifecycle, best practices, state file layout, and git integration potential.",
  },
  {
    slug: "claude-code-skill",
    filename: "claude-code-skill.md",
    label: "Claude Code",
    title: "clrun — Claude Code Integration Skill",
    description:
      "Optimized instructions for Claude Code. Covers the core execute-monitor-interact-verify workflow, prompt detection heuristics, override strategies, priority queuing, and error handling.",
  },
  {
    slug: "openclaw-skill",
    filename: "openclaw-skill.md",
    label: "OpenClaw",
    title: "clrun — OpenClaw Integration Skill",
    description:
      "Structured skill reference for OpenClaw agents. Full command reference with return types, a step-by-step workflow pattern, queue behavior table, session state reference, and key rules.",
  },
];

export default function SkillsPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-background pt-14">
        {/* Header */}
        <div className="border-b border-border/40">
        <div className="max-w-5xl mx-auto px-6 py-16 sm:py-24">
          <a
            href="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              className="rotate-180"
            >
              <path
                d="M6 3l5 5-5 5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Back to home
          </a>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
            Agent Skills
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl">
            Browse, preview, and download the built-in skill files that ship
            with clrun. These are automatically installed into{" "}
            <code className="text-sm bg-zinc-800 px-2 py-0.5 rounded font-mono">
              .clrun/skills/
            </code>{" "}
            on first run — or grab them here.
          </p>
        </div>
      </div>

      {/* Skills list */}
      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="space-y-8">
          {skills.map((skill) => (
            <SkillViewer key={skill.slug} skill={skill} />
          ))}
        </div>

        {/* Raw download section */}
        <div className="mt-20 rounded-xl border border-border/30 bg-card/30 p-8 text-center">
          <h2 className="text-xl font-semibold mb-3">
            Direct download links
          </h2>
          <p className="text-sm text-muted-foreground mb-6">
            Point your AI agent at any of these URLs for instant skill
            loading.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 font-mono text-sm">
            {skills.map((skill) => (
              <a
                key={skill.slug}
                href={`/skills/${skill.filename}`}
                className="px-4 py-2 rounded-lg border border-border/40 bg-zinc-900/60 text-emerald-400 hover:bg-zinc-800/80 hover:border-border/60 transition-all"
                download
              >
                {skill.filename}
              </a>
            ))}
          </div>
        </div>
      </div>
    </main>
    </>
  );
}
