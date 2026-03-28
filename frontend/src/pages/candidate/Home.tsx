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

import AnimatedBackground from "@/components/AnimatedBackground"
import { Header } from "@/components/header-3"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useTheme } from "@/lib/theme-context"

export default function Home() {
  const { theme } = useTheme()
  const isDark = theme === "dark"
  const cardClass = [
    "p-6 text-center transition-colors duration-300",
    isDark ? "bg-zinc-900 border-zinc-800 text-zinc-50" : "bg-white border-gray-200 text-gray-900",
  ].join(" ")

  return (
    <div
      className={[
        "min-h-screen transition-colors duration-300",
        isDark ? "bg-zinc-950 text-zinc-50" : "bg-[#FAFAFA] text-[#0A0A0A]",
      ].join(" ")}
    >
      <Header />

      <section className="relative min-h-[calc(100vh-56px)] flex items-center">
        <AnimatedBackground variant="gridscan" />

        <div className="relative z-10 w-full px-4">
          <div className="mx-auto max-w-5xl py-16">
            <div className="text-5xl md:text-6xl font-bold text-center">
              AI-Powered Interview Platform
            </div>
            <div className="text-lg text-muted-foreground text-center max-w-2xl mx-auto mt-4">
              Upload your resume. Answer questions by voice. Get evaluated by AI in minutes.
            </div>
            <div className="mt-8 flex gap-4 justify-center">
              <Button asChild size="lg" className={isDark ? "bg-[#7C3AED] hover:bg-[#7C3AED]/90" : ""}>
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
          "py-20 transition-colors duration-300",
          isDark ? "bg-zinc-950" : "bg-white",
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
          "py-20 transition-colors duration-300",
          isDark ? "bg-zinc-950" : "bg-[#FAFAFA]",
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

      <footer
        className={[
          "py-8 border-t text-center text-sm text-muted-foreground transition-colors duration-300",
          isDark ? "bg-zinc-950 border-zinc-800" : "bg-white border-gray-200",
        ].join(" ")}
      >
        SAGE — Smart Agentic Grading & Evaluation System · Built for VibeCon 2025
      </footer>
    </div>
  )
}
