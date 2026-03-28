import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { BarChart3, Calendar, CreditCard, FileSearch, LayoutDashboard, LogOut, Mic, Moon, Settings, Sun } from "lucide-react"
import { PolarAngleAxis, PolarGrid, Radar, RadarChart } from "recharts"
import { flexRender, getCoreRowModel, getSortedRowModel, type ColumnDef, type SortingState, useReactTable } from "@tanstack/react-table"

import { AnalyzeContent } from "@/pages/candidate/Analyze"
import { InterviewListContent } from "@/pages/candidate/InterviewList"
import { ScheduleContent } from "@/pages/candidate/Schedule"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { Input } from "@/components/ui/input"
import { PricingSection } from "@/components/ui/pricing"
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
import { getInterviews } from "@/lib/api"
import { useTheme } from "@/lib/theme-context"

type Tab = "overview" | "resume" | "interviews" | "schedule" | "scores" | "settings" | "pricing"

type UpcomingInterview = {
  id: string
  role: string
  company: string
  date: string
  time: string
  status: "Confirmed" | "Pending" | "Completed"
}

const fallbackUpcoming: UpcomingInterview[] = [
  { id: "1", role: "ML Engineer", company: "Google", date: "Mar 29, 2026", time: "10:30 AM", status: "Confirmed" },
  { id: "2", role: "Backend Developer", company: "Meta", date: "Apr 01, 2026", time: "2:00 PM", status: "Pending" },
  { id: "3", role: "Software Engineer", company: "Stripe", date: "Mar 25, 2026", time: "11:00 AM", status: "Completed" },
  { id: "4", role: "Frontend Developer", company: "Vercel", date: "Apr 03, 2026", time: "9:00 AM", status: "Confirmed" },
  { id: "5", role: "Data Analyst", company: "Anthropic", date: "Apr 05, 2026", time: "3:30 PM", status: "Pending" },
]

