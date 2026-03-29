import { useEffect, useMemo, useRef, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import {
  BarChart3,
  Briefcase,
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
import { createJobPosting, deleteJobPosting, getJobs, updateJobPosting, type JobPosting } from "@/lib/api"
import { useTheme } from "@/lib/theme-context"
import type { Candidate, Interview } from "@/types"

type CandidateRow = {
  id: string
  name: string
  email: string
  job: string
  role: string
  score: number | null
  status: "Evaluated" | "In Progress" | "Pending"
  date: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function scoreColor(score: number | null) {
  if (score === null) return "text-muted-foreground"
  if (score >= 7.5) return "text-green-500"
  if (score >= 5) return "text-amber-500"
  return "text-red-500"
}

function StatusBadge({ status }: { status: CandidateRow["status"] }) {
  const { theme } = useTheme()
  const isDark = theme === "dark"
  const cls =
    status === "Evaluated"
      ? isDark
        ? "bg-green-500/15 text-green-300 border-green-500/25"
        : "bg-green-100 text-green-700 border-green-200"
      : status === "In Progress"
      ? isDark
        ? "bg-blue-500/15 text-blue-300 border-blue-500/25"
        : "bg-blue-100 text-blue-700 border-blue-200"
      : isDark
        ? "bg-yellow-500/15 text-yellow-300 border-yellow-500/25"
        : "bg-yellow-100 text-yellow-700 border-yellow-200"
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

  const [activeTab, setActiveTab] = useState<"dashboard" | "jobs" | "candidates" | "settings" | "pricing">("dashboard")
  const [loading, setLoading] = useState(true)
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [interviews, setInterviews] = useState<Interview[]>([])
  const [jobPostings, setJobPostings] = useState<JobPosting[]>([])
  const [query, setQuery] = useState("")
  const candidatesRef = useRef<HTMLDivElement | null>(null)
  const [jobsQuery, setJobsQuery] = useState("")
  const [jobFormOpen, setJobFormOpen] = useState(false)
  const [jobFormError, setJobFormError] = useState<string | null>(null)
  const [jobFormSuccess, setJobFormSuccess] = useState<string | null>(null)
  const [editingJobId, setEditingJobId] = useState<string | null>(null)
  const [jobForm, setJobForm] = useState({
    company_name: localStorage.getItem("sage_company") || "SAGE Demo Corp",
    company_email: (() => {
      try {
        const u = JSON.parse(localStorage.getItem("sage_user") ?? "{}") as { email?: string }
        return u.email || "admin@sage.ai"
      } catch {
        return "admin@sage.ai"
      }
    })(),
    job_title: "",
    job_role: "Software Engineer",
    job_description: "",
    requirements: "",
    salary_range: "",
    location: "Remote",
    deadline: "",
    max_candidates: 50,
    status: "active",
  })

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const token = localStorage.getItem("sage_token")
        const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {}

        const [candRes, intRes, jobsRes] = await Promise.all([
          fetch("http://localhost:8000/api/candidates", { headers }),
          fetch("http://localhost:8000/api/interviews", { headers }),
          fetch("http://localhost:8000/api/jobs?all=true", { headers }),
        ])
        if (cancelled) return

        if (candRes.ok) {
          const raw = (await candRes.json()) as unknown
          const arr: Candidate[] = Array.isArray(raw)
            ? (raw as Candidate[])
            : Array.isArray((raw as { candidates?: unknown[] } | null)?.candidates)
              ? ((raw as { candidates: Candidate[] }).candidates ?? [])
              : []
          setCandidates(arr)
        } else {
          setCandidates([])
        }

        if (intRes.ok) {
          const raw = (await intRes.json()) as unknown
          const arr: Interview[] = Array.isArray(raw)
            ? (raw as Interview[])
            : Array.isArray((raw as { interviews?: unknown[] } | null)?.interviews)
              ? ((raw as { interviews: Interview[] }).interviews ?? [])
              : []
          setInterviews(arr)
        } else {
          setInterviews([])
        }

        if (jobsRes.ok) {
          const raw = (await jobsRes.json()) as unknown
          const arr: JobPosting[] = Array.isArray(raw) ? (raw as JobPosting[]) : []
          setJobPostings(arr)
        } else {
          setJobPostings([])
        }
      } catch (e) {
        console.error("Failed to fetch HR data:", e)
        if (cancelled) return
        setCandidates([])
        setInterviews([])
        setJobPostings([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [activeTab])

  useEffect(() => {
    if (activeTab !== "candidates") return
    candidatesRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
  }, [activeTab])

  async function reloadJobs() {
    try {
      const raw = (await getJobs({ all: true })) as unknown
      const arr: JobPosting[] = Array.isArray(raw) ? (raw as JobPosting[]) : []
      setJobPostings(arr)
    } catch {
      setJobPostings([])
    }
  }

  async function submitJobForm() {
    setJobFormError(null)
    setJobFormSuccess(null)
    const payload = {
      company_name: jobForm.company_name.trim(),
      company_email: jobForm.company_email.trim(),
      job_title: jobForm.job_title.trim(),
      job_role: jobForm.job_role,
      job_description: jobForm.job_description.trim(),
      requirements: jobForm.requirements.trim() || null,
      salary_range: jobForm.salary_range.trim() || null,
      location: jobForm.location.trim() || "Remote",
      deadline: jobForm.deadline ? jobForm.deadline : null,
      max_candidates: Number(jobForm.max_candidates) || 50,
      status: jobForm.status,
    }
    if (!payload.company_name || !payload.company_email || !payload.job_title || !payload.job_role || !payload.job_description) {
      setJobFormError("Please fill all required fields.")
      return
    }
    try {
      if (editingJobId) {
        await updateJobPosting(editingJobId, payload)
        setJobFormSuccess("Job updated.")
      } else {
        await createJobPosting(payload as Omit<JobPosting, "id" | "created_at" | "updated_at">)
        setJobFormSuccess("Job posted.")
      }
      setJobFormOpen(false)
      setEditingJobId(null)
      await reloadJobs()
      window.setTimeout(() => setJobFormSuccess(null), 2500)
    } catch (e) {
      setJobFormError(e instanceof Error ? e.message : "Failed to save job")
    }
  }

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

  const stats = useMemo(() => {
    const totalCandidates = candidates.length
    const completedInterviews = interviews.filter((i) => i.status === "completed").length
    const scoredInterviews = interviews.filter((i) => {
      const s = (i as unknown as { overall_score?: unknown }).overall_score
      return typeof s === "number" && s > 0
    })
    const avgScore =
      scoredInterviews.length > 0
        ? scoredInterviews.reduce((sum, i) => sum + ((i as unknown as { overall_score?: number }).overall_score ?? 0), 0) / scoredInterviews.length
        : null
    const hireRate =
      scoredInterviews.length > 0
        ? Math.round((scoredInterviews.filter((i) => ((i as unknown as { overall_score?: number }).overall_score ?? 0) >= 7.5).length / scoredInterviews.length) * 100)
        : 0
    return { totalCandidates, completedInterviews, avgScore, hireRate }
  }, [candidates, interviews])

  const STAT_CARDS = useMemo(
    () => [
      { label: "Total Candidates", icon: Users, value: stats.totalCandidates, suffix: "", footer: "Total" },
      { label: "Interviews Completed", icon: CheckCircle, value: stats.completedInterviews, suffix: "", footer: "Total" },
      { label: "Average Score", icon: BarChart3, value: stats.avgScore, suffix: "/10", footer: "Total" },
      { label: "Hire Rate", icon: TrendingUp, value: stats.hireRate, suffix: "%", footer: "Total" },
    ],
    [stats]
  )

  const tableData = useMemo(() => {
    const candidateById = new Map(candidates.map((c) => [c.id, c]))
    const jobById = new Map(jobPostings.map((j) => [j.id, j]))
    return interviews
      .slice()
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
      .map((interview) => {
        const candidate = candidateById.get(interview.candidate_id)
        const rawJobId = (interview as unknown as { job_id?: unknown }).job_id
        const jobId = typeof rawJobId === "string" ? rawJobId : null
        const jobTitle = jobId ? jobById.get(jobId)?.job_title : null
        const rawScore = (interview as unknown as { overall_score?: unknown }).overall_score
        const score = typeof rawScore === "number" && rawScore > 0 ? rawScore : null
        const status: CandidateRow["status"] =
          interview.status === "completed" && score !== null
            ? "Evaluated"
            : interview.status === "in_progress"
              ? "In Progress"
              : "Pending"
        return {
          id: interview.id,
          name: candidate?.name || "Unknown",
          email: candidate?.email || "",
          job: jobTitle || "—",
          role: interview.job_role || "—",
          score,
          status,
          date: formatDate(interview.created_at),
        } satisfies CandidateRow
      })
  }, [candidates, interviews, jobPostings])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return tableData
    return tableData.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q) ||
        r.job.toLowerCase().includes(q) ||
        r.role.toLowerCase().includes(q)
    )
  }, [query, tableData])

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
              activeTab === "jobs" ? activeNav : inactiveNav,
            ].join(" ")}
            onClick={() => setActiveTab("jobs")}
          >
            <Briefcase size={16} />
            Job Postings
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
                  navigate("/login", { replace: true })
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
                  : activeTab === "jobs"
                    ? "Job Postings"
                  : activeTab === "candidates"
                    ? "Candidates"
                    : "Dashboard"}
            </h1>
            <p className={["text-sm mt-0.5", textMuted].join(" ")}>
              {activeTab === "settings"
                ? "Account preferences and appearance"
                : activeTab === "pricing"
                  ? "Enterprise plans for HR teams and organizations"
                  : activeTab === "jobs"
                    ? "Create and manage job postings"
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
        ) : activeTab === "jobs" ? (
          <div className="max-w-6xl space-y-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h2 className="text-xl font-semibold">Job Postings</h2>
                <p className={["text-sm mt-1", textMuted].join(" ")}>Create roles, review applicants, and manage hiring</p>
              </div>
              <Button
                className={isDark ? "bg-[#7C3AED] hover:bg-[#7C3AED]/90 text-white" : "bg-black text-white hover:bg-black/90 border border-black"}
                onClick={() => {
                  setJobFormError(null)
                  setJobFormSuccess(null)
                  setEditingJobId(null)
                  setJobForm({
                    company_name: localStorage.getItem("sage_company") || "SAGE Demo Corp",
                    company_email: (() => {
                      try {
                        const u = JSON.parse(localStorage.getItem("sage_user") ?? "{}") as { email?: string }
                        return u.email || "admin@sage.ai"
                      } catch {
                        return "admin@sage.ai"
                      }
                    })(),
                    job_title: "",
                    job_role: "Software Engineer",
                    job_description: "",
                    requirements: "",
                    salary_range: "",
                    location: "Remote",
                    deadline: "",
                    max_candidates: 50,
                    status: "active",
                  })
                  setJobFormOpen(true)
                }}
              >
                + Post New Job
              </Button>
            </div>

            {jobFormOpen ? (
              <Card className={["p-6 rounded-xl", cardBg].join(" ")}>
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="font-semibold">{editingJobId ? "Edit Job Posting" : "Post New Job"}</div>
                  <Button
                    variant="outline"
                    className={isDark ? "border-zinc-700 text-white hover:bg-white/10" : "border-gray-300 text-gray-900 hover:bg-gray-50"}
                    onClick={() => {
                      setJobFormOpen(false)
                      setEditingJobId(null)
                      setJobFormError(null)
                    }}
                  >
                    Cancel
                  </Button>
                </div>

                <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Company Name</Label>
                    <Input value={jobForm.company_name} onChange={(e) => setJobForm((p) => ({ ...p, company_name: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Company Email</Label>
                    <Input value={jobForm.company_email} onChange={(e) => setJobForm((p) => ({ ...p, company_email: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Job Title</Label>
                    <Input value={jobForm.job_title} onChange={(e) => setJobForm((p) => ({ ...p, job_title: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Job Role</Label>
                    <select
                      value={jobForm.job_role}
                      onChange={(e) => setJobForm((p) => ({ ...p, job_role: e.target.value }))}
                      className={["h-10 w-full rounded-lg border px-3 text-sm outline-none", isDark ? "bg-zinc-800 border-zinc-700 text-zinc-50" : "bg-white border-gray-200 text-gray-900"].join(" ")}
                    >
                      {["Software Engineer", "ML Engineer", "Data Analyst", "Product Manager", "Designer"].map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Job Description</Label>
                    <textarea
                      value={jobForm.job_description}
                      onChange={(e) => setJobForm((p) => ({ ...p, job_description: e.target.value }))}
                      className={["min-h-[140px] w-full rounded-lg border px-3 py-2 text-sm outline-none", isDark ? "bg-zinc-800 border-zinc-700 text-zinc-50" : "bg-white border-gray-200 text-gray-900"].join(" ")}
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Requirements</Label>
                    <textarea
                      value={jobForm.requirements}
                      onChange={(e) => setJobForm((p) => ({ ...p, requirements: e.target.value }))}
                      className={["min-h-[120px] w-full rounded-lg border px-3 py-2 text-sm outline-none", isDark ? "bg-zinc-800 border-zinc-700 text-zinc-50" : "bg-white border-gray-200 text-gray-900"].join(" ")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Salary Range</Label>
                    <Input value={jobForm.salary_range} onChange={(e) => setJobForm((p) => ({ ...p, salary_range: e.target.value }))} placeholder="₹8-15 LPA" />
                  </div>
                  <div className="space-y-2">
                    <Label>Location</Label>
                    <Input value={jobForm.location} onChange={(e) => setJobForm((p) => ({ ...p, location: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Application Deadline</Label>
                    <Input type="date" value={jobForm.deadline} onChange={(e) => setJobForm((p) => ({ ...p, deadline: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Max Candidates</Label>
                    <Input
                      type="number"
                      value={String(jobForm.max_candidates)}
                      onChange={(e) => setJobForm((p) => ({ ...p, max_candidates: Number(e.target.value) }))}
                    />
                  </div>
                </div>

                {jobFormError ? <div className="mt-4 text-sm text-red-500">{jobFormError}</div> : null}
                {jobFormSuccess ? <div className="mt-4 text-sm text-green-500">{jobFormSuccess}</div> : null}

                <div className="mt-5 flex items-center justify-end gap-3">
                  <Button
                    className={isDark ? "bg-[#7C3AED] hover:bg-[#7C3AED]/90 text-white" : "bg-black text-white hover:bg-black/90 border border-black"}
                    onClick={() => void submitJobForm()}
                  >
                    {editingJobId ? "Save Changes" : "Post Job"}
                  </Button>
                </div>
              </Card>
            ) : null}

            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="relative w-80">
                <Search size={14} className={["absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none", textMuted].join(" ")} />
                <Input
                  value={jobsQuery}
                  onChange={(e) => setJobsQuery(e.target.value)}
                  placeholder="Search title, role, company…"
                  className={["pl-9 h-9 text-sm", inputCls].join(" ")}
                />
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader size={28} color={isDark ? "#FFFFFF" : "#0A0A0A"} />
              </div>
            ) : (
              <div className="space-y-4">
                {(jobsQuery.trim()
                  ? jobPostings.filter((j) => {
                      const q = jobsQuery.trim().toLowerCase()
                      return (
                        String(j.job_title ?? "").toLowerCase().includes(q) ||
                        String(j.job_role ?? "").toLowerCase().includes(q) ||
                        String(j.company_name ?? "").toLowerCase().includes(q)
                      )
                    })
                  : jobPostings
                ).length === 0 ? (
                  <Card className={["p-6 rounded-xl", cardBg].join(" ")}>
                    <div className={["text-sm", textMuted].join(" ")}>No job postings yet.</div>
                  </Card>
                ) : (
                  (jobsQuery.trim()
                    ? jobPostings.filter((j) => {
                        const q = jobsQuery.trim().toLowerCase()
                        return (
                          String(j.job_title ?? "").toLowerCase().includes(q) ||
                          String(j.job_role ?? "").toLowerCase().includes(q) ||
                          String(j.company_name ?? "").toLowerCase().includes(q)
                        )
                      })
                    : jobPostings
                  ).map((job) => {
                    const applicants = interviews.filter((iv) => String((iv as unknown as { job_id?: unknown }).job_id ?? "") === job.id).length
                    const status = String(job.status ?? "active")
                    const statusCls =
                      status === "closed"
                        ? isDark
                          ? "bg-zinc-800 text-zinc-200 border-zinc-700"
                          : "bg-gray-100 text-gray-700 border-gray-200"
                        : isDark
                          ? "bg-green-500/15 text-green-300 border-green-500/25"
                          : "bg-green-100 text-green-700 border-green-200"
                    return (
                      <Card key={job.id} className={["p-6 rounded-xl", cardBg].join(" ")}>
                        <div className="flex items-start justify-between gap-4 flex-wrap">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <div className="text-lg font-semibold">{job.job_title}</div>
                              <Badge variant="outline" className={statusCls}>
                                {status}
                              </Badge>
                            </div>
                            <div className={["text-sm mt-1", textMuted].join(" ")}>
                              {job.company_name} · {job.location || "Remote"} · {job.job_role}
                            </div>
                            <div className={["text-sm mt-2", textMuted].join(" ")}>
                              Applicants: <span className={textMain}>{applicants}</span>
                              {job.deadline ? (
                                <>
                                  {" "}
                                  · Deadline: <span className={textMain}>{new Date(job.deadline).toLocaleDateString()}</span>
                                </>
                              ) : null}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className={isDark ? "border-zinc-700 text-white hover:bg-white/10" : "border-gray-300 text-gray-900 hover:bg-gray-50"}
                              onClick={() => {
                                setJobFormError(null)
                                setJobFormSuccess(null)
                                setEditingJobId(job.id)
                                setJobForm({
                                  company_name: job.company_name,
                                  company_email: job.company_email,
                                  job_title: job.job_title,
                                  job_role: job.job_role,
                                  job_description: job.job_description,
                                  requirements: job.requirements ?? "",
                                  salary_range: job.salary_range ?? "",
                                  location: job.location ?? "Remote",
                                  deadline: job.deadline ?? "",
                                  max_candidates: job.max_candidates ?? 50,
                                  status: job.status ?? "active",
                                })
                                setJobFormOpen(true)
                              }}
                            >
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className={isDark ? "border-zinc-700 text-white hover:bg-white/10" : "border-gray-300 text-gray-900 hover:bg-gray-50"}
                              disabled={status === "closed"}
                              onClick={() =>
                                void (async () => {
                                  await updateJobPosting(job.id, { status: "closed" })
                                  await reloadJobs()
                                })()
                              }
                            >
                              Close Posting
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() =>
                                void (async () => {
                                  await deleteJobPosting(job.id)
                                  await reloadJobs()
                                })()
                              }
                            >
                              Delete
                            </Button>
                          </div>
                        </div>
                      </Card>
                    )
                  })
                )}
              </div>
            )}
          </div>
        ) : activeTab === "candidates" ? (
          <Card
            ref={candidatesRef}
            className={[
              "rounded-xl overflow-hidden scroll-mt-24",
              isDark ? "ring-2 ring-purple-500/40" : "ring-2 ring-blue-500/30",
              cardBg,
            ].join(" ")}
          >
            <div className="p-6 pb-4 flex items-center justify-between gap-4 flex-wrap">
              <h2 className="text-base font-semibold">Candidates</h2>
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
                  {["Name", "Job", "Role Applied", "Score", "Status", "Date", "Action"].map((h) => (
                    <TableHead key={h} className={["text-xs uppercase tracking-wide font-medium", theadCls].join(" ")}>
                      {h}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-14">
                      <div className="flex items-center justify-center">
                        <Loader size={28} color={isDark ? "#FFFFFF" : "#0A0A0A"} />
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-14 text-center">
                      {query.trim() ? (
                        <p className={["text-sm", textMuted].join(" ")}>No candidates match "{query}"</p>
                      ) : (
                        <p className={["text-sm", textMuted].join(" ")}>No candidates yet. Candidates will appear here after they complete assessments.</p>
                      )}
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((r) => (
                    <TableRow key={r.id} className={["border-b transition-colors", borderRow, rowHover].join(" ")}>
                      <TableCell>
                        <div className="font-semibold text-sm">{r.name}</div>
                        <div className={["text-xs", textMuted].join(" ")}>{r.email}</div>
                      </TableCell>
                      <TableCell className={["text-sm", textMuted].join(" ")}>{r.job}</TableCell>
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
              {filtered.length} of {tableData.length} candidate{tableData.length !== 1 ? "s" : ""}
            </div>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
              {STAT_CARDS.map(({ label, icon: Icon, value, suffix, footer }) => (
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
                  ) : value === null ? (
                    <div className={["text-3xl font-bold tabular-nums", textMuted].join(" ")}>—</div>
                  ) : (
                    <CountUp to={value} suffix={suffix} className="text-3xl font-bold tabular-nums" />
                  )}
                  <p className={["text-xs mt-2", textMuted].join(" ")}>{footer}</p>
                </Card>
              ))}
            </div>

            <Card
              ref={candidatesRef}
              className={[
                "rounded-xl overflow-hidden scroll-mt-24",
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
                      <TableCell colSpan={7} className="py-14">
                        <div className="flex items-center justify-center">
                          <Loader size={28} color={isDark ? "#FFFFFF" : "#0A0A0A"} />
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-14 text-center">
                        {query.trim() ? (
                          <p className={["text-sm", textMuted].join(" ")}>No candidates match "{query}"</p>
                        ) : (
                          <p className={["text-sm", textMuted].join(" ")}>No candidates yet. Candidates will appear here after they complete assessments.</p>
                        )}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((r) => (
                      <TableRow key={r.id} className={["border-b transition-colors", borderRow, rowHover].join(" ")}>
                        <TableCell>
                          <div className="font-semibold text-sm">{r.name}</div>
                          <div className={["text-xs", textMuted].join(" ")}>{r.email}</div>
                        </TableCell>
                        <TableCell className={["text-sm", textMuted].join(" ")}>{r.job}</TableCell>
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
                {filtered.length} of {tableData.length} candidate{tableData.length !== 1 ? "s" : ""}
              </div>
            </Card>
          </>
        )}
      </main>
    </div>
  )
}
