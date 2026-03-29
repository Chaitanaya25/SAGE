import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { ArrowLeft, Moon, Sun } from "lucide-react"

import { Button } from "@/components/ui/button"
import { PricingSection } from "@/components/ui/pricing"
import { useTheme } from "@/lib/theme-context"

const CANDIDATE_PLANS = [
  {
    name: "Free",
    info: "For individual candidates",
    price: { monthly: 0, yearly: 0 },
    features: [
      { text: "1 AI assessment per month" },
      { text: "Resume ATS score analysis" },
      { text: "8-question voice interview" },
      { text: "Basic evaluation report" },
      { text: "Community support" },
    ],
    btn: { text: "Get Started", href: "/login" },
  },
  {
    name: "Pro",
    info: "For serious job seekers",
    highlighted: true,
    price: { monthly: 299, yearly: 2999 },
    features: [
      { text: "Unlimited AI assessments" },
      { text: "Advanced ATS scoring with JD matching" },
      { text: "12-question extended interviews" },
      { text: "Radar chart skill analytics" },
      { text: "Skill gap analysis & recommendations" },
      { text: "AI Coach with improvement plans" },
      { text: "Priority email support", tooltip: "Response within 24 hours" },
      { text: "Interview preparation insights" },
    ],
    btn: { text: "Start Pro", href: "/login" },
  },
]

const HR_PLANS = [
  {
    name: "Team",
    info: "For small HR teams",
    price: { monthly: 4999, yearly: 49999 },
    features: [
      { text: "25 assessments per month" },
      { text: "5 HR seats" },
      { text: "Basic analytics dashboard" },
      { text: "Candidate comparison reports" },
      { text: "Email support", tooltip: "Response within 48 hours" },
    ],
    btn: { text: "Start Team Plan", href: "/login" },
  },
  {
    name: "Business",
    info: "For growing organizations",
    highlighted: true,
    price: { monthly: 14999, yearly: 149999 },
    features: [
      { text: "Unlimited assessments" },
      { text: "20 HR seats" },
      { text: "Advanced analytics & reporting" },
      { text: "Custom evaluation rubrics" },
      { text: "API access for integrations" },
      { text: "Priority support", tooltip: "24/7 chat and email support" },
      { text: "Job posting management" },
    ],
    btn: { text: "Start Business", href: "/login" },
  },
  {
    name: "Enterprise",
    info: "For large organizations",
    price: { monthly: 49999, yearly: 499999 },
    features: [
      { text: "Unlimited everything" },
      { text: "Unlimited HR seats" },
      { text: "Dedicated account manager" },
      { text: "SSO / SAML authentication" },
      { text: "SLA guarantee (99.9% uptime)" },
      { text: "On-premise deployment option" },
      { text: "Data export & compliance" },
    ],
    btn: { text: "Contact Sales", href: "/login" },
  },
]

export default function PricingPage() {
  const [view, setView] = useState<"candidate" | "hr">("candidate")
  const navigate = useNavigate()
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === "dark"

  return (
    <div className={["min-h-screen", isDark ? "bg-zinc-950 text-white" : "bg-[#FAFAFA] text-black"].join(" ")}>
      <header className={["sticky top-0 z-50 border-b backdrop-blur-lg", isDark ? "bg-zinc-950/80 border-zinc-800" : "bg-white/80 border-gray-200"].join(" ")}>
        <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <button type="button" onClick={() => navigate("/home")} className="flex items-center gap-2 font-bold text-xl">
            <ArrowLeft className="w-4 h-4" /> SAGE
          </button>
          <div className="flex items-center gap-2">
            <Button size="icon" variant="outline" onClick={toggleTheme} className={isDark ? "border-zinc-700 bg-transparent hover:bg-zinc-900" : "border-gray-200 bg-white hover:bg-gray-50"}>
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
            <Button variant="outline" onClick={() => navigate("/login")} className={isDark ? "border-zinc-700 text-white hover:bg-white/10" : "border-gray-300 text-gray-900 hover:bg-gray-50"}>
              Login
            </Button>
          </div>
        </nav>
      </header>

      <main className="py-16 px-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">Pricing</h1>
          <p className="text-muted-foreground max-w-xl mx-auto">Choose the right plan for your needs. All prices in ₹ (INR).</p>

          <div className={["inline-flex rounded-full border p-1 mt-6", isDark ? "border-zinc-700 bg-zinc-900" : "border-gray-200 bg-gray-100"].join(" ")}>
            <button
              type="button"
              onClick={() => setView("candidate")}
              className={[
                "px-6 py-2 rounded-full text-sm font-medium transition-colors",
                view === "candidate" ? (isDark ? "bg-purple-600 text-white" : "bg-black text-white") : "text-muted-foreground",
              ].join(" ")}
            >
              For Candidates
            </button>
            <button
              type="button"
              onClick={() => setView("hr")}
              className={[
                "px-6 py-2 rounded-full text-sm font-medium transition-colors",
                view === "hr" ? (isDark ? "bg-purple-600 text-white" : "bg-black text-white") : "text-muted-foreground",
              ].join(" ")}
            >
              For HR Teams
            </button>
          </div>
        </div>

        {view === "candidate" ? (
          <PricingSection plans={CANDIDATE_PLANS} heading="Candidate Plans" description="Ace your next interview with AI-powered assessments" />
        ) : (
          <PricingSection plans={HR_PLANS} heading="HR & Enterprise Plans" description="Scale your hiring with autonomous AI screening" />
        )}
      </main>
    </div>
  )
}
