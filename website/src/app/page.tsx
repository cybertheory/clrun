import { Navbar } from "@/components/navbar";
import { Hero } from "@/components/hero";
import { Install } from "@/components/install";
import { Features } from "@/components/features";
import { AgentNative } from "@/components/agent-native";
import { HowItWorks } from "@/components/how-it-works";
import { SkillsSection } from "@/components/skills-section";
import { ComingSoon } from "@/components/coming-soon";
import { Footer } from "@/components/footer";

export default function Home() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen">
        <Hero />
        <Install />
        <Features />
        <AgentNative />
        <HowItWorks />
        <SkillsSection />
        <ComingSoon />
        <Footer />
      </main>
    </>
  );
}
