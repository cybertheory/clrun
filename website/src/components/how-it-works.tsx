"use client";

import { motion } from "framer-motion";

const steps = [
  {
    command: 'clrun run "npm init"',
    label: "Execute",
    description: "Spawn an interactive PTY session. Get back a terminal ID.",
  },
  {
    command: 'clrun input <id> "yes" --priority 5',
    label: "Interact",
    description: "Queue deterministic input with priority control.",
  },
  {
    command: "clrun tail <id> --lines 50",
    label: "Observe",
    description: "Read terminal output. Monitor execution in real time.",
  },
  {
    command: "clrun status",
    label: "Verify",
    description: "Check session states, exit codes, and queue depth.",
  },
];

export function HowItWorks() {
  return (
    <section className="py-32 px-6 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-zinc-900/20 to-transparent" />

      <div className="relative max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-20"
        >
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-6">
            Four commands.
            <br />
            <span className="text-muted-foreground">Complete control.</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            A minimal, powerful API surface designed for machine consumption.
            Every response is structured YAML.
          </p>
        </motion.div>

        <div className="space-y-6">
          {steps.map((step, i) => (
            <motion.div
              key={step.label}
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="flex items-start gap-6"
            >
              {/* Step number */}
              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-zinc-800/80 border border-border/30 flex items-center justify-center text-lg font-bold text-zinc-300">
                {i + 1}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">
                    {step.label}
                  </span>
                </div>
                <div className="rounded-lg border border-border/40 bg-zinc-900/60 backdrop-blur-sm px-5 py-4 font-mono text-sm mb-2">
                  <span className="text-zinc-500">$ </span>
                  <span className="text-emerald-400">{step.command}</span>
                </div>
                <p className="text-sm text-muted-foreground pl-1">
                  {step.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
