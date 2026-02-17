"use client";

import { motion } from "framer-motion";
import { Terminal } from "lucide-react";

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}

export function Navbar() {
  return (
    <motion.nav
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.05 }}
      className="fixed top-0 left-0 right-0 z-50 border-b border-border/20 bg-background/60 backdrop-blur-xl"
    >
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
        {/* Logo */}
        <a href="/" className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-zinc-800 border border-border/30 flex items-center justify-center">
            <Terminal className="w-3.5 h-3.5 text-zinc-300" />
          </div>
          <span className="font-bold text-sm tracking-tight">clrun</span>
        </a>

        {/* Right side */}
        <div className="flex items-center gap-4">
          <a
            href="/skills"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors hidden sm:block"
          >
            Skills
          </a>
          <a
            href="/llms.txt"
            className="text-sm font-mono text-muted-foreground hover:text-emerald-400 transition-colors hidden sm:block"
          >
            llms.txt
          </a>
          <a
            href="https://www.npmjs.com/package/clrun"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors hidden sm:block"
          >
            npm
          </a>
          <a
            href="https://pypi.org/project/clrun/"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors hidden sm:block"
          >
            PyPI
          </a>
          <a
            href="https://github.com/cybertheory/clrun"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center w-9 h-9 rounded-lg text-muted-foreground hover:text-foreground hover:bg-zinc-800/60 transition-all"
            aria-label="View on GitHub"
          >
            <GitHubIcon className="w-5 h-5" />
          </a>
        </div>
      </div>
    </motion.nav>
  );
}
