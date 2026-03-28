import { useMemo, useState } from "react"

import AnimatedBackground from "@/components/AnimatedBackground"
import CandidateHeader from "@/components/CandidateHeader"
import ScheduledInterviews, { type ScheduledInterview } from "@/components/ScheduledInterviews"
import { Calendar20 } from "@/components/ui/calendar-with-time-pressets"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { JOB_ROLES } from "@/lib/constants"
import { useTheme } from "@/lib/theme-context"

export function ScheduleContent() {
  const { theme } = useTheme()
  const isDark = theme === "dark"

  const [scheduledList, setScheduledList] = useState<ScheduledInterview[]>([
    { id: "1", company: "Google", role: "Software Engineer", date: "Mar 29, 2026", time: "10:30 AM", status: "Confirmed" },
    { id: "2", company: "Meta", role: "ML Engineer", date: "Apr 01, 2026", time: "2:00 PM", status: "Pending" },
    { id: "3", company: "Stripe", role: "Backend Developer", date: "Mar 25, 2026", time: "11:00 AM", status: "Completed" },
    { id: "4", company: "Vercel", role: "Frontend Developer", date: "Apr 03, 2026", time: "9:00 AM", status: "Confirmed" },
    { id: "5", company: "Anthropic", role: "AI Research", date: "Apr 05, 2026", time: "3:30 PM", status: "Pending" },
  ])
  const [selectedDate, setSelectedDate] = useState<Date | undefined>()
  const [selectedTime, setSelectedTime] = useState<string>("")
  const [showBookingForm, setShowBookingForm] = useState(false)
  const [bookingRole, setBookingRole] = useState("")
  const [bookingCompany, setBookingCompany] = useState("")
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const selectedText = useMemo(() => {
    if (!selectedDate || !selectedTime) return ""
    const d = selectedDate.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })
    return `${d} at ${selectedTime}`
  }, [selectedDate, selectedTime])

  const cardShell = isDark ? "bg-zinc-900/60 border-zinc-800 text-zinc-50" : "bg-white border-gray-200 text-gray-900"

  function confirmBooking() {
    if (!selectedDate || !selectedTime || !bookingRole || !bookingCompany.trim()) return
    const dateText = selectedDate.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })
    const next: ScheduledInterview = {
      id: String(Date.now()),
      company: bookingCompany.trim(),
      role: bookingRole,
      date: dateText,
      time: selectedTime,
      status: "Confirmed",
    }
    setScheduledList((prev) => [next, ...prev])
    setBookingCompany("")
    setBookingRole("")
    setSelectedDate(undefined)
    setSelectedTime("")
    setShowBookingForm(false)
    setSuccessMessage("Booking confirmed.")
    window.setTimeout(() => setSuccessMessage(null), 2500)
  }

  return (
    <>
      <div className="space-y-2">
        <div className="text-3xl font-semibold">Scheduled Assessments</div>
        <div className="text-sm text-muted-foreground">Manage your upcoming and past interview sessions</div>
      </div>

      <Card className={["mt-8 p-6 backdrop-blur-sm", cardShell].join(" ")}>
        <ScheduledInterviews items={scheduledList} />
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
                  disabled={!bookingRole || !bookingCompany.trim()}
                  onClick={confirmBooking}
                >
                  Confirm Booking
                </Button>
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
