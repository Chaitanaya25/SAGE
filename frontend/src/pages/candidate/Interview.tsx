import { useEffect, useMemo, useRef, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { CheckCircle, CheckSquare, Loader2, Mic, Square, Timer, Volume2, X } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { WS_URL } from "@/lib/api"
import { useTheme } from "@/lib/theme-context"
import type { WebSocketMessage } from "@/types"

type InterviewUiState = "connecting" | "idle" | "recording" | "processing" | "ai_speaking" | "complete"
type Phase = "pre" | "live"

const CHECKLIST = [
  "Microphone access required",
  "Quiet environment recommended",
  "Answer in English",
  "Speak clearly and naturally",
]

function unlockAudio() {
  try {
    const ctx = new AudioContext()
    const buffer = ctx.createBuffer(1, 1, 22050)
    const source = ctx.createBufferSource()
    source.buffer = buffer
    source.connect(ctx.destination)
    source.start(0)
  } catch {
    // ignore — best-effort unlock
  }
}

export default function Interview() {
  const location = useLocation() as unknown as {
    state?: { candidateId?: string; interviewId?: string; jobRole?: string }
  }
  const navigate = useNavigate()
  const { theme } = useTheme()
  const isDark = theme === "dark"

  const candidateId = location.state?.candidateId ?? null
  const jobRole     = location.state?.jobRole ?? "your role"

  const [phase,               setPhase]               = useState<Phase>("pre")
  const [uiState,             setUiState]             = useState<InterviewUiState>("connecting")
  const [qIndex,              setQIndex]              = useState(0)
  const [qTotal,              setQTotal]              = useState(8)
  const [elapsed,             setElapsed]             = useState(0)
  const [micError,            setMicError]            = useState<string | null>(null)
  const [currentQuestionText, setCurrentQuestionText] = useState("")
  const [lastCandidateAnswer, setLastCandidateAnswer] = useState("")

  const wsRef            = useRef<WebSocket | null>(null)
  const audioRef         = useRef<HTMLAudioElement | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const mediaStreamRef   = useRef<MediaStream | null>(null)
  const chunksRef        = useRef<BlobPart[]>([])

  const timerLabel = useMemo(() => {
    const m = Math.floor(elapsed / 60)
    const s = elapsed % 60
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
  }, [elapsed])

  // Timer
  useEffect(() => {
    if (phase !== "live") return
    const id = setInterval(() => setElapsed((e) => e + 1), 1000)
    return () => clearInterval(id)
  }, [phase])

  // WebSocket — only when live
  useEffect(() => {
    if (phase !== "live") return
    if (!candidateId) {
      console.warn("[SAGE] No candidateId in location state — redirecting to /upload")
      navigate("/upload", { replace: true })
      return
    }

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

        if (msg.type === "question") {
          if (typeof msg.total === "number") setQTotal(msg.total)
          if (typeof msg.index === "number") setQIndex(msg.index)
          if (typeof msg.text  === "string") setCurrentQuestionText(msg.text)
          setUiState("ai_speaking")
          return
        }
        if (msg.type === "transcript") {
          if (typeof msg.text === "string") setLastCandidateAnswer(msg.text)
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

      // Binary = TTS audio bytes
      console.log("[SAGE] WS binary, byteLength:", (event.data as ArrayBuffer).byteLength)
      const audioEl = audioRef.current
      if (!audioEl) { console.warn("[SAGE] audioRef is null"); return }

      let blob: Blob
      if (event.data instanceof ArrayBuffer) {
        blob = new Blob([event.data], { type: "audio/mpeg" })
      } else if (event.data instanceof Blob) {
        blob = event.data
      } else { return }

      const url = URL.createObjectURL(blob)
      audioEl.src = url
      setUiState("ai_speaking")
      try {
        await audioEl.play()
        console.log("[SAGE] Audio playing")
      } catch (err) {
        console.error("[SAGE] Audio play failed:", err)
        URL.revokeObjectURL(url)
      }
      audioEl.onended = () => {
        URL.revokeObjectURL(url)
        setUiState((s) => (s === "ai_speaking" ? "idle" : s))
      }
    }

    ws.onerror = (e) => {
      console.error("[SAGE] WS error:", e)
      setUiState("idle")
    }

    ws.onclose = (e) => {
      console.log("[SAGE] WS closed:", e.code, e.reason)
      wsRef.current = null
    }

    return () => {
      ws.close()
      wsRef.current = null
      mediaRecorderRef.current?.stop()
      mediaStreamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [phase, candidateId, navigate])

  // Navigate on complete
  useEffect(() => {
    if (uiState !== "complete") return
    const t = setTimeout(() => navigate("/done", { replace: true }), 2000)
    return () => clearTimeout(t)
  }, [uiState, navigate])

  async function handleStart() {
    setMicError(null)
    try {
      // Unlock browser autoplay policy before WebSocket connects
      unlockAudio()
      const s = await navigator.mediaDevices.getUserMedia({ audio: true })
      s.getTracks().forEach((t) => t.stop())
      setPhase("live")
    } catch {
      setMicError("Microphone access denied. Please allow it and try again.")
    }
  }

  function toggleRecording() {
    if (uiState === "recording") stopRecording()
    else if (uiState === "idle")  startRecording()
  }

  async function startRecording() {
    const ws = wsRef.current
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      console.warn("[SAGE] WS not open, cannot record")
      return
    }
    setUiState("recording")

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    mediaStreamRef.current = stream

    const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : "audio/webm"

    const recorder = new MediaRecorder(stream, { mimeType })
    mediaRecorderRef.current = recorder
    chunksRef.current = []

    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeType })
      console.log("[SAGE] Sending audio blob, size:", blob.size)
      ws.send(blob)
      setUiState("processing")
      stream.getTracks().forEach((t) => t.stop())
      mediaStreamRef.current = null
    }
    recorder.start()
  }

  function stopRecording() {
    const r = mediaRecorderRef.current
    if (r?.state === "recording") r.stop()
  }

  function handleEndInterview() {
    const ws = wsRef.current
    if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ action: "end" }))
    navigate("/interviews")
  }

  // ─── Theme ─────────────────────────────────────────────────────────────────
  const pageBg = isDark ? "bg-zinc-950 text-zinc-50" : "bg-[#FAFAFA] text-[#0A0A0A]"
  const barBg  = isDark ? "bg-zinc-900/95 border-zinc-800" : "bg-white/95 border-[#E5E7EB]"
  const cardBg = isDark ? "bg-zinc-900 border-zinc-800" : "bg-white border-gray-200"

  // ─── Pre-interview screen ──────────────────────────────────────────────────
  if (phase === "pre") {
    const checkColor = isDark ? "text-[#7C3AED]" : "text-[#2563EB]"
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
              {jobRole} &bull; 8 questions &bull; ~10 minutes
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

  // ─── Live interview screen ──────────────────────────────────────────────────
  const isDisabled = uiState === "processing" || uiState === "ai_speaking" || uiState === "complete" || uiState === "connecting"

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

        {/* CSS orb — clicking toggles recording */}
        <div
          className={["relative w-64 h-64 md:w-80 md:h-80", isDisabled ? "cursor-default" : "cursor-pointer"].join(" ")}
          onClick={() => !isDisabled && toggleRecording()}
        >
          {/* Outer ping ring — recording only */}
          {uiState === "recording" && (
            <div className="absolute inset-0 rounded-full bg-purple-500/20 animate-ping" />
          )}

          {/* Middle glow ring */}
          <div className={[
            "absolute inset-4 rounded-full transition-all duration-500",
            uiState === "recording"
              ? "bg-purple-500/10 shadow-[0_0_60px_20px_rgba(124,58,237,0.3)]"
              : uiState === "ai_speaking"
              ? "bg-blue-500/10 shadow-[0_0_60px_20px_rgba(37,99,235,0.3)]"
              : "bg-zinc-800/50",
          ].join(" ")} />

          {/* Inner orb */}
          <div className={[
            "absolute inset-8 rounded-full flex items-center justify-center transition-all duration-300",
            uiState === "recording"
              ? "bg-gradient-to-br from-purple-600 to-purple-800 shadow-2xl shadow-purple-500/40 scale-105"
              : uiState === "ai_speaking"
              ? "bg-gradient-to-br from-blue-500 to-blue-700 shadow-2xl shadow-blue-500/40 scale-100"
              : uiState === "processing"
              ? "bg-gradient-to-br from-zinc-600 to-zinc-800 scale-95"
              : uiState === "complete"
              ? "bg-gradient-to-br from-green-600 to-green-800 shadow-2xl shadow-green-500/40 scale-100"
              : "bg-gradient-to-br from-zinc-700 to-zinc-900 hover:from-zinc-600 hover:to-zinc-800",
          ].join(" ")}>
            {uiState === "processing" ? (
              <Loader2 className="w-12 h-12 text-white animate-spin" />
            ) : uiState === "ai_speaking" ? (
              <Volume2 className="w-12 h-12 text-white" />
            ) : uiState === "recording" ? (
              <Mic className="w-12 h-12 text-white animate-pulse" />
            ) : uiState === "complete" ? (
              <CheckCircle className="w-12 h-12 text-white" />
            ) : (
              <Mic className="w-12 h-12 text-zinc-300" />
            )}
          </div>
        </div>

        {/* Status label */}
        <div className="text-center mt-8 mb-6">
          {uiState === "idle" && <p className="text-zinc-400 text-lg">Tap the orb to speak</p>}
          {uiState === "recording"   && <p className="text-purple-400 text-lg animate-pulse">Listening...</p>}
          {uiState === "processing"  && <p className="text-zinc-400 text-lg">Processing your answer...</p>}
          {uiState === "ai_speaking" && <p className="text-blue-400 text-lg">SAGE is speaking...</p>}
          {uiState === "complete"    && <p className="text-green-400 text-lg">Interview complete!</p>}
          {uiState === "connecting"  && <p className="text-zinc-500 text-lg">Connecting...</p>}
        </div>

        {/* Question subtitle + last answer */}
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

          {lastCandidateAnswer && uiState !== "recording" && (
            <div className="mt-4 opacity-60">
              <p className="text-sm text-zinc-500">Your answer:</p>
              <p className="text-sm text-zinc-300 italic line-clamp-3">
                {lastCandidateAnswer}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
