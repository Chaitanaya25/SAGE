import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useTheme } from "@/lib/theme-context"
import { useEffect, useMemo, useState } from "react"

export type ScheduledInterview = {
  id: string
  company: string
  role: string
  status: "Confirmed" | "Pending" | "Completed"
  date: string
  time: string
}

export default function ScheduledInterviews({ items }: { items?: ScheduledInterview[] }) {
  const { theme } = useTheme()
  const isDark = theme === "dark"
  const [loading, setLoading] = useState(false)
  const [fetched, setFetched] = useState<ScheduledInterview[]>([])

  function badgeClass(status: string) {
    if (status === "Confirmed") {
      return isDark
        ? "bg-green-500/15 text-green-300 border-green-500/25"
        : "bg-green-100 text-green-700 border-green-200"
    }
    if (status === "Completed") {
      return isDark
        ? "bg-blue-500/15 text-blue-300 border-blue-500/25"
        : "bg-blue-100 text-blue-700 border-blue-200"
    }
    return isDark
      ? "bg-yellow-500/15 text-yellow-300 border-yellow-500/25"
      : "bg-yellow-100 text-yellow-700 border-yellow-200"
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

        const mapped: ScheduledInterview[] = mine
          .map((x) => (x && typeof x === "object" ? (x as Record<string, unknown>) : {}))
          .map((r) => {
            const scheduledAt = typeof r.scheduled_at === "string" ? r.scheduled_at : ""
            const createdAt = typeof r.created_at === "string" ? r.created_at : ""
            const when = scheduledAt || createdAt
            const d = when ? new Date(when) : null
            const date = d && !Number.isNaN(d.getTime()) ? d.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" }) : "—"
            const time = d && !Number.isNaN(d.getTime()) ? d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "—"
            const statusRaw = String(r.status ?? "").toLowerCase()
            const status: ScheduledInterview["status"] =
              statusRaw.includes("complete") ? "Completed" : statusRaw.includes("confirm") ? "Confirmed" : "Pending"
            return {
              id: String(r.id ?? ""),
              company: String(r.company ?? "—"),
              role: String(r.job_role ?? r.role ?? "—"),
              status,
              date,
              time,
            }
          })
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
            <TableHead>Date</TableHead>
            <TableHead>Time</TableHead>
            <TableHead>Status</TableHead>
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
                <TableCell>{interview.date}</TableCell>
                <TableCell>{interview.time}</TableCell>
                <TableCell>
                  <Badge
                    variant={
                      interview.status === "Confirmed"
                        ? "default"
                        : interview.status === "Completed"
                          ? "secondary"
                          : "outline"
                    }
                    className={badgeClass(interview.status)}
                  >
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
