import { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import {
  BarChart3,
  Brain,
  Calendar,
  FileSearch,
  Mic,
  Shield,
  Moon,
  Sun,
} from "lucide-react"

import CountUp from "@/components/CountUp"
import AnimatedBackground from "@/components/AnimatedBackground"
import ScheduledInterviews from "@/components/ScheduledInterviews"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Calendar20 } from "@/components/ui/calendar-with-time-pressets"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { PricingSection } from "@/components/ui/pricing"
import { useTheme } from "@/lib/theme-context"

export default function Home() {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === "dark"
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null)
  const [showSchedule, setShowSchedule] = useState(false)
  const [showCalendar, setShowCalendar] = useState(false)
  const [booking, setBooking] = useState<{ date: Date | undefined; time: string | null }>({
    date: undefined,
    time: null,
  })
  const glassCard = [
    "relative overflow-hidden p-6 transition-colors duration-300 backdrop-blur-sm",
    "transition-transform duration-300 hover:-translate-y-[2px]",
    isDark ? "bg-zinc-900/60 border-zinc-700/50 text-zinc-50" : "bg-white/70 border-gray-200/50 text-gray-900",
  ].join(" ")
  const outlineCtaClass = isDark
    ? "border-zinc-700/60 bg-transparent hover:bg-zinc-900"
    : "border-black text-black hover:bg-black hover:text-white"

  const headerShell = isDark
    ? "bg-zinc-950/80 border-zinc-800 text-zinc-400"
    : "bg-white/80 border-gray-200 text-gray-600"
  const dropdownShell = isDark
    ? "bg-zinc-900/95 border-zinc-800 text-zinc-50"
    : "bg-white/95 border-gray-200 text-gray-900"
  const navButtonBase = isDark
    ? "text-sm text-white hover:text-white transition-colors px-3 py-2"
    : "text-sm text-gray-600 hover:text-gray-900 transition-colors px-3 py-2"

  const bookingText = useMemo(() => {
    const date = booking.date
    const time = booking.time
    if (!date || !time) return "Select a date and time to book your assessment."
    const d = date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })
    return `Your assessment is booked for ${d} at ${time}`
  }, [booking.date, booking.time])

  return (
    <div
      className={[
        "min-h-screen relative transition-colors duration-300",
        isDark ? "bg-black text-zinc-50" : "bg-white text-[#0A0A0A]",
      ].join(" ")}
    >
      <AnimatedBackground variant="particles" />

      <div className="relative z-10">
        <style>{`
          @keyframes sageDropdownIn { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }
          .sage-dropdown { animation: sageDropdownIn 200ms ease-out; }
        `}</style>

        <header className={["sticky top-0 z-50 backdrop-blur-lg border-b", headerShell].join(" ")}>
          <div className="max-w-6xl mx-auto flex items-center justify-between h-16 px-6">
            <Link to="/home" className={["font-bold text-xl", isDark ? "text-white" : "text-gray-900"].join(" ")}>
              SAGE
            </Link>

            <nav className="hidden md:flex items-center gap-2">
              <div
                className="relative"
                onMouseEnter={() => setActiveDropdown("product")}
                onMouseLeave={() => {
                  setActiveDropdown(null)
                  setShowSchedule(false)
                  setShowCalendar(false)
                }}
              >
                <button type="button" className={navButtonBase}>
                  Product
                </button>
                {activeDropdown === "product" ? (
                  <div
                    className={[
                      "sage-dropdown absolute top-full left-0 mt-2 backdrop-blur-xl border rounded-xl p-4 shadow-2xl relative before:content-[''] before:absolute before:-top-2 before:left-0 before:right-0 before:h-2",
                      showSchedule ? "min-w-[640px]" : "min-w-[480px]",
                      dropdownShell,
                    ].join(" ")}
                  >
                    <div className="grid grid-cols-2 gap-2">
                      <Link
                        to="/analyze"
                        onMouseEnter={() => setActiveDropdown("product")}
                        className={[
                          "flex items-start gap-3 p-3 rounded-lg",
                          isDark ? "hover:bg-zinc-800/50" : "hover:bg-gray-100",
                        ].join(" ")}
                      >
                        <div
                          className={[
                            "h-10 w-10 rounded-lg p-2 flex items-center justify-center",
                            isDark ? "bg-zinc-800" : "bg-gray-100",
                          ].join(" ")}
                        >
                          <FileSearch className={isDark ? "text-white" : "text-gray-900"} size={18} />
                        </div>
                        <div>
                          <div className={["text-sm font-medium", isDark ? "text-white" : "text-gray-900"].join(" ")}>
                            Resume Analysis
                          </div>
                          <div className={["text-xs", isDark ? "text-zinc-400" : "text-gray-600"].join(" ")}>
                            ATS-style resume scoring with skill matching and hiring probability
                          </div>
                        </div>
                      </Link>

                      <Link
                        to="/upload"
                        onMouseEnter={() => setActiveDropdown("product")}
                        className={[
                          "flex items-start gap-3 p-3 rounded-lg",
                          isDark ? "hover:bg-zinc-800/50" : "hover:bg-gray-100",
                        ].join(" ")}
                      >
                        <div
                          className={[
                            "h-10 w-10 rounded-lg p-2 flex items-center justify-center",
                            isDark ? "bg-zinc-800" : "bg-gray-100",
                          ].join(" ")}
                        >
                          <Mic className={isDark ? "text-white" : "text-gray-900"} size={18} />
                        </div>
                        <div>
                          <div className={["text-sm font-medium", isDark ? "text-white" : "text-gray-900"].join(" ")}>
                            Voice Interview
                          </div>
                          <div className={["text-xs", isDark ? "text-zinc-400" : "text-gray-600"].join(" ")}>
                            Real-time AI voice interview with dynamic questioning
                          </div>
                        </div>
                      </Link>

                      <button
                        type="button"
                        onClick={() => {
                          setShowSchedule((v) => !v)
                          setShowCalendar(false)
                        }}
                        className={[
                          "flex items-start gap-3 p-3 rounded-lg text-left",
                          isDark ? "hover:bg-zinc-800/50" : "hover:bg-gray-100",
                        ].join(" ")}
                      >
                        <div
                          className={[
                            "h-10 w-10 rounded-lg p-2 flex items-center justify-center",
                            isDark ? "bg-zinc-800" : "bg-gray-100",
                          ].join(" ")}
                        >
                          <Calendar className={isDark ? "text-white" : "text-gray-900"} size={18} />
                        </div>
                        <div>
                          <div className={["text-sm font-medium", isDark ? "text-white" : "text-gray-900"].join(" ")}>
                            Schedule Assessment
                          </div>
                          <div className={["text-xs", isDark ? "text-zinc-400" : "text-gray-600"].join(" ")}>
                            Book your interview slot with our AI interviewer
                          </div>
                        </div>
                      </button>

                      <Link
                        to="/done"
                        onMouseEnter={() => setActiveDropdown("product")}
                        className={[
                          "flex items-start gap-3 p-3 rounded-lg",
                          isDark ? "hover:bg-zinc-800/50" : "hover:bg-gray-100",
                        ].join(" ")}
                      >
                        <div
                          className={[
                            "h-10 w-10 rounded-lg p-2 flex items-center justify-center",
                            isDark ? "bg-zinc-800" : "bg-gray-100",
                          ].join(" ")}
                        >
                          <BarChart3 className={isDark ? "text-white" : "text-gray-900"} size={18} />
                        </div>
                        <div>
                          <div className={["text-sm font-medium", isDark ? "text-white" : "text-gray-900"].join(" ")}>
                            Score Dashboard
                          </div>
                          <div className={["text-xs", isDark ? "text-zinc-400" : "text-gray-600"].join(" ")}>
                            View your evaluation scores and improvement areas
                          </div>
                        </div>
                      </Link>
                    </div>
                    {showSchedule ? (
                      <div
                        className={[
                          "mt-4 pt-4 border-t",
                          isDark ? "border-zinc-800" : "border-gray-200",
                        ].join(" ")}
                      >
                        <ScheduledInterviews />
                        <Button
                          className="w-full mt-3"
                          variant="outline"
                          size="sm"
                          onClick={() => setShowCalendar((v) => !v)}
                        >
                          Book New Assessment Slot
                        </Button>
                        {showCalendar ? (
                          <div className={["mt-3 rounded-xl border", isDark ? "border-zinc-800" : "border-gray-200"].join(" ")}>
                            <Calendar20 value={booking} onChange={setBooking} />
                            <div className={["px-4 pb-4 text-xs", isDark ? "text-zinc-400" : "text-gray-600"].join(" ")}>
                              {bookingText}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>

              <a className={navButtonBase} href="#pricing">
                Pricing
              </a>
              <a className={navButtonBase} href="#faq">
                FAQ
              </a>
            </nav>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="icon"
                variant="outline"
                onClick={toggleTheme}
                className={isDark ? "border-zinc-800 bg-transparent hover:bg-zinc-900" : "border-gray-200 bg-white hover:bg-gray-50"}
              >
                {isDark ? <Sun size={16} /> : <Moon size={16} />}
              </Button>
              <Button
                asChild
                variant="outline"
                className={
                  isDark
                    ? "border-zinc-700 text-white bg-transparent hover:bg-zinc-900"
                    : "border-black text-black hover:bg-black hover:text-white"
                }
              >
                <Link to="/hr/login">HR Portal</Link>
              </Button>
              <Button
                asChild
                className={
                  isDark
                    ? "bg-[#7C3AED] text-white hover:bg-[#7C3AED]/90"
                    : "bg-black text-white hover:bg-black/90 border border-black"
                }
              >
                <Link to="/upload">Start Assessment</Link>
              </Button>
            </div>
          </div>
        </header>

        <section className="relative min-h-[calc(100vh-56px)] flex items-center bg-transparent">
          <div className="w-full px-4">
            <div className="mx-auto max-w-5xl py-16">
              <div className="text-5xl md:text-6xl font-bold text-center">Autonomous AI Recruitment</div>
              <div className="text-lg text-muted-foreground text-center max-w-2xl mx-auto mt-4">
                SAGE conducts end-to-end candidate screening — from resume analysis to voice interviews to evaluation
                reports — with zero human involvement in the loop.
              </div>
              <div className="mt-8 flex gap-4 justify-center">
                <Button
                  asChild
                  size="lg"
                  className={
                    isDark ? "bg-[#7C3AED] hover:bg-[#7C3AED]/90" : "bg-black text-white hover:bg-black/90 border border-black"
                  }
                >
                  <Link to="/upload">Begin Assessment</Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className={outlineCtaClass}
                >
                  <Link to="/hr/login">Enterprise Demo</Link>
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
          <div className="text-3xl font-semibold text-center mb-12">Assessment Pipeline</div>
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
          <div className="text-3xl font-semibold text-center mb-12">Why Organizations Choose SAGE</div>
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
          id="pricing"
          className={[
            "py-20 transition-colors duration-300 backdrop-blur-sm",
            isDark ? "bg-zinc-950/90" : "bg-white/90",
          ].join(" ")}
        >
          <div className="max-w-6xl mx-auto px-4">
            <PricingSection
              heading="Assessment Plans"
              description="Choose the right plan for your hiring needs. Scale from individual assessments to enterprise-wide deployment."
              plans={[
                {
                  name: "Starter",
                  info: "For individual candidates",
                  price: { monthly: 0, yearly: 0 },
                  features: [
                    { text: "1 AI assessment per month" },
                    { text: "Basic resume analysis" },
                    { text: "Standard voice interview (8 questions)" },
                    { text: "Score report with recommendations" },
                    { text: "Email support", tooltip: "Response within 48 hours" },
                  ],
                  btn: { text: "Get Started Free", href: "/upload" },
                },
                {
                  name: "Professional",
                  info: "For active job seekers",
                  highlighted: true,
                  price: { monthly: 19, yearly: 190 },
                  features: [
                    { text: "Unlimited AI assessments" },
                    { text: "Advanced ATS resume scoring" },
                    { text: "Extended interviews (12 questions)" },
                    { text: "Detailed radar chart analytics" },
                    { text: "Skill gap analysis with recommendations" },
                    { text: "Priority support", tooltip: "24/7 chat support" },
                    { text: "Interview preparation tips", tooltip: "AI-generated prep materials" },
                  ],
                  btn: { text: "Start Pro Trial", href: "/upload" },
                },
                {
                  name: "Enterprise",
                  info: "For organizations & HR teams",
                  price: { monthly: 99, yearly: 990 },
                  features: [
                    { text: "Unlimited team assessments" },
                    { text: "HR Dashboard with analytics" },
                    { text: "Custom evaluation rubrics" },
                    { text: "Bulk candidate processing" },
                    { text: "API access for integrations" },
                    { text: "Dedicated account manager", tooltip: "Personal onboarding and support" },
                    { text: "SOC 2 compliance reporting" },
                  ],
                  btn: { text: "Contact Sales", href: "/hr/login" },
                },
              ]}
              className={isDark ? "text-zinc-50" : "text-gray-900"}
            />
          </div>
        </section>

        <section
          id="metrics"
          className={[
            "w-full py-16 transition-colors duration-300",
            isDark ? "bg-zinc-900" : "bg-white",
          ].join(" ")}
        >
          <div className="max-w-4xl mx-auto px-4">
            <div className="text-3xl font-semibold text-center mb-10">Platform Metrics</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              <div className="space-y-2">
                <CountUp to={12400} suffix="+" className="text-4xl font-bold tabular-nums" />
                <div className="text-sm text-muted-foreground">Assessments Completed</div>
              </div>
              <div className="space-y-2">
                <CountUp to={94.2} suffix="%" className="text-4xl font-bold tabular-nums" />
                <div className="text-sm text-muted-foreground">Accuracy Rate</div>
              </div>
              <div className="space-y-2">
                <CountUp to={8.3} suffix=" min" className="text-4xl font-bold tabular-nums" />
                <div className="text-sm text-muted-foreground">Avg Assessment Duration</div>
              </div>
              <div className="space-y-2">
                <CountUp to={340} suffix="+" className="text-4xl font-bold tabular-nums" />
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
            <div className="text-3xl font-semibold text-center mb-12">Common Questions</div>
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
            <div className="text-3xl font-bold">Ready to Begin?</div>
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