export default function CandidateDashboard() {
  const navigate = useNavigate()
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === "dark"
  const [tab, setTab] = useState<Tab>("overview")
  const [upcoming, setUpcoming] = useState<UpcomingInterview[]>(fallbackUpcoming)
  const [roleSearch, setRoleSearch] = useState("")
  const [sorting, setSorting] = useState<SortingState>([])

  const tabTitles: Record<Tab, string> = {
    overview: "Overview",
    resume: "Resume Analysis",
    interviews: "Voice Interviews",
    schedule: "Schedule",
    scores: "Score Dashboard",
    settings: "Settings",
    pricing: "Pricing",
  }

  const candidate = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("sage_candidate") ?? "{}") as { name?: string; email?: string }
    } catch {
      return {} as { name?: string; email?: string }
    }
  }, [])

  const chartConfig = useMemo(() => {
    const config: ChartConfig = {
      score: { label: "Score", color: isDark ? "#7C3AED" : "#2563EB" },
    }
    return config
  }, [isDark])

  const radarData = useMemo(
    () => [
      { skill: "Technical", score: 8.2 },
      { skill: "Communication", score: 7.6 },
      { skill: "Relevance", score: 8.0 },
      { skill: "Confidence", score: 7.4 },
      { skill: "Problem Solving", score: 7.9 },
    ],
    []
  )

  const activity = [
    "Completed ML Engineer interview — 8.2/10",
    "Uploaded resume for ATS scoring",
    "Scheduled Backend Developer assessment",
    "Viewed evaluation report",
    "Updated candidate profile",
  ]

  function logout() {
    localStorage.clear()
    navigate("/login", { replace: true })
  }

  useEffect(() => {
    const controller = new AbortController()
    const timeoutId = window.setTimeout(() => controller.abort(), 3000)
    ;(async () => {
      try {
        const raw = (await getInterviews(controller.signal)) as unknown
        const arr: unknown[] =
          Array.isArray(raw) ? raw : Array.isArray((raw as { interviews?: unknown[] } | null)?.interviews) ? (raw as { interviews: unknown[] }).interviews : []

        const mapped: UpcomingInterview[] = arr
          .slice(0, 5)
          .map((item, idx) => {
            const r = (item ?? {}) as Record<string, unknown>
            const statusRaw = String(r.status ?? "Pending").toLowerCase()
            const status: UpcomingInterview["status"] =
              statusRaw.includes("complete") ? "Completed" : statusRaw.includes("confirm") ? "Confirmed" : "Pending"

            const createdAt = typeof r.created_at === "string" ? new Date(r.created_at) : null
            const date =
              typeof r.date === "string"
                ? r.date
                : createdAt
                  ? createdAt.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })
                  : "—"

            const role = String(r.role ?? r.job_role ?? r.role_applied ?? "—")
            return {
              id: String(r.id ?? r.interview_id ?? idx),
              role,
              company: String(r.company ?? "—"),
              date,
              time: String(r.time ?? "—"),
              status,
            } satisfies UpcomingInterview
          })
          .filter((x: UpcomingInterview) => x.role !== "—")

        if (mapped.length) setUpcoming(mapped)
      } catch (err) {
        console.log("[SAGE] Upcoming interviews fetch failed:", err)
      } finally {
        window.clearTimeout(timeoutId)
      }
    })()
    return () => {
      window.clearTimeout(timeoutId)
      controller.abort()
    }
  }, [])

  const filteredUpcoming = useMemo(() => {
    const q = roleSearch.trim().toLowerCase()
    if (!q) return upcoming
    return upcoming.filter((i) => i.role.toLowerCase().includes(q))
  }, [upcoming, roleSearch])

  const interviewColumns = useMemo<ColumnDef<UpcomingInterview>[]>(() => {
    const confirmedCls = isDark ? "bg-green-500/15 text-green-300 border-green-500/25" : "bg-green-100 text-green-700"
    const completedCls = isDark ? "bg-blue-500/15 text-blue-300 border-blue-500/25" : "bg-blue-100 text-blue-700"
    const pendingCls = isDark ? "bg-yellow-500/15 text-yellow-300 border-yellow-500/25" : "bg-yellow-100 text-yellow-700"

    return [
      {
        accessorKey: "role",
        header: "Role",
        cell: ({ row }) => <span className="font-medium">{row.getValue("role") as string}</span>,
      },
      { accessorKey: "company", header: "Company" },
      { accessorKey: "date", header: "Date" },
      { accessorKey: "time", header: "Time" },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => {
          const s = row.getValue("status") as string
          const cls = s === "Confirmed" ? confirmedCls : s === "Completed" ? completedCls : pendingCls
          return (
            <Badge
              variant={s === "Confirmed" ? "default" : s === "Completed" ? "secondary" : "outline"}
              className={cls}
            >
              {s}
            </Badge>
          )
        },
      },
      {
        id: "action",
        header: "Action",
        cell: ({ row }) => {
          const s = row.original.status
          return (
            <Button
              size="sm"
              variant={s === "Completed" ? "outline" : "default"}
              onClick={() => (s === "Completed" ? setTab("scores") : setTab("interviews"))}
            >
              {s === "Completed" ? "View Report" : "Start"}
            </Button>
          )
        },
      },
    ]
  }, [isDark])

  const upcomingTable = useReactTable({
    data: filteredUpcoming,
    columns: interviewColumns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

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
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="p-4">
                  <div className="text-sm text-muted-foreground">Interviews Completed</div>
                  <div className="text-2xl font-semibold mt-1">3</div>
                </Card>
                <Card className="p-4">
                  <div className="text-sm text-muted-foreground">Average Score</div>
                  <div className="text-2xl font-semibold mt-1">7.8/10</div>
                </Card>
                <Card className="p-4">
                  <div className="text-sm text-muted-foreground">Next Interview</div>
                  <div className="text-2xl font-semibold mt-1">Mar 29</div>
                </Card>
                <Card className="p-4">
                  <div className="text-sm text-muted-foreground">Resume Score</div>
                  <div className="text-2xl font-semibold mt-1">78%</div>
                </Card>
              </div>

              <Card className="p-6">
                <div className="font-semibold">Recent Activity</div>
                <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                  {activity.map((a) => (
                    <div key={a}>{a}</div>
                  ))}
                </div>
              </Card>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  className={isDark ? "bg-[#7C3AED] text-white hover:bg-[#7C3AED]/90" : "bg-black text-white hover:bg-black/90 border border-black"}
                  onClick={() => setTab("interviews")}
                >
                  New Interview
                </Button>
                <Button variant="outline" onClick={() => setTab("resume")}>
                  Upload Resume
                </Button>
                <Button variant="outline" onClick={() => setTab("scores")}>
                  View Reports
                </Button>
              </div>

              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="text-lg">Upcoming Interviews</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="mb-3">
                    <Input
                      placeholder="Search by role..."
                      value={roleSearch}
                      onChange={(e) => setRoleSearch(e.target.value)}
                    />
                  </div>
                  <Table>
                    <TableHeader>
                      {upcomingTable.getHeaderGroups().map((hg) => (
                        <TableRow key={hg.id}>
                          {hg.headers.map((header) => (
                            <TableHead
                              key={header.id}
                              className={header.column.getCanSort() ? "cursor-pointer select-none" : undefined}
                              onClick={header.column.getToggleSortingHandler()}
                            >
                              {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                            </TableHead>
                          ))}
                        </TableRow>
                      ))}
                    </TableHeader>
                    <TableBody>
                      {upcomingTable.getRowModel().rows.map((row) => (
                        <TableRow key={row.id}>
                          {row.getVisibleCells().map((cell) => (
                            <TableCell key={cell.id}>
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <div className="mt-3 text-xs text-muted-foreground">
                    {filteredUpcoming.length} of {upcoming.length} interviews
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : null}

          {tab === "resume" ? <AnalyzeContent compact /> : null}
          {tab === "interviews" ? <InterviewListContent compact /> : null}
          {tab === "schedule" ? <ScheduleContent /> : null}

          {tab === "scores" ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="p-6">
                <div className="font-semibold">Competency Radar</div>
                <div className="mt-4 h-[320px]">
                  <ChartContainer config={chartConfig} className="h-full w-full">
                    <RadarChart data={radarData}>
                      <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                      <PolarGrid />
                      <PolarAngleAxis dataKey="skill" />
                      <Radar
                        name="score"
                        dataKey="score"
                        stroke="var(--color-score)"
                        fill="var(--color-score)"
                        fillOpacity={0.3}
                        dot={{ r: 4 }}
                      />
                    </RadarChart>
                  </ChartContainer>
                </div>
              </Card>
              <Card className="p-6">
                <div className="font-semibold">Completed Interviews</div>
                <div className="mt-4 space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">ML Engineer</span>
                    <span className="font-semibold tabular-nums">8.2/10</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Frontend Developer</span>
                    <span className="font-semibold tabular-nums">7.6/10</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Backend Developer</span>
                    <span className="font-semibold tabular-nums">7.7/10</span>
                  </div>
                </div>
              </Card>
            </div>
          ) : null}

          {tab === "settings" ? (
            <div className="max-w-2xl space-y-4">
              <Card className="p-6">
                <div className="font-semibold">Profile</div>
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="text-sm text-muted-foreground">Name</div>
                    <Input value={candidate.name ?? "Candidate"} readOnly />
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm text-muted-foreground">Email</div>
                    <Input value={candidate.email ?? "—"} readOnly />
                  </div>
                </div>
              </Card>
              <Card className="p-6">
                <div className="font-semibold">Appearance</div>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Theme</span>
                  <Button variant="outline" onClick={toggleTheme}>
                    {isDark ? "Dark" : "Light"}
                  </Button>
                </div>
              </Card>
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
            </div>
          ) : null}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
