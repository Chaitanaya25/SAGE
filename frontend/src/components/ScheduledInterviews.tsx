import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useTheme } from "@/lib/theme-context"

const scheduledInterviews = [
  {
    id: "1",
    company: "Google",
    role: "Software Engineer",
    status: "Confirmed",
    date: "Mar 29, 2026",
    time: "10:30 AM",
  },
  {
    id: "2",
    company: "Meta",
    role: "ML Engineer",
    status: "Pending",
    date: "Apr 01, 2026",
    time: "2:00 PM",
  },
  {
    id: "3",
    company: "Stripe",
    role: "Backend Developer",
    status: "Completed",
    date: "Mar 25, 2026",
    time: "11:00 AM",
  },
  {
    id: "4",
    company: "Vercel",
    role: "Frontend Developer",
    status: "Confirmed",
    date: "Apr 03, 2026",
    time: "9:00 AM",
  },
  {
    id: "5",
    company: "Anthropic",
    role: "AI Research",
    status: "Pending",
    date: "Apr 05, 2026",
    time: "3:30 PM",
  },
]

export default function ScheduledInterviews() {
  const { theme } = useTheme()
  const isDark = theme === "dark"

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

  const upcomingCount = scheduledInterviews.filter((i) => i.status !== "Completed").length

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
          {scheduledInterviews.map((interview) => (
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
          ))}
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

