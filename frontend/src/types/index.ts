export interface Candidate {
  id: string
  name: string
  email: string
  phone: string | null
  resume_url: string | null
  resume_parsed: Record<string, unknown>
  created_at: string
}

export interface Interview {
  id: string
  candidate_id: string
  job_role: string
  status: "pending" | "in_progress" | "completed" | "failed" | "interrupted" | "timed_out"
  created_at: string
  completed_at: string | null
  overall_score?: number | null
  scheduled_at?: string | null
  job_id?: string | null
  company?: string | null
}

export interface Question {
  id: string
  interview_id: string
  question_text: string
  question_order: number
  category: "technical" | "behavioral" | "role_fit" | "curveball"
}

export interface ScoreBreakdown {
  technical_depth: number
  communication: number
  relevance: number
  confidence: number
  feedback?: string
  red_flags?: string
}

export interface Report {
  id: string
  interview_id: string
  overall_score: number
  scores_json: Record<string, unknown>
  strengths: string[]
  weaknesses: string[]
  recommendation: "HIRE" | "NO_HIRE" | "MAYBE"
  summary: string
  suggested_follow_up: string[]
  created_at: string
}

export interface WebSocketMessage {
  type: "greeting" | "question" | "transcript" | "status" | "complete" | "error" | "warning"
  text?: string
  message?: string
  index?: number
  total?: number
  category?: string
}

export interface TranscriptEntry {
  speaker: "ai" | "candidate"
  text: string
  timestamp: Date
}
