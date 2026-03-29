const API_URL = "http://localhost:8000"

function getHeaders(): HeadersInit {
  const h: HeadersInit = { "Content-Type": "application/json" }
  const t = localStorage.getItem("sage_token")
  if (t) h["Authorization"] = "Bearer " + t
  return h
}

export async function uploadResume(file: File, jobRole: string, candidateId?: string, jobId?: string) {
  const fd = new FormData()
  fd.append("file", file)
  fd.append("job_role", jobRole)
  if (candidateId) fd.append("candidate_id", candidateId)
  if (jobId) fd.append("job_id", jobId)
  const r = await fetch(API_URL + "/api/upload-resume", { method: "POST", body: fd })
  if (!r.ok) throw new Error("Upload failed")
  return r.json()
}

export async function getQuestions(id: string) {
  const r = await fetch(API_URL + "/api/questions/" + id, { headers: getHeaders() })
  if (!r.ok) throw new Error("Failed")
  return r.json()
}

export async function getReport(id: string) {
  const r = await fetch(API_URL + "/api/report/" + id, { headers: getHeaders() })
  if (!r.ok) throw new Error("Not found")
  return r.json()
}

export async function getCandidates() {
  const r = await fetch(API_URL + "/api/candidates", { headers: getHeaders() })
  if (!r.ok) throw new Error("Failed")
  return r.json()
}

export async function getInterviews(signal?: AbortSignal) {
  const r = await fetch(API_URL + "/api/interviews", { headers: getHeaders(), signal })
  if (!r.ok) throw new Error("Failed")
  return r.json()
}

export async function scheduleInterview(payload: {
  candidateId: string
  jobRole: string
  scheduledAt: string
  company?: string
}) {
  const r = await fetch(API_URL + "/api/interviews/schedule", {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({
      candidate_id: payload.candidateId,
      job_role: payload.jobRole,
      scheduled_at: payload.scheduledAt,
      company: payload.company ?? "",
    }),
  })
  if (!r.ok) throw new Error("Failed")
  return r.json()
}

export type JobPosting = {
  id: string
  company_name: string
  company_email: string
  job_title: string
  job_role: string
  job_description: string
  requirements?: string | null
  salary_range?: string | null
  location?: string | null
  deadline?: string | null
  max_candidates?: number | null
  status?: string | null
  created_at?: string | null
  updated_at?: string | null
}

export async function getJobs(payload?: { all?: boolean; signal?: AbortSignal }) {
  const qs = payload?.all ? "?all=true" : ""
  const r = await fetch(API_URL + "/api/jobs" + qs, { headers: getHeaders(), signal: payload?.signal })
  if (!r.ok) throw new Error("Failed")
  return r.json()
}

export async function createJobPosting(data: Omit<JobPosting, "id" | "created_at" | "updated_at">) {
  const r = await fetch(API_URL + "/api/jobs", {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(data),
  })
  if (!r.ok) throw new Error("Failed")
  return r.json()
}

export async function updateJobPosting(jobId: string, data: Partial<JobPosting>) {
  const r = await fetch(API_URL + "/api/jobs/" + jobId, {
    method: "PUT",
    headers: getHeaders(),
    body: JSON.stringify(data),
  })
  if (!r.ok) throw new Error("Failed")
  return r.json()
}

export async function deleteJobPosting(jobId: string) {
  const r = await fetch(API_URL + "/api/jobs/" + jobId, {
    method: "DELETE",
    headers: getHeaders(),
  })
  if (!r.ok) throw new Error("Failed")
  return r.json()
}

export async function getInterview(id: string) {
  const r = await fetch(API_URL + "/api/interview/" + id, { headers: getHeaders() })
  if (!r.ok) throw new Error("Failed")
  return r.json()
}

export async function hrLogin(email: string, password: string) {
  const r = await fetch(API_URL + "/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  })
  if (!r.ok) throw new Error("Invalid credentials")
  return r.json()
}

export async function candidateLogin(email: string, name: string) {
  const r = await fetch(API_URL + "/api/auth/candidate-login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, name }),
  })
  if (!r.ok) throw new Error("Login failed")
  return r.json()
}

export const WS_URL = "ws://localhost:8000/ws/interview"
