import { useEffect, useMemo, useState } from "react"

import AnimatedBackground from "@/components/AnimatedBackground"
import CandidateHeader from "@/components/CandidateHeader"
import ScheduledInterviews, { type ScheduledInterview } from "@/components/ScheduledInterviews"
import { Calendar20 } from "@/components/ui/calendar-with-time-pressets"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { scheduleInterview } from "@/lib/api"
import { JOB_ROLES } from "@/lib/constants"
import { useTheme } from "@/lib/theme-context"

export function ScheduleContent() {
  const { theme } = useTheme()
  const isDark = theme === "dark"

  const [scheduledList, setScheduledList] = useState<ScheduledInterview[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | undefined>()
  const [selectedTime, setSelectedTime] = useState<string>("")
  const [showBookingForm, setShowBookingForm] = useState(false)
  const [bookingRole, setBookingRole] = useState("")
  const [bookingCompany, setBookingCompany] = useState("")
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  function toScheduledAtISO(date: Date, time: string) {
    const m = time.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i)
    if (!m) throw new Error("Invalid time")
    let h = Number(m[1])
    const min = Number(m[2])
    const meridiem = m[3].toUpperCase()
    if (meridiem === "AM" && h === 12) h = 0
    if (meridiem === "PM" && h !== 12) h += 12
    const d = new Date(date)
    d.setHours(h, min, 0, 0)
    return d.toISOString()
  }

  async function loadScheduled(signal?: AbortSignal) {
    const candidate = JSON.parse(localStorage.getItem("sage_candidate") || "{}") as { id?: string; candidate_id?: string }
    const candidateId = candidate.id ?? candidate.candidate_id ?? ""
    const token = localStorage.getItem("sage_token")
    const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {}
    const res = await fetch("http://localhost:8000/api/interviews", { headers, signal })
    if (!res.ok) throw new Error("Failed")
    const raw = (await res.json()) as unknown
    const arr: unknown[] =
      Array.isArray(raw) ? raw : Array.isArray((raw as { interviews?: unknown[] } | null)?.interviews) ? (raw as { interviews: unknown[] }).interviews : []
    let mine = candidateId
      ? arr.filter((x) => {
          const r = x && typeof x === "object" ? (x as Record<string, unknown>) : {}
          return String(r.candidate_id ?? "") === candidateId
        })
      : arr

    try {
      const rawIds = localStorage.getItem("sage_demo_interview_ids") || "[]"
      const demoIds = new Set((JSON.parse(rawIds) as unknown[]).filter((x): x is string => typeof x === "string"))
      mine = mine.filter((x) => {
        const r = x && typeof x === "object" ? (x as Record<string, unknown>) : {}
        return !demoIds.has(String(r.id ?? ""))
      })
    } catch {
      // ignore
    }

    const jobRes = await fetch("http://localhost:8000/api/jobs?all=true", { headers, signal })
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
          date,
          time,
          status,
        }
      })
      .filter((x): x is ScheduledInterview => Boolean(x))
      .filter((i) => i.id && i.role !== "—")
      .sort((a, b) => (a.date < b.date ? 1 : -1))
    setScheduledList(mapped)
  }

  useEffect(() => {
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 10000)
    ;(async () => {
      try {
        setLoading(true)
        await loadScheduled(controller.signal)
      } catch {
        setScheduledList([])
      } finally {
        setLoading(false)
        window.clearTimeout(timeout)
      }
    })()
    return () => {
      window.clearTimeout(timeout)
      controller.abort()
    }
  }, [])

  const selectedText = useMemo(() => {
    if (!selectedDate || !selectedTime) return ""
    const d = selectedDate.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })
    return `${d} at ${selectedTime}`
  }, [selectedDate, selectedTime])

  const cardShell = isDark ? "bg-zinc-900/60 border-zinc-800 text-zinc-50" : "bg-white border-gray-200 text-gray-900"

  async function confirmBooking() {
    if (!selectedDate || !selectedTime || !bookingRole || !bookingCompany.trim()) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      const candidate = JSON.parse(localStorage.getItem("sage_candidate") || "{}") as { id?: string; candidate_id?: string }
      const candidateId = candidate.id ?? candidate.candidate_id ?? localStorage.getItem("sage_candidate_id") ?? ""
      if (!candidateId) throw new Error("Missing candidate id")
      const scheduledAt = toScheduledAtISO(selectedDate, selectedTime)
      await scheduleInterview({
        candidateId,
        jobRole: bookingRole,
        scheduledAt,
        company: bookingCompany.trim(),
      })
      setBookingCompany("")
      setBookingRole("")
      setSelectedDate(undefined)
      setSelectedTime("")
      setShowBookingForm(false)
      setSuccessMessage("Booking confirmed.")
      window.setTimeout(() => setSuccessMessage(null), 2500)
      await loadScheduled()
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Failed to schedule")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <div className="space-y-2">
        <div className="text-3xl font-semibold">Scheduled Assessments</div>
        <div className="text-sm text-muted-foreground">Manage your upcoming and past interview sessions</div>
      </div>

      <Card className={["mt-8 p-6 backdrop-blur-sm", cardShell].join(" ")}>
        <ScheduledInterviews items={scheduledList} />
        {loading ? <div className="mt-3 text-sm text-muted-foreground">Loading interviews…</div> : null}
        <div className="mt-4 flex justify-end">
          <Button
            className={isDark ? "bg-[#7C3AED] text-white hover:bg-[#7C3AED]/90" : "bg-black text-white hover:bg-black/90 border border-black"}
            onClick={() => document.getElementById("book-calendar")?.scrollIntoView({ behavior: "smooth" })}
          >
            Book New Assessment
          </Button>
        </div>
      </Card>

      <div id="book-calendar" className="mt-6">
        <div className="flex justify-center">
          <Card className={["w-full max-w-md p-6 backdrop-blur-sm", cardShell].join(" ")}>
            <div className="text-sm font-medium">Book a new slot</div>
            <div className="mt-3 rounded-xl border border-border">
              <Calendar20
                value={{ date: selectedDate, time: selectedTime ? selectedTime : null }}
                onChange={(next) => {
                  setSelectedDate(next.date)
                  setSelectedTime(next.time ?? "")
                  setShowBookingForm(Boolean(next.date && next.time))
                  setSuccessMessage(null)
                }}
              />
            </div>

            {showBookingForm && selectedDate && selectedTime ? (
              <div className="mt-4 space-y-4">
                <div className="text-sm">
                  <span className="text-muted-foreground">Selected:</span> {selectedText}
                </div>

                <div className="space-y-2">
                  <Label>Job Role</Label>
                  <select
                    value={bookingRole}
                    onChange={(e) => setBookingRole(e.target.value)}
                    className={[
                      "h-10 w-full rounded-lg border px-3 text-sm outline-none transition-colors",
                      isDark
                        ? "bg-zinc-950 border-zinc-800 text-white focus:border-[#7C3AED]"
                        : "bg-white border-gray-200 text-gray-900 focus:border-[#2563EB]",
                    ].join(" ")}
                  >
                    <option value="">Select role…</option>
                    {JOB_ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label>Company</Label>
                  <Input value={bookingCompany} onChange={(e) => setBookingCompany(e.target.value)} placeholder="Company name" />
                </div>

                <Button
                  className={isDark ? "bg-[#7C3AED] text-white hover:bg-[#7C3AED]/90" : "bg-black text-white hover:bg-black/90 border border-black"}
                  disabled={submitting || !bookingRole || !bookingCompany.trim()}
                  onClick={confirmBooking}
                >
                  {submitting ? "Scheduling..." : "Confirm Booking"}
                </Button>
                {submitError ? <div className="text-sm text-red-500">{submitError}</div> : null}
              </div>
            ) : null}

            {successMessage ? <div className="mt-4 text-sm text-green-500">{successMessage}</div> : null}
          </Card>
        </div>
      </div>
    </>
  )
}

export default function Schedule() {
  const { theme } = useTheme()
  const isDark = theme === "dark"

  return (
    <div className={["min-h-screen relative", isDark ? "bg-black text-zinc-50" : "bg-white text-gray-900"].join(" ")}>
      <AnimatedBackground variant="particles" />
      <div className="relative z-10">
        <CandidateHeader />
        <main className="max-w-4xl mx-auto pt-24 px-4 pb-16">
          <ScheduleContent />
        </main>
      </div>
    </div>
  )
}
