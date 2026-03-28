import { useEffect, useMemo, useRef, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { CheckCircle, Loader2, Mic, Volume2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import { WS_URL } from "@/lib/api"
import type { TranscriptEntry, WebSocketMessage } from "@/types"

type InterviewUiState = "connecting" | "idle" | "recording" | "processing" | "ai_speaking" | "complete"

function nowEntry(text: string, speaker: TranscriptEntry["speaker"]): TranscriptEntry {
  return { speaker, text, timestamp: new Date() }
}

export default function Interview() {
  const location = useLocation() as unknown as { state?: { candidateId?: string; interviewId?: string } }
  const navigate = useNavigate()
  const candidateId = location.state?.candidateId ?? null

  const [uiState, setUiState] = useState<InterviewUiState>("connecting")
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([])
  const [qIndex, setQIndex] = useState(0)
  const [qTotal, setQTotal] = useState(8)
  const [statusText, setStatusText] = useState<string>("Connecting...")

  const wsRef = useRef<WebSocket | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<BlobPart[]>([])

  const progressValue = useMemo(() => {
    if (!qTotal) return 0
    return Math.min(100, Math.max(0, ((qIndex + 1) / qTotal) * 100))
  }, [qIndex, qTotal])

  useEffect(() => {
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
  }, [candidateId, navigate])

  useEffect(() => {
    if (uiState !== "complete") return
    const t = setTimeout(() => navigate("/done", { replace: true }), 2000)
    return () => clearTimeout(t)
  }, [uiState, navigate])

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

  const commonButton =
    "w-20 h-20 rounded-full flex items-center justify-center border transition"

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <audio ref={audioRef} />
      <div className="fixed top-0 left-0 right-0 z-10 bg-white border-b border-[#E5E7EB]">
        <div className="mx-auto max-w-5xl px-4 h-14 flex items-center justify-between">
          <div className="font-semibold text-[#0A0A0A]">SAGE</div>
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <span className="h-2 w-2 rounded-full bg-green-500" />
            <span>Interview in Progress</span>
          </div>
          <Badge variant="secondary" className="bg-gray-100 text-gray-700 border border-gray-200">
            Q{Math.min(qIndex + 1, qTotal)}/{qTotal}
          </Badge>
        </div>
      </div>

      <div className="pt-20 pb-24">
        <div className="mx-auto max-w-5xl px-4">
          <div className="flex flex-col items-center gap-6">
            {uiState === "recording" ? (
              <button
                type="button"
                onClick={stopRecording}
                className={`${commonButton} bg-[#2563EB] border-[#2563EB] text-white relative`}
              >
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#2563EB]/30" />
                <Mic className="relative" size={28} />
              </button>
            ) : uiState === "processing" ? (
              <div className={`${commonButton} bg-white border-gray-200 text-gray-600`}>
                <Loader2 className="animate-spin" size={28} />
              </div>
            ) : uiState === "ai_speaking" ? (
              <div className={`${commonButton} bg-white border-gray-200 text-gray-600`}>
                <Volume2 size={28} />
              </div>
            ) : uiState === "complete" ? (
              <div className={`${commonButton} bg-white border-gray-200 text-green-600`}>
                <CheckCircle size={28} />
              </div>
            ) : (
              <button
                type="button"
                onClick={startRecording}
                className={`${commonButton} bg-white border-gray-200 text-gray-700 hover:border-[#2563EB]`}
              >
                <Mic size={28} />
              </button>
            )}
            <div className="text-sm text-gray-600">{statusText}</div>
          </div>

          <div className="mt-10">
            <ScrollArea className="h-[420px] rounded-xl border border-[#E5E7EB] bg-white p-4">
              <div className="space-y-3">
                {transcript.map((t, idx) => (
                  <div
                    key={idx}
                    className={`flex ${t.speaker === "ai" ? "justify-start" : "justify-end"}`}
                  >
                    <div
                      className={[
                        "max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
                        t.speaker === "ai"
                          ? "bg-gray-100 text-gray-900 border border-gray-200"
                          : "bg-white text-gray-900 border border-blue-200",
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

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E5E7EB]">
        <div className="mx-auto max-w-5xl px-4 py-4 space-y-2">
          <Progress value={progressValue} />
          <div className="text-xs text-gray-600">
            Question {Math.min(qIndex + 1, qTotal)} of {qTotal}
          </div>
        </div>
      </div>
    </div>
  )
}
