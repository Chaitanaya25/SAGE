import { useEffect, useMemo, useRef, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import {
  BarChart3,
  CheckCircle,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Moon,
  Search,
  Settings,
  TrendingUp,
  Sun,
  Users,
} from "lucide-react"

import CountUp from "@/components/CountUp"
import Loader from "@/components/Loader"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PricingSection } from "@/components/ui/pricing"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { getCandidates, getInterviews, getReport } from "@/lib/api"
import { useTheme } from "@/lib/theme-context"
import type { Candidate, Interview, Report } from "@/types"

// ── Mock data ─────────────────────────────────────────────────────────────────

interface MockRow {
  id: string
  name: string
  email: string
  role: string
  score: number | null
  status: "Evaluated" | "In Progress" | "Pending"
  date: string
}

const MOCK: MockRow[] = [
  { id: "1",  name: "Rahul Sharma",  email: "rahul@email.com",  role: "ML Engineer",         score: 8.2,  status: "Evaluated",   date: "Mar 28, 2026" },
  { id: "2",  name: "Priya Patel",   email: "priya@email.com",  role: "Frontend Developer",  score: 7.5,  status: "Evaluated",   date: "Mar 27, 2026" },
  { id: "3",  name: "Arjun Singh",   email: "arjun@email.com",  role: "Backend Developer",   score: null, status: "In Progress", date: "Mar 28, 2026" },
  { id: "4",  name: "Sneha Gupta",   email: "sneha@email.com",  role: "Data Analyst",        score: 6.8,  status: "Evaluated",   date: "Mar 26, 2026" },
  { id: "5",  name: "Vikram Rao",    email: "vikram@email.com", role: "DevOps Engineer",     score: 9.1,  status: "Evaluated",   date: "Mar 25, 2026" },
  { id: "6",  name: "Ananya Iyer",   email: "ananya@email.com", role: "Product Manager",     score: 7.0,  status: "Evaluated",   date: "Mar 25, 2026" },
  { id: "7",  name: "Karan Mehta",   email: "karan@email.com",  role: "Software Engineer",   score: null, status: "Pending",     date: "Mar 28, 2026" },
  { id: "8",  name: "Divya Nair",    email: "divya@email.com",  role: "UX Designer",         score: 8.5,  status: "Evaluated",   date: "Mar 24, 2026" },
  { id: "9",  name: "Amit Kumar",    email: "amit@email.com",   role: "ML Engineer",         score: 5.2,  status: "Evaluated",   date: "Mar 23, 2026" },
  { id: "10", name: "Neha Joshi",    email: "neha@email.com",   role: "Frontend Developer",  score: null, status: "In Progress", date: "Mar 28, 2026" },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function scoreColor(score: number | null) {
  if (score === null) return ""
  if (score >= 7) return "text-green-500"
  if (score >= 5) return "text-amber-400"
  return "text-red-500"
}

function StatusBadge({ status }: { status: MockRow["status"] }) {
  const cls =
    status === "Evaluated"
      ? "bg-green-500/10 text-green-400 border-green-500/20"
      : status === "In Progress"
      ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
      : "bg-zinc-700/50 text-zinc-400 border-zinc-600/30"
  return (
    <Badge variant="outline" className={["text-xs font-medium px-2 py-0.5", cls].join(" ")}>
      {status}
    </Badge>
  )
}

function formatDate(v?: string | null) {
  if (!v) return ""
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const navigate = useNavigate()
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === "dark"

  const [activeTab, setActiveTab] = useState<"dashboard" | "candidates" | "settings" | "pricing">("dashboard")
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<MockRow[]>(MOCK)
  const [query, setQuery] = useState("")
  const candidatesRef = useRef<HTMLDivElement | null>(null)

  const [stats, setStats] = useState({
    totalCandidates: 47,
    completed: 38,
    avgScore: 7.4,
    hireRate: 34,
  })

  // Try real API, fall back to mock
  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const [cRes, iRes] = await Promise.all([getCandidates(), getInterviews()])
        if (cancelled) return
        const candidates: Candidate[] = cRes.candidates ?? []
        const interviews: Interview[] = iRes.interviews ?? []
        if (interviews.length === 0 && candidates.length === 0) throw new Error("empty")

        const completed = interviews.filter((iv) => iv.status === "completed")
        const reportSettled = await Promise.allSettled(
          completed.map(async (iv) => ({ id: iv.id, report: await getReport(iv.id) as Report }))
        )
        if (cancelled) return

        const reportMap: Record<string, Report> = {}
        for (const s of reportSettled) {
          if (s.status === "fulfilled") reportMap[s.value.id] = s.value.report
        }

        const candidateById = new Map(candidates.map((c) => [c.id, c]))
        const apiRows: MockRow[] = interviews
          .slice()
          .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
          .map((iv) => {
            const c = candidateById.get(iv.candidate_id)
            const r = reportMap[iv.id]
            const statusMap: Record<string, MockRow["status"]> = {
              completed: "Evaluated",
              in_progress: "In Progress",
              pending: "Pending",
              interrupted: "Pending",
              timed_out: "Pending",
            }
            return {
              id: iv.id,
              name: c?.name || "Unknown",
              email: c?.email || "",
              role: iv.job_role,
              score: typeof r?.overall_score === "number" ? r.overall_score : null,
              status: statusMap[iv.status] ?? "Pending",
              date: formatDate(iv.created_at),
            }
          })

        const reportList = Object.values(reportMap)
        const avgScore = reportList.length
          ? reportList.reduce((s, r) => s + (r.overall_score ?? 0), 0) / reportList.length
          : 0
        const hireRate = reportList.length
          ? (reportList.filter((r) => r.recommendation === "HIRE").length / reportList.length) * 100
          : 0

        setRows(apiRows.length ? apiRows : MOCK)
        setStats({
          totalCandidates: candidates.length || 47,
          completed: completed.length || 38,
          avgScore: Number.isFinite(avgScore) ? avgScore : 7.4,
          hireRate: Number.isFinite(hireRate) ? hireRate : 34,
        })
      } catch {
        if (!cancelled) { setRows(MOCK) }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (activeTab !== "candidates") return
    candidatesRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
  }, [activeTab])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return rows
    return rows.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q) ||
        r.role.toLowerCase().includes(q)
    )
  }, [rows, query])

  // ── Theme ─────────────────────────────────────────────────────────────────
  const sidebarBg  = isDark ? "bg-zinc-950 border-zinc-800"        : "bg-white border-gray-200"
  const pageBg     = isDark ? "bg-zinc-900"                         : "bg-[#FAFAFA]"
  const cardBg     = isDark ? "bg-zinc-900 border-zinc-800"         : "bg-white border-gray-200"
  const textMain   = isDark ? "text-zinc-50"                        : "text-[#0A0A0A]"
  const textMuted  = isDark ? "text-zinc-400"                       : "text-gray-500"
  const rowHover   = isDark ? "hover:bg-zinc-800/50"                : "hover:bg-gray-50"
  const borderRow  = isDark ? "border-zinc-800"                     : "border-gray-100"
  const activeNav  = isDark ? "bg-zinc-800 text-zinc-50"            : "bg-gray-100 text-gray-900"
  const inactiveNav= isDark ? "text-zinc-400 hover:text-zinc-50 hover:bg-zinc-800/60" : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
  const inputCls   = isDark ? "bg-zinc-800 border-zinc-700 text-zinc-50 placeholder:text-zinc-500" : "bg-white border-gray-200"
  const theadCls   = isDark ? "text-zinc-400"                       : "text-gray-500"

  const STAT_CARDS = [
    { label: "Total Candidates",       icon: Users,       value: stats.totalCandidates, suffix: "",   trend: "+12% this month" },
    { label: "Interviews Completed",   icon: CheckCircle, value: stats.completed,       suffix: "",   trend: "+8% this month"  },
    { label: "Average Score",          icon: BarChart3,   value: stats.avgScore,        suffix: "/10",trend: "+0.3 improvement" },
    { label: "Hire Rate",              icon: TrendingUp,  value: stats.hireRate,        suffix: "%",  trend: "Stable"          },
  ]

  return (
    <div className={["min-h-screen flex", pageBg, textMain].join(" ")}>

      {/* ── Sidebar ── */}
      <aside className={["fixed inset-y-0 left-0 w-64 flex flex-col border-r", sidebarBg].join(" ")}>
        <div className="py-6 px-6">
          <div className="font-bold text-xl">SAGE</div>
          <div className={["text-xs uppercase tracking-widest mt-1", textMuted].join(" ")}>HR Portal</div>
        </div>

        <nav className="flex-1 px-3 space-y-1">
          <button
            type="button"
            className={[
              "w-full flex items-center gap-3 py-2.5 px-3 rounded-lg text-sm font-medium transition-colors",
              activeTab === "dashboard" ? activeNav : inactiveNav,
            ].join(" ")}
            onClick={() => setActiveTab("dashboard")}
          >
            <LayoutDashboard size={16} />
            Dashboard
          </button>
          <button
            type="button"
            className={[
              "w-full flex items-center gap-3 py-2.5 px-3 rounded-lg text-sm font-medium transition-colors",
              activeTab === "candidates" ? activeNav : inactiveNav,
            ].join(" ")}
            onClick={() => setActiveTab("candidates")}
          >
            <Users size={16} />
            Candidates
          </button>
          <button
            type="button"
            className={[
              "w-full flex items-center gap-3 py-2.5 px-3 rounded-lg text-sm font-medium transition-colors",
              activeTab === "settings" ? activeNav : inactiveNav,
            ].join(" ")}
            onClick={() => setActiveTab("settings")}
          >
            <Settings size={16} />
            Settings
          </button>
          <button
            type="button"
            className={[
              "w-full flex items-center gap-3 py-2.5 px-3 rounded-lg text-sm font-medium transition-colors",
              activeTab === "pricing" ? activeNav : inactiveNav,
            ].join(" ")}
            onClick={() => setActiveTab("pricing")}
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

      {/* ── Main ── */}
      <main className="ml-64 flex-1 p-8">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">
              {activeTab === "settings"
                ? "Settings"
                : activeTab === "pricing"
                  ? "Pricing"
                  : activeTab === "candidates"
                    ? "Candidates"
                    : "Dashboard"}
            </h1>
            <p className={["text-sm mt-0.5", textMuted].join(" ")}>
              {activeTab === "settings"
                ? "Account preferences and appearance"
                : activeTab === "pricing"
                  ? "Enterprise plans for HR teams and organizations"
                  : "Welcome back, SAGE Admin"}
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

        {activeTab === "settings" ? (
          <div className="max-w-2xl">
            <h2 className="text-xl font-semibold">Settings</h2>
            <p className={["text-sm mt-1", textMuted].join(" ")}>Account preferences and appearance</p>

            <Card className={["mt-6 p-6 rounded-xl", cardBg].join(" ")}>
              <h3 className="font-semibold mb-4">Profile</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input value="SAGE Admin" disabled />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value="admin@sage.ai" disabled />
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Input value="HR Administrator" disabled />
                </div>
                <div className="space-y-2">
                  <Label>Organization</Label>
                  <Input value="SAGE Systems" disabled />
                </div>
              </div>
            </Card>

            <Card className={["mt-4 p-6 rounded-xl", cardBg].join(" ")}>
              <h3 className="font-semibold mb-4">Appearance</h3>
              <div className="flex items-center justify-between">
                <span className="text-sm">Dark Mode</span>
                <button
                  type="button"
                  onClick={toggleTheme}
                  className={[
                    "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                    isDark ? "bg-purple-600" : "bg-gray-300",
                  ].join(" ")}
                  aria-label="Toggle dark mode"
                >
                  <span
                    className={[
                      "inline-block h-5 w-5 transform rounded-full bg-white transition-transform",
                      isDark ? "translate-x-5" : "translate-x-1",
                    ].join(" ")}
                  />
                </button>
              </div>
            </Card>

            <Card className={["mt-4 p-6 rounded-xl", cardBg].join(" ")}>
              <h3 className="font-semibold mb-4">Notifications</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <span>Email notifications for new candidates</span>
                  <input type="checkbox" defaultChecked className="accent-purple-600 w-4 h-4" />
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span>Weekly assessment summary</span>
                  <input type="checkbox" defaultChecked className="accent-purple-600 w-4 h-4" />
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span>Interview completion alerts</span>
                  <input type="checkbox" defaultChecked className="accent-purple-600 w-4 h-4" />
                </div>
              </div>
            </Card>

            <Card className={["mt-4 p-6 rounded-xl", cardBg].join(" ")}>
              <h3 className="font-semibold mb-4">Security</h3>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Change Password</Label>
                  <Input type="password" placeholder="Coming soon" disabled />
                </div>
                <div>
                  <Label>Two-Factor Authentication</Label>
                  <p className={["text-sm mt-1", textMuted].join(" ")}>Coming soon</p>
                </div>
              </div>
            </Card>

            <Card className={["mt-4 p-6 rounded-xl", cardBg, "border-red-500/20"].join(" ")}>
              <h3 className="font-semibold text-red-500 mb-4">Danger Zone</h3>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium">Delete Account</p>
                  <p className={["text-sm", textMuted].join(" ")}>
                    Permanently delete your account and all data
                  </p>
                </div>
                <Button variant="destructive" size="sm" onClick={() => console.log("Delete account")}>
                  Delete
                </Button>
              </div>
            </Card>
          </div>
        ) : activeTab === "pricing" ? (
          <div className="max-w-6xl">
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
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
              {STAT_CARDS.map(({ label, icon: Icon, value, suffix, trend }) => (
                <Card key={label} className={["rounded-xl p-6", cardBg].join(" ")}>
                  <div className="flex items-center justify-between mb-4">
                    <p className={["text-sm font-medium", textMuted].join(" ")}>{label}</p>
                    <div className={["p-2 rounded-lg", isDark ? "bg-zinc-800" : "bg-gray-100"].join(" ")}>
                      <Icon size={16} className={textMuted} />
                    </div>
                  </div>
                  {loading ? (
                    <div className="h-9 flex items-center">
                      <Loader size={22} color={isDark ? "#FFFFFF" : "#0A0A0A"} />
                    </div>
                  ) : (
                    <CountUp to={value} suffix={suffix} className="text-3xl font-bold tabular-nums" />
                  )}
                  <p className="text-green-400 text-xs mt-2">{trend}</p>
                </Card>
              ))}
            </div>

            <Card
              ref={candidatesRef}
              className={[
                "rounded-xl overflow-hidden scroll-mt-24",
                activeTab === "candidates" ? (isDark ? "ring-2 ring-purple-500/40" : "ring-2 ring-blue-500/30") : "",
                cardBg,
              ].join(" ")}
            >
              <div className="p-6 pb-4 flex items-center justify-between gap-4 flex-wrap">
                <h2 className="text-base font-semibold">Recent Candidates</h2>
                <div className="relative w-72">
                  <Search size={14} className={["absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none", textMuted].join(" ")} />
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search name, email, role…"
                    className={["pl-9 h-9 text-sm", inputCls].join(" ")}
                  />
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow className={["border-b", borderRow].join(" ")}>
                    {["Name", "Role Applied", "Score", "Status", "Date", "Action"].map((h) => (
                      <TableHead key={h} className={["text-xs uppercase tracking-wide font-medium", theadCls].join(" ")}>
                        {h}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-14">
                        <div className="flex items-center justify-center">
                          <Loader size={28} color={isDark ? "#FFFFFF" : "#0A0A0A"} />
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-14 text-center">
                        <p className={["text-sm", textMuted].join(" ")}>No candidates match "{query}"</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((r) => (
                      <TableRow key={r.id} className={["border-b transition-colors", borderRow, rowHover].join(" ")}>
                        <TableCell>
                          <div className="font-semibold text-sm">{r.name}</div>
                          <div className={["text-xs", textMuted].join(" ")}>{r.email}</div>
                        </TableCell>
                        <TableCell className="text-sm">{r.role}</TableCell>
                        <TableCell>
                          {r.score !== null ? (
                            <span className={["font-semibold tabular-nums text-sm", scoreColor(r.score)].join(" ")}>
                              {r.score.toFixed(1)}
                              <span className={["text-xs ml-0.5", textMuted].join(" ")}>/10</span>
                            </span>
                          ) : (
                            <span className={textMuted}>—</span>
                          )}
                        </TableCell>
                        <TableCell><StatusBadge status={r.status} /></TableCell>
                        <TableCell className={["text-sm", textMuted].join(" ")}>{r.date}</TableCell>
                        <TableCell>
                          {r.status === "Evaluated" ? (
                            <Button asChild size="sm" className={isDark ? "bg-[#7C3AED] hover:bg-[#7C3AED]/90 text-white" : "bg-black text-white hover:bg-black/90"}>
                              <Link to={`/hr/report/${r.id}`}>View Report</Link>
                            </Button>
                          ) : (
                            <Button size="sm" variant="outline" disabled className={isDark ? "border-zinc-700 text-zinc-500" : ""}>
                              View Report
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              <div className={["px-6 py-3 text-xs border-t", textMuted, borderRow].join(" ")}>
                {filtered.length} of {rows.length} candidate{rows.length !== 1 ? "s" : ""}
              </div>
            </Card>
          </>
        )}
      </main>
    </div>
  )
}
