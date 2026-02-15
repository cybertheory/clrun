"use client";

import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import {
  LayoutDashboard,
  Globe,
  Shield,
  Cloud,
  Users,
} from "lucide-react";

const upcoming = [
  {
    icon: LayoutDashboard,
    title: "Team Dashboard",
    description: "Real-time visibility into team-wide agent execution.",
  },
  {
    icon: Globe,
    title: "Shared Execution Fabric",
    description: "Collaborative execution substrate across machines.",
  },
  {
    icon: Shield,
    title: "Enterprise Audit Layer",
    description: "Compliance-grade audit trails for regulated environments.",
  },
  {
    icon: Cloud,
    title: "Cloud-Backed Execution",
    description: "Persistent execution that survives machine restarts.",
  },
  {
    icon: Users,
    title: "Team Observability",
    description: "Unified view of all agent actions across your organization.",
  },
];

export function ComingSoon() {
  return (
    <section className="py-32 px-6 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-zinc-900/20 to-transparent" />

      <div className="relative max-w-4xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
        >
          <Badge
            variant="outline"
            className="mb-6 text-sm px-4 py-1.5 border-border/50"
          >
            Coming Soon
          </Badge>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-6">
            Where this is going
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-16">
            clrun is the foundation. What comes next transforms individual
            agent execution into team-wide infrastructure.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-3xl mx-auto">
          {upcoming.map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className="group rounded-xl border border-border/30 bg-card/30 backdrop-blur-sm p-5 text-left hover:bg-card/50 hover:border-border/50 transition-all duration-300"
            >
              <item.icon className="w-5 h-5 text-zinc-400 mb-3 group-hover:text-zinc-300 transition-colors" />
              <h3 className="font-semibold text-sm mb-1">{item.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {item.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
