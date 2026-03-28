import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"

import AnimatedBackground from "@/components/AnimatedBackground"
import CandidateHeader from "@/components/CandidateHeader"
import ScheduledInterviews from "@/components/ScheduledInterviews"
import { Calendar20 } from "@/components/ui/calendar-with-time-pressets"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useTheme } from "@/lib/theme-context"

export default function Schedule() {
  const navigate = useNavigate()
  const { theme } = useTheme()
  const isDark = theme === "dark"

  const [booking, setBooking] = useState<{ date: Date | undefined; time: string | null }>({
    date: undefined,
    time: null,
  })

  const bookingText = useMemo(() => {
    const date = booking.date
    const time = booking.time
    if (!date || !time) return "Select a date and time to book your assessment."
    const d = date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })
    return `Your assessment is booked for ${d} at ${time}`
  }, [booking.date, booking.time])

  const cardShell = isDark ? "bg-zinc-900/60 border-zinc-800 text-zinc-50" : "bg-white border-gray-200 text-gray-900"

  return (
    <div className={["min-h-screen relative", isDark ? "bg-black text-zinc-50" : "bg-white text-gray-900"].join(" ")}>
      <AnimatedBackground variant="particles" />
      <div className="relative z-10">
        <CandidateHeader />

        <main className="max-w-4xl mx-auto pt-24 px-4 pb-16">
          <div className="space-y-2">
            <div className="text-3xl font-semibold">Scheduled Assessments</div>
            <div className="text-sm text-muted-foreground">Manage your upcoming and past interview sessions</div>
          </div>

          <Card className={["mt-8 p-6 backdrop-blur-sm", cardShell].join(" ")}>
            <ScheduledInterviews />
            <div className="mt-4 flex justify-end">
              <Button
                className={isDark ? "bg-[#7C3AED] text-white hover:bg-[#7C3AED]/90" : "bg-black text-white hover:bg-black/90 border border-black"}
                onClick={() => navigate("/upload")}
              >
                Book New Assessment
              </Button>
            </div>
          </Card>

          <Card className={["mt-6 p-6 backdrop-blur-sm", cardShell].join(" ")}>
            <div className="text-sm font-medium">Book a new slot</div>
            <div className="mt-3 rounded-xl border border-border">
              <Calendar20 value={booking} onChange={setBooking} />
              <div className="px-4 pb-4 text-xs text-muted-foreground">{bookingText}</div>
            </div>
          </Card>
        </main>
      </div>
    </div>
  )
}

