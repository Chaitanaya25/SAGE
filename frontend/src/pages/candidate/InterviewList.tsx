import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { ArrowUpDown, ChevronUp, ChevronDown, FileText, Mic, Plus, Search } from "lucide-react"

import AnimatedBackground from "@/components/AnimatedBackground"
import CandidateHeader from "@/components/CandidateHeader"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { getInterviews } from "@/lib/api"
import { useTheme } from "@/lib/theme-context"

interface Interview {
  id: string
  candidate_id: string
  job_role: string
  status: "pending" | "in_progress" | "completed" | "interrupted"
  created_at: string
  scheduled_at?: string | null
  overall_score: number | null
  job_id?: string | null
}

function getInterviewDayStatus(interview: Interview) {
  if (interview.status === "in_progress") return "available" as const
  if (!interview.scheduled_at) return "available" as const
  const scheduledDate = String(interview.scheduled_at).split("T")[0]
  const today = new Date().toISOString().split("T")[0]
  if (today === scheduledDate) return "available" as const
  if (today < scheduledDate) return "upcoming" as const
  return "expired" as const
}

function StatusBadge({ interview }: { interview: Interview }) {
  const { theme } = useTheme()
  const isDark = theme === "dark"
  const status = interview.status
  const dayStatus = getInterviewDayStatus(interview)
  const label =
    status === "completed"
      ? "Completed"
      : status === "in_progress"
        ? "In Progress"
        : !interview.scheduled_at
          ? "Scheduled"
          : dayStatus === "available"
            ? "Available Today"
            : dayStatus === "upcoming"
              ? "Upcoming"
              : "Expired"
  const className = isDark ? "border-white text-white bg-transparent" : "border-black text-black bg-transparent"
  return (
    <Badge variant="outline" className={["text-xs font-medium px-2 py-0.5", className].join(" ")}>
      {label}
    </Badge>
  )
}

