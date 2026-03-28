import { useEffect, useMemo, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import {
  ArrowLeft,
  CalendarPlus,
  CheckCircle2,
  Download,
  UserCheck,
  XCircle,
} from "lucide-react"
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from "recharts"

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { getCandidates, getInterview, getQuestions } from "@/lib/api"
import { SCORE_DIMENSIONS } from "@/lib/constants"
import { useTheme } from "@/lib/theme-context"
import type { Candidate, Question, ScoreBreakdown } from "@/types"

type InterviewResponseRow = {
  id: string
  interview_id: string
  question_id: string
  transcript: string
  scores: ScoreBreakdown
  feedback?: string
  created_at?: string
}

type InterviewPayload = {
  interview: { id: string; candidate_id: string; job_role: string; created_at: string }
  responses: InterviewResponseRow[]
}

type ReportView = {
  id?: string
  interview_id?: string
  candidate_name?: string
  candidate_email?: string
  job_role?: string
  overall_score?: number
  technical_depth?: number
  communication?: number
  relevance?: number
  confidence?: number
  scores?: Partial<ScoreBreakdown>
  scores_json?: Record<string, unknown>
  scoresJson?: Record<string, unknown>
  recommendation?: string
  strengths?: string[]
  weaknesses?: string[]
  summary?: string
  transcript?: unknown[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(value?: string | null) {
  if (!value) return ""
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ""
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
}

function initials(name?: string | null) {
  const parts = (name ?? "").trim().split(" ").filter(Boolean)
  if (parts.length === 0) return "?"
  return parts.length >= 2 ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase() : parts[0][0].toUpperCase()
}

function scoreColor(score: number, isDark: boolean) {
  if (score >= 7) return isDark ? "text-green-400" : "text-green-600"
  if (score >= 5) return isDark ? "text-amber-400" : "text-amber-600"
  return isDark ? "text-red-400" : "text-red-500"
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ReportPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { theme } = useTheme()
  const isDark = theme === "dark"

  const [loading, setLoading] = useState(true)
  const [report, setReport] = useState<ReportView | null>(null)
  const [error, setError] = useState("")
  const [interview, setInterview] = useState<InterviewPayload | null>(null)
  const [candidate, setCandidate] = useState<Candidate | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!id) return
      setLoading(true)
      setError("")
      try {
        const controller = new AbortController()
        const timeout = window.setTimeout(() => controller.abort(), 10000)
        const reportUrl = `http://localhost:8000/api/report/${id}`
        const reportRes = await fetch(reportUrl, { signal: controller.signal })
        window.clearTimeout(timeout)
        if (!reportRes.ok) throw new Error("Report not found")
        const r = await reportRes.json()
        console.log("Report data:", r)

        const [iv, q] = await Promise.all([getInterview(id), getQuestions(id)])
        if (cancelled) return
        setReport(r)
        setInterview(iv)
        setQuestions(q.questions ?? [])
        const candidatesRes = await getCandidates()
        if (cancelled) return
        const all = (candidatesRes.candidates ?? []) as Candidate[]
        const found = all.find((c) => c.id === iv.interview.candidate_id) ?? null
        setCandidate(found)
      } catch (e: unknown) {
        if (cancelled) return
        console.error("Failed to load report:", e)
        setError(e instanceof Error ? e.message : "Failed to load report")
        setReport(null)
        setInterview(null)
        setQuestions([])
        setCandidate(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [id])

  const questionTextById = useMemo(() => {
    const m = new Map<string, string>()
    for (const q of questions) m.set(q.id, q.question_text)
    return m
  }, [questions])

  const scores = useMemo(() => {
    return {
      technical_depth: report?.technical_depth ?? report?.scores?.technical_depth ?? 0,
      communication: report?.communication ?? report?.scores?.communication ?? 0,
      relevance: report?.relevance ?? report?.scores?.relevance ?? 0,
      confidence: report?.confidence ?? report?.scores?.confidence ?? 0,
    }
  }, [report])

  const averageScores = useMemo(() => {
    const scoresJson = report?.scores_json ?? report?.scoresJson
    const scoresObj = scoresJson && typeof scoresJson === "object" ? (scoresJson as Record<string, unknown>) : undefined
    const avgRaw = (scoresObj?.average_scores ?? scoresObj?.averageScores) as unknown
    const avg = avgRaw && typeof avgRaw === "object" ? (avgRaw as Record<string, unknown>) : undefined
    const out: Record<string, number> = {}
    for (const dim of SCORE_DIMENSIONS) {
      const vFromJson = Number(avg?.[dim.key])
      const vFromDirect = Number((scores as Record<string, number>)[dim.key])
      const v = Number.isFinite(vFromJson) ? vFromJson : Number.isFinite(vFromDirect) ? vFromDirect : 0
      out[dim.key] = v
    }
    return out
  }, [report, scores])

  const radarData = useMemo(() => {
    const pick = (k: keyof typeof averageScores) => {
      const v1 = Number(averageScores[k])
      if (Number.isFinite(v1) && v1 !== 0) return v1
      const v2 = Number((scores as Record<string, number>)[k])
      return Number.isFinite(v2) ? v2 : 0
    }
    return [
      { dimension: "Technical", score: pick("technical_depth") },
      { dimension: "Communication", score: pick("communication") },
      { dimension: "Relevance", score: pick("relevance") },
      { dimension: "Confidence", score: pick("confidence") },
    ]
  }, [averageScores, scores])

  // ── Theme classes ──────────────────────────────────────────────────────────
  const pageBg     = isDark ? "bg-zinc-950 text-zinc-50"   : "bg-[#FAFAFA] text-[#0A0A0A]"
  const sidebarBg  = isDark ? "bg-zinc-900 border-zinc-800" : "bg-white border-gray-200"
  const cardBg     = isDark ? "bg-zinc-900 border-zinc-800" : "bg-white border-gray-200"
  const mutedText  = isDark ? "text-zinc-400" : "text-gray-500"
  const labelText  = isDark ? "text-zinc-300" : "text-gray-700"
  const divider    = isDark ? "border-zinc-800" : "border-gray-100"

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className={["flex items-center justify-center min-h-screen", pageBg].join(" ")}>
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p>Loading report...</p>
        </div>
      </div>
    )
  }

  if (error && !report) {
    return (
      <div className={["flex items-center justify-center min-h-screen", pageBg].join(" ")}>
        <p className="text-red-500">Error: {error}</p>
      </div>
    )
  }

  if (!report || !interview) {
    return (
      <div className={["min-h-screen p-8", pageBg].join(" ")}>
        <button type="button" onClick={() => navigate("/hr/dashboard")} className="text-sm text-blue-500 hover:underline flex items-center gap-1">
          <ArrowLeft size={14} /> Back to Dashboard
        </button>
        <p className={["mt-8 text-sm", mutedText].join(" ")}>Report not found.</p>
      </div>
    )
  }

  const overallScore =
    typeof report?.overall_score === "number"
      ? report.overall_score
      : (scores.technical_depth * 0.35 + scores.communication * 0.25 + scores.relevance * 0.25 + scores.confidence * 0.15) || 0
  const recommendation = report?.recommendation ?? (overallScore >= 7.5 ? "HIRE" : overallScore >= 5 ? "MAYBE" : "NO_HIRE")

  const recConfig = {
    HIRE:    { label: "HIRE",     bg: isDark ? "bg-green-900/40 text-green-400 border-green-700" : "bg-green-100 text-green-700 border-green-300" },
    MAYBE:   { label: "REVIEW",   bg: isDark ? "bg-amber-900/40 text-amber-400 border-amber-700" : "bg-amber-100 text-amber-700 border-amber-300" },
    NO_HIRE: { label: "NO HIRE",  bg: isDark ? "bg-red-900/40 text-red-400 border-red-700"       : "bg-red-100 text-red-600 border-red-300" },
  } as const

  const rec = recConfig[recommendation as keyof typeof recConfig] ?? recConfig.MAYBE

  const reportCandidateId = String(interview.interview.candidate_id ?? "")

  const handleHire = async () => {
    try {
      const hired = JSON.parse(localStorage.getItem("sage_hired") || "[]") as string[]
      if (reportCandidateId && !hired.includes(reportCandidateId)) hired.push(reportCandidateId)
      localStorage.setItem("sage_hired", JSON.stringify(hired))
      alert("Candidate marked as hired!")
    } catch {
      alert("Failed to update hire status")
    }
  }

  return (
    <div className={["min-h-screen flex", pageBg].join(" ")}>
      {/* ── Sidebar ── */}
      <aside className={["w-64 min-h-screen border-r flex-shrink-0 flex flex-col", sidebarBg].join(" ")}>
        <div className="h-16 flex items-center px-6 border-b border-inherit">
          <span className={["font-bold text-xl", isDark ? "text-white" : "text-gray-900"].join(" ")}>SAGE</span>
          <span className={["ml-2 text-xs", mutedText].join(" ")}>HR Portal</span>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          <button
            type="button"
            onClick={() => navigate("/hr/dashboard")}
            className={["w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors", isDark ? "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-50" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"].join(" ")}
          >
            <ArrowLeft size={16} />
            Back to Dashboard
          </button>
        </nav>
      </aside>

      {/* ── Main content ── */}
      <main className="flex-1 overflow-y-auto p-8">
        <div className="max-w-4xl space-y-6">

          {/* ── Candidate header card ── */}
          <Card className={cardBg}>
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                {/* Left: avatar + info */}
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16 text-lg">
                    <AvatarFallback className={isDark ? "bg-zinc-700 text-zinc-100" : "bg-gray-100 text-gray-700"}>
                      {initials(candidate?.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h1 className="text-xl font-semibold">{candidate?.name ?? "Unknown Candidate"}</h1>
                    <p className={["text-sm", mutedText].join(" ")}>{candidate?.email ?? ""}</p>
                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                      <span className={["text-xs", mutedText].join(" ")}>{interview.interview.job_role}</span>
                      <span className={["text-xs", mutedText].join(" ")}>·</span>
                      <span className={["text-xs", mutedText].join(" ")}>{formatDate(interview.interview.created_at)}</span>
                    </div>
                  </div>
                </div>

                {/* Right: score + badge */}
                <div className="flex flex-col items-center gap-2 min-w-[120px]">
                  <span className={["text-5xl font-bold tabular-nums", scoreColor(overallScore, isDark)].join(" ")}>
                    {overallScore.toFixed(1)}
                  </span>
                  <span className={["text-xs", mutedText].join(" ")}>/10 overall</span>
                  <Badge className={["text-xs font-semibold px-3 py-1 border", rec.bg].join(" ")}>
                    {rec.label}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── Score breakdown + Radar ── */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Score bars */}
            <Card className={cardBg}>
              <CardHeader>
                <CardTitle className="text-base">Score Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 mb-4">
                  {SCORE_DIMENSIONS.map((d) => {
                    const v = averageScores[d.key]
                    return (
                      <div key={d.key} className={["rounded-lg p-3 border", isDark ? "bg-zinc-800 border-zinc-700" : "bg-gray-50 border-gray-200"].join(" ")}>
                        <p className={["text-xs mb-1", mutedText].join(" ")}>{d.label}</p>
                        <p className={["text-xl font-bold tabular-nums", scoreColor(v, isDark)].join(" ")}>{v.toFixed(1)}</p>
                        <Progress value={v * 10} className="h-1 mt-2" />
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Radar chart */}
            <Card className={cardBg}>
              <CardHeader>
                <CardTitle className="text-base">Performance Radar</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke={isDark ? "#3f3f46" : "#e5e7eb"} />
                    <PolarAngleAxis
                      dataKey="dimension"
                      tick={{ fontSize: 11, fill: isDark ? "#a1a1aa" : "#6b7280" }}
                    />
                    <PolarRadiusAxis domain={[0, 10]} tick={false} axisLine={false} />
                    <Radar
                      name="Score"
                      dataKey="score"
                      stroke={isDark ? "#7C3AED" : "#2563EB"}
                      fill={isDark ? "#7C3AED" : "#2563EB"}
                      fillOpacity={0.25}
                      strokeWidth={2}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* ── Summary ── */}
          <Card className={cardBg}>
            <CardHeader>
              <CardTitle className="text-base">Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <p className={["text-sm leading-relaxed", labelText].join(" ")}>{report.summary}</p>
            </CardContent>
          </Card>

          {/* ── Strengths & Weaknesses ── */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card className={cardBg}>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <CheckCircle2 size={16} className={isDark ? "text-green-400" : "text-green-600"} />
                  Strengths
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {(report.strengths ?? []).map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className={["mt-1 h-1.5 w-1.5 rounded-full flex-shrink-0", isDark ? "bg-green-400" : "bg-green-500"].join(" ")} />
                      <span className={labelText}>{s}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card className={cardBg}>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <XCircle size={16} className={isDark ? "text-orange-400" : "text-orange-500"} />
                  Areas to Improve
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {(report.weaknesses ?? []).map((w, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className={["mt-1 h-1.5 w-1.5 rounded-full flex-shrink-0", isDark ? "bg-orange-400" : "bg-orange-500"].join(" ")} />
                      <span className={labelText}>{w}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* ── Transcript accordion ── */}
          <Card className={cardBg}>
            <CardHeader>
              <CardTitle className="text-base">Interview Transcript</CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                {interview.responses.map((r, idx) => {
                  const qText = questionTextById.get(r.question_id) ?? `Question ${idx + 1}`
                  const s = r.scores ?? ({} as ScoreBreakdown)
                  const avgQ = ((s.technical_depth ?? 0) + (s.communication ?? 0) + (s.relevance ?? 0) + (s.confidence ?? 0)) / 4
                  return (
                    <AccordionItem
                      key={r.id}
                      value={r.id}
                      className={["border-b last:border-b-0", divider].join(" ")}
                    >
                      <AccordionTrigger className="hover:no-underline py-4">
                        <div className="flex items-center justify-between w-full pr-3 gap-3">
                          <div className="text-left">
                            <p className={["text-sm font-medium", isDark ? "text-zinc-100" : "text-gray-900"].join(" ")}>
                              Q{idx + 1}: {qText}
                            </p>
                            {r.feedback && (
                              <p className={["text-xs mt-0.5", mutedText].join(" ")}>{r.feedback}</p>
                            )}
                          </div>
                          <Badge
                            variant="outline"
                            className={[
                              "text-xs font-semibold flex-shrink-0",
                              avgQ >= 8
                                ? isDark ? "border-green-700 text-green-400 bg-green-900/30" : "border-green-300 text-green-700 bg-green-50"
                                : avgQ >= 6
                                ? isDark ? "border-amber-700 text-amber-400 bg-amber-900/30" : "border-amber-300 text-amber-700 bg-amber-50"
                                : isDark ? "border-red-700 text-red-400 bg-red-900/30" : "border-red-300 text-red-600 bg-red-50",
                            ].join(" ")}
                          >
                            {avgQ.toFixed(1)}
                          </Badge>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className={["rounded-lg p-4 mb-3 text-sm leading-relaxed", isDark ? "bg-zinc-800 text-zinc-200" : "bg-gray-50 text-gray-700"].join(" ")}>
                          {r.transcript}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {([
                            ["Technical", s.technical_depth],
                            ["Comm", s.communication],
                            ["Relevance", s.relevance],
                            ["Confidence", s.confidence],
                          ] as [string, number][]).map(([label, val]) => (
                            <span
                              key={label}
                              className={["text-xs px-2 py-0.5 rounded-full border font-medium", isDark ? "bg-zinc-800 border-zinc-700 text-zinc-300" : "bg-white border-gray-200 text-gray-600"].join(" ")}
                            >
                              {label}: {val ?? "—"}/10
                            </span>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  )
                })}
              </Accordion>
            </CardContent>
          </Card>

          {/* ── Action buttons ── */}
          <div className="flex flex-wrap gap-3 pb-8">
            <Button
              variant="outline"
              className={isDark ? "border-zinc-700 text-zinc-200 hover:bg-zinc-800" : ""}
              onClick={() => console.log("Download PDF for interview", id)}
            >
              <Download size={15} className="mr-2" />
              Download PDF
            </Button>
            <Button
              variant="outline"
              className={isDark ? "border-zinc-700 text-zinc-200 hover:bg-zinc-800" : ""}
              onClick={() => console.log("Schedule follow-up for interview", id)}
            >
              <CalendarPlus size={15} className="mr-2" />
              Schedule Follow-up
            </Button>
            <Button
              className={isDark ? "bg-green-700 hover:bg-green-600 text-white" : "bg-green-600 hover:bg-green-700 text-white"}
              onClick={handleHire}
            >
              <UserCheck size={15} className="mr-2" />
              Mark as Hired
            </Button>
          </div>

        </div>
      </main>
    </div>
  )
}
