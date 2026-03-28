import { Link } from "react-router-dom"
import {
  BarChart3,
  Brain,
  FileCheck,
  MessageSquare,
  Mic,
  Shield,
  Upload,
} from "lucide-react"

import CountUp from "@/components/CountUp"
import { GridScan } from "@/components/GridScan.jsx"
import { Header } from "@/components/header-3"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useTheme } from "@/lib/theme-context"

export default function Home() {
  const { theme } = useTheme()
  const isDark = theme === "dark"
  const cardClass = [
    "p-6 text-center transition-colors duration-300",
    "backdrop-blur-sm",
    isDark
      ? "bg-zinc-900/60 border-zinc-700/50 text-zinc-50"
      : "bg-white/70 border-gray-200/50 text-gray-900",
  ].join(" ")

  return (
    <div
      className={[
        "min-h-screen relative transition-colors duration-300",
        isDark ? "bg-zinc-950 text-zinc-50" : "bg-[#FAFAFA] text-[#0A0A0A]",
      ].join(" ")}
    >
      <div className="fixed inset-0 z-0 pointer-events-none">
        <GridScan
          sensitivity={0.55}
          lineThickness={1}
          linesColor={theme === "dark" ? "#392e4e" : "#d1d5db"}
          scanColor={theme === "dark" ? "#FF9FFC" : "#7C3AED"}
          gridScale={0.1}
          scanOpacity={0.4}
          enablePost
          bloomIntensity={0.6}
          chromaticAberration={0.002}
          noiseIntensity={0.01}
        />
      </div>

      <div className="relative z-10">
        <Header />

        <section className="relative min-h-[calc(100vh-56px)] flex items-center bg-transparent">
          <div className="w-full px-4">
            <div className="mx-auto max-w-5xl py-16">
              <div className="text-5xl md:text-6xl font-bold text-center">
                AI-Powered Interview Platform
              </div>
              <div className="text-lg text-muted-foreground text-center max-w-2xl mx-auto mt-4">
                Upload your resume. Answer questions by voice. Get evaluated by AI in minutes.
              </div>
              <div className="mt-8 flex gap-4 justify-center">
                <Button
                  asChild
                  size="lg"
                  className={isDark ? "bg-[#7C3AED] hover:bg-[#7C3AED]/90" : ""}
                >
                  <Link to="/upload">Start Interview</Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className={isDark ? "border-zinc-800 bg-transparent hover:bg-zinc-900" : ""}
                >
                  <Link to="/hr/login">HR Portal</Link>
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
          <div className="text-3xl font-semibold text-center mb-12">How SAGE Works</div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 max-w-5xl mx-auto px-4">
            <Card className={cardClass}>
              <Upload className="mx-auto mb-4" color={isDark ? "#7C3AED" : "#2563EB"} size={40} />
              <div className="font-semibold">Upload Resume</div>
              <div className="mt-2 text-sm text-muted-foreground">
                Submit your PDF and select the role you're applying for
              </div>
            </Card>
            <Card className={cardClass}>
              <MessageSquare className="mx-auto mb-4" color={isDark ? "#7C3AED" : "#2563EB"} size={40} />
              <div className="font-semibold">AI Interview</div>
              <div className="mt-2 text-sm text-muted-foreground">
                Answer voice questions generated specifically from your resume
              </div>
            </Card>
            <Card className={cardClass}>
              <BarChart3 className="mx-auto mb-4" color={isDark ? "#7C3AED" : "#2563EB"} size={40} />
              <div className="font-semibold">Real-time Scoring</div>
              <div className="mt-2 text-sm text-muted-foreground">
                Get evaluated on technical depth, communication, relevance, and confidence
              </div>
            </Card>
            <Card className={cardClass}>
              <FileCheck className="mx-auto mb-4" color={isDark ? "#7C3AED" : "#2563EB"} size={40} />
              <div className="font-semibold">Get Results</div>
              <div className="mt-2 text-sm text-muted-foreground">
                Receive a detailed evaluation report with hire recommendation
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
          <div className="text-3xl font-semibold text-center mb-12">Why SAGE?</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto px-4">
            <Card className={cardClass}>
              <Mic className="mx-auto mb-4" color={isDark ? "#7C3AED" : "#2563EB"} size={40} />
              <div className="font-semibold">Voice-First</div>
              <div className="mt-2 text-sm text-muted-foreground">
                Natural voice interviews — no typing, no chatbots
              </div>
            </Card>
            <Card className={cardClass}>
              <Brain className="mx-auto mb-4" color={isDark ? "#7C3AED" : "#2563EB"} size={40} />
              <div className="font-semibold">AI-Powered</div>
              <div className="mt-2 text-sm text-muted-foreground">
                GPT-4o generates questions specific to YOUR resume
              </div>
            </Card>
            <Card className={cardClass}>
              <Shield className="mx-auto mb-4" color={isDark ? "#7C3AED" : "#2563EB"} size={40} />
              <div className="font-semibold">Fair & Consistent</div>
              <div className="mt-2 text-sm text-muted-foreground">
                Every candidate scored on the same 4 dimensions
              </div>
            </Card>
          </div>
        </section>

        <section
          className={[
            "w-full py-16 transition-colors duration-300",
            isDark ? "bg-zinc-900" : "bg-white",
          ].join(" ")}
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto text-center px-4">
            <div className="space-y-2">
              <CountUp to={2500} suffix="+" className="text-4xl font-bold tabular-nums" />
              <div className="text-sm text-muted-foreground">Interviews Conducted</div>
            </div>
            <div className="space-y-2">
              <CountUp to={98} suffix="%" className="text-4xl font-bold tabular-nums" />
              <div className="text-sm text-muted-foreground">Candidate Satisfaction</div>
            </div>
            <div className="space-y-2">
              <CountUp to={4.2} suffix=" min" className="text-4xl font-bold tabular-nums" />
              <div className="text-sm text-muted-foreground">Average Interview Time</div>
            </div>
            <div className="space-y-2">
              <CountUp to={50} suffix="+" className="text-4xl font-bold tabular-nums" />
              <div className="text-sm text-muted-foreground">Companies Trust SAGE</div>
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
            <div className="text-3xl font-semibold text-center mb-12">Frequently Asked Questions</div>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem
                value="q1"
                className={isDark ? "border-zinc-800" : "border-gray-200"}
              >
                <AccordionTrigger>How does the voice interview work?</AccordionTrigger>
                <AccordionContent>
                  SAGE uses your microphone to conduct a real-time voice interview. Our AI asks questions generated from
                  your resume, listens to your answers via Deepgram speech recognition, and evaluates your responses in
                  real-time.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem
                value="q2"
                className={isDark ? "border-zinc-800" : "border-gray-200"}
              >
                <AccordionTrigger>How long does the interview take?</AccordionTrigger>
                <AccordionContent>
                  A typical SAGE interview consists of 8 questions and takes about 10-15 minutes to complete.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem
                value="q3"
                className={isDark ? "border-zinc-800" : "border-gray-200"}
              >
                <AccordionTrigger>What roles can I apply for?</AccordionTrigger>
                <AccordionContent>
                  SAGE currently supports interviews for Software Engineer, Data Analyst, Product Manager, UX Designer,
                  DevOps Engineer, ML Engineer, and more.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem
                value="q4"
                className={isDark ? "border-zinc-800" : "border-gray-200"}
              >
                <AccordionTrigger>How is my score calculated?</AccordionTrigger>
                <AccordionContent>
                  You're evaluated on 4 dimensions: Technical Depth (35%), Communication (25%), Relevance (25%), and
                  Confidence (15%). Each dimension is scored 1-10 by GPT-4o.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem
                value="q5"
                className={isDark ? "border-zinc-800" : "border-gray-200"}
              >
                <AccordionTrigger>Is my data secure?</AccordionTrigger>
                <AccordionContent>
                  Yes. Your resume and interview data are stored securely in Supabase with row-level security. We never
                  share your information with third parties.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem
                value="q6"
                className={isDark ? "border-zinc-800" : "border-gray-200"}
              >
                <AccordionTrigger>Can I retake the interview?</AccordionTrigger>
                <AccordionContent>
                  Currently each resume upload generates one interview session. You can upload an updated resume to start
                  a new interview for a different role.
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
            <div className="text-3xl font-bold">Ready to ace your next interview?</div>
            <div className="text-muted-foreground mt-4">
              Start your AI-powered interview in under 5 minutes. No preparation needed — just your resume and your
              voice.
            </div>
            <div className="mt-8 flex gap-4 justify-center">
              <Button asChild size="lg" className={isDark ? "bg-[#7C3AED] hover:bg-[#7C3AED]/90" : ""}>
                <Link to="/upload">Start Interview</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className={isDark ? "border-zinc-700/60 bg-transparent" : ""}>
                <a href="#how-it-works">Learn More</a>
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
                <div className="text-sm text-muted-foreground">
                  Smart Agentic Grading & Evaluation System
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="font-medium">Links</div>
                <div className="flex flex-col gap-2 text-muted-foreground">
                  <a className="hover:text-foreground" href="#how-it-works">
                    How it Works
                  </a>
                  <a className="hover:text-foreground" href="#features">
                    Features
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
              © 2025 SAGE. Built for VibeCon Hackathon.
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}
