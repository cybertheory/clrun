"use client";

import { motion } from "framer-motion";
import { Separator } from "@/components/ui/separator";
import { Terminal } from "lucide-react";

export function Footer() {
  return (
    <footer className="py-16 px-6">
      <div className="max-w-5xl mx-auto">
        <Separator className="mb-12 opacity-20" />

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="flex flex-col md:flex-row items-center justify-between gap-6"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-border/30 flex items-center justify-center">
              <Terminal className="w-4 h-4 text-zinc-300" />
            </div>
            <span className="font-bold text-lg">clrun</span>
          </div>

          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <a
              href="https://github.com/cybertheory/clrun"
              className="hover:text-foreground transition-colors"
            >
              GitHub
            </a>
            <a
              href="https://www.npmjs.com/package/clrun"
              className="hover:text-foreground transition-colors"
            >
              npm
            </a>
            <a
              href="https://pypi.org/project/clrun/"
              className="hover:text-foreground transition-colors"
            >
              PyPI
            </a>
            <a
              href="https://github.com/cybertheory/clrun/blob/main/README.md"
              className="hover:text-foreground transition-colors"
            >
              Documentation
            </a>
          </div>

          <p className="text-sm text-muted-foreground">
            Open Source &middot; MIT License
          </p>
        </motion.div>
      </div>
    </footer>
  );
}
