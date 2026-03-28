import { useEffect, useMemo, useRef, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { CheckCircle, CheckSquare, Loader2, Mic, Square, Timer, Volume2, X } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import { WS_URL } from "@/lib/api"
import { useTheme } from "@/lib/theme-context"
import type { TranscriptEntry, WebSocketMessage } from "@/types"

type InterviewUiState = "connecting" | "idle" | "recording" | "processing" | "ai_speaking" | "complete"
type Phase = "pre" | "live"

function nowEntry(text: string, speaker: TranscriptEntry["speaker"]): TranscriptEntry {
  return { speaker, text, timestamp: new Date() }
}

const CHECKLIST = [
  "Microphone access required",
  "Quiet environment recommended",
  "Answer in English",
  "Speak clearly and naturally",
]

export default function Interview() {
  const location = useLocation() as unknown as {
    state?: { candidateId?: string; interviewId?: string; jobRole?: string }
  }
  const navigate = useNavigate()
  const { theme } = useTheme()
  const isDark = theme === "dark"

  const candidateId = location.state?.candidateId ?? null
  const jobRole = location.state?.jobRole ?? "your role"

  const [phase, setPhase] = useState<Phase>("pre")
  const [uiState, setUiState] = useState<InterviewUiState>("connecting")
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([])
  const [qIndex, setQIndex] = useState(0)
  const [qTotal, setQTotal] = useState(8)
  const [statusText, setStatusText] = useState<string>("Connecting...")
  const [elapsed, setElapsed] = useState(0)
  const [micError, setMicError] = useState<string | null>(null)

  const wsRef = useRef<WebSocket | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<BlobPart[]>([])

  const progressValue = useMemo(() => {
    if (!qTotal) return 0
    return Math.min(100, Math.max(0, ((qIndex + 1) / qTotal) * 100))
  }, [qIndex, qTotal])

  const timerLabel = useMemo(() => {
    const m = Math.floor(elapsed / 60)
    const s = elapsed % 60
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
  }, [elapsed])

  // Timer — only runs when phase is "live"
  useEffect(() => {
    if (phase !== "live") return
    const id = setInterval(() => setElapsed((e) => e + 1), 1000)
    return () => clearInterval(id)
  }, [phase])

  // WebSocket — only connects when phase is "live"
  useEffect(() => {
    if (phase !== "live") return
    if (!candidateId) {
      navigate("/upload", { replace: true })
      return
    }

    const ws = new WebSocket(`${WS_URL}/${candidateId}`)
    ws.binaryType = "arraybuffer"
    wsRef.current = ws

    ws.onopen = () => {
      setUiState("idle")
      setStatusText("Waiting for first question...")
    }

    ws.onmessage = async (event) => {
      if (typeof event.data === "string") {
        let msg: WebSocketMessage
        try {
          msg = JSON.parse(event.data) as WebSocketMessage
        } catch {
          return
        }

        if (msg.type === "question") {
          if (typeof msg.total === "number") setQTotal(msg.total)
          if (typeof msg.index === "number") setQIndex(msg.index)
          if (typeof msg.text === "string") {
            const text = msg.text
            setTranscript((t) => [...t, nowEntry(text, "ai")])
          }
          setUiState("ai_speaking")
          setStatusText("AI speaking...")
          return
        }

        if (msg.type === "transcript") {
          if (typeof msg.text === "string") {
            const text = msg.text
            setTranscript((t) => [...t, nowEntry(text, "candidate")])
          }
          return
        }

        if (msg.type === "status") {
          const m = msg.message ?? ""
          setStatusText(m)
          if (m === "listening") setUiState("idle")
          if (m === "processing") setUiState("processing")
          return
        }

        if (msg.type === "complete") {
          setUiState("complete")
          setStatusText(msg.message ?? "complete")
          return
        }

        if (msg.type === "warning") {
          setStatusText(msg.message ?? "warning")
          return
        }

        if (msg.type === "error") {
          setStatusText(msg.message ?? "error")
          setUiState("idle")
          return
        }

        return
      }

      const audioEl = audioRef.current
      if (!audioEl) return

      let blob: Blob
      if (event.data instanceof ArrayBuffer) {
        blob = new Blob([event.data], { type: "audio/mpeg" })
      } else if (event.data instanceof Blob) {
        blob = event.data
      } else {
        return
      }

      const url = URL.createObjectURL(blob)
      audioEl.src = url
      setUiState("ai_speaking")
      setStatusText("AI speaking...")
      try {
        await audioEl.play()
      } catch {
        URL.revokeObjectURL(url)
      }
      audioEl.onended = () => {
        URL.revokeObjectURL(url)
        setUiState((s) => (s === "ai_speaking" ? "idle" : s))
      }
    }

    ws.onclose = () => {
      wsRef.current = null
      setStatusText("Disconnected")
    }

    ws.onerror = () => {
      setStatusText("Connection error")
    }

    return () => {
      ws.close()
      wsRef.current = null
      mediaRecorderRef.current?.stop()
      mediaStreamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [phase, candidateId, navigate])

  useEffect(() => {
    if (uiState !== "complete") return
    const t = setTimeout(() => navigate("/done", { replace: true }), 2000)
    return () => clearTimeout(t)
  }, [uiState, navigate])

  async function handleStart() {
    setMicError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.getTracks().forEach((t) => t.stop())
      setPhase("live")
    } catch {
      setMicError("Microphone access was denied. Please allow microphone access and try again.")
    }
  }

  async function startRecording() {
    const ws = wsRef.current
    if (!ws || ws.readyState !== WebSocket.OPEN) return
    if (uiState === "processing" || uiState === "ai_speaking" || uiState === "complete") return

    setStatusText("recording")
    setUiState("recording")

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    mediaStreamRef.current = stream

    const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : "audio/webm"

    const recorder = new MediaRecorder(stream, { mimeType })
    mediaRecorderRef.current = recorder
    chunksRef.current = []

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data)
    }

    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeType })
      ws.send(blob)
      setUiState("processing")
      setStatusText("processing")
      stream.getTracks().forEach((t) => t.stop())
      mediaStreamRef.current = null
    }

    recorder.start()
  }

  function stopRecording() {
    const recorder = mediaRecorderRef.current
    if (!recorder) return
    if (recorder.state === "recording") recorder.stop()
  }

  function handleEndInterview() {
    const ws = wsRef.current
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ action: "end" }))
    }
    navigate("/interviews")
  }

  // Theme classes
  const pageBg = isDark ? "bg-zinc-950 text-zinc-50" : "bg-[#FAFAFA] text-[#0A0A0A]"
  const barBg = isDark ? "bg-zinc-900/95 border-zinc-800" : "bg-white border-[#E5E7EB]"
  const scrollBg = isDark ? "bg-zinc-900 border-zinc-800" : "bg-white border-[#E5E7EB]"
  const aiBubble = isDark
    ? "bg-zinc-800 text-zinc-100 border-zinc-700"
    : "bg-gray-100 text-gray-900 border-gray-200"
  const candidateBubble = isDark
    ? "bg-zinc-700 text-zinc-100 border-zinc-600"
    : "bg-white text-gray-900 border-blue-200"

  const commonButton = "w-20 h-20 rounded-full flex items-center justify-center border transition"

  // ─── Pre-interview screen ───────────────────────────────────────────────────
  if (phase === "pre") {
    const cardBg = isDark ? "bg-zinc-900 border-zinc-800" : "bg-white border-gray-200"
    const checkColor = isDark ? "text-[#7C3AED]" : "text-[#2563EB]"

    return (
      <div className={["min-h-screen flex items-center justify-center px-4", pageBg].join(" ")}>
        <Card className={["w-full max-w-md p-8 shadow-xl", cardBg].join(" ")}>
          <div className="text-center mb-6">
            <div className={["inline-flex items-center justify-center w-14 h-14 rounded-full mb-4", isDark ? "bg-[#7C3AED]/20" : "bg-blue-50"].join(" ")}>
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

          {micError && (
            <p className="mb-4 text-sm text-red-500 text-center">{micError}</p>
          )}

          <div className="flex flex-col gap-3">
            <Button
              size="lg"
              className={["w-full text-base font-semibold", isDark ? "bg-[#7C3AED] hover:bg-[#7C3AED]/90 text-white" : "bg-black text-white hover:bg-black/90"].join(" ")}
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
  return (
    <div className={["min-h-screen", pageBg].join(" ")}>
      <audio ref={audioRef} />

      {/* Top bar */}
      <div className={["fixed top-0 left-0 right-0 z-10 border-b backdrop-blur-md", barBg].join(" ")}>
        <div className="mx-auto max-w-5xl px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Timer size={15} className={isDark ? "text-zinc-400" : "text-gray-500"} />
            <span className={["font-mono text-sm tabular-nums", isDark ? "text-zinc-300" : "text-gray-700"].join(" ")}>
              {timerLabel}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-green-500" />
            <span className={["text-sm font-medium", isDark ? "text-zinc-300" : "text-gray-700"].join(" ")}>
              Interview in Progress
            </span>
            <Badge
              variant="secondary"
              className={isDark ? "bg-zinc-800 text-zinc-300 border-zinc-700" : "bg-gray-100 text-gray-700 border border-gray-200"}
            >
              Q{Math.min(qIndex + 1, qTotal)}/{qTotal}
            </Badge>
          </div>

          <Button
            size="sm"
            variant="destructive"
            onClick={handleEndInterview}
            className="text-xs h-8"
          >
            <Square size={12} className="mr-1.5 fill-current" />
            End Interview
          </Button>
        </div>
      </div>

      <div className="pt-20 pb-24">
        <div className="mx-auto max-w-5xl px-4">
          <div className="flex flex-col items-center gap-6">
            {uiState === "recording" ? (
              <button
                type="button"
                onClick={stopRecording}
                className={[commonButton, "bg-[#2563EB] border-[#2563EB] text-white relative"].join(" ")}
              >
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#2563EB]/30" />
                <Mic className="relative" size={28} />
              </button>
            ) : uiState === "processing" ? (
              <div className={[commonButton, isDark ? "bg-zinc-800 border-zinc-700 text-zinc-400" : "bg-white border-gray-200 text-gray-600"].join(" ")}>
                <Loader2 className="animate-spin" size={28} />
              </div>
            ) : uiState === "ai_speaking" ? (
              <div className={[commonButton, isDark ? "bg-zinc-800 border-zinc-700 text-zinc-400" : "bg-white border-gray-200 text-gray-600"].join(" ")}>
                <Volume2 size={28} />
              </div>
            ) : uiState === "complete" ? (
              <div className={[commonButton, isDark ? "bg-zinc-800 border-zinc-700 text-green-400" : "bg-white border-gray-200 text-green-600"].join(" ")}>
                <CheckCircle size={28} />
              </div>
            ) : (
              <button
                type="button"
                onClick={startRecording}
                className={[
                  commonButton,
                  isDark
                    ? "bg-zinc-800 border-zinc-700 text-zinc-200 hover:border-[#7C3AED]"
                    : "bg-white border-gray-200 text-gray-700 hover:border-[#2563EB]",
                ].join(" ")}
              >
                <Mic size={28} />
              </button>
            )}
            <div className={["text-sm", isDark ? "text-zinc-400" : "text-gray-600"].join(" ")}>
              {statusText}
            </div>
          </div>

          <div className="mt-10">
            <ScrollArea className={["h-[420px] rounded-xl border p-4", scrollBg].join(" ")}>
              <div className="space-y-3">
                {transcript.map((t, idx) => (
                  <div
                    key={idx}
                    className={["flex", t.speaker === "ai" ? "justify-start" : "justify-end"].join(" ")}
                  >
                    <div
                      className={[
                        "max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed border",
                        t.speaker === "ai" ? aiBubble : candidateBubble,
                      ].join(" ")}
                    >
                      {t.text}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>
      </div>

      {/* Bottom progress bar */}
      <div className={["fixed bottom-0 left-0 right-0 border-t", barBg].join(" ")}>
        <div className="mx-auto max-w-5xl px-4 py-4 space-y-2">
          <Progress value={progressValue} />
          <div className={["text-xs", isDark ? "text-zinc-500" : "text-gray-600"].join(" ")}>
            Question {Math.min(qIndex + 1, qTotal)} of {qTotal}
          </div>
        </div>
      </div>
    </div>
  )
}
