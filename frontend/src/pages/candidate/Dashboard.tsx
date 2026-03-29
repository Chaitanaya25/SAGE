import { useEffect, useMemo, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { BarChart3, Briefcase, Calendar, CheckCircle, CreditCard, FileSearch, FileText, LayoutDashboard, LogOut, Mic, Moon, Settings, Sun, TrendingUp } from "lucide-react"
import { PolarAngleAxis, PolarGrid, Radar, RadarChart } from "recharts"

import { AnalyzeContent } from "@/pages/candidate/Analyze"
import { InterviewListContent } from "@/pages/candidate/InterviewList"
import { ScheduleContent } from "@/pages/candidate/Schedule"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { PricingSection } from "@/components/ui/pricing"
import { Progress } from "@/components/ui/progress"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { getJobs, type JobPosting } from "@/lib/api"
import { useTheme } from "@/lib/theme-context"

type Tab = "overview" | "jobs" | "resume" | "interviews" | "schedule" | "scores" | "reports" | "settings" | "pricing"

type CandidateReportDetail = {
  id: string
  overall_score: number
  recommendation: "HIRE" | "NO HIRE" | "REVIEW"
  scores: {
    technical_depth: number
    communication: number
    relevance: number
    confidence: number
  }
  strengths: string[]
  weaknesses: string[]
  summary: string
}

type InterviewItem = {
  id: string
  candidate_id: string
  job_role: string
  status: string
  created_at: string
  scheduled_at: string | null
  completed_at: string | null
  overall_score: number | null
}

type UpcomingInterview = {
  id: string
  role: string
  date: string
  time: string
  status: "Pending" | "In Progress" | "Completed"
}

export default function CandidateDashboard() {
  const location = useLocation() as unknown as { state?: { tab?: string } }
  const navigate = useNavigate()
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === "dark"
  const [tab, setTab] = useState<Tab>("overview")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [interviews, setInterviews] = useState<InterviewItem[]>([])
  const [stats, setStats] = useState<{ completed: number; avgScore: number | null; total: number; resumeScore: number | null }>({
    completed: 0,
    avgScore: null,
    total: 0,
    resumeScore: null,
  })
  const [profileName, setProfileName] = useState("")
  const [preferredLanguage, setPreferredLanguage] = useState("English")
  const [durationPreference, setDurationPreference] = useState<"8" | "12">("8")
  const [emailAlerts, setEmailAlerts] = useState(true)
  const [interviewReminders, setInterviewReminders] = useState(true)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [reportSearch, setReportSearch] = useState("")
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null)
  const [reportDetail, setReportDetail] = useState<CandidateReportDetail | null>(null)
  const [reportLoading, setReportLoading] = useState(false)
  const [reportError, setReportError] = useState<string | null>(null)
  const [jobs, setJobs] = useState<JobPosting[]>([])
  const [jobsLoading, setJobsLoading] = useState(false)
  const [jobsError, setJobsError] = useState<string | null>(null)
  const [jobsQuery, setJobsQuery] = useState("")

  const tabTitles: Record<Tab, string> = {
    overview: "Overview",
    jobs: "Browse Jobs",
    resume: "Resume Analysis",
    interviews: "Voice Interviews",
    schedule: "Schedule",
    scores: "Score Dashboard",
    reports: "My Reports",
    settings: "Settings",
    pricing: "Pricing",
  }

  const candidate = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("sage_candidate") ?? "{}") as {
        id?: string
        candidate_id?: string
        name?: string
        email?: string
        resume_parsed?: Record<string, unknown>
      }
    } catch {
      return {} as {
        id?: string
        candidate_id?: string
        name?: string
        email?: string
        resume_parsed?: Record<string, unknown>
      }
    }
  }, [])

  const candidateId = candidate.id ?? candidate.candidate_id ?? localStorage.getItem("sage_candidate_id") ?? ""

  const isHired = useMemo(() => {
    try {
      const hired = JSON.parse(localStorage.getItem("sage_hired") || "[]") as string[]
      return Boolean(candidateId && hired.includes(candidateId))
    } catch {
      return false
    }
  }, [candidateId])

  const hiredIds = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("sage_hired") || "[]") as string[]
    } catch {
      return [] as string[]
    }
  }, [])

  async function loadReport(interviewId: string) {
    setSelectedReportId(interviewId)
    setReportLoading(true)
    setReportError(null)
    try {
      const token = localStorage.getItem("sage_token")
      const res = await fetch(`http://localhost:8000/api/report/${interviewId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      })
      if (!res.ok) throw new Error("Failed")
      const data = (await res.json()) as unknown
      const asRecord = (v: unknown) => (v && typeof v === "object" ? (v as Record<string, unknown>) : {})
      const d = asRecord(data)
      const scoresJson = asRecord(d.scores_json ?? d.scoresJson)
      const avg = asRecord(scoresJson.average_scores ?? scoresJson.averageScores)
      const strengths = Array.isArray(d.strengths) ? d.strengths.filter((x): x is string => typeof x === "string") : []
      const weaknesses = Array.isArray(d.weaknesses) ? d.weaknesses.filter((x): x is string => typeof x === "string") : []
      const recRaw = String(d.recommendation ?? "REVIEW").replace("_", " ")
      const recommendation: CandidateReportDetail["recommendation"] =
        recRaw === "HIRE" || recRaw === "NO HIRE" || recRaw === "REVIEW" ? (recRaw as CandidateReportDetail["recommendation"]) : "REVIEW"
      const detail: CandidateReportDetail = {
        id: String(d.id ?? interviewId),
        overall_score: Number(d.overall_score ?? d.overallScore ?? 0),
        recommendation,
        scores: {
          technical_depth: Number(avg.technical_depth ?? 0),
          communication: Number(avg.communication ?? 0),
          relevance: Number(avg.relevance ?? 0),
          confidence: Number(avg.confidence ?? 0),
        },
        strengths,
        weaknesses,
        summary: String(d.summary ?? ""),
      }
      setReportDetail(detail)
    } catch (e) {
      console.error("Failed to load report:", e)
      setReportDetail(null)
      setReportError(e instanceof Error ? e.message : "Report not available")
    } finally {
      setReportLoading(false)
    }
  }

  useEffect(() => {
    const next = location.state?.tab
    if (next === "pricing") setTab("pricing")
  }, [location.state?.tab])

  useEffect(() => {
    setProfileName(candidate.name ?? "")
    try {
      const raw = localStorage.getItem("sage_candidate_settings")
      if (!raw) return
      const parsed = JSON.parse(raw) as {
        name?: string
        preferredLanguage?: string
        durationPreference?: "8" | "12"
        emailAlerts?: boolean
        interviewReminders?: boolean
      }
      if (typeof parsed.name === "string") setProfileName(parsed.name)
      if (typeof parsed.preferredLanguage === "string") setPreferredLanguage(parsed.preferredLanguage)
      if (parsed.durationPreference === "8" || parsed.durationPreference === "12") setDurationPreference(parsed.durationPreference)
      if (typeof parsed.emailAlerts === "boolean") setEmailAlerts(parsed.emailAlerts)
      if (typeof parsed.interviewReminders === "boolean") setInterviewReminders(parsed.interviewReminders)
    } catch {
      return
    }
  }, [candidate.name])

  function saveSettings() {
    const payload = {
      name: profileName.trim() || candidate.name || "Candidate",
      preferredLanguage,
      durationPreference,
      emailAlerts,
      interviewReminders,
    }
    localStorage.setItem("sage_candidate_settings", JSON.stringify(payload))
    try {
      const raw = localStorage.getItem("sage_candidate")
      const cur = raw ? (JSON.parse(raw) as Record<string, unknown>) : {}
      localStorage.setItem("sage_candidate", JSON.stringify({ ...cur, name: payload.name }))
    } catch {
      return
    }
    setSaveMessage("Saved.")
    window.setTimeout(() => setSaveMessage(null), 2000)
  }

  function logout() {
    localStorage.clear()
    navigate("/login", { replace: true })
  }

  const candidateName = profileName.trim() || candidate.name || "User"

  function formatDay(value?: string | null) {
    if (!value) return "—"
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return "—"
    return d.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })
  }

  function formatTime(value?: string | null) {
    if (!value) return "—"
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return "—"
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
  }

  function formatRelative(value?: string | null) {
    if (!value) return ""
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return ""
    const diffMs = Date.now() - d.getTime()
    const m = Math.floor(diffMs / 60000)
    if (m < 1) return "just now"
    if (m < 60) return `${m} minutes ago`
    const h = Math.floor(m / 60)
    if (h < 24) return `${h} hours ago`
    const days = Math.floor(h / 24)
    return `${days} days ago`
  }

  useEffect(() => {
    let cancelled = false
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 10000)

    async function fetchData() {
      setLoading(true)
      setError(null)
      try {
        const token = localStorage.getItem("sage_token")
        const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {}
        const res = await fetch("http://localhost:8000/api/interviews", { headers, signal: controller.signal })
        if (!res.ok) throw new Error("Failed to fetch interviews")
        const data = (await res.json()) as unknown
        const arr: unknown[] =
          Array.isArray(data) ? data : Array.isArray((data as { interviews?: unknown[] } | null)?.interviews) ? (data as { interviews: unknown[] }).interviews : []

        const mine: InterviewItem[] = arr
          .map((item) => (item && typeof item === "object" ? (item as Record<string, unknown>) : {}))
          .map((r) => ({
            id: String(r.id ?? ""),
            candidate_id: String(r.candidate_id ?? ""),
            job_role: String(r.job_role ?? r.role ?? ""),
            status: String(r.status ?? ""),
            created_at: String(r.created_at ?? ""),
            scheduled_at: (r.scheduled_at ? String(r.scheduled_at) : null) as string | null,
            completed_at: (r.completed_at ? String(r.completed_at) : null) as string | null,
            overall_score: (typeof r.overall_score === "number" ? r.overall_score : null) as number | null,
          }))
          .filter((iv) => iv.id && iv.candidate_id && iv.job_role)
          .filter((iv) => (candidateId ? iv.candidate_id === candidateId : true))

        if (cancelled) return
        setInterviews(mine)

        const completed = mine.filter((iv) => iv.status === "completed")
        const avgScore =
          completed.length > 0
            ? completed.reduce((sum, iv) => sum + (typeof iv.overall_score === "number" ? iv.overall_score : 0), 0) / completed.length
            : null

        const resumeParsed = (candidate.resume_parsed ?? {}) as Record<string, unknown>
        const resumeScoreRaw = Number(resumeParsed.ats_score ?? resumeParsed.resume_score ?? resumeParsed.score ?? NaN)
        const resumeScore = Number.isFinite(resumeScoreRaw) ? Math.round(resumeScoreRaw) : null

        setStats({
          total: mine.length,
          completed: completed.length,
          avgScore: avgScore !== null ? Math.round(avgScore * 10) / 10 : null,
          resumeScore,
        })
      } catch (e) {
        if (cancelled) return
        console.error("Failed to fetch data:", e)
        setInterviews([])
        setStats({ total: 0, completed: 0, avgScore: null, resumeScore: null })
        setError(e instanceof Error ? e.message : "Failed to fetch data")
      } finally {
        if (!cancelled) setLoading(false)
        window.clearTimeout(timeout)
      }
    }

    void fetchData()
    return () => {
      cancelled = true
      window.clearTimeout(timeout)
      controller.abort()
    }
  }, [candidateId, candidate.resume_parsed])

  useEffect(() => {
    if (tab !== "jobs") return
    let cancelled = false
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 10000)

    ;(async () => {
      setJobsLoading(true)
      setJobsError(null)
      try {
        const raw = (await getJobs({ signal: controller.signal })) as unknown
        const arr: JobPosting[] = Array.isArray(raw) ? (raw as JobPosting[]) : []
        if (cancelled) return
        setJobs(arr)
      } catch (e) {
        if (cancelled) return
        setJobs([])
        setJobsError(e instanceof Error ? e.message : "Failed to load jobs")
      } finally {
        if (!cancelled) setJobsLoading(false)
        window.clearTimeout(timeout)
      }
    })()

    return () => {
      cancelled = true
      window.clearTimeout(timeout)
      controller.abort()
    }
  }, [tab])

  const upcomingInterviews = useMemo(() => {
    return interviews
      .filter((iv) => iv.status === "pending" || iv.status === "in_progress")
      .slice()
      .sort((a, b) => ((a.scheduled_at ?? a.created_at) < (b.scheduled_at ?? b.created_at) ? 1 : -1))
      .slice(0, 5)
      .map((iv) => {
        const when = iv.scheduled_at ?? iv.created_at
        const status: UpcomingInterview["status"] = iv.status === "in_progress" ? "In Progress" : "Pending"
        return {
          id: iv.id,
          role: iv.job_role,
          date: formatDay(when),
          time: formatTime(when),
          status,
        }
      })
  }, [interviews])

  const completedInterviews = useMemo(() => interviews.filter((iv) => iv.status === "completed"), [interviews])

  const weeklyCounts = useMemo(() => {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
    const totalThisWeek = interviews.filter((iv) => {
      const d = new Date(iv.created_at).getTime()
      return Number.isFinite(d) && d >= weekAgo
    }).length
    const completedThisWeek = interviews.filter((iv) => {
      const d = new Date(iv.created_at).getTime()
      return Number.isFinite(d) && d >= weekAgo && iv.status === "completed"
    }).length
    return { totalThisWeek, completedThisWeek }
  }, [interviews])

  const reportRows = useMemo(() => {
    return completedInterviews
      .slice()
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
      .map((iv) => {
        const score = typeof iv.overall_score === "number" ? Math.round(iv.overall_score * 10) / 10 : 0
        const status = hiredIds.includes(candidateId) ? "Hired" : "Evaluated"
        return {
          id: iv.id,
          role: iv.job_role,
          date: formatDay(iv.created_at),
          score,
          status,
        }
      })
  }, [candidateId, completedInterviews, hiredIds])

  const filteredReports = useMemo(() => {
    const q = reportSearch.trim().toLowerCase()
    if (!q) return reportRows
    return reportRows.filter((r) => r.role.toLowerCase().includes(q))
  }, [reportRows, reportSearch])

  const recentActivity = useMemo(() => {
    return interviews
      .slice()
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
      .slice(0, 5)
      .map((iv) => {
        const base = iv.status === "completed" ? "Completed" : iv.status === "in_progress" ? "Started" : "Scheduled"
        const score = typeof iv.overall_score === "number" ? ` — ${iv.overall_score.toFixed(1)}/10` : ""
        return {
          id: iv.id,
          label: `${base} ${iv.job_role} interview${iv.status === "completed" ? score : ""}`,
          time: formatRelative(iv.created_at),
          icon:
            iv.status === "completed"
              ? "check"
              : iv.status === "in_progress"
                ? "mic"
                : "calendar",
        } as const
      })
  }, [interviews])

  const filteredJobs = useMemo(() => {
    const q = jobsQuery.trim().toLowerCase()
    if (!q) return jobs
    return jobs.filter((j) => {
      const title = String(j.job_title ?? "").toLowerCase()
      const role = String(j.job_role ?? "").toLowerCase()
      const company = String(j.company_name ?? "").toLowerCase()
      const location = String(j.location ?? "").toLowerCase()
      return title.includes(q) || role.includes(q) || company.includes(q) || location.includes(q)
    })
  }, [jobs, jobsQuery])

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <div className="px-3 py-2">
            <h2 className="font-bold">SAGE</h2>
            <p className="text-xs text-muted-foreground">Candidate Portal</p>
          </div>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Assessment</SidebarGroupLabel>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton isActive={tab === "overview"} onClick={() => setTab("overview")}>
                  <LayoutDashboard className="w-4 h-4" /> Overview
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton isActive={tab === "jobs"} onClick={() => setTab("jobs")}>
                  <Briefcase className="w-4 h-4" /> Browse Jobs
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton isActive={tab === "resume"} onClick={() => setTab("resume")}>
                  <FileSearch className="w-4 h-4" /> Resume Analysis
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton isActive={tab === "interviews"} onClick={() => setTab("interviews")}>
                  <Mic className="w-4 h-4" /> Voice Interviews
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton isActive={tab === "schedule"} onClick={() => setTab("schedule")}>
                  <Calendar className="w-4 h-4" /> Schedule
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton isActive={tab === "scores"} onClick={() => setTab("scores")}>
                  <BarChart3 className="w-4 h-4" /> Score Dashboard
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton isActive={tab === "reports"} onClick={() => setTab("reports")}>
                  <FileText className="w-4 h-4" /> My Reports
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>

          <SidebarGroup>
            <SidebarGroupLabel>Account</SidebarGroupLabel>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton isActive={tab === "settings"} onClick={() => setTab("settings")}>
                  <Settings className="w-4 h-4" /> Settings
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton isActive={tab === "pricing"} onClick={() => setTab("pricing")}>
                  <CreditCard className="w-4 h-4" /> Pricing
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={logout}>
                <LogOut className="w-4 h-4" /> Logout
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset>
        <header className="flex h-14 items-center gap-2 border-b px-4">
          <SidebarTrigger />
          <h1 className="font-semibold">{tabTitles[tab]}</h1>
          <div className="ml-auto">
            <Button type="button" size="icon" variant="outline" onClick={toggleTheme}>
              {isDark ? <Sun size={16} /> : <Moon size={16} />}
            </Button>
          </div>
        </header>

        <main className="p-6">
          {tab === "overview" ? (
            <div>
              <div className="rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 p-6 text-white mb-6">
                <h2 className="text-2xl font-bold">Welcome back, {candidateName}!</h2>
                <p className="text-purple-100 mt-1">Here's your assessment overview</p>
                <div className="flex flex-wrap gap-3 mt-4 items-center">
                  <Button size="sm" variant="secondary" onClick={() => setTab("interviews")}>
                    Start New Interview
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className={[
                      "border-white/30",
                      isDark ? "bg-black text-white hover:bg-black/90 border-black/40" : "bg-white text-black hover:bg-white/90",
                    ].join(" ")}
                    onClick={() => setTab("resume")}
                  >
                    Analyze Resume
                  </Button>
                  {isHired ? (
                    <Badge className="bg-white/15 text-white border border-white/20">Hired!</Badge>
                  ) : null}
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="rounded-xl border p-5 relative overflow-hidden">
                  <Mic className={["absolute -right-2 -top-2 w-16 h-16 opacity-5", isDark ? "text-white" : "text-black"].join(" ")} />
                  <div className={["text-base font-semibold", isDark ? "text-white" : "text-black"].join(" ")}>Interviews</div>
                  <div className="text-2xl font-semibold mt-2">{loading ? "—" : String(stats.total)}</div>
                  <div className="text-xs text-green-400 mt-2">+{weeklyCounts.totalThisWeek} this week</div>
                </div>

                <div className="rounded-xl border p-5 relative overflow-hidden">
                  <CheckCircle className={["absolute -right-2 -top-2 w-16 h-16 opacity-5", isDark ? "text-white" : "text-black"].join(" ")} />
                  <div className={["text-base font-semibold", isDark ? "text-white" : "text-black"].join(" ")}>Completed</div>
                  <div className="text-2xl font-semibold mt-2">{loading ? "—" : String(stats.completed)}</div>
                  <div className="text-xs text-green-400 mt-2">+{weeklyCounts.completedThisWeek} this week</div>
                </div>

                <div className="rounded-xl border p-5 relative overflow-hidden">
                  <BarChart3 className={["absolute -right-2 -top-2 w-16 h-16 opacity-5", isDark ? "text-white" : "text-black"].join(" ")} />
                  <div className={["text-base font-semibold", isDark ? "text-white" : "text-black"].join(" ")}>Avg Score</div>
                  <div
                    className={[
                      "text-2xl font-semibold mt-2",
                      stats.avgScore === null
                        ? "text-muted-foreground"
                        : stats.avgScore >= 7.5
                          ? "text-green-500"
                          : stats.avgScore >= 5
                            ? "text-amber-500"
                            : "text-red-500",
                    ].join(" ")}
                  >
                    {loading ? "—" : stats.avgScore === null ? "—" : `${stats.avgScore.toFixed(1)}/10`}
                  </div>
                  <div className="text-xs text-muted-foreground mt-2">
                    {stats.completed > 0 ? `Based on ${stats.completed} completed` : "No completed interviews yet"}
                  </div>
                </div>

                <div className="rounded-xl border p-5 relative overflow-hidden">
                  <TrendingUp className={["absolute -right-2 -top-2 w-16 h-16 opacity-5", isDark ? "text-white" : "text-black"].join(" ")} />
                  <div className={["text-base font-semibold", isDark ? "text-white" : "text-black"].join(" ")}>Resume Score</div>
                  <div className="text-2xl font-semibold mt-2">
                    {loading ? "—" : stats.resumeScore === null ? "—" : `${stats.resumeScore}%`}
                  </div>
                  <div className="text-xs text-muted-foreground mt-2">
                    {stats.resumeScore === null ? "Upload resume to get a score" : "From latest resume analysis"}
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-lg">Upcoming Interviews</CardTitle>
                    <Button
                      size="sm"
                      variant="outline"
                      className={isDark ? "border-zinc-700 text-white hover:bg-white/10" : "border-gray-300 text-gray-900 hover:bg-gray-50"}
                      onClick={() => setTab("interviews")}
                    >
                      View All
                    </Button>
                  </CardHeader>
                  <CardContent>
                    {loading ? (
                      <div className="text-sm text-muted-foreground">Loading interviews…</div>
                    ) : error ? (
                      <div className="flex items-center justify-between gap-4 flex-wrap">
                        <div className="text-sm text-muted-foreground">Couldn't load interviews</div>
                        <Button
                          size="sm"
                          variant="outline"
                          className={isDark ? "border-zinc-700 text-white hover:bg-white/10" : "border-gray-300 text-gray-900 hover:bg-gray-50"}
                          onClick={() => window.location.reload()}
                        >
                          Retry
                        </Button>
                      </div>
                    ) : upcomingInterviews.length === 0 ? (
                      <div className="flex items-center justify-between gap-4 flex-wrap">
                        <div className="text-sm text-muted-foreground">No upcoming interviews</div>
                        <Button
                          size="sm"
                          className={isDark ? "bg-white text-black hover:bg-white/90 border-white" : "bg-black text-white hover:bg-black/90 border-black"}
                          onClick={() => setTab("schedule")}
                        >
                          Schedule One
                        </Button>
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Role</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Time</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Action</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {upcomingInterviews.map((iv) => {
                            const badgeCls =
                              iv.status === "In Progress"
                                ? isDark
                                  ? "bg-blue-500/15 text-blue-300 border-blue-500/25"
                                  : "bg-blue-100 text-blue-700 border-blue-200"
                                : isDark
                                  ? "bg-yellow-500/15 text-yellow-300 border-yellow-500/25"
                                  : "bg-yellow-100 text-yellow-700 border-yellow-200"
                            return (
                              <TableRow key={iv.id}>
                                <TableCell className="font-medium">{iv.role}</TableCell>
                                <TableCell className="whitespace-nowrap tabular-nums">{iv.date}</TableCell>
                                <TableCell className="whitespace-nowrap tabular-nums">{iv.time}</TableCell>
                                <TableCell>
                                  <Badge variant="outline" className={badgeCls}>
                                    {iv.status}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Button
                                    size="sm"
                                    className={isDark ? "bg-white text-black hover:bg-white/90 border-white" : "bg-black text-white hover:bg-black/90 border-black"}
                                    onClick={() => setTab("interviews")}
                                  >
                                    Start
                                  </Button>
                                </TableCell>
                              </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="text-sm text-muted-foreground">Loading activity…</div>
                  ) : recentActivity.length === 0 ? (
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <div className="text-sm text-muted-foreground">No interviews yet</div>
                      <Button size="sm" onClick={() => setTab("interviews")}>
                        Start your first assessment
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {recentActivity.map((a) => (
                        <div key={a.id} className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className={["h-9 w-9 rounded-lg flex items-center justify-center", isDark ? "bg-zinc-800" : "bg-gray-100"].join(" ")}>
                              {a.icon === "check" ? (
                                <CheckCircle className={["w-4 h-4", isDark ? "text-white" : "text-black"].join(" ")} />
                              ) : a.icon === "calendar" ? (
                                <Calendar className={["w-4 h-4", isDark ? "text-white" : "text-black"].join(" ")} />
                              ) : (
                                <Mic className={["w-4 h-4", isDark ? "text-white" : "text-black"].join(" ")} />
                              )}
                            </div>
                            <div className="text-sm">{a.label}</div>
                          </div>
                          <div className="text-xs text-muted-foreground">{a.time}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : null}

          {tab === "jobs" ? (
            <div className="max-w-5xl">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <div className="text-2xl font-semibold">Available Positions</div>
                  <div className="text-sm text-muted-foreground">Browse open roles and start your application</div>
                </div>
                <div className="w-full sm:w-80">
                  <Input
                    value={jobsQuery}
                    onChange={(e) => setJobsQuery(e.target.value)}
                    placeholder="Search by title, role, company…"
                  />
                </div>
              </div>

              <div className="mt-6">
                {jobsLoading ? (
                  <div className="text-sm text-muted-foreground">Loading jobs…</div>
                ) : jobsError ? (
                  <div className="text-sm text-muted-foreground">No open positions right now. Check back soon!</div>
                ) : filteredJobs.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No open positions right now. Check back soon!</div>
                ) : (
                  <div className="space-y-4">
                    {filteredJobs.map((job) => (
                      <Card key={job.id} className="p-5">
                        <div className="flex justify-between items-start gap-6 flex-wrap">
                          <div className="min-w-0 flex-1">
                            <h3 className="font-semibold text-lg">{job.job_title}</h3>
                            <p className="text-muted-foreground">
                              {job.company_name} · {job.location || "Remote"}
                            </p>
                            <p className="text-sm mt-2">
                              {String(job.job_description ?? "").length > 200
                                ? `${String(job.job_description).slice(0, 200)}...`
                                : String(job.job_description ?? "")}
                            </p>
                            <div className="flex flex-wrap gap-2 mt-3">
                              <Badge>{job.job_role}</Badge>
                              {job.salary_range ? <Badge variant="outline">{job.salary_range}</Badge> : null}
                              {job.deadline ? (
                                <Badge variant="outline">
                                  Deadline: {new Date(job.deadline).toLocaleDateString()}
                                </Badge>
                              ) : null}
                            </div>
                          </div>
                          <Button
                            className={isDark ? "bg-white text-black hover:bg-white/90 border-white" : "bg-black text-white hover:bg-black/90 border border-black"}
                            onClick={() =>
                              navigate("/interview", {
                                state: { jobRole: job.job_role, jobTitle: job.job_title, companyName: job.company_name, jobId: job.id },
                              })
                            }
                          >
                            Apply Now
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : null}

          {tab === "resume" ? <AnalyzeContent compact /> : null}
          {tab === "interviews" ? <InterviewListContent compact /> : null}
          {tab === "schedule" ? <ScheduleContent /> : null}

          {tab === "scores" ? (
            reportDetail ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="p-6">
                  <div className="font-semibold">Competency Radar</div>
                  <div className="mt-4 h-[320px]">
                    <RadarChart
                      width={420}
                      height={320}
                      data={[
                        { skill: "Technical", score: reportDetail.scores.technical_depth },
                        { skill: "Communication", score: reportDetail.scores.communication },
                        { skill: "Relevance", score: reportDetail.scores.relevance },
                        { skill: "Confidence", score: reportDetail.scores.confidence },
                      ]}
                    >
                      <PolarGrid />
                      <PolarAngleAxis dataKey="skill" />
                      <Radar
                        name="score"
                        dataKey="score"
                        stroke={isDark ? "#7C3AED" : "#2563EB"}
                        fill={isDark ? "#7C3AED" : "#2563EB"}
                        fillOpacity={0.25}
                      />
                    </RadarChart>
                  </div>
                </Card>
                <Card className="p-6">
                  <div className="font-semibold">Score Breakdown</div>
                  <div className="mt-4 space-y-4">
                    {([
                      ["Technical", reportDetail.scores.technical_depth],
                      ["Communication", reportDetail.scores.communication],
                      ["Relevance", reportDetail.scores.relevance],
                      ["Confidence", reportDetail.scores.confidence],
                    ] as [string, number][]).map(([label, val]) => (
                      <div key={label} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">{label}</span>
                          <span className="text-sm font-semibold tabular-nums">{val.toFixed(1)}/10</span>
                        </div>
                        <Progress value={Math.max(0, Math.min(100, val * 10))} />
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            ) : (
              <Card className="p-6">
                <div className="font-semibold">Score Dashboard</div>
                <div className="mt-2 text-sm text-muted-foreground">
                  Open a completed interview report to view detailed score analytics.
                </div>
                <div className="mt-4">
                  <Button onClick={() => setTab("reports")}>Go to My Reports</Button>
                </div>
              </Card>
            )
          ) : null}

          {tab === "reports" ? (
            <div className="max-w-5xl space-y-4">
              <Card className="p-6">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="font-semibold">Completed Interviews</div>
                  <div className="w-72">
                    <Input placeholder="Search by role..." value={reportSearch} onChange={(e) => setReportSearch(e.target.value)} />
                  </div>
                </div>

                <div className="mt-4">
                  {reportRows.length === 0 ? (
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <div className="text-sm text-muted-foreground">No interviews yet</div>
                      <Button size="sm" onClick={() => setTab("interviews")}>
                        Start your first assessment
                      </Button>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Role</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Overall Score</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredReports.map((r) => {
                          const statusCls =
                            r.status === "Hired"
                              ? isDark
                                ? "bg-green-500/15 text-green-300 border-green-500/25"
                                : "bg-green-100 text-green-700 border-green-200"
                              : isDark
                                ? "bg-blue-500/15 text-blue-300 border-blue-500/25"
                                : "bg-blue-100 text-blue-700 border-blue-200"

                          return (
                            <TableRow key={r.id}>
                              <TableCell className="font-medium">{r.role}</TableCell>
                              <TableCell>{r.date}</TableCell>
                              <TableCell className="tabular-nums">{r.score.toFixed(1)}/10</TableCell>
                              <TableCell>
                                <Badge variant="outline" className={statusCls}>
                                  {r.status}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className={isDark ? "bg-white text-black hover:bg-white/90 border-white" : "bg-black text-white hover:bg-black/90 border-black"}
                                  onClick={() => void loadReport(r.id)}
                                >
                                  View Report
                                </Button>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  )}
                  <div className="mt-3 text-xs text-muted-foreground">
                    {filteredReports.length} of {reportRows.length} reports
                  </div>
                </div>
              </Card>

              {reportLoading ? (
                <Card className="p-6">
                  <div className="text-sm text-muted-foreground">Loading report…</div>
                </Card>
              ) : reportError ? (
                <Card className="p-6">
                  <div className="text-sm text-red-500">{reportError}</div>
                </Card>
              ) : reportDetail ? (
                <Card className="p-6">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                      <div className="font-semibold">Report</div>
                      <div className="text-sm text-muted-foreground">Interview ID: {reportDetail.id}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div
                        className={[
                          "text-3xl font-bold tabular-nums",
                          reportDetail.overall_score >= 7.5
                            ? isDark ? "text-green-300" : "text-green-700"
                            : reportDetail.overall_score >= 5
                              ? isDark ? "text-amber-300" : "text-amber-700"
                              : isDark ? "text-red-300" : "text-red-700",
                        ].join(" ")}
                      >
                        {reportDetail.overall_score.toFixed(1)}
                      </div>
                      <Badge variant="outline">
                        {reportDetail.recommendation}
                      </Badge>
                    </div>
                  </div>

                  <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    {([
                      ["Technical", reportDetail.scores.technical_depth],
                      ["Communication", reportDetail.scores.communication],
                      ["Relevance", reportDetail.scores.relevance],
                      ["Confidence", reportDetail.scores.confidence],
                    ] as [string, number][]).map(([label, val]) => (
                      <div key={label} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">{label}</span>
                          <span className="text-sm font-semibold tabular-nums">{val.toFixed(1)}/10</span>
                        </div>
                        <Progress value={Math.max(0, Math.min(100, val * 10))} />
                      </div>
                    ))}
                  </div>

                  {reportDetail.summary ? (
                    <div className="mt-6">
                      <div className="font-semibold">Summary</div>
                      <p className="mt-2 text-sm text-muted-foreground">{reportDetail.summary}</p>
                    </div>
                  ) : null}

                  <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <div className="font-semibold">Strengths</div>
                      <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
                        {(reportDetail.strengths.length ? reportDetail.strengths : ["—"]).map((s, idx) => (
                          <li key={idx}>{s}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <div className="font-semibold">Areas for improvement</div>
                      <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
                        {(reportDetail.weaknesses.length ? reportDetail.weaknesses : ["—"]).map((s, idx) => (
                          <li key={idx}>{s}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </Card>
              ) : selectedReportId ? (
                <Card className="p-6">
                  <div className="text-sm text-muted-foreground">Report not available.</div>
                </Card>
              ) : null}
            </div>
          ) : null}

          {tab === "settings" ? (
            <div className="max-w-2xl space-y-4">
              <Card className="p-6">
                <div className="font-semibold">Profile</div>
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="text-sm text-muted-foreground">Name</div>
                    <Input value={profileName} onChange={(e) => setProfileName(e.target.value)} placeholder="Your name" />
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm text-muted-foreground">Email</div>
                    <Input value={candidate.email ?? "—"} readOnly />
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="font-semibold">Preferences</div>
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="text-sm text-muted-foreground">Preferred language</div>
                    <select
                      value={preferredLanguage}
                      onChange={(e) => setPreferredLanguage(e.target.value)}
                      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    >
                      <option value="English">English</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm text-muted-foreground">Interview duration</div>
                    <select
                      value={durationPreference}
                      onChange={(e) => setDurationPreference(e.target.value as "8" | "12")}
                      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    >
                      <option value="8">8 questions</option>
                      <option value="12">12 questions</option>
                    </select>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="font-semibold">Notifications</div>
                <div className="mt-4 space-y-3 text-sm">
                  <label className="flex items-center justify-between gap-4">
                    <span className="text-muted-foreground">Email alerts</span>
                    <input
                      type="checkbox"
                      checked={emailAlerts}
                      onChange={(e) => setEmailAlerts(e.target.checked)}
                      className="accent-purple-600 w-4 h-4"
                    />
                  </label>
                  <label className="flex items-center justify-between gap-4">
                    <span className="text-muted-foreground">Interview reminders</span>
                    <input
                      type="checkbox"
                      checked={interviewReminders}
                      onChange={(e) => setInterviewReminders(e.target.checked)}
                      className="accent-purple-600 w-4 h-4"
                    />
                  </label>
                </div>
              </Card>

              <Card className="p-6">
                <div className="font-semibold">Theme</div>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Dark / Light</span>
                  <Button variant="outline" onClick={toggleTheme}>
                    {isDark ? "Dark" : "Light"}
                  </Button>
                </div>
              </Card>

              <Card className="p-6 border-red-500/20">
                <div className="font-semibold text-red-500">Account</div>
                <div className="mt-4 flex items-center justify-between gap-4">
                  <div>
                    <div className="text-sm font-medium">Delete Account</div>
                    <div className="text-sm text-muted-foreground">Coming soon</div>
                  </div>
                  <Button variant="destructive" size="sm" disabled>
                    Delete
                  </Button>
                </div>
              </Card>

              <div className="flex items-center justify-between">
                {saveMessage ? <div className="text-sm text-green-500">{saveMessage}</div> : <div />}
                <Button onClick={saveSettings} className={isDark ? "bg-[#7C3AED] text-white hover:bg-[#7C3AED]/90" : "bg-black text-white hover:bg-black/90 border border-black"}>
                  Save Changes
                </Button>
              </div>
            </div>
          ) : null}

          {tab === "pricing" ? (
            <div className="max-w-6xl">
              <PricingSection
                heading="Assessment Plans"
                description="Choose the right plan for your hiring needs. Scale from individual practice to advanced analytics."
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
                    price: { monthly: 299, yearly: 2999 },
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
                ]}
                className={isDark ? "text-zinc-50" : "text-gray-900"}
              />
            </div>
          ) : null}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
