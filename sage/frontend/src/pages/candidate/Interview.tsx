import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import FadeContent from "@/components/FadeContent";
import DecryptedText from "@/components/DecryptedText";
import { Mic, Volume2, Loader2, CheckCircle } from "lucide-react";
import { WS_URL } from "@/lib/api";
import type { WebSocketMessage, TranscriptEntry } from "@/types";

type InterviewState =
  | "connecting"
  | "idle"
  | "recording"
  | "processing"
  | "ai_speaking"
  | "complete";

export default function Interview() {
  const navigate = useNavigate();
  const location = useLocation();
  const { candidateId } = (location.state as { candidateId?: string; interviewId?: string }) ?? {};

  const [interviewState, setInterviewState] = useState<InterviewState>("connecting");
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [currentQuestionText, setCurrentQuestionText] = useState("");
  const [currentCategory, setCurrentCategory] = useState("");
  const [connectionError, setConnectionError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  const wsRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // WebSocket connection
  useEffect(() => {
    if (!candidateId) {
      navigate("/upload");
      return;
    }

    setInterviewState("connecting");
    setConnectionError(false);

    const ws = new WebSocket(`${WS_URL}/${candidateId}`);
    wsRef.current = ws;

    ws.onopen = () => {
      setInterviewState("idle");
    };

    ws.onmessage = (event: MessageEvent) => {
      // Binary frame = TTS audio from ElevenLabs
      if (event.data instanceof Blob) {
        const url = URL.createObjectURL(new Blob([event.data], { type: "audio/mpeg" }));
        const audio = audioRef.current;
        if (audio) {
          audio.src = url;
          audio.play().catch(() => {});
          setInterviewState("ai_speaking");
          audio.onended = () => setInterviewState("idle");
        }
        return;
      }

      // Text frame = JSON control message
      const msg = JSON.parse(event.data as string) as WebSocketMessage;

      switch (msg.type) {
        case "question":
          setTranscript((prev) => [
            ...prev,
            { speaker: "ai", text: msg.text ?? "", timestamp: new Date() },
          ]);
          setCurrentQuestion(msg.index ?? 0);
          setTotalQuestions(msg.total ?? 0);
          setCurrentQuestionText(msg.text ?? "");
          setCurrentCategory(msg.category ?? "");
          break;

        case "transcript":
          setTranscript((prev) => [
            ...prev,
            { speaker: "candidate", text: msg.text ?? "", timestamp: new Date() },
          ]);
          break;

        case "status":
          if (msg.message === "listening") setInterviewState("idle");
          if (msg.message === "processing") setInterviewState("processing");
          break;

        case "complete":
          setInterviewState("complete");
          setTimeout(() => navigate("/done"), 2000);
          break;

        case "error":
        case "warning":
          setTranscript((prev) => [
            ...prev,
            { speaker: "ai", text: msg.message ?? "", timestamp: new Date() },
          ]);
          setInterviewState("idle");
          break;
      }
    };

    ws.onclose = () => {
      setInterviewState((prev) => (prev === "complete" ? "complete" : "idle"));
    };

    ws.onerror = (e) => {
      console.error("WebSocket error", e);
      setConnectionError(true);
    };

    return () => {
      ws.close();
    };
  }, [candidateId, retryKey]); // retryKey triggers reconnect

  // Auto-scroll transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript]);

  const toggleRecording = useCallback(async () => {
    if (interviewState === "idle") {
      if (!navigator.mediaDevices || typeof MediaRecorder === "undefined") {
        alert("Browser doesn't support audio recording");
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : "audio/webm";
        const recorder = new MediaRecorder(stream, { mimeType });
        audioChunksRef.current = [];

        recorder.ondataavailable = (e) => {
          audioChunksRef.current.push(e.data);
        };

        recorder.onstop = () => {
          const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(blob);
          }
          setInterviewState("processing");
        };

        recorder.start();
        mediaRecorderRef.current = recorder;
        setInterviewState("recording");
      } catch {
        alert("Could not access microphone. Please check your browser permissions.");
      }
    } else if (interviewState === "recording") {
      mediaRecorderRef.current?.stop();
      mediaRecorderRef.current?.stream.getTracks().forEach((t) => t.stop());
    }
  }, [interviewState]);

  // Mic button appearance config
  const micConfig = {
    connecting: {
      className: "bg-gray-200 cursor-not-allowed",
      icon: <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />,
      disabled: true,
    },
    idle: {
      className: "bg-[#F3F4F6] hover:bg-[#E5E7EB] cursor-pointer",
      icon: <Mic className="w-8 h-8 text-gray-500" />,
      disabled: false,
    },
    recording: {
      className: "bg-[#2563EB] cursor-pointer",
      icon: <Mic className="w-8 h-8 text-white" />,
      disabled: false,
    },
    processing: {
      className: "bg-[#F3F4F6] cursor-not-allowed",
      icon: <Loader2 className="w-8 h-8 text-gray-500 animate-spin" />,
      disabled: true,
    },
    ai_speaking: {
      className: "bg-[#DBEAFE] cursor-not-allowed",
      icon: <Volume2 className="w-8 h-8 text-[#2563EB]" />,
      disabled: true,
    },
    complete: {
      className: "bg-green-100 cursor-not-allowed",
      icon: <CheckCircle className="w-8 h-8 text-green-600" />,
      disabled: true,
    },
  }[interviewState];

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <style>{`
        .waveform-bar { animation: waveform 1s ease-in-out infinite; }
        .waveform-bar:nth-child(2) { animation-delay: 0.2s; }
        .waveform-bar:nth-child(3) { animation-delay: 0.4s; }
        @keyframes waveform { 0%, 100% { height: 12px; } 50% { height: 24px; } }
      `}</style>

      <audio ref={audioRef} className="hidden" />

      <FadeContent blur duration={800} className="min-h-screen">
        {/* Top bar */}
        <div className="fixed top-0 w-full bg-white border-b border-[#E5E7EB] h-14 px-6 flex items-center justify-between z-50">
          <span className="font-semibold text-lg text-[#0A0A0A]">SAGE</span>

          <div className="flex items-center gap-2">
            {interviewState !== "complete" && (
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            )}
            <span className="text-sm text-gray-600">
              {interviewState === "complete" ? "Interview Complete" : "Interview in Progress"}
            </span>
          </div>

          <Badge variant="outline">
            Q{currentQuestion + 1} / {Math.max(totalQuestions, 1)}
          </Badge>
        </div>

        {/* Main content */}
        <div className="pt-20 pb-24 flex flex-col items-center max-w-2xl mx-auto px-4">
          {/* Question display */}
          <div className="mb-6 text-center">
            {currentCategory && (
              <Badge className="mb-2 text-xs capitalize" variant="secondary">
                {currentCategory.replace("_", " ")}
              </Badge>
            )}
            {currentQuestionText ? (
              <p className="text-lg font-medium text-[#0A0A0A] max-w-lg">
                {currentQuestionText}
              </p>
            ) : (
              <p className="text-lg font-medium text-gray-400 max-w-lg">
                {interviewState === "connecting"
                  ? "Connecting to interview session..."
                  : "Waiting for first question..."}
              </p>
            )}
          </div>

          {/* Mic button */}
          <div className="mb-8 flex flex-col items-center">
            <div className="relative flex items-center justify-center">
              {interviewState === "recording" && (
                <div className="absolute w-24 h-24 rounded-full bg-[#2563EB]/20 animate-ping" />
              )}
              <button
                onClick={micConfig.disabled ? undefined : toggleRecording}
                disabled={micConfig.disabled}
                className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-200 shadow-lg ${micConfig.className}`}
                aria-label={interviewState === "recording" ? "Stop recording" : "Start recording"}
              >
                {micConfig.icon}
              </button>
            </div>

            {/* State label */}
            <div className="mt-3 text-sm text-gray-500 flex flex-col items-center gap-2">
              {interviewState === "connecting" && <span>Connecting...</span>}
              {interviewState === "idle" && <span>Click to speak</span>}
              {interviewState === "recording" && (
                <span className="text-[#2563EB] font-medium">Listening... Click to stop</span>
              )}
              {interviewState === "processing" && (
                <DecryptedText
                  text="SAGE is thinking..."
                  speed={50}
                  animateOn="view"
                  className="text-gray-500"
                />
              )}
              {interviewState === "ai_speaking" && (
                <>
                  <span>SAGE is speaking...</span>
                  <div className="flex items-end gap-1 h-6">
                    <div className="w-1 bg-[#2563EB] rounded-full waveform-bar" />
                    <div className="w-1 bg-[#2563EB] rounded-full waveform-bar" />
                    <div className="w-1 bg-[#2563EB] rounded-full waveform-bar" />
                  </div>
                </>
              )}
              {interviewState === "complete" && (
                <span className="text-green-600 font-medium">Interview complete!</span>
              )}
            </div>

            {/* Connection error retry */}
            {connectionError && interviewState !== "complete" && (
              <div className="mt-4 flex flex-col items-center gap-2">
                <span className="text-sm text-red-500">Connection lost.</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setConnectionError(false);
                    setRetryKey((k) => k + 1);
                  }}
                >
                  Retry Connection
                </Button>
              </div>
            )}
          </div>

          {/* Transcript */}
          <div className="w-full mt-4">
            <ScrollArea className="h-[350px] w-full rounded-lg border border-[#E5E7EB] bg-white p-4">
              {transcript.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <span className="text-gray-400 text-sm">
                    Waiting for interview to begin...
                  </span>
                </div>
              ) : (
                transcript.map((entry, i) =>
                  entry.speaker === "ai" ? (
                    <div key={i} className="flex justify-start mb-3">
                      <div className="bg-[#F3F4F6] rounded-lg rounded-tl-none p-3 max-w-[80%]">
                        <div className="text-xs font-medium text-[#2563EB] mb-1">SAGE</div>
                        <div className="text-sm text-[#0A0A0A]">{entry.text}</div>
                      </div>
                    </div>
                  ) : (
                    <div key={i} className="flex justify-end mb-3">
                      <div className="bg-white border-l-2 border-[#2563EB] rounded-lg rounded-tr-none p-3 max-w-[80%]">
                        <div className="text-xs font-medium text-gray-500 mb-1">You</div>
                        <div className="text-sm text-[#0A0A0A]">{entry.text}</div>
                      </div>
                    </div>
                  )
                )
              )}
              <div ref={transcriptEndRef} />
            </ScrollArea>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="fixed bottom-0 w-full bg-white border-t border-[#E5E7EB] px-6 py-3">
          <Progress
            value={(currentQuestion / Math.max(totalQuestions, 1)) * 100}
            className="h-1.5 mb-2"
          />
          <p className="text-xs text-gray-500 text-center">
            Question {currentQuestion + 1} of {Math.max(totalQuestions, 1)}
          </p>
        </div>
      </FadeContent>
    </div>
  );
}
