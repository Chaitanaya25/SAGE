export const JOB_ROLES = [
  "Software Engineer",
  "Data Analyst",
  "Product Manager",
  "UX Designer",
  "DevOps Engineer",
  "ML Engineer",
  "Frontend Developer",
  "Backend Developer",
] as const

export const INTERVIEW_STATUS: Record<string, { label: string; color: string }> = {
  pending: { label: "Pending", color: "bg-gray-100 text-gray-700" },
  in_progress: { label: "In Progress", color: "bg-yellow-100 text-yellow-700" },
  completed: { label: "Completed", color: "bg-green-100 text-green-700" },
  failed: { label: "Failed", color: "bg-red-100 text-red-700" },
  interrupted: { label: "Interrupted", color: "bg-orange-100 text-orange-700" },
  timed_out: { label: "Timed Out", color: "bg-red-100 text-red-700" },
}

export const SCORE_DIMENSIONS = [
  { key: "technical_depth", label: "Technical Depth", weight: 0.35 },
  { key: "communication", label: "Communication", weight: 0.25 },
  { key: "relevance", label: "Relevance", weight: 0.25 },
  { key: "confidence", label: "Confidence", weight: 0.15 },
] as const

export const RECOMMENDATION_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; border: string }
> = {
  HIRE: {
    label: "Recommended: Hire",
    color: "text-green-700",
    bg: "bg-green-50",
    border: "border-l-green-500",
  },
  NO_HIRE: {
    label: "Not Recommended",
    color: "text-red-700",
    bg: "bg-red-50",
    border: "border-l-red-500",
  },
  MAYBE: {
    label: "Further Review Needed",
    color: "text-yellow-700",
    bg: "bg-yellow-50",
    border: "border-l-yellow-500",
  },
}

