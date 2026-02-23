"use client";

import { motion } from "framer-motion";
import { Terminal, Cloud } from "lucide-react";

export function SCPSection() {
  return (
    <section className="py-32 px-6 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-zinc-900/20 to-transparent" />
      <div className="relative max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-border/40 bg-zinc-800/60 px-4 py-1.5 text-sm text-muted-foreground mb-6">
            <Cloud className="w-4 h-4" />
            Dynamic remote CLIs
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-6">
            Dynamic remote CLIs with SCP
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            <strong>CLRUN supports dynamic remote CLIs via SCP.</strong> Connect to any SCP
            server and drive its workflow as an interactive terminal. SCP servers expose
            state and CLI metadata (hints, next steps, options); CLRUN connects and loads
            the flow into a virtual terminal. Use the same <code className="rounded bg-zinc-800/80 px-1.5 py-0.5 text-sm">clrun &lt;id&gt;</code>,{" "}
            <code className="rounded bg-zinc-800/80 px-1.5 py-0.5 text-sm">clrun key &lt;id&gt;</code>, and{" "}
            <code className="rounded bg-zinc-800/80 px-1.5 py-0.5 text-sm">clrun tail</code> semantics.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.5 }}
          className="rounded-xl border border-border/40 bg-zinc-900/60 backdrop-blur-sm p-6 font-mono text-sm"
        >
          <div className="flex items-center gap-2 text-zinc-500 mb-4">
            <Terminal className="w-4 h-4" />
            <span>Connect and drive a remote workflow</span>
          </div>
          <pre className="text-zinc-300 overflow-x-auto">
            <span className="text-zinc-500">$ </span>
            <span className="text-emerald-400">clrun scp http://localhost:8000</span>
            {"\n"}
            <span className="text-zinc-500">$ </span>
            <span className="text-emerald-400">clrun &lt;id&gt; "1"</span>
            <span className="text-zinc-500">  # option index or action name</span>
            {"\n"}
            <span className="text-zinc-500">$ </span>
            <span className="text-emerald-400">clrun tail &lt;id&gt; --lines 50</span>
          </pre>
          <p className="mt-4 text-sm text-muted-foreground">
            Learn more about SCP and the standardized CLI endpoint in the SCP repo docs.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
