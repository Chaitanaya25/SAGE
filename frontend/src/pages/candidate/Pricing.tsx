import { Link } from "react-router-dom"

import AnimatedBackground from "@/components/AnimatedBackground"
import CandidateHeader from "@/components/CandidateHeader"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { PricingSection } from "@/components/ui/pricing"
import { useTheme } from "@/lib/theme-context"

export default function Pricing() {
  const { theme } = useTheme()
  const isDark = theme === "dark"

  return (
    <div className={["min-h-screen relative", isDark ? "bg-black text-zinc-50" : "bg-white text-gray-900"].join(" ")}>
      <AnimatedBackground variant="particles" />
      <div className="relative z-10">
        <CandidateHeader />

        <main className="max-w-6xl mx-auto pt-24 px-4 pb-16 space-y-16">
          <section
            id="pricing"
            className={[
              "py-10 backdrop-blur-sm rounded-2xl border",
              isDark ? "bg-zinc-950/70 border-zinc-800" : "bg-white/80 border-gray-200",
            ].join(" ")}
          >
            <PricingSection
              heading="Assessment Plans"
              description="Choose the right plan for your hiring needs. Scale from individual assessments to enterprise-wide deployment."
              plans={[
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
                  btn: { text: "Get Started", href: "/upload" },
                },
                {
                  name: "Pro",
                  info: "For serious job seekers",
                  highlighted: true,
                  price: { monthly: 499, yearly: 4999 },
                  features: [
                    { text: "Unlimited AI assessments" },
                    { text: "Advanced ATS scoring with JD matching" },
                    { text: "12-question extended interviews" },
                    { text: "Radar chart skill analytics" },
                    { text: "Skill gap analysis & recommendations" },
                    { text: "Priority email support" },
                    { text: "Interview preparation insights" },
                  ],
                  btn: { text: "Start Pro", href: "/upload" },
                },
                {
                  name: "Enterprise",
                  info: "For HR teams & organizations",
                  price: { monthly: 2999, yearly: 29999 },
                  features: [
                    { text: "Unlimited team assessments" },
                    { text: "HR Dashboard with full analytics" },
                    { text: "Custom scoring rubrics" },
                    { text: "Bulk candidate processing" },
                    { text: "REST API access" },
                    { text: "Dedicated account manager" },
                    { text: "Data export & compliance" },
                  ],
                  btn: { text: "Contact Sales", href: "/hr/login" },
                },
              ]}
              className={isDark ? "text-zinc-50" : "text-gray-900"}
            />
          </section>

          <section
            id="faq"
            className={[
              "py-10 backdrop-blur-sm rounded-2xl border",
              isDark ? "bg-zinc-900/70 border-zinc-800" : "bg-white/80 border-gray-200",
            ].join(" ")}
          >
            <div className="max-w-2xl mx-auto px-6">
              <div className="text-3xl font-semibold text-center mb-12">Common Questions</div>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="q1" className={isDark ? "border-zinc-800" : "border-gray-200"}>
                  <AccordionTrigger>How does the assessment work?</AccordionTrigger>
                  <AccordionContent>
                    SAGE uses WebSocket-based real-time voice communication. Deepgram Nova-2 handles speech recognition while
                    ElevenLabs provides natural AI voice synthesis. Questions are dynamically generated from your parsed resume data.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="q2" className={isDark ? "border-zinc-800" : "border-gray-200"}>
                  <AccordionTrigger>What is the assessment duration?</AccordionTrigger>
                  <AccordionContent>
                    A standard assessment consists of 8 calibrated questions across 4 dimensions. Most candidates complete the session in 8-12 minutes.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="q3" className={isDark ? "border-zinc-800" : "border-gray-200"}>
                  <AccordionTrigger>Which roles are supported?</AccordionTrigger>
                  <AccordionContent>
                    SAGE currently supports assessment for Software Engineering, Data Analysis, Product Management, UX Design, DevOps, Machine Learning, and full-stack development roles.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="q4" className={isDark ? "border-zinc-800" : "border-gray-200"}>
                  <AccordionTrigger>How is scoring calculated?</AccordionTrigger>
                  <AccordionContent>
                    Responses are evaluated on four weighted dimensions: Technical Depth (35%), Communication Clarity (25%), Response Relevance (25%), and Confidence Level (15%). Each dimension is scored 1-10 by GPT-4o with structured evaluation rubrics.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="q5" className={isDark ? "border-zinc-800" : "border-gray-200"}>
                  <AccordionTrigger>Is candidate data secure?</AccordionTrigger>
                  <AccordionContent>
                    All data is stored in Supabase PostgreSQL with row-level security policies. Resume files are processed in-memory and never persisted to disk. We comply with standard data protection practices.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="q6" className={isDark ? "border-zinc-800" : "border-gray-200"}>
                  <AccordionTrigger>Can assessments be retaken?</AccordionTrigger>
                  <AccordionContent>
                    Each resume submission generates a unique assessment session. Candidates may submit an updated resume to initiate a new assessment for the same or different role.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              <div className="mt-8 text-center text-sm text-muted-foreground">
                For enterprise onboarding, contact sales via the{" "}
                <Link className="underline underline-offset-4" to="/hr/login">
                  HR Portal
                </Link>
                .
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}

