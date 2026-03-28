const API_URL = "http://localhost:8000"

function getHeaders(): HeadersInit {
  const h: HeadersInit = { "Content-Type": "application/json" }
  const t = localStorage.getItem("sage_token")
  if (t) h["Authorization"] = "Bearer " + t
  return h
}

export async function uploadResume(file: File, jobRole: string) {
  const fd = new FormData()
  fd.append("file", file)
  fd.append("job_role", jobRole)
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
