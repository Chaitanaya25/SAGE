import { useNavigate } from "react-router-dom"
import { CreditCard, LayoutDashboard, LogOut, Moon, Settings, Sun, Users } from "lucide-react"

import { PricingSection } from "@/components/ui/pricing"
import { Button } from "@/components/ui/button"
import { useTheme } from "@/lib/theme-context"

export default function HRPricing() {
  const navigate = useNavigate()
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === "dark"

  const sidebarBg = isDark ? "bg-zinc-950 border-zinc-800" : "bg-white border-gray-200"
  const pageBg = isDark ? "bg-zinc-900 text-zinc-50" : "bg-[#FAFAFA] text-[#0A0A0A]"
  const textMuted = isDark ? "text-zinc-400" : "text-gray-500"
  const activeNav = isDark ? "bg-zinc-800 text-zinc-50" : "bg-gray-100 text-gray-900"
  const inactiveNav = isDark
    ? "text-zinc-400 hover:text-zinc-50 hover:bg-zinc-800/60"
    : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
  const borderRow = isDark ? "border-zinc-800" : "border-gray-200"

  return (
    <div className={["min-h-screen flex", pageBg].join(" ")}>
      <aside className={["fixed inset-y-0 left-0 w-64 flex flex-col border-r", sidebarBg].join(" ")}>
        <div className="py-6 px-6">
          <div className="font-bold text-xl">SAGE</div>
          <div className={["text-xs uppercase tracking-widest mt-1", textMuted].join(" ")}>HR Portal</div>
        </div>

        <nav className="flex-1 px-3 space-y-1">
          <button
            type="button"
            className={["w-full flex items-center gap-3 py-2.5 px-3 rounded-lg text-sm font-medium transition-colors", inactiveNav].join(" ")}
            onClick={() => navigate("/hr/dashboard")}
          >
            <LayoutDashboard size={16} />
            Dashboard
          </button>
          <button
            type="button"
            className={["w-full flex items-center gap-3 py-2.5 px-3 rounded-lg text-sm font-medium transition-colors", inactiveNav].join(" ")}
            onClick={() => navigate("/hr/dashboard")}
          >
            <Users size={16} />
            Candidates
          </button>
          <button
            type="button"
            className={["w-full flex items-center gap-3 py-2.5 px-3 rounded-lg text-sm font-medium transition-colors", inactiveNav].join(" ")}
            onClick={() => navigate("/hr/dashboard")}
          >
            <Settings size={16} />
            Settings
          </button>
          <button
            type="button"
            className={["w-full flex items-center gap-3 py-2.5 px-3 rounded-lg text-sm font-medium transition-colors", activeNav].join(" ")}
          >
            <CreditCard size={16} />
            Pricing
          </button>
        </nav>

        <div className={["p-4 border-t", borderRow].join(" ")}>
          <button
            type="button"
            className={["w-full flex items-center gap-3 py-2.5 px-3 rounded-lg text-sm transition-colors", inactiveNav].join(" ")}
            onClick={() => {
              localStorage.removeItem("sage_token")
              navigate("/hr/login", { replace: true })
            }}
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </aside>

      <main className="ml-64 flex-1 p-8">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Pricing</h1>
            <p className={["text-sm mt-0.5", textMuted].join(" ")}>
              Enterprise plans for HR teams and organizations
            </p>
          </div>
          <Button
            type="button"
            size="icon"
            variant="outline"
            onClick={toggleTheme}
            className={isDark ? "border-zinc-800 bg-transparent hover:bg-zinc-900" : "border-gray-200 bg-white"}
          >
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
          </Button>
        </div>

        <PricingSection
          heading="Enterprise Plans"
          description="Scale candidate screening across teams with analytics, automation, and compliance controls."
          plans={[
            {
              name: "Team",
              info: "For small HR teams",
              price: { monthly: 4999, yearly: 49990 },
              features: [
                { text: "25 assessments / month" },
                { text: "5 HR seats" },
                { text: "Basic analytics" },
                { text: "Email support" },
              ],
              btn: { text: "Choose Team", href: "/hr/login" },
            },
            {
              name: "Business",
              info: "For growing organizations",
              highlighted: true,
              price: { monthly: 14999, yearly: 149990 },
              features: [
                { text: "Unlimited assessments" },
                { text: "20 HR seats" },
                { text: "Advanced analytics" },
                { text: "Priority support" },
                { text: "API access" },
                { text: "Custom rubrics" },
              ],
              btn: { text: "Choose Business", href: "/hr/login" },
            },
            {
              name: "Enterprise",
              info: "For large deployments",
              price: { monthly: 49999, yearly: 499990 },
              features: [
                { text: "Unlimited everything" },
                { text: "Unlimited HR seats" },
                { text: "Dedicated manager" },
                { text: "SSO/SAML" },
                { text: "SLA guarantee" },
                { text: "On-premise option" },
              ],
              btn: { text: "Contact Sales", href: "/hr/login" },
            },
          ]}
          className={isDark ? "text-zinc-50" : "text-gray-900"}
        />
      </main>
    </div>
  )
}

