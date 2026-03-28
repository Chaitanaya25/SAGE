import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { BarChart3, Calendar, FileSearch, LayoutDashboard, LogOut, Mic, Moon, Settings, Sun } from "lucide-react"
import { PolarAngleAxis, PolarGrid, Radar, RadarChart } from "recharts"

import { AnalyzeContent } from "@/pages/candidate/Analyze"
import { InterviewListContent } from "@/pages/candidate/InterviewList"
import { ScheduleContent } from "@/pages/candidate/Schedule"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { Input } from "@/components/ui/input"
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
import { useTheme } from "@/lib/theme-context"

type Tab = "overview" | "resume" | "interviews" | "schedule" | "scores" | "settings"

export default function CandidateDashboard() {
  const navigate = useNavigate()
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === "dark"
  const [tab, setTab] = useState<Tab>("overview")

  const tabTitles: Record<Tab, string> = {
    overview: "Overview",
    resume: "Resume Analysis",
    interviews: "Voice Interviews",
    schedule: "Schedule",
    scores: "Score Dashboard",
    settings: "Settings",
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
                <Button className={isDark ? "bg-[#7C3AED] text-white hover:bg-[#7C3AED]/90" : "bg-black text-white hover:bg-black/90 border border-black"} onClick={() => navigate("/interview")}>
                  New Interview
                </Button>
                <Button variant="outline" onClick={() => navigate("/upload")}>
                  Upload Resume
                </Button>
                <Button variant="outline" onClick={() => navigate("/done")}>
                  View Reports
                </Button>
              </div>
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
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}

