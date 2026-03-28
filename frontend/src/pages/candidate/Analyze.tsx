import { useMemo, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { CheckCircle, FileText, Upload as UploadIcon, X as XIcon } from "lucide-react"

import AnimatedBackground from "@/components/AnimatedBackground"
import CandidateHeader from "@/components/CandidateHeader"
import Loader from "@/components/Loader"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { uploadResume } from "@/lib/api"
import { JOB_ROLES } from "@/lib/constants"
import { useTheme } from "@/lib/theme-context"

type UploadState = "idle" | "loading" | "done"

type UploadResult = {
  candidate_id: string
  interview_id: string
  status: string
  questions_count: number
  resume_parsed?: Record<string, unknown>
}

function AnalyzeInner() {
  const navigate = useNavigate()
  const { theme } = useTheme()
  const isDark = theme === "dark"
  const inputRef = useRef<HTMLInputElement | null>(null)

  const [file, setFile] = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)
  type JobRole = (typeof JOB_ROLES)[number]
  const [targetRole, setTargetRole] = useState<JobRole | "">(JOB_ROLES[0] ?? "")
  const [uploadState, setUploadState] = useState<UploadState>("idle")
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<UploadResult | null>(null)

  const candidate = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("sage_candidate") ?? "{}") as {
        id?: string
        candidate_id?: string
        name?: string
        email?: string
        resume_parsed?: Record<string, unknown>
      }
    } catch {
      return {} as {
        id?: string
        candidate_id?: string
        name?: string
        email?: string
        resume_parsed?: Record<string, unknown>
      }
    }
  }, [])

  const candidateId = candidate.id ?? candidate.candidate_id ?? localStorage.getItem("sage_candidate_id") ?? ""

  const cardShell = isDark
    ? "bg-zinc-900/60 border-zinc-800 text-zinc-50"
    : "bg-white border-gray-200 text-gray-900"

  function openPicker() {
    inputRef.current?.click()
  }

  function onFilesSelected(files: FileList | null) {
    const f = files?.[0]
    if (!f) return
    setFile(f)
  }

  async function analyze() {
    if (!file || !targetRole) return
    setUploadState("loading")
    setError(null)
    setResult(null)
    try {
      const res = (await uploadResume(file, targetRole, candidateId || undefined)) as UploadResult
      localStorage.setItem("sage_candidate_id", res.candidate_id)
      localStorage.setItem("sage_interview_id", res.interview_id)

      if (res.resume_parsed && typeof res.resume_parsed === "object") {
        try {
          const merged = { ...candidate, resume_parsed: res.resume_parsed }
          const name = typeof (res.resume_parsed as Record<string, unknown>).name === "string" ? String((res.resume_parsed as Record<string, unknown>).name) : ""
          const email = typeof (res.resume_parsed as Record<string, unknown>).email === "string" ? String((res.resume_parsed as Record<string, unknown>).email) : ""
          localStorage.setItem("sage_candidate", JSON.stringify({ ...merged, ...(name ? { name } : {}), ...(email ? { email } : {}) }))
        } catch (e) {
          console.error("Failed to persist candidate profile:", e)
        }
      }

      setResult(res)
      setUploadState("done")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed")
      setUploadState("idle")
    }
  }

  return (
    <div className={["max-w-6xl mx-auto px-4", isDark ? "text-zinc-50" : "text-gray-900"].join(" ")}>
      <div className="space-y-1">
        <div className="text-2xl font-semibold">Resume Analysis</div>
        <div className="text-sm text-muted-foreground">Upload your resume to generate questions for your next assessment.</div>
      </div>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className={["p-6 backdrop-blur-sm", cardShell].join(" ")}>
            <div className="text-lg font-semibold">Upload Resume</div>
            <div className="mt-4">
              <input
                ref={inputRef}
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={(e) => onFilesSelected(e.target.files)}
              />
              <div
                role="button"
                tabIndex={0}
                onClick={openPicker}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") openPicker()
                }}
                onDragEnter={(e) => {
                  e.preventDefault()
                  setDragging(true)
                }}
                onDragOver={(e) => {
                  e.preventDefault()
                  setDragging(true)
                }}
                onDragLeave={(e) => {
                  e.preventDefault()
                  setDragging(false)
                }}
                onDrop={(e) => {
                  e.preventDefault()
                  setDragging(false)
                  onFilesSelected(e.dataTransfer.files)
                }}
                className={[
                  "border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition",
                  dragging
                    ? isDark
                      ? "border-[#7C3AED] bg-purple-500/10"
                      : "border-[#2563EB] bg-blue-500/10"
                    : isDark
                      ? "border-zinc-800 hover:border-[#7C3AED]"
                      : "border-gray-200 hover:border-[#2563EB]",
                ].join(" ")}
              >
                <UploadIcon className="mx-auto mb-3 text-muted-foreground" size={40} />
                <div className="text-sm font-medium">Drag and drop your resume PDF</div>
                <div className="text-xs text-muted-foreground mt-1">or click to browse</div>
              </div>
            </div>

            {file ? (
              <div className={["mt-4 flex items-center justify-between rounded-lg border p-3", isDark ? "border-zinc-800" : "border-gray-200"].join(" ")}>
                <div className="flex items-center gap-3">
                  <FileText className="text-muted-foreground" size={18} />
                  <div>
                    <div className="text-sm font-medium">{file.name}</div>
                    <div className="text-xs text-muted-foreground">Ready</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="text-green-500" size={18} />
                  <button type="button" onClick={() => setFile(null)} className="text-muted-foreground hover:text-foreground">
                    <XIcon size={18} />
                  </button>
                </div>
              </div>
            ) : null}
          </Card>

          <Card className={["p-6 backdrop-blur-sm", cardShell].join(" ")}>
            <div className="text-lg font-semibold">Target Role</div>
            <div className="mt-4 space-y-4">
              <div className="space-y-2">
                <Label>Role</Label>
                <select
                  className={[
                    "h-10 w-full rounded-lg border px-3 text-sm outline-none transition-colors",
                    isDark
                      ? "bg-zinc-950 border-zinc-800 text-white focus:border-[#7C3AED]"
                      : "bg-white border-gray-200 text-gray-900 focus:border-[#2563EB]",
                  ].join(" ")}
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value as JobRole | "")}
                >
                  {JOB_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              {error ? <div className="text-sm text-red-500">{error}</div> : null}

              <Button
                className={[
                  "w-full",
                  isDark ? "bg-[#7C3AED] text-white hover:bg-[#7C3AED]/90" : "bg-black text-white hover:bg-black/90 border border-black",
                ].join(" ")}
                disabled={!file || !targetRole || uploadState === "loading"}
                onClick={analyze}
              >
                {uploadState === "loading" ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="inline-flex">
                      <Loader size={16} color="#FFFFFF" />
                    </span>
                    Uploading...
                  </span>
                ) : (
                  "Analyze Resume"
                )}
              </Button>
            </div>
          </Card>
        </div>

        {uploadState === "done" && result ? (
          <div className="mt-8">
            <Card className={["p-6 backdrop-blur-sm", cardShell].join(" ")}>
              <div className="text-lg font-semibold">Analysis Ready</div>
              <div className="mt-2 text-sm text-muted-foreground">
                Questions generated: <span className="font-medium tabular-nums">{result.questions_count}</span>
              </div>
              {typeof (result.resume_parsed as Record<string, unknown> | undefined)?.role_fit_score === "number" ? (
                <div className="mt-1 text-sm text-muted-foreground">
                  Role fit score:{" "}
                  <span className="font-medium tabular-nums">
                    {String((result.resume_parsed as Record<string, unknown>).role_fit_score)}/10
                  </span>
                </div>
              ) : null}
              <div className="mt-5 flex flex-col sm:flex-row gap-3 justify-end">
                <Button
                  className={isDark ? "bg-[#7C3AED] text-white hover:bg-[#7C3AED]/90" : "bg-black text-white hover:bg-black/90 border border-black"}
                  onClick={() =>
                    navigate("/interview", {
                      state: { candidateId: result.candidate_id, interviewId: result.interview_id, jobRole: targetRole },
                    })
                  }
                >
                  Start Interview
                </Button>
                <Button
                  variant="outline"
                  className={isDark ? "border-zinc-700 text-white hover:bg-white/10" : "border-gray-300 text-gray-900 hover:bg-gray-50"}
                  onClick={() => navigate("/dashboard")}
                >
                  Back to Dashboard
                </Button>
              </div>
            </Card>
          </div>
        ) : null}
    </div>
  )
}

export function AnalyzeContent(props: { compact?: boolean } = {}) {
  const { compact = false } = props
  return (
    <div className={compact ? "" : "pt-24 pb-16"}>
      <AnalyzeInner />
    </div>
  )
}

export default function Analyze() {
  const { theme } = useTheme()
  const isDark = theme === "dark"
  return (
    <div className={["min-h-screen relative", isDark ? "bg-black text-zinc-50" : "bg-white text-gray-900"].join(" ")}>
      <AnimatedBackground variant="particles" />
      <div className="relative z-10">
        <CandidateHeader />
        <AnalyzeContent />
      </div>
    </div>
  )
}
