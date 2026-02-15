"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ChevronDown,
  Download,
  Copy,
  Check,
  ExternalLink,
} from "lucide-react";

interface Skill {
  slug: string;
  filename: string;
  label: string;
  title: string;
  description: string;
}

export function SkillViewer({ skill }: { skill: Skill }) {
  const [expanded, setExpanded] = useState(false);
  const [content, setContent] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  const fileUrl = `/skills/${skill.filename}`;

  async function loadContent() {
    if (content) {
      setExpanded(!expanded);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(fileUrl);
      const text = await res.text();
      setContent(text);
      setExpanded(true);
    } catch {
      setContent("Failed to load skill file.");
      setExpanded(true);
    } finally {
      setLoading(false);
    }
  }

  async function copyContent() {
    const text = content ?? (await fetch(fileUrl).then((r) => r.text()));
    if (text) await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="rounded-xl border border-border/40 bg-card/30 overflow-hidden transition-all hover:border-border/60">
      {/* Header */}
      <div className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <Badge variant="secondary" className="text-xs flex-shrink-0">
                {skill.label}
              </Badge>
              <span className="font-mono text-sm text-zinc-400 truncate">
                {skill.filename}
              </span>
            </div>
            <h3 className="text-lg font-semibold mb-2">{skill.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {skill.description}
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 mt-5">
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs border-border/50 bg-card/50"
            onClick={loadContent}
            disabled={loading}
          >
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform ${expanded ? "rotate-180" : ""}`}
            />
            {loading ? "Loading..." : expanded ? "Collapse" : "Preview"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs border-border/50 bg-card/50"
            onClick={copyContent}
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
            {copied ? "Copied" : "Copy"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs border-border/50 bg-card/50"
            asChild
          >
            <a href={fileUrl} download>
              <Download className="w-3.5 h-3.5" />
              Download
            </a>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs border-border/50 bg-card/50"
            asChild
          >
            <a href={fileUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-3.5 h-3.5" />
              Raw
            </a>
          </Button>
        </div>
      </div>

      {/* Expandable content */}
      <AnimatePresence>
        {expanded && content && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="border-t border-border/30">
              <pre className="p-6 text-sm font-mono text-zinc-300 leading-relaxed overflow-x-auto max-h-[600px] overflow-y-auto bg-zinc-950/50">
                {content}
              </pre>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
