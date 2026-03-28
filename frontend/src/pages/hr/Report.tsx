import { useEffect, useMemo, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { ArrowLeft, Download, Share2 } from "lucide-react"

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { getCandidates, getInterview, getQuestions, getReport } from "@/lib/api"
import { RECOMMENDATION_CONFIG, SCORE_DIMENSIONS } from "@/lib/constants"
import type { Candidate, Question, Report, ScoreBreakdown } from "@/types"

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

function formatDate(value?: string | null) {
  if (!value) return ""
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ""
  return d.toLocaleDateString()
}

function initialFromName(name?: string | null) {
  const n = (name ?? "").trim()
  return n ? n[0]?.toUpperCase() : "?"
}

export default function ReportPage() {
  const { id } = useParams<{ id: string }>()
  const [loading, setLoading] = useState(true)
  const [report, setReport] = useState<Report | null>(null)
  const [interview, setInterview] = useState<InterviewPayload | null>(null)
  const [candidate, setCandidate] = useState<Candidate | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])

  useEffect(() => {
    let cancelled = false

    async function load() {
      if (!id) return
      setLoading(true)
      try {
        const [r, iv, q] = await Promise.all([getReport(id), getInterview(id), getQuestions(id)])
        if (cancelled) return
        setReport(r)
        setInterview(iv)
        setQuestions(q.questions ?? [])

        const candidatesRes = await getCandidates()
        if (cancelled) return
        const all = (candidatesRes.candidates ?? []) as Candidate[]
        const found = all.find((c) => c.id === iv.interview.candidate_id) ?? null
        setCandidate(found)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [id])

  const questionTextById = useMemo(() => {
    const m = new Map<string, string>()
    for (const q of questions) m.set(q.id, q.question_text)
    return m
  }, [questions])

  const averageScores = useMemo(() => {
    const scoresJson = report?.scores_json as { average_scores?: Record<string, number> } | undefined
    const avg = scoresJson?.average_scores ?? {}
    const out: Record<string, number> = {}
    for (const dim of SCORE_DIMENSIONS) {
      const v = Number(avg[dim.key])
      out[dim.key] = Number.isFinite(v) ? v : 0
    }
    return out
  }, [report])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFAFA]">
        <div className="max-w-4xl mx-auto p-8">
          <div className="h-10 w-48 bg-gray-100 rounded-md animate-pulse" />
          <div className="mt-6 h-40 bg-gray-100 rounded-xl animate-pulse" />
          <div className="mt-6 h-72 bg-gray-100 rounded-xl animate-pulse" />
        </div>
      </div>
    )
  }

  if (!report || !interview) {
    return (
      <div className="min-h-screen bg-[#FAFAFA]">
        <div className="max-w-4xl mx-auto p-8">
          <Link className="text-sm text-[#2563EB] hover:underline" to="/hr/dashboard">
            ← Back
          </Link>
          <div className="mt-8 text-sm text-gray-600">Report not found.</div>
        </div>
      </div>
    )
  }

  const cfg = RECOMMENDATION_CONFIG[report.recommendation] ?? RECOMMENDATION_CONFIG.MAYBE

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <div className="max-w-4xl mx-auto p-8 space-y-6">
        <Link className="inline-flex items-center gap-2 text-sm text-[#2563EB] hover:underline" to="/hr/dashboard">
          <ArrowLeft size={16} />
          Back to Dashboard
        </Link>

        <Card>
          <CardHeader>
            <CardTitle>Candidate</CardTitle>
          </CardHeader>
          <CardContent className="flex items-start justify-between gap-6 flex-col md:flex-row">
            <div className="flex items-center gap-4">
              <Avatar className="h-12 w-12">
                <AvatarFallback>{initialFromName(candidate?.name)}</AvatarFallback>
              </Avatar>
              <div>
                <div className="text-lg font-semibold">{candidate?.name || "Unknown"}</div>
                <div className="text-sm text-gray-600">{candidate?.email || ""}</div>
              </div>
            </div>
            <div className="text-sm text-gray-600 space-y-1">
              <div>
                <span className="text-gray-500">Role:</span> {interview.interview.job_role}
              </div>
              <div>
                <span className="text-gray-500">Date:</span> {formatDate(interview.interview.created_at)}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Scores</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {SCORE_DIMENSIONS.map((d) => {
              const v = averageScores[d.key]
              return (
                <div key={d.key} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="font-medium">{d.label}</div>
                    <div className="text-gray-600">{v.toFixed(1)}/10</div>
                  </div>
                  <Progress value={Math.max(0, Math.min(100, v * 10))} />
                </div>
              )
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Transcript</CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {interview.responses.map((r, idx) => {
                const qText = questionTextById.get(r.question_id) ?? `Question ${idx + 1}`
                const s = r.scores ?? ({} as ScoreBreakdown)
                return (
                  <AccordionItem key={r.id} value={r.id}>
                    <AccordionTrigger>
                      <div className="flex items-center justify-between w-full pr-3">
                        <div className="text-left">
                          <div className="text-sm font-medium">Q{idx + 1}: {qText}</div>
                          <div className="text-xs text-gray-500">{r.feedback ?? ""}</div>
                        </div>
                        <Badge variant="secondary" className="bg-gray-100 text-gray-700 border border-gray-200">
                          {typeof report.overall_score === "number" ? report.overall_score.toFixed(1) : "—"}
                        </Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3">
                        <div className="text-sm text-gray-700 whitespace-pre-wrap">{r.transcript}</div>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="secondary" className="bg-gray-100 text-gray-700 border border-gray-200">
                            Tech {s.technical_depth ?? "—"}/10
                          </Badge>
                          <Badge variant="secondary" className="bg-gray-100 text-gray-700 border border-gray-200">
                            Comm {s.communication ?? "—"}/10
                          </Badge>
                          <Badge variant="secondary" className="bg-gray-100 text-gray-700 border border-gray-200">
                            Rel {s.relevance ?? "—"}/10
                          </Badge>
                          <Badge variant="secondary" className="bg-gray-100 text-gray-700 border border-gray-200">
                            Conf {s.confidence ?? "—"}/10
                          </Badge>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                )
              })}
            </Accordion>
          </CardContent>
        </Card>

        <Card className={`border-l-4 ${cfg.border} ${cfg.bg}`}>
          <CardHeader>
            <CardTitle className={cfg.color}>{cfg.label}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-gray-700 whitespace-pre-wrap">{report.summary}</div>
            <Separator />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <div className="text-sm font-medium">Strengths</div>
                <ul className="text-sm text-gray-700 list-disc pl-5 space-y-1">
                  {report.strengths?.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
              <div className="space-y-2">
                <div className="text-sm font-medium">Weaknesses</div>
                <ul className="text-sm text-gray-700 list-disc pl-5 space-y-1">
                  {report.weaknesses?.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              <Button variant="outline" className="gap-2">
                <Download size={16} />
                Download PDF
              </Button>
              <Button variant="outline" className="gap-2">
                <Share2 size={16} />
                Share
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
