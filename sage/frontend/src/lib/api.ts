const API_URL = 'http://localhost:8000'

function getHeaders(): HeadersInit {
  const headers: HeadersInit = { 'Content-Type': 'application/json' }
  const token = localStorage.getItem('sage_token')
  if (token) headers['Authorization'] = 'Bearer ' + token
  return headers
}

export async function uploadResume(file: File, jobRole: string) {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('job_role', jobRole)
  const res = await fetch(API_URL + '/api/upload-resume', {
    method: 'POST',
    body: formData,
  })
  if (!res.ok) throw new Error('Upload failed')
  return res.json()
}

export async function getQuestions(interviewId: string) {
  const res = await fetch(API_URL + '/api/questions/' + interviewId, {
    headers: getHeaders(),
  })
  if (!res.ok) throw new Error('Failed to fetch questions')
  return res.json()
}

export async function getReport(interviewId: string) {
  const res = await fetch(API_URL + '/api/report/' + interviewId, {
    headers: getHeaders(),
  })
  if (!res.ok) throw new Error('Report not found')
  return res.json()
}

export async function getCandidates() {
  const res = await fetch(API_URL + '/api/candidates', { headers: getHeaders() })
  if (!res.ok) throw new Error('Failed to fetch candidates')
  return res.json()
}

export async function getInterviews() {
  const res = await fetch(API_URL + '/api/interviews', { headers: getHeaders() })
  if (!res.ok) throw new Error('Failed to fetch interviews')
  return res.json()
}

export async function getInterview(interviewId: string) {
  const res = await fetch(API_URL + '/api/interview/' + interviewId, {
    headers: getHeaders(),
  })
  if (!res.ok) throw new Error('Failed to fetch interview')
  return res.json()
}

export async function hrLogin(email: string, password: string) {
  const res = await fetch(API_URL + '/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  if (!res.ok) throw new Error('Invalid credentials')
  return res.json()
}

export async function candidateLogin(email: string, name: string) {
  const res = await fetch(API_URL + '/api/auth/candidate-login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, name }),
  })
  if (!res.ok) throw new Error('Login failed')
  return res.json()
}

export const WS_URL = 'ws://localhost:8000/ws/interview'
