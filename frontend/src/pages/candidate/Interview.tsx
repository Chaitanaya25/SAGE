import { useEffect, useMemo, useRef, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { CheckCircle, CheckSquare, Mic, Square, Timer, Upload, Volume2, X } from "lucide-react"

import Loader from "@/components/Loader"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { JOB_ROLES } from "@/lib/constants"
import { WS_URL } from "@/lib/api"
import { useTheme } from "@/lib/theme-context"
import type { WebSocketMessage } from "@/types"

type InterviewUiState = "connecting" | "idle" | "recording" | "processing" | "ai_speaking" | "complete"
type Phase = "pre" | "live"
type Step = "upload" | "schedule" | "ready"

const CHECKLIST = [
  "Microphone access required",
  "Quiet environment recommended",
  "Answer in English",
  "Speak clearly and naturally",
]

function unlockAudio() {
  try {
    const ctx = new AudioContext()
    const buf = ctx.createBuffer(1, 1, 22050)
    const src = ctx.createBufferSource()
    src.buffer = buf
    src.connect(ctx.destination)
    src.start(0)
  } catch { /* best-effort */ }
}

export default function Interview() {
  const location = useLocation() as unknown as {
    state?: {
      candidateId?: string
      interviewId?: string
      jobRole?: string
      jobId?: string
      jobTitle?: string
      companyName?: string
      deadline?: string | null
      scheduleMode?: boolean
    }
  }
  const navigate = useNavigate()
  const { theme } = useTheme()
  const isDark = theme === "dark"

  const navCandidateId = location.state?.candidateId ?? ""
  const navInterviewId = location.state?.interviewId ?? ""
  const navJobRole     = location.state?.jobRole     ?? ""
  const navJobId       = location.state?.jobId       ?? ""
  const scheduleMode   = location.state?.scheduleMode ?? false
  const deadline       = location.state?.deadline ?? null
  const deadlineDate   = deadline ? String(deadline).split("T")[0] : null
  const companyName    = location.state?.companyName ?? ""
  const jobTitle       = location.state?.jobTitle ?? ""

  // ── Pre-interview state ───────────────────────────────────────────────────
  const [step,        setStep]        = useState<Step>(navCandidateId ? "ready" : "upload")
  const [candidateId, setCandidateId] = useState(navCandidateId)
  const [interviewId, setInterviewId] = useState(navInterviewId)
  const [jobRole,     setJobRole]     = useState(navJobRole)
  const [file,        setFile]        = useState<File | null>(null)
  const [uploading,   setUploading]   = useState(false)
  const [uploadError, setUploadError] = useState("")
  const [dragOver,    setDragOver]    = useState(false)
  const [micError,    setMicError]    = useState<string | null>(null)
  const [scheduleDate, setScheduleDate] = useState("")
  const [scheduleTime, setScheduleTime] = useState("")
  const [scheduling, setScheduling] = useState(false)
  const [scheduleError, setScheduleError] = useState("")

  // ── Live interview state ──────────────────────────────────────────────────
  const [phase,               setPhase]               = useState<Phase>("pre")
  const [uiState,             setUiState]             = useState<InterviewUiState>("connecting")
  const [qIndex,              setQIndex]              = useState(0)
  const [qTotal,              setQTotal]              = useState(8)
  const [elapsed,             setElapsed]             = useState(0)
  const [currentQuestionText, setCurrentQuestionText] = useState("")

  const wsRef            = useRef<WebSocket | null>(null)
  const audioRef         = useRef<HTMLAudioElement | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const mediaStreamRef   = useRef<MediaStream | null>(null)
  const chunksRef        = useRef<BlobPart[]>([])
  const audioFallbackTimerRef  = useRef<number | null>(null)
  const lastSpokenTypeRef = useRef<"greeting" | "question" | null>(null)
  const shouldAutoListenRef = useRef(false)

  // Refs so WS closure always sees latest values without re-subscribing
  const phaseRef           = useRef(phase)
  phaseRef.current         = phase
  const uiStateRef         = useRef(uiState)
  uiStateRef.current       = uiState
  // Populated after startRecording is defined below
  const startRecordingRef  = useRef<() => Promise<void>>(async () => {})

  const timerLabel = useMemo(() => {
    const m = Math.floor(elapsed / 60)
    const s = elapsed % 60
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
  }, [elapsed])

  // ── Timer ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== "live") return
    const id = setInterval(() => setElapsed((e) => e + 1), 1000)
    return () => clearInterval(id)
  }, [phase])

  // ── WebSocket — only when live ────────────────────────────────────────────
  useEffect(() => {
    if (phase !== "live") return

    if (!candidateId) {
      console.warn("[SAGE] No candidateId — returning to upload step")
      setPhase("pre")
      setStep("upload")
      return
    }

    console.log(
      "Live phase started. WS readyState:",
      wsRef.current?.readyState,
      "candidateId:",
      candidateId
    )

    const wsUrl = `${WS_URL}/${candidateId}`
    console.log("[SAGE] Connecting WebSocket:", wsUrl)
    const ws = new WebSocket(wsUrl)
    ws.binaryType = "arraybuffer"
    wsRef.current = ws

    ws.onopen = () => {
      console.log("[SAGE] WS open")
      setUiState("idle")
    }

    ws.onmessage = async (event) => {
      if (typeof event.data === "string") {
        console.log("[SAGE] WS text:", event.data.slice(0, 200))
        let msg: WebSocketMessage
        try { msg = JSON.parse(event.data) as WebSocketMessage } catch { return }

        if (msg.type === "greeting") {
          if (typeof msg.text === "string") setCurrentQuestionText(msg.text)
          lastSpokenTypeRef.current = "greeting"
          shouldAutoListenRef.current = false
          setUiState("ai_speaking")
          return
        }
        if (msg.type === "question") {
          if (typeof msg.total === "number") setQTotal(msg.total)
          if (typeof msg.index === "number") setQIndex(msg.index)
          if (typeof msg.text  === "string") setCurrentQuestionText(msg.text)
          lastSpokenTypeRef.current = "question"
          shouldAutoListenRef.current = true
          setUiState("ai_speaking")
          if (audioFallbackTimerRef.current) window.clearTimeout(audioFallbackTimerRef.current)
          audioFallbackTimerRef.current = window.setTimeout(() => {
            console.log("[SAGE] No audio received, forcing idle + auto-listen")
            if (uiStateRef.current !== "recording") {
              setUiState("idle")
              setTimeout(() => {
                console.log("[SAGE] Calling startRecording (audio fallback), phase:", phaseRef.current)
                if (phaseRef.current === "live") void startRecordingRef.current()
              }, 500)
            }
          }, 5000)
          return
        }
        if (msg.type === "status") {
          const m = msg.message ?? ""
          console.log("[SAGE] WS status:", m)
          if (m === "listening")  setUiState("idle")
          if (m === "processing") setUiState("processing")
          return
        }
        if (msg.type === "complete") {
          console.log("[SAGE] WS complete")
          setUiState("complete")
          return
        }
        if (msg.type === "error") {
          console.error("[SAGE] WS error msg:", msg)
          setUiState("idle")
          return
        }
        return
      }

      // Binary = TTS audio
      const byteLen = (event.data as ArrayBuffer).byteLength
      console.log("[SAGE] WS binary, byteLength:", byteLen)
      const audioEl = audioRef.current
      if (!audioEl) { console.warn("[SAGE] audioRef is null"); return }
      if (audioFallbackTimerRef.current) {
        window.clearTimeout(audioFallbackTimerRef.current)
        audioFallbackTimerRef.current = null
      }

      const blob =
        event.data instanceof ArrayBuffer
          ? new Blob([event.data], { type: "audio/mpeg" })
          : event.data instanceof Blob
          ? event.data
          : null
      if (!blob) return

      console.log("[SAGE] Received audio bytes, size:", blob.size)
      const url = URL.createObjectURL(blob)
      audioEl.src = url
      setUiState("ai_speaking")

      const triggerAutoListen = (reason: string) => {
        if (!shouldAutoListenRef.current) return
        console.log(`[SAGE] Auto-listen triggered (${reason})`)
        setUiState("idle")
        setTimeout(() => {
          console.log("[SAGE] Calling startRecording, phase:", phaseRef.current)
          if (phaseRef.current === "live") void startRecordingRef.current()
        }, 1000)
      }

      audioEl.onended = () => {
        console.log("[SAGE] AI audio ended, auto-starting mic in 1s...")
        URL.revokeObjectURL(url)
        triggerAutoListen("audio ended")
      }
      audioEl.onerror = (e) => {
        console.error("[SAGE] Audio error:", e)
        URL.revokeObjectURL(url)
        triggerAutoListen("audio error")
      }

      audioEl.oncanplaythrough = () => {
        console.log("[SAGE] Audio ready, playing…")
        audioEl.play().catch((err) => {
          console.error("[SAGE] Audio play failed:", err)
          URL.revokeObjectURL(url)
          triggerAutoListen("audio play failed")
        })
      }
    }

    ws.onerror = (e) => { console.error("[SAGE] WS error:", e); setUiState("idle") }
    ws.onclose = (e) => { console.log("[SAGE] WS closed:", e.code, e.reason); wsRef.current = null }

    return () => {
      ws.close()
      wsRef.current = null
      if (audioFallbackTimerRef.current) {
        window.clearTimeout(audioFallbackTimerRef.current)
        audioFallbackTimerRef.current = null
      }
      mediaRecorderRef.current?.stop()
      mediaStreamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [phase, candidateId])

  // Navigate on complete
  useEffect(() => {
    if (uiState !== "complete") return
    const t = setTimeout(() => navigate("/done", { replace: true }), 2000)
    return () => clearTimeout(t)
  }, [uiState, navigate])

  // ── Upload handler ────────────────────────────────────────────────────────
  async function handleUpload() {
    if (!file || !jobRole) {
      setUploadError("Please select a PDF and choose a role.")
      return
    }
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setUploadError("Only PDF files are supported.")
      return
    }
    setUploading(true)
    setUploadError("")
    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("job_role", jobRole)
      const candidate = JSON.parse(localStorage.getItem("sage_candidate") ?? "{}") as { id?: string; candidate_id?: string }
      const savedId = localStorage.getItem("sage_candidate_id") || candidate.id || candidate.candidate_id || ""
      if (savedId) formData.append("candidate_id", savedId)
      if (navJobId) formData.append("job_id", navJobId)

      const token = localStorage.getItem("sage_token")
      const res = await fetch("http://localhost:8000/api/upload-resume", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { detail?: string }
        throw new Error(err.detail ?? "Upload failed")
      }
      const data = await res.json() as { candidate_id: string; interview_id: string }
      console.log("[SAGE] Upload success:", data)
      localStorage.setItem("sage_candidate_id", data.candidate_id)
      localStorage.setItem("sage_interview_id", data.interview_id)
      setCandidateId(data.candidate_id)
      setInterviewId(data.interview_id)
      setStep(scheduleMode ? "schedule" : "ready")
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to upload resume"
      console.error("[SAGE] Upload error:", e)
      setUploadError(msg)
    } finally {
      setUploading(false)
    }
  }

  async function handleScheduleInterview() {
    if (!scheduleDate || !scheduleTime) {
      setScheduleError("Please select both date and time")
      return
    }
    setScheduling(true)
    setScheduleError("")

    try {
      const [time, periodRaw] = scheduleTime.split(" ")
      const period = (periodRaw || "").toUpperCase()
      let hours = Number(time.split(":")[0])
      const minutes = Number(time.split(":")[1])
      if (period === "PM" && hours !== 12) hours += 12
      if (period === "AM" && hours === 12) hours = 0
      const scheduledAt = new Date(`${scheduleDate}T${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00`)

      const res = await fetch("http://localhost:8000/api/interviews/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          interview_id: interviewId,
          candidate_id: candidateId,
          job_role: jobRole,
          scheduled_at: scheduledAt.toISOString(),
          company: companyName,
          job_id: navJobId,
        }),
      })
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { detail?: string }
        throw new Error(err.detail || "Failed to schedule")
      }

      alert(`Interview scheduled for ${new Date(scheduledAt).toLocaleDateString()} at ${scheduleTime}`)
      navigate("/dashboard")
    } catch (e: unknown) {
      setScheduleError(e instanceof Error ? e.message : "Failed to schedule interview")
    } finally {
      setScheduling(false)
    }
  }

  // ── Start interview ───────────────────────────────────────────────────────
  async function handleStart() {
    setMicError(null)
    try {
      unlockAudio()
      const s = await navigator.mediaDevices.getUserMedia({ audio: true })
      s.getTracks().forEach((t) => t.stop())
      setPhase("live")
    } catch {
      setMicError("Microphone access denied. Please allow it and try again.")
    }
  }

  async function startRecording() {
    console.log("[SAGE] startRecording called. uiState:", uiStateRef.current, "ws readyState:", wsRef.current?.readyState)
    try {
      const ws = wsRef.current
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        console.error("[SAGE] WebSocket not open, cannot record")
        return
      }
      if (mediaRecorderRef.current?.state === "recording") return

      setUiState("recording")
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      console.log("[SAGE] Mic stream obtained")
      mediaStreamRef.current = stream

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm"
      const recorder = new MediaRecorder(stream, { mimeType })
      mediaRecorderRef.current = recorder
      chunksRef.current = []

    // ── Silence detection via Web Audio AnalyserNode ──
    const audioCtx = new AudioContext()
    const analyser = audioCtx.createAnalyser()
    analyser.fftSize = 256
    audioCtx.createMediaStreamSource(stream).connect(analyser)
    const volumeData = new Uint8Array(analyser.frequencyBinCount)
    let silenceTimer: ReturnType<typeof setTimeout> | null = null
    const SILENCE_MS = 4000

    const silenceCheck = setInterval(() => {
      analyser.getByteFrequencyData(volumeData)
      const avg = volumeData.reduce((a, b) => a + b, 0) / volumeData.length
      if (avg / 255 < 0.005) {
        if (!silenceTimer) {
          silenceTimer = setTimeout(() => {
            console.log("[SAGE] Silence detected, stopping recording")
            clearInterval(silenceCheck)
            stopRecording()
          }, SILENCE_MS)
        }
      } else {
        if (silenceTimer) { clearTimeout(silenceTimer); silenceTimer = null }
      }
    }, 100)

      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      recorder.onstop = () => {
        console.log("[SAGE] Recording stopped, chunks:", chunksRef.current.length)
        clearInterval(silenceCheck)
        if (silenceTimer) { clearTimeout(silenceTimer); silenceTimer = null }
        void audioCtx.close()
        const blob = new Blob(chunksRef.current, { type: mimeType })
        console.log("[SAGE] Sending audio blob, size:", blob.size)
        ws.send(blob)
        setUiState("processing")
        stream.getTracks().forEach((t) => t.stop())
        mediaStreamRef.current = null
      }
      recorder.start()
      console.log("[SAGE] Recording started")
    } catch (err) {
      console.error("[SAGE] startRecording failed:", err)
      setUiState("idle")
    }
  }
  // Keep ref in sync so WS closure can call latest version
  startRecordingRef.current = startRecording

  function stopRecording() {
    const r = mediaRecorderRef.current
    if (r?.state === "recording") r.stop()
  }

  function handleEndInterview() {
    const ws = wsRef.current
    if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ action: "end" }))
    navigate("/interviews")
  }

  // ── Theme helpers ─────────────────────────────────────────────────────────
  const barBg  = isDark ? "bg-zinc-900/95 border-zinc-800" : "bg-white/95 border-[#E5E7EB]"

  // ═══════════════════════════════════════════════════════════════════════════
  // PRE-INTERVIEW: Step 1 — Upload
  // ═══════════════════════════════════════════════════════════════════════════
  if (phase === "pre" && step === "upload") {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <Card className="max-w-lg w-full p-8 bg-zinc-900 border-zinc-800">
          <h2 className="text-2xl font-semibold text-white mb-1">Upload Your Resume</h2>
          <p className="text-zinc-400 text-sm mb-6">
            We'll analyze it and generate tailored interview questions.
          </p>

          {/* Drop zone */}
          <div
            className={[
              "border-2 border-dashed rounded-xl p-8 text-center mb-4 transition-colors",
              dragOver
                ? "border-purple-500 bg-purple-500/5"
                : file
                ? "border-green-600 bg-green-500/5"
                : "border-zinc-700 hover:border-zinc-500 cursor-pointer",
            ].join(" ")}
            onClick={() => document.getElementById("resume-input")?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDragOver(false)
              const dropped = e.dataTransfer.files[0]
              if (dropped) setFile(dropped)
            }}
          >
            {file ? (
              <div className="text-green-400">
                <CheckCircle className="w-8 h-8 mx-auto mb-2" />
                <p className="font-medium text-white">{file.name}</p>
                <p className="text-sm text-zinc-500 mt-0.5">{(file.size / 1024).toFixed(0)} KB</p>
                <button
                  type="button"
                  className="mt-2 text-xs text-zinc-500 hover:text-zinc-300 underline"
                  onClick={(e) => { e.stopPropagation(); setFile(null) }}
                >
                  Remove
                </button>
              </div>
            ) : (
              <div className="text-zinc-500 cursor-pointer">
                <Upload className="w-8 h-8 mx-auto mb-2" />
                <p className="text-sm font-medium text-zinc-300">Drag & drop your PDF here</p>
                <p className="text-xs mt-1">or click to browse</p>
              </div>
            )}
            <input
              id="resume-input"
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>

          {/* Job role selector */}
          <select
            value={jobRole}
            onChange={(e) => setJobRole(e.target.value)}
            className="w-full p-3 rounded-lg bg-zinc-800 border border-zinc-700 text-white mb-4 focus:outline-none focus:border-purple-500 transition-colors"
          >
            <option value="">Select a role…</option>
            {JOB_ROLES.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>

          {uploadError && (
            <p className="text-red-400 text-sm mb-4">{uploadError}</p>
          )}

          <Button
            className="w-full bg-[#7C3AED] hover:bg-[#7C3AED]/90 text-white"
            size="lg"
            onClick={handleUpload}
            disabled={uploading || !file || !jobRole}
          >
            {uploading ? (
              <span className="inline-flex items-center">
                <span className="mr-2 inline-flex">
                  <Loader size={16} color="#FFFFFF" />
                </span>
                Analyzing Resume…
              </span>
            ) : (
              "Continue"
            )}
          </Button>

          <Button
            variant="outline"
            className="w-full mt-2 border-zinc-700 text-zinc-300 hover:bg-zinc-800"
            onClick={() => navigate("/interviews")}
          >
            <X size={15} className="mr-2" />
            Cancel
          </Button>
        </Card>
      </div>
    )
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PRE-INTERVIEW: Step 2 — Ready
  // ═══════════════════════════════════════════════════════════════════════════
  if (phase === "pre" && step === "schedule") {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <Card className="max-w-lg w-full p-8 bg-zinc-900 border-zinc-800">
          <h2 className="text-2xl font-semibold text-white mb-2">Schedule Your Interview</h2>
          <p className="text-zinc-400 mb-1">
            {jobTitle || jobRole} {companyName ? `at ${companyName}` : ""}
          </p>
          {deadline ? (
            <p className="text-yellow-400 text-sm mb-6">
              Application deadline:{" "}
              {new Date(deadline).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
            </p>
          ) : (
            <div className="mb-6" />
          )}

          <div className="mb-4">
            <label className="text-sm text-zinc-300 mb-2 block">Select Date</label>
            <input
              type="date"
              value={scheduleDate}
              min={new Date().toISOString().split("T")[0]}
              max={deadlineDate || undefined}
              onChange={(e) => setScheduleDate(e.target.value)}
              className="w-full p-3 rounded-lg bg-zinc-800 border border-zinc-700 text-white"
            />
          </div>

          <div className="mb-6">
            <label className="text-sm text-zinc-300 mb-2 block">Select Time</label>
            <div className="grid grid-cols-3 gap-2">
              {["09:00 AM", "10:00 AM", "11:00 AM", "01:00 PM", "02:00 PM", "03:00 PM", "04:00 PM", "05:00 PM", "06:00 PM"].map((time) => (
                <button
                  type="button"
                  key={time}
                  onClick={() => setScheduleTime(time)}
                  className={[
                    "p-2 rounded-lg text-sm border transition-colors",
                    scheduleTime === time
                      ? "bg-purple-600 border-purple-500 text-white"
                      : "bg-zinc-800 border-zinc-700 text-zinc-300 hover:border-zinc-500",
                  ].join(" ")}
                >
                  {time}
                </button>
              ))}
            </div>
          </div>

          {scheduleError ? <p className="text-red-400 text-sm mb-4">{scheduleError}</p> : null}

          <Button className="w-full" size="lg" disabled={!scheduleDate || !scheduleTime || scheduling} onClick={handleScheduleInterview}>
            {scheduling ? "Scheduling..." : "Confirm Schedule"}
          </Button>

          <Button
            variant="outline"
            className="w-full mt-2 border-zinc-700 text-zinc-300 hover:bg-zinc-800"
            onClick={() => navigate("/dashboard")}
          >
            Cancel
          </Button>
        </Card>
      </div>
    )
  }

  if (phase === "pre" && step === "ready") {
    const checkColor = isDark ? "text-[#7C3AED]" : "text-[#2563EB]"
    const cardBg = isDark ? "bg-zinc-900 border-zinc-800" : "bg-white border-gray-200"
    const pageBg = isDark ? "bg-zinc-950 text-zinc-50" : "bg-[#FAFAFA] text-[#0A0A0A]"
    return (
      <div className={["min-h-screen flex items-center justify-center px-4", pageBg].join(" ")}>
        <Card className={["w-full max-w-md p-8 shadow-xl", cardBg].join(" ")}>
          <div className="text-center mb-6">
            <div className={[
              "inline-flex items-center justify-center w-14 h-14 rounded-full mb-4",
              isDark ? "bg-[#7C3AED]/20" : "bg-blue-50",
            ].join(" ")}>
              <Mic size={24} className={isDark ? "text-[#7C3AED]" : "text-[#2563EB]"} />
            </div>
            <h2 className="text-2xl font-semibold">Ready to Begin?</h2>
            <p className={["mt-1 text-sm", isDark ? "text-zinc-400" : "text-gray-500"].join(" ")}>
              {jobRole || "Your role"} &bull; 8 questions &bull; ~10 minutes
            </p>
          </div>

          <ul className="space-y-3 mb-8">
            {CHECKLIST.map((item) => (
              <li key={item} className="flex items-center gap-3 text-sm">
                <CheckSquare size={16} className={checkColor} />
                <span className={isDark ? "text-zinc-300" : "text-gray-700"}>{item}</span>
              </li>
            ))}
          </ul>

          {micError && <p className="mb-4 text-sm text-red-500 text-center">{micError}</p>}

          <div className="flex flex-col gap-3">
            <Button
              size="lg"
              className={[
                "w-full text-base font-semibold",
                isDark ? "bg-[#7C3AED] hover:bg-[#7C3AED]/90 text-white" : "bg-black text-white hover:bg-black/90",
              ].join(" ")}
              onClick={handleStart}
            >
              <Mic size={18} className="mr-2" />
              Start Interview
            </Button>
            <Button
              size="lg"
              variant="outline"
              className={["w-full", isDark ? "border-zinc-700 text-zinc-200 hover:bg-zinc-800" : ""].join(" ")}
              onClick={() => navigate("/interviews")}
            >
              <X size={16} className="mr-2" />
              Cancel
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // LIVE INTERVIEW
  // ═══════════════════════════════════════════════════════════════════════════
  const isDisabled =
    uiState === "processing" ||
    uiState === "ai_speaking" ||
    uiState === "complete" ||
    uiState === "connecting"

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      <audio ref={audioRef} />

      {/* Top bar */}
      <div className={["fixed top-0 left-0 right-0 z-10 border-b backdrop-blur-md", barBg].join(" ")}>
        <div className="mx-auto max-w-5xl px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Timer size={14} className="text-zinc-400" />
            <span className="font-mono text-sm tabular-nums text-zinc-300">{timerLabel}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-green-500" />
            <span className="text-sm font-medium text-zinc-300">Interview in Progress</span>
            <Badge variant="secondary" className="bg-zinc-800 text-zinc-300 border-zinc-700">
              Q{Math.min(qIndex + 1, qTotal)}/{qTotal}
            </Badge>
          </div>
          <Button size="sm" variant="destructive" onClick={handleEndInterview} className="text-xs h-8">
            <Square size={11} className="mr-1.5 fill-current" />
            End Interview
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 pt-14">

        {/* CSS orb */}
        <div
          className={["relative w-64 h-64 md:w-80 md:h-80", isDisabled ? "cursor-default" : "cursor-pointer"].join(" ")}
          onClick={() => {
            console.log("Orb clicked, current state:", uiState, "ws readyState:", wsRef.current?.readyState)
            if (isDisabled) return
            if (uiState === "idle") {
              console.log("Starting recording...")
              void startRecording().catch((err) => console.error("[SAGE] startRecording error:", err))
            } else if (uiState === "recording") {
              console.log("Stopping recording...")
              stopRecording()
            }
          }}
        >
          {uiState === "recording" && (
            <div className="absolute inset-0 rounded-full bg-purple-500/20 animate-ping" />
          )}
          <div className={[
            "absolute inset-4 rounded-full transition-all duration-500",
            uiState === "recording"
              ? "bg-purple-500/10 shadow-[0_0_60px_20px_rgba(124,58,237,0.3)]"
              : uiState === "ai_speaking"
              ? "bg-blue-500/10 shadow-[0_0_60px_20px_rgba(37,99,235,0.3)]"
              : "bg-zinc-800/50",
          ].join(" ")} />
          <div className={[
            "absolute inset-8 rounded-full flex items-center justify-center transition-all duration-300",
            uiState === "recording"
              ? "bg-gradient-to-br from-purple-600 to-purple-800 shadow-2xl shadow-purple-500/40 scale-105"
              : uiState === "ai_speaking"
              ? "bg-gradient-to-br from-blue-500 to-blue-700 shadow-2xl shadow-blue-500/40"
              : uiState === "processing"
              ? "bg-gradient-to-br from-zinc-600 to-zinc-800 scale-95"
              : uiState === "complete"
              ? "bg-gradient-to-br from-green-600 to-green-800 shadow-2xl shadow-green-500/40"
              : "bg-gradient-to-br from-zinc-700 to-zinc-900 hover:from-zinc-600 hover:to-zinc-800",
          ].join(" ")}>
            {uiState === "processing"  ? <Loader size={48} color="#FFFFFF" /> :
             uiState === "ai_speaking" ? <Volume2  className="w-12 h-12 text-white" /> :
             uiState === "recording"   ? <Mic      className="w-12 h-12 text-white animate-pulse" /> :
             uiState === "complete"    ? <CheckCircle className="w-12 h-12 text-white" /> :
                                         <Mic      className="w-12 h-12 text-zinc-300" />}
          </div>
        </div>

        {/* Status */}
        <div className="text-center mt-8 mb-6">
          {uiState === "idle"        && <p className="text-zinc-400 text-lg">Tap the orb to speak</p>}
          {uiState === "recording"   && <p className="text-purple-400 text-lg animate-pulse">Listening…</p>}
          {uiState === "processing"  && <p className="text-zinc-400 text-lg">Processing your answer…</p>}
          {uiState === "ai_speaking" && <p className="text-blue-400 text-lg">SAGE is speaking…</p>}
          {uiState === "complete"    && <p className="text-green-400 text-lg">Interview complete!</p>}
          {uiState === "connecting"  && <p className="text-zinc-500 text-lg">Connecting…</p>}
        </div>

        {/* Question */}
        <div className="max-w-2xl w-full text-center">
          {currentQuestionText && (
            <div className="mb-4">
              <p className="text-sm text-zinc-500 mb-1">
                Question {Math.min(qIndex + 1, qTotal)} of {qTotal}
              </p>
              <p className="text-xl font-medium text-zinc-100 leading-relaxed">
                {currentQuestionText}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
