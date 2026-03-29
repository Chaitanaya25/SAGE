import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useTheme } from "@/lib/theme-context"
import { useEffect, useMemo, useState } from "react"

export type ScheduledInterview = {
  id: string
  company: string
  role: string
  status: "Available Today" | "Upcoming" | "Expired" | "Completed"
  date: string
  time: string
}

export default function ScheduledInterviews({ items }: { items?: ScheduledInterview[] }) {
  const { theme } = useTheme()
  const isDark = theme === "dark"
  const [loading, setLoading] = useState(false)
  const [fetched, setFetched] = useState<ScheduledInterview[]>([])

  function badgeClass(status: string) {
    return (isDark ? "border-white text-white bg-transparent" : "border-black text-black bg-transparent") + (status ? "" : "")
  }

  const rows = useMemo(() => (items ? items : fetched), [items, fetched])
  const upcomingCount = rows.filter((i) => i.status !== "Completed").length

  useEffect(() => {
    if (items) return
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 10000)
    ;(async () => {
      try {
        setLoading(true)
        const candidate = JSON.parse(localStorage.getItem("sage_candidate") || "{}") as { id?: string; candidate_id?: string }
        const candidateId = candidate.id ?? candidate.candidate_id ?? ""
        const token = localStorage.getItem("sage_token")
        const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {}
        const res = await fetch("http://localhost:8000/api/interviews", { headers, signal: controller.signal })
        if (!res.ok) throw new Error("Failed")
        const raw = (await res.json()) as unknown
        const arr: unknown[] =
          Array.isArray(raw) ? raw : Array.isArray((raw as { interviews?: unknown[] } | null)?.interviews) ? (raw as { interviews: unknown[] }).interviews : []

        const mine = candidateId
          ? arr.filter((x) => {
              const r = x && typeof x === "object" ? (x as Record<string, unknown>) : {}
              return String(r.candidate_id ?? "") === candidateId
            })
          : arr
        let demoIds: Set<string> | null = null
        try {
          const raw = localStorage.getItem("sage_demo_interview_ids") || "[]"
          demoIds = new Set((JSON.parse(raw) as unknown[]).filter((x): x is string => typeof x === "string"))
        } catch {
          demoIds = null
        }

        const jobRes = await fetch("http://localhost:8000/api/jobs?all=true", { signal: controller.signal })
        const jobsData = (await jobRes.json().catch(() => [])) as unknown
        const jobsRaw: unknown[] = Array.isArray(jobsData) ? jobsData : []
        const jobsAll = jobsRaw
          .map((x) => (x && typeof x === "object" ? (x as Record<string, unknown>) : null))
          .filter((x): x is Record<string, unknown> => Boolean(x))
        const invalidJobStatuses = new Set(["closed", "deleted", "inactive"])
        const jobById = new Map(jobsAll.map((j) => [String(j.id ?? ""), j]))

        const today = new Date().toISOString().split("T")[0]
        const mapped: ScheduledInterview[] = mine
          .map((x) => (x && typeof x === "object" ? (x as Record<string, unknown>) : {}))
          .map((r) => {
            if (demoIds && demoIds.has(String(r.id ?? ""))) return null
            const jobId = r.job_id ? String(r.job_id) : ""
            const job = jobId ? jobById.get(jobId) : null
            if (jobId) {
              if (!job) return null
              const st = String(job.status ?? "").toLowerCase()
              if (st && (invalidJobStatuses.has(st) || st !== "active")) return null
            }
            const scheduledAt = typeof r.scheduled_at === "string" ? r.scheduled_at : ""
            const createdAt = typeof r.created_at === "string" ? r.created_at : ""
            const when = scheduledAt || createdAt
            const d = when ? new Date(when) : null
            const date = d && !Number.isNaN(d.getTime()) ? d.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" }) : "—"
            const scheduledDate = scheduledAt ? String(scheduledAt).split("T")[0] : ""
            const time = scheduledAt ? "Anytime" : d && !Number.isNaN(d.getTime()) ? d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "—"
            const statusRaw = String(r.status ?? "").toLowerCase()
            const status: ScheduledInterview["status"] = statusRaw.includes("complete")
              ? "Completed"
              : !scheduledDate
                ? "Upcoming"
                : scheduledDate === today
                  ? "Available Today"
                  : today < scheduledDate
                    ? "Upcoming"
                    : "Expired"
            return {
              id: String(r.id ?? ""),
              company: String(job?.company_name ?? r.company ?? "—"),
              role: String(job?.job_role ?? r.job_role ?? r.role ?? "—"),
              status,
              date,
              time,
            }
          })
          .filter((x): x is ScheduledInterview => Boolean(x))
          .filter((i) => i.id && i.role !== "—")

        setFetched(mapped)
      } catch {
        setFetched([])
      } finally {
        setLoading(false)
        window.clearTimeout(timeout)
      }
    })()
    return () => {
      window.clearTimeout(timeout)
      controller.abort()
    }
  }, [items])

  return (
    <div className="w-full">
      <h3 className={["text-sm font-semibold mb-3", isDark ? "text-white" : "text-gray-900"].join(" ")}>
        Scheduled Assessments
      </h3>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Company</TableHead>
            <TableHead>Role</TableHead>
            <TableHead className="text-center">Date</TableHead>
            <TableHead className="text-center">Time</TableHead>
            <TableHead className="text-center">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                Loading interviews…
              </TableCell>
            </TableRow>
          ) : rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                No interviews yet
              </TableCell>
            </TableRow>
          ) : (
            rows.map((interview) => (
              <TableRow key={interview.id} className="hover:bg-muted/40">
                <TableCell className="font-medium">{interview.company}</TableCell>
                <TableCell>{interview.role}</TableCell>
                <TableCell className="text-center tabular-nums">{interview.date}</TableCell>
                <TableCell className="text-center tabular-nums">{interview.time}</TableCell>
                <TableCell className="text-center">
                  <Badge variant="outline" className={badgeClass(interview.status)}>
                    {interview.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell colSpan={4} className="text-right text-sm">
              Total Upcoming
            </TableCell>
            <TableCell className="font-semibold">{upcomingCount} interviews</TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  )
}
