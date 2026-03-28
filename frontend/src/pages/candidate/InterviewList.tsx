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
  overall_score: number | null
}

const mockInterviews: Interview[] = [
  { id: "1", candidate_id: "abc", job_role: "Software Engineer", status: "completed", created_at: "2026-03-25T10:30:00Z", overall_score: 7.8 },
  { id: "2", candidate_id: "abc", job_role: "ML Engineer", status: "in_progress", created_at: "2026-03-28T14:00:00Z", overall_score: null },
  { id: "3", candidate_id: "abc", job_role: "Backend Developer", status: "pending", created_at: "2026-03-29T09:00:00Z", overall_score: null },
  { id: "4", candidate_id: "abc", job_role: "Frontend Developer", status: "completed", created_at: "2026-03-20T11:00:00Z", overall_score: 8.2 },
  { id: "5", candidate_id: "abc", job_role: "Data Analyst", status: "interrupted", created_at: "2026-03-22T16:00:00Z", overall_score: null },
]

function StatusBadge({ status }: { status: Interview["status"] }) {
  const map: Record<Interview["status"], { label: string; className: string }> = {
    pending: { label: "Scheduled", className: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800" },
    in_progress: { label: "In Progress", className: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800" },
    completed: { label: "Completed", className: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800" },
    interrupted: { label: "Interrupted", className: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800" },
  }
  const { label, className } = map[status] ?? map.pending
  return (
    <Badge variant="outline" className={["text-xs font-medium px-2 py-0.5", className].join(" ")}>
      {label}
    </Badge>
  )
}

export default function InterviewList() {
  const navigate = useNavigate()
  const { theme } = useTheme()
  const isDark = theme === "dark"

  const [interviews, setInterviews] = useState<Interview[]>([])
  const [loading, setLoading] = useState(true)
  const [sorting, setSorting] = useState<SortingState>([{ id: "created_at", desc: true }])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])

  useEffect(() => {
    async function load() {
      try {
        const raw = await getInterviews() as Interview[]
        const candidate = JSON.parse(localStorage.getItem("sage_candidate") ?? "{}")
        const candidateId = candidate?.id ?? candidate?.candidate_id ?? null
        const filtered = candidateId ? raw.filter((i) => i.candidate_id === candidateId) : raw
        setInterviews(filtered.length > 0 ? filtered : mockInterviews)
      } catch {
        setInterviews(mockInterviews)
      } finally {
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
      cell: ({ getValue }) => <StatusBadge status={getValue() as Interview["status"]} />,
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
      cell: ({ getValue }) => (
        <span className={isDark ? "text-zinc-400" : "text-gray-500"}>
          {new Date(getValue() as string).toLocaleDateString("en-US", {
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
        const { id, candidate_id, job_role, status } = row.original
        if (status === "completed") {
          return (
            <Button
              size="sm"
              variant="outline"
              className={isDark ? "border-zinc-700 text-zinc-200 hover:bg-zinc-800" : ""}
              onClick={() => navigate("/done", { state: { interviewId: id } })}
            >
              <FileText size={14} className="mr-1.5" />
              View Report
            </Button>
          )
        }
        return (
          <Button
            size="sm"
            className={isDark ? "bg-[#7C3AED] hover:bg-[#7C3AED]/90 text-white" : "bg-black text-white hover:bg-black/90"}
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

  // Theme classes
  const pageBg = isDark ? "bg-zinc-950" : "bg-[#FAFAFA]"
  const cardBg = isDark ? "bg-zinc-900 border-zinc-800" : "bg-white border-gray-200"
  const theadColor = isDark ? "text-zinc-400" : "text-gray-500"
  const rowHover = isDark ? "hover:bg-zinc-800/50" : "hover:bg-gray-50"
  const borderColor = isDark ? "border-zinc-800" : "border-gray-100"
  const textColor = isDark ? "text-zinc-50" : "text-[#0A0A0A]"

  return (
    <div className={["min-h-screen relative", pageBg, textColor].join(" ")}>
      <AnimatedBackground variant="particles" />
      <div className="relative z-10">
        <CandidateHeader />

        <main className="max-w-5xl mx-auto pt-24 px-4 pb-16">
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
              className={isDark ? "bg-[#7C3AED] hover:bg-[#7C3AED]/90 text-white" : "bg-black text-white hover:bg-black/90"}
            >
              <Plus size={16} className="mr-1.5" />
              New Interview
            </Button>
          </div>

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
      </div>
    </div>
  )
}