function InterviewListInner({ compact = false }: { compact?: boolean }) {
  const navigate = useNavigate()
  const { theme } = useTheme()
  const isDark = theme === "dark"

  const [interviews, setInterviews] = useState<Interview[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sorting, setSorting] = useState<SortingState>([{ id: "created_at", desc: true }])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])

  useEffect(() => {
    async function load() {
      const controller = new AbortController()
      const timeoutId = window.setTimeout(() => controller.abort(), 10000)
      try {
        setLoading(true)
        setError(null)
        const raw = (await getInterviews(controller.signal)) as unknown
        const arrRaw: unknown[] = Array.isArray(raw)
          ? (raw as unknown[])
          : Array.isArray((raw as { interviews?: unknown[] } | null)?.interviews)
            ? (((raw as { interviews?: unknown[] }).interviews ?? []) as unknown[])
            : []
        const arr: Interview[] = arrRaw
          .map((x) => (x && typeof x === "object" ? (x as Record<string, unknown>) : {}))
          .map((r) => ({
            id: String(r.id ?? ""),
            candidate_id: String(r.candidate_id ?? ""),
            job_role: String(r.job_role ?? ""),
            status: String(r.status ?? "pending") as Interview["status"],
            created_at: String(r.created_at ?? ""),
            scheduled_at: (typeof r.scheduled_at === "string" ? r.scheduled_at : null) as string | null,
            overall_score: (typeof r.overall_score === "number" ? r.overall_score : null) as number | null,
            job_id: (r.job_id ? String(r.job_id) : null) as string | null,
          }))
          .filter((i) => i.id && i.candidate_id && i.job_role)
        const candidate = JSON.parse(localStorage.getItem("sage_candidate") ?? "{}") as { id?: string; candidate_id?: string }
        const candidateId = candidate?.id ?? candidate?.candidate_id ?? localStorage.getItem("sage_candidate_id") ?? null
        let mine = candidateId ? arr.filter((i) => i.candidate_id === candidateId) : arr
        try {
          const raw = localStorage.getItem("sage_demo_interview_ids") || "[]"
          const demoIds = new Set((JSON.parse(raw) as unknown[]).filter((x): x is string => typeof x === "string"))
          mine = mine.filter((iv) => !demoIds.has(iv.id))
        } catch {
          // ignore
        }

        const jobRes = await fetch("http://localhost:8000/api/jobs?all=true", { signal: controller.signal })
        const jobsData = (await jobRes.json().catch(() => [])) as unknown
        const jobsRaw: unknown[] = Array.isArray(jobsData) ? jobsData : []
        const jobsAll = jobsRaw
          .map((x) => (x && typeof x === "object" ? (x as Record<string, unknown>) : null))
          .filter((x): x is Record<string, unknown> => Boolean(x))
        const invalidJobStatuses = new Set(["closed", "deleted", "inactive"])
        const jobById = new Map(jobsAll.map((j) => [String(j.id ?? ""), j]))

        const valid = mine.filter((iv) => {
          if (!iv.job_id) return true
          const job = jobById.get(String(iv.job_id))
          if (!job) return false
          const st = String(job.status ?? "").toLowerCase()
          if (!st) return true
          if (invalidJobStatuses.has(st)) return false
          return st === "active"
        })

        setInterviews(valid)
      } catch (e) {
        setInterviews([])
        setError(e instanceof Error ? e.message : "Failed to load interviews")
      } finally {
        window.clearTimeout(timeoutId)
        setLoading(false)
      }
    }
    load()
  }, [])

  const columns = useMemo<ColumnDef<Interview>[]>(() => [
    {
      accessorKey: "job_role",
      header: ({ column }) => (
        <button
          type="button"
          className="flex items-center gap-1 font-medium hover:opacity-70 transition-opacity"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Company / Role
          {column.getIsSorted() === "asc" ? (
            <ChevronUp size={14} />
          ) : column.getIsSorted() === "desc" ? (
            <ChevronDown size={14} />
          ) : (
            <ArrowUpDown size={14} className="opacity-40" />
          )}
        </button>
      ),
      cell: ({ getValue }) => (
        <span className="font-semibold">{getValue() as string}</span>
      ),
    },
    {
      accessorKey: "status",
      header: ({ column }) => (
        <button
          type="button"
          className="flex items-center gap-1 font-medium hover:opacity-70 transition-opacity"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Status
          {column.getIsSorted() === "asc" ? (
            <ChevronUp size={14} />
          ) : column.getIsSorted() === "desc" ? (
            <ChevronDown size={14} />
          ) : (
            <ArrowUpDown size={14} className="opacity-40" />
          )}
        </button>
      ),
      cell: ({ row }) => <StatusBadge interview={row.original} />,
    },
    {
      accessorKey: "created_at",
      header: ({ column }) => (
        <button
          type="button"
          className="flex items-center gap-1 font-medium hover:opacity-70 transition-opacity"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Date
          {column.getIsSorted() === "asc" ? (
            <ChevronUp size={14} />
          ) : column.getIsSorted() === "desc" ? (
            <ChevronDown size={14} />
          ) : (
            <ArrowUpDown size={14} className="opacity-40" />
          )}
        </button>
      ),
      cell: ({ getValue, row }) => (
        <span className={isDark ? "text-zinc-400" : "text-gray-500"}>
          {new Date((row.original.scheduled_at ?? (getValue() as string)) as string).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          })}
        </span>
      ),
    },
    {
      accessorKey: "overall_score",
      header: ({ column }) => (
        <button
          type="button"
          className="flex items-center gap-1 font-medium hover:opacity-70 transition-opacity"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Score
          {column.getIsSorted() === "asc" ? (
            <ChevronUp size={14} />
          ) : column.getIsSorted() === "desc" ? (
            <ChevronDown size={14} />
          ) : (
            <ArrowUpDown size={14} className="opacity-40" />
          )}
        </button>
      ),
      cell: ({ getValue }) => {
        const v = getValue() as number | null
        return v !== null && v !== undefined ? (
          <span className="font-semibold tabular-nums">{v.toFixed(1)}<span className={["text-xs ml-0.5", isDark ? "text-zinc-500" : "text-gray-400"].join(" ")}>/10</span></span>
        ) : (
          <span className={isDark ? "text-zinc-600" : "text-gray-400"}>—</span>
        )
      },
    },
    {
      id: "actions",
      header: () => <span className="font-medium">Action</span>,
      cell: ({ row }) => {
        const { id, candidate_id, job_role, status, scheduled_at } = row.original
        if (status === "completed") {
          return (
            <Button
              size="sm"
              variant="outline"
              className={isDark ? "bg-white text-black hover:bg-white/90 border border-white" : "bg-black text-white hover:bg-black/90 border border-black"}
              onClick={() => navigate("/dashboard", { state: { tab: "reports", reportId: id } })}
            >
              <FileText size={14} className="mr-1.5" />
              View Report
            </Button>
          )
        }
        const dayStatus = getInterviewDayStatus(row.original)
        return dayStatus === "available" ? (
          <Button
            size="sm"
            className={isDark ? "bg-white text-black hover:bg-white/90 border border-white" : "bg-black text-white hover:bg-black/90 border border-black"}
            onClick={() => navigate("/interview", { state: { candidateId: candidate_id, interviewId: id, jobRole: job_role } })}
          >
            <Mic size={14} className="mr-1.5" />
            Start Interview
          </Button>
        ) : scheduled_at ? (
          <span className="text-sm text-muted-foreground">
            {dayStatus === "upcoming" ? "Upcoming" : "Expired"}:{" "}
            {new Date(scheduled_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </span>
        ) : (
          <Button
            size="sm"
            className={isDark ? "bg-white text-black hover:bg-white/90 border border-white" : "bg-black text-white hover:bg-black/90 border border-black"}
            onClick={() => navigate("/interview", { state: { candidateId: candidate_id, interviewId: id, jobRole: job_role } })}
          >
            <Mic size={14} className="mr-1.5" />
            Start Interview
          </Button>
        )
      },
    },
  ], [navigate, isDark])

  const table = useReactTable({
    data: interviews,
    columns,
    state: { sorting, columnFilters },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  })

  const searchValue = (table.getColumn("job_role")?.getFilterValue() as string) ?? ""

  const cardBg = isDark ? "bg-zinc-900 border-zinc-800" : "bg-white border-gray-200"
  const theadColor = isDark ? "text-zinc-400" : "text-gray-500"
  const rowHover = isDark ? "hover:bg-zinc-800/50" : "hover:bg-gray-50"
  const borderColor = isDark ? "border-zinc-800" : "border-gray-100"

  return (
    <main className={["max-w-5xl mx-auto px-4 pb-16", compact ? "pt-0" : "pt-24"].join(" ")}>
          {/* Page header */}
          <div className="flex items-start justify-between mb-8">
            <div>
              <h1 className="text-3xl font-semibold">My Interviews</h1>
              <p className={["mt-1 text-sm", isDark ? "text-zinc-400" : "text-gray-500"].join(" ")}>
                View scheduled, ongoing, and completed assessments
              </p>
            </div>
            <Button
              onClick={() => navigate("/upload")}
              className={isDark ? "bg-white text-black hover:bg-white/90 border border-white" : "bg-black text-white hover:bg-black/90 border border-black"}
            >
              <Plus size={16} className="mr-1.5" />
              New Interview
            </Button>
          </div>
          {error ? <div className="mb-4 text-sm text-red-500">{error}</div> : null}

          {/* Search */}
          <div className="relative mb-4">
            <Search size={15} className={["absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none", isDark ? "text-zinc-500" : "text-gray-400"].join(" ")} />
            <Input
              placeholder="Search by role..."
              value={searchValue}
              onChange={(e) => table.getColumn("job_role")?.setFilterValue(e.target.value)}
              className={[
                "pl-9",
                isDark
                  ? "bg-zinc-900 border-zinc-700 text-zinc-50 placeholder:text-zinc-500 focus-visible:ring-[#7C3AED]"
                  : "bg-white border-gray-200 focus-visible:ring-blue-500",
              ].join(" ")}
            />
          </div>

          {/* Table */}
          <Card className={["overflow-hidden", cardBg].join(" ")}>
            {loading ? (
              <div className="flex items-center justify-center h-48">
                <div className={["text-sm", isDark ? "text-zinc-400" : "text-gray-500"].join(" ")}>Loading interviews...</div>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  {table.getHeaderGroups().map((hg) => (
                    <TableRow key={hg.id} className={["border-b", borderColor].join(" ")}>
                      {hg.headers.map((header) => (
                        <TableHead key={header.id} className={["text-xs uppercase tracking-wide", theadColor].join(" ")}>
                          {flexRender(header.column.columnDef.header, header.getContext())}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {table.getRowModel().rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={columns.length} className="h-48 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <p className={isDark ? "text-zinc-400" : "text-gray-500"}>
                            {searchValue
                              ? `No interviews match "${searchValue}"`
                              : "No interviews yet. Upload your resume to get started."}
                          </p>
                          {!searchValue && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => navigate("/upload")}
                              className={isDark ? "border-zinc-700 text-zinc-200 hover:bg-zinc-800" : ""}
                            >
                              Upload Resume
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    table.getRowModel().rows.map((row) => (
                      <TableRow
                        key={row.id}
                        className={["border-b transition-colors cursor-default", borderColor, rowHover].join(" ")}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id}>
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </Card>

          <p className={["mt-3 text-xs", isDark ? "text-zinc-600" : "text-gray-400"].join(" ")}>
            {table.getRowModel().rows.length} of {interviews.length} interview{interviews.length !== 1 ? "s" : ""}
          </p>
        </main>
  )
}

export function InterviewListContent({ compact = false }: { compact?: boolean }) {
  return <InterviewListInner compact={compact} />
}

export default function InterviewList() {
  const { theme } = useTheme()
  const isDark = theme === "dark"
  const pageBg = isDark ? "bg-zinc-950 text-zinc-50" : "bg-[#FAFAFA] text-[#0A0A0A]"

  return (
    <div className={["min-h-screen relative", pageBg].join(" ")}>
      <AnimatedBackground variant="particles" />
      <div className="relative z-10">
        <CandidateHeader />
        <InterviewListContent />
      </div>
    </div>
  )
}
