import { useEffect, useMemo, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { LogOut, Search } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { getCandidates, getInterviews, getReport } from "@/lib/api"
import { INTERVIEW_STATUS } from "@/lib/constants"
import type { Candidate, Interview, Report } from "@/types"

type ReportMap = Record<string, Report | undefined>

function formatDate(value?: string | null) {
  if (!value) return ""
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ""
  return d.toLocaleDateString()
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [interviews, setInterviews] = useState<Interview[]>([])
  const [reports, setReports] = useState<ReportMap>({})
  const [query, setQuery] = useState("")

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      try {
        const [cRes, iRes] = await Promise.all([getCandidates(), getInterviews()])
        if (cancelled) return
        setCandidates(cRes.candidates ?? [])
        setInterviews(iRes.interviews ?? [])

        const completed = (iRes.interviews ?? []).filter((iv: Interview) => iv.status === "completed")
        const settled = await Promise.allSettled(
          completed.map(async (iv: Interview) => ({ id: iv.id, report: await getReport(iv.id) }))
        )
        if (cancelled) return

        const map: ReportMap = {}
        for (const s of settled) {
          if (s.status === "fulfilled") {
            map[s.value.id] = s.value.report
          }
        }
        setReports(map)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  const candidateById = useMemo(() => {
    const m = new Map<string, Candidate>()
    for (const c of candidates) m.set(c.id, c)
    return m
  }, [candidates])

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    const base = interviews
      .slice()
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
      .map((iv) => {
        const c = candidateById.get(iv.candidate_id)
        const report = reports[iv.id]
        return {
          interview: iv,
          candidate: c,
          report,
          score: typeof report?.overall_score === "number" ? report.overall_score : null,
        }
      })

    if (!q) return base
    return base.filter((r) => {
      const name = (r.candidate?.name ?? "").toLowerCase()
      const email = (r.candidate?.email ?? "").toLowerCase()
      const role = (r.interview.job_role ?? "").toLowerCase()
      return name.includes(q) || email.includes(q) || role.includes(q)
    })
  }, [candidateById, interviews, query, reports])

  const stats = useMemo(() => {
    const totalCandidates = candidates.length
    const completed = interviews.filter((iv) => iv.status === "completed").length
    const reportList = Object.values(reports).filter(Boolean) as Report[]
    const avgScore =
      reportList.length > 0
        ? reportList.reduce((sum, r) => sum + (r.overall_score ?? 0), 0) / reportList.length
        : 0
    const hires = reportList.filter((r) => r.recommendation === "HIRE").length
    const hireRate = reportList.length > 0 ? (hires / reportList.length) * 100 : 0
    return {
      totalCandidates,
      completed,
      avgScore: Number.isFinite(avgScore) ? avgScore : 0,
      hireRate: Number.isFinite(hireRate) ? hireRate : 0,
    }
  }, [candidates.length, interviews, reports])

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-[#0A0A0A]">
      <aside className="fixed inset-y-0 left-0 w-60 bg-white border-r border-[#E5E7EB]">
        <div className="h-16 px-6 flex items-center font-semibold text-xl">SAGE</div>
        <nav className="px-3 space-y-1">
          <div className="px-3 py-2 rounded-md bg-gray-100 text-sm font-medium">Dashboard</div>
          <div className="px-3 py-2 rounded-md text-sm text-gray-600">Candidates</div>
          <div className="px-3 py-2 rounded-md text-sm text-gray-600">Settings</div>
        </nav>
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <Button
            variant="outline"
            className="w-full justify-start gap-2"
            onClick={() => {
              localStorage.removeItem("sage_token")
              navigate("/hr/login", { replace: true })
            }}
          >
            <LogOut size={16} />
            Logout
          </Button>
        </div>
      </aside>

      <main className="ml-60 p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 rounded-xl border border-[#E5E7EB] bg-white animate-pulse" />
            ))
          ) : (
            <>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-gray-600 font-medium">Total Candidates</CardTitle>
                </CardHeader>
                <CardContent className="text-3xl font-semibold">{stats.totalCandidates}</CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-gray-600 font-medium">Completed</CardTitle>
                </CardHeader>
                <CardContent className="text-3xl font-semibold">{stats.completed}</CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-gray-600 font-medium">Avg Score /10</CardTitle>
                </CardHeader>
                <CardContent className="text-3xl font-semibold">{stats.avgScore.toFixed(1)}</CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-gray-600 font-medium">Hire Rate</CardTitle>
                </CardHeader>
                <CardContent className="text-3xl font-semibold">{stats.hireRate.toFixed(0)}%</CardContent>
              </Card>
            </>
          )}
        </div>

        <div className="mt-8 flex items-center gap-3">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search candidates, emails, roles..."
              className="pl-9"
            />
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-[#E5E7EB] bg-white overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Candidate</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Score</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={6}>
                      <div className="h-10 w-full bg-gray-100 rounded-md animate-pulse" />
                    </TableCell>
                  </TableRow>
                ))
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center text-sm text-gray-600">
                    No interviews found.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r) => {
                  const iv = r.interview
                  const c = r.candidate
                  const cfg = INTERVIEW_STATUS[iv.status] ?? {
                    label: iv.status,
                    color: "bg-gray-100 text-gray-700",
                  }
                  return (
                    <TableRow key={iv.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <div className="font-medium">{c?.name || "Unknown"}</div>
                          <div className="text-xs text-gray-500">{c?.email || ""}</div>
                        </div>
                      </TableCell>
                      <TableCell>{iv.job_role}</TableCell>
                      <TableCell className="text-sm text-gray-600">{formatDate(iv.created_at)}</TableCell>
                      <TableCell>
                        <Badge className={`border border-gray-200 ${cfg.color}`} variant="secondary">
                          {cfg.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{r.score === null ? "—" : r.score.toFixed(1)}</TableCell>
                      <TableCell className="text-right">
                        {iv.status === "completed" ? (
                          <Button asChild size="sm">
                            <Link to={`/hr/report/${iv.id}`}>View Report</Link>
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline" disabled>
                            View Report
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </main>
    </div>
  )
}

