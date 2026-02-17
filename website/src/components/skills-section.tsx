"use client";

import { motion } from "framer-motion";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bot, BookOpen, Sparkles, Download, ArrowRight } from "lucide-react";

const skills = [
  {
    icon: BookOpen,
    name: "clrun-skill.md",
    label: "Core Skill",
    href: "/skills/clrun-skill.md",
    description:
      "Complete CLI reference written for AI consumption. Covers all commands, queue behavior, session lifecycle, and best practices.",
  },
  {
    icon: Bot,
    name: "claude-code-skill.md",
    label: "Claude Code",
    href: "/skills/claude-code-skill.md",
    description:
      "Optimized integration instructions for Claude Code. Covers workflow patterns, prompt detection, override strategies, and error handling.",
  },
  {
    icon: Sparkles,
    name: "openclaw-skill.md",
    label: "OpenClaw",
    href: "/skills/openclaw-skill.md",
    description:
      "Structured skill reference for OpenClaw agents. Full command reference, workflow patterns, and agent-specific guidance.",
  },
];

export function SkillsSection() {
  return (
    <section className="py-32 px-6">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-6"
        >
          <Badge
            variant="outline"
            className="mb-6 text-sm px-4 py-1.5 border-border/50"
          >
            Zero-Configuration AI Compatibility
          </Badge>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-6">
            Built-in agent skills
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-16">
            On first run — whether via{" "}
            <code className="text-sm bg-zinc-800 px-2 py-1 rounded">npm</code>{" "}
            or{" "}
            <code className="text-sm bg-zinc-800 px-2 py-1 rounded">pip</code>{" "}
            — clrun automatically installs structured skill files into your project.
            Point your AI agent at{" "}
            <code className="text-sm bg-zinc-800 px-2 py-1 rounded">
              .clrun/skills/
            </code>{" "}
            and it knows everything.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {skills.map((skill, i) => (
            <motion.div
              key={skill.name}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
            >
              <Card className="h-full border-border/40 bg-card/50 backdrop-blur-sm hover:bg-card/80 hover:border-border/60 transition-all duration-300 flex flex-col">
                <CardHeader className="p-6 flex-1">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-zinc-800/80 border border-border/30 flex items-center justify-center">
                      <skill.icon className="w-5 h-5 text-zinc-300" />
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {skill.label}
                    </Badge>
                  </div>
                  <CardTitle className="text-base font-mono font-normal mb-3 text-zinc-300">
                    {skill.name}
                  </CardTitle>
                  <CardDescription className="text-sm text-muted-foreground leading-relaxed">
                    {skill.description}
                  </CardDescription>
                </CardHeader>
                <div className="px-6 pb-5 pt-0">
                  <a
                    href={skill.href}
                    download
                    className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors font-mono"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download skill
                  </a>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Auto-install note + browse link */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-12 flex flex-col items-center gap-5"
        >
          <div className="inline-block rounded-xl border border-border/30 bg-zinc-900/40 backdrop-blur-sm px-6 py-4">
            <p className="text-sm text-muted-foreground font-mono">
              <span className="text-zinc-500">$</span>{" "}
              <span className="text-emerald-400">clrun run</span>{" "}
              <span className="text-zinc-400">&quot;any command&quot;</span>
              <br />
              <span className="text-zinc-600 text-xs mt-1 block">
                → Skills auto-installed to .clrun/skills/ on first run
              </span>
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 border-border/50 bg-card/30 backdrop-blur-sm"
            asChild
          >
            <a href="/skills">
              Browse all skills
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </Button>
        </motion.div>
      </div>
    </section>
  );
}
