import { useEffect, useRef, useState } from "react"
import { Link } from "react-router-dom"
import {
  Brain,
  Mic,
  Shield,
} from "lucide-react"

import CountUp from "@/components/CountUp"
import AnimatedBackground from "@/components/AnimatedBackground"
import HomeHeader from "@/components/HomeHeader"
import RotatingText from "@/components/RotatingText.jsx"
import VariableProximity from "@/components/VariableProximity.jsx"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useTheme } from "@/lib/theme-context"

export default function Home() {
  const { theme } = useTheme()
  const isDark = theme === "dark"
  const pipelineRef = useRef<HTMLDivElement | null>(null)
  const whyRef = useRef<HTMLDivElement | null>(null)
  const metricsHeadingRef = useRef<HTMLDivElement | null>(null)
  const faqRef = useRef<HTMLDivElement | null>(null)
  const ctaRef = useRef<HTMLDivElement | null>(null)
  const metricsSectionRef = useRef<HTMLElement | null>(null)
  const [metricsInView, setMetricsInView] = useState(false)
  const glassCard = [
    "relative overflow-hidden p-6 transition-colors duration-300 backdrop-blur-sm",
    "transition-transform duration-300 hover:-translate-y-[2px]",
    isDark ? "bg-zinc-900/60 border-zinc-700/50 text-zinc-50" : "bg-white/70 border-gray-200/50 text-gray-900",
  ].join(" ")
  const outlineCtaClass = isDark
    ? "bg-white text-black border border-white hover:bg-white/90"
    : "bg-black text-white border border-black hover:bg-black/90"

  useEffect(() => {
    if (metricsInView) return
    const el = metricsSectionRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0]
        if (first?.isIntersecting) {
          setMetricsInView(true)
          observer.disconnect()
        }
      },
      { threshold: 0.25 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [metricsInView])

  return (
    <div
      className={[
        "min-h-screen relative transition-colors duration-300",
        isDark ? "bg-black text-zinc-50" : "bg-white text-[#0A0A0A]",
      ].join(" ")}
    >
      <AnimatedBackground variant="particles" />

      <div className="relative z-10">
        <HomeHeader />

        <section className="relative min-h-[calc(100vh-56px)] flex items-center bg-transparent">
          <div className="w-full px-4">
            <div className="mx-auto max-w-5xl py-16">
              <h1 className="text-5xl md:text-7xl font-bold text-center">
                Autonomous AI
                <br />
                <span className="inline-flex mt-2 justify-center">
                  <RotatingText
                    texts={["Recruitment", "Screening", "Evaluation", "Assessment"]}
                    mainClassName="px-2 md:px-3 bg-purple-600 text-white overflow-hidden py-0.5 md:py-1 justify-center rounded-lg"
                    staggerFrom="last"
                    initial={{ y: "100%" }}
                    animate={{ y: 0 }}
                    exit={{ y: "-120%" }}
                    staggerDuration={0.025}
                    splitLevelClassName="overflow-hidden pb-0.5 md:pb-1"
                    transition={{ type: "spring", damping: 30, stiffness: 400 }}
                    rotationInterval={2000}
                    splitBy="words"
                  />
                </span>
              </h1>
              <div className="text-lg text-muted-foreground text-center max-w-2xl mx-auto mt-4">
                End-to-end candidate screening. Resume parsing, voice interviews, and AI evaluation.
              </div>
              <div className="mt-8 flex gap-4 justify-center">
                <Button
                  asChild
                  size="lg"
                  className={
                    isDark ? "bg-white text-black hover:bg-white/90 border border-white" : "bg-black text-white hover:bg-black/90 border border-black"
                  }
                >
                  <Link to="/login">Login</Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className={outlineCtaClass}
                >
                  <Link to="/login">Sign Up</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section
          id="how-it-works"
          className={[
            "py-20 transition-colors duration-300 backdrop-blur-sm",
            isDark ? "bg-zinc-950/90" : "bg-white/90",
          ].join(" ")}
        >
          <div ref={pipelineRef} style={{ position: "relative" }} className="text-center mb-12">
            <VariableProximity
              label="Assessment Pipeline"
              className="text-4xl md:text-5xl font-semibold"
              fromFontVariationSettings="'wght' 400"
              toFontVariationSettings="'wght' 900"
              containerRef={pipelineRef}
              radius={150}
              falloff="linear"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 max-w-5xl mx-auto px-4">
            <Card className={[glassCard, "text-left"].join(" ")}>
              <div
                className={[
                  "absolute -top-2 -left-1 text-6xl font-bold select-none",
                  isDark ? "text-white/10" : "text-black/10",
                ].join(" ")}
              >
                01
              </div>
              <div className={["font-semibold", isDark ? "text-white" : "text-black"].join(" ")}>Resume Analysis</div>
              <div className={["mt-2 text-sm", isDark ? "text-white" : "text-black"].join(" ")}>
                Our parser extracts skills, experience, and role-fit signals from your PDF using structured NLP.
              </div>
            </Card>
            <Card className={[glassCard, "text-left"].join(" ")}>
              <div
                className={[
                  "absolute -top-2 -left-1 text-6xl font-bold select-none",
                  isDark ? "text-white/10" : "text-black/10",
                ].join(" ")}
              >
                02
              </div>
              <div className={["font-semibold", isDark ? "text-white" : "text-black"].join(" ")}>Dynamic Questioning</div>
              <div className={["mt-2 text-sm", isDark ? "text-white" : "text-black"].join(" ")}>
                8 interview questions generated from YOUR resume — technical, behavioral, role-fit, and lateral thinking.
              </div>
            </Card>
            <Card className={[glassCard, "text-left"].join(" ")}>
              <div
                className={[
                  "absolute -top-2 -left-1 text-6xl font-bold select-none",
                  isDark ? "text-white/10" : "text-black/10",
                ].join(" ")}
              >
                03
              </div>
              <div className={["font-semibold", isDark ? "text-white" : "text-black"].join(" ")}>Voice Interview</div>
              <div className={["mt-2 text-sm", isDark ? "text-white" : "text-black"].join(" ")}>
                Real-time speech-to-text and text-to-speech powered by Deepgram and ElevenLabs. No typing required.
              </div>
            </Card>
            <Card className={[glassCard, "text-left"].join(" ")}>
              <div
                className={[
                  "absolute -top-2 -left-1 text-6xl font-bold select-none",
                  isDark ? "text-white/10" : "text-black/10",
                ].join(" ")}
              >
                04
              </div>
              <div className={["font-semibold", isDark ? "text-white" : "text-black"].join(" ")}>Evaluation Report</div>
              <div className={["mt-2 text-sm", isDark ? "text-white" : "text-black"].join(" ")}>
                Multi-dimensional scoring across technical depth, communication, relevance, and confidence. Delivered instantly.
              </div>
            </Card>
          </div>
        </section>

        <section
          id="features"
          className={[
            "py-20 transition-colors duration-300 backdrop-blur-sm",
            isDark ? "bg-zinc-900/80" : "bg-gray-50/80",
          ].join(" ")}
        >
          <div ref={whyRef} style={{ position: "relative" }} className="text-center mb-12">
            <VariableProximity
              label="Why Organizations Choose SAGE"
              className="text-4xl md:text-5xl font-semibold"
              fromFontVariationSettings="'wght' 400"
              toFontVariationSettings="'wght' 900"
              containerRef={whyRef}
              radius={150}
              falloff="linear"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto px-4">
            <Card className={[glassCard, "text-left"].join(" ")}>
              <Mic className="mb-4" color={isDark ? "#7C3AED" : "#2563EB"} size={36} />
              <div className="font-semibold">Zero Bias Screening</div>
              <div className="mt-2 text-sm text-muted-foreground">
                Every candidate evaluated on identical dimensions with consistent AI scoring. No interviewer mood variance.
              </div>
            </Card>
            <Card className={[glassCard, "text-left"].join(" ")}>
              <Brain className="mb-4" color={isDark ? "#7C3AED" : "#2563EB"} size={36} />
              <div className="font-semibold">10x Faster Pipeline</div>
              <div className="mt-2 text-sm text-muted-foreground">
                From resume upload to hire/no-hire recommendation in under 15 minutes. No scheduling, no coordination.
              </div>
            </Card>
            <Card className={[glassCard, "text-left"].join(" ")}>
              <Shield className="mb-4" color={isDark ? "#7C3AED" : "#2563EB"} size={36} />
              <div className="font-semibold">Enterprise-Grade Analysis</div>
              <div className="mt-2 text-sm text-muted-foreground">
                GPT-4o powered evaluation with granular scoring, red flag detection, and actionable hiring insights.
              </div>
            </Card>
          </div>
        </section>

        <section
          id="metrics"
          ref={metricsSectionRef}
          className={[
            "w-full py-16 transition-colors duration-300",
            isDark ? "bg-zinc-900" : "bg-white",
          ].join(" ")}
        >
          <div className="max-w-4xl mx-auto px-4">
            <div ref={metricsHeadingRef} style={{ position: "relative" }} className="text-center mb-10">
              <VariableProximity
                label="Platform Metrics"
                className="text-4xl md:text-5xl font-semibold"
                fromFontVariationSettings="'wght' 400"
                toFontVariationSettings="'wght' 900"
                containerRef={metricsHeadingRef}
                radius={150}
                falloff="linear"
              />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              <div className="space-y-2">
                {metricsInView ? (
                  <CountUp to={12400} suffix="+" className="text-4xl font-bold tabular-nums" />
                ) : (
                  <div className="text-4xl font-bold tabular-nums">12,400+</div>
                )}
                <div className="text-sm text-muted-foreground">Assessments Completed</div>
              </div>
              <div className="space-y-2">
                {metricsInView ? (
                  <CountUp to={94.2} suffix="%" className="text-4xl font-bold tabular-nums" />
                ) : (
                  <div className="text-4xl font-bold tabular-nums">94.2%</div>
                )}
                <div className="text-sm text-muted-foreground">Accuracy Rate</div>
              </div>
              <div className="space-y-2">
                {metricsInView ? (
                  <CountUp to={8.3} suffix=" min" className="text-4xl font-bold tabular-nums" />
                ) : (
                  <div className="text-4xl font-bold tabular-nums">8.3 min</div>
                )}
                <div className="text-sm text-muted-foreground">Avg Assessment Duration</div>
              </div>
              <div className="space-y-2">
                {metricsInView ? (
                  <CountUp to={340} suffix="+" className="text-4xl font-bold tabular-nums" />
                ) : (
                  <div className="text-4xl font-bold tabular-nums">340+</div>
                )}
                <div className="text-sm text-muted-foreground">Organizations Onboarded</div>
              </div>
            </div>
          </div>
        </section>

        <section
          id="faq"
          className={[
            "py-20 transition-colors duration-300 backdrop-blur-sm",
            isDark ? "bg-zinc-900/80" : "bg-gray-50/80",
          ].join(" ")}
        >
          <div className="max-w-2xl mx-auto px-4">
            <div ref={faqRef} style={{ position: "relative" }} className="text-center mb-12">
              <VariableProximity
                label="Common Questions"
                className="text-4xl md:text-5xl font-semibold"
                fromFontVariationSettings="'wght' 400"
                toFontVariationSettings="'wght' 900"
                containerRef={faqRef}
                radius={150}
                falloff="linear"
              />
            </div>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem
                value="q1"
                className={isDark ? "border-zinc-800" : "border-gray-200"}
              >
                <AccordionTrigger>How does the assessment work?</AccordionTrigger>
                <AccordionContent>
                  SAGE uses WebSocket-based real-time voice communication. Deepgram Nova-2 handles speech recognition while
                  ElevenLabs provides natural AI voice synthesis. Questions are dynamically generated from your parsed resume data.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem
                value="q2"
                className={isDark ? "border-zinc-800" : "border-gray-200"}
              >
                <AccordionTrigger>What is the assessment duration?</AccordionTrigger>
                <AccordionContent>
                  A standard assessment consists of 8 calibrated questions across 4 dimensions. Most candidates complete the session in 8-12 minutes.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem
                value="q3"
                className={isDark ? "border-zinc-800" : "border-gray-200"}
              >
                <AccordionTrigger>Which roles are supported?</AccordionTrigger>
                <AccordionContent>
                  SAGE currently supports assessment for Software Engineering, Data Analysis, Product Management, UX Design, DevOps, Machine Learning, and full-stack development roles.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem
                value="q4"
                className={isDark ? "border-zinc-800" : "border-gray-200"}
              >
                <AccordionTrigger>How is scoring calculated?</AccordionTrigger>
                <AccordionContent>
                  Responses are evaluated on four weighted dimensions: Technical Depth (35%), Communication Clarity (25%), Response Relevance (25%), and Confidence Level (15%). Each dimension is scored 1-10 by GPT-4o with structured evaluation rubrics.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem
                value="q5"
                className={isDark ? "border-zinc-800" : "border-gray-200"}
              >
                <AccordionTrigger>Is candidate data secure?</AccordionTrigger>
                <AccordionContent>
                  All data is stored in Supabase PostgreSQL with row-level security policies. Resume files are processed in-memory and never persisted to disk. We comply with standard data protection practices.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem
                value="q6"
                className={isDark ? "border-zinc-800" : "border-gray-200"}
              >
                <AccordionTrigger>Can assessments be retaken?</AccordionTrigger>
                <AccordionContent>
                  Each resume submission generates a unique assessment session. Candidates may submit an updated resume to initiate a new assessment for the same or different role.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </section>

        <section
          className={[
            "w-full py-20 transition-colors duration-300",
            isDark ? "bg-gradient-to-r from-purple-900/30 to-zinc-900" : "bg-gradient-to-r from-blue-50 to-white",
          ].join(" ")}
        >
          <div className="max-w-2xl mx-auto text-center px-4">
            <div ref={ctaRef} style={{ position: "relative" }} className="text-center">
              <VariableProximity
                label="Ready to Begin?"
                className="text-4xl md:text-5xl font-bold"
                fromFontVariationSettings="'wght' 400"
                toFontVariationSettings="'wght' 900"
                containerRef={ctaRef}
                radius={150}
                falloff="linear"
              />
            </div>
            <div className="text-muted-foreground mt-4">
              Complete your AI assessment in under 15 minutes. All you need is your resume and a microphone.
            </div>
            <div className="mt-8 flex gap-4 justify-center">
              <Button
                asChild
                size="lg"
                className={
                  isDark ? "bg-[#7C3AED] hover:bg-[#7C3AED]/90" : "bg-black text-white hover:bg-black/90 border border-black"
                }
              >
                <Link to="/upload">Start Assessment</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className={outlineCtaClass}>
                <Link to="/hr/login">View Sample Report</Link>
              </Button>
            </div>
          </div>
        </section>

        <footer
          className={[
            "py-8 border-t transition-colors duration-300",
            isDark ? "border-zinc-800 bg-zinc-950" : "border-gray-200 bg-white",
          ].join(" ")}
        >
          <div className="max-w-4xl mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="space-y-2">
                <div className="font-semibold">SAGE</div>
                <div className="text-sm text-muted-foreground">Smart Agentic Grading & Evaluation System</div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="font-medium">Links</div>
                <div className="flex flex-col gap-2 text-muted-foreground">
                  <a className="hover:text-foreground" href="#how-it-works">
                    How it Works
                  </a>
                  <a className="hover:text-foreground" href="#features">
                    Why SAGE
                  </a>
                  <a className="hover:text-foreground" href="#faq">
                    FAQ
                  </a>
                  <Link className="hover:text-foreground" to="/upload">
                    Upload Resume
                  </Link>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="font-medium">Company</div>
                <div className="flex flex-col gap-2 text-muted-foreground">
                  <Link className="hover:text-foreground" to="/hr/login">
                    HR Portal
                  </Link>
                  <a className="hover:text-foreground" href="#">
                    Privacy Policy
                  </a>
                  <a className="hover:text-foreground" href="#">
                    Terms of Service
                  </a>
                </div>
              </div>
            </div>

            <div className="mt-8 text-xs text-center text-muted-foreground">
              © 2025 SAGE Systems. All rights reserved.
            </div>
            <div className="mt-2 text-xs text-center text-muted-foreground">
              Powered by GPT-4o · Deepgram · ElevenLabs · LangGraph
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}
