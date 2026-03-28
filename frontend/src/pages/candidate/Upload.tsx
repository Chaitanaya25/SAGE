import { useEffect, useMemo, useRef, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import {
  ArrowLeft,
  CheckCircle,
  FileText,
  Loader2,
  Upload as UploadIcon,
  X,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { JOB_ROLES } from "@/lib/constants"
import { uploadResume } from "@/lib/api"

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  const kb = bytes / 1024
  if (kb < 1024) return `${kb.toFixed(1)} KB`
  return `${(kb / 1024).toFixed(1)} MB`
}

export default function Upload() {
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [file, setFile] = useState<File | null>(null)
  type JobRole = (typeof JOB_ROLES)[number]
  const [jobRole, setJobRole] = useState<JobRole | "">("")
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadingStepIndex, setLoadingStepIndex] = useState(0)

  const loadingSteps = ["Parsing resume...", "Generating questions...", "Preparing interview..."] as const

  useEffect(() => {
    if (!loading) return
    setLoadingStepIndex(0)
    const t1 = window.setTimeout(() => setLoadingStepIndex(1), 2000)
    const t2 = window.setTimeout(() => setLoadingStepIndex(2), 4000)
    return () => {
      window.clearTimeout(t1)
      window.clearTimeout(t2)
    }
  }, [loading])

  const fileMeta = useMemo(() => {
    if (!file) return null
    return { name: file.name, size: formatBytes(file.size) }
  }, [file])

  function openPicker() {
    inputRef.current?.click()
  }

  function onFilesSelected(files: FileList | null) {
    const f = files?.[0]
    if (!f) return
    if (!f.name.toLowerCase().endsWith(".pdf")) {
      setError("Please upload a PDF file.")
      return
    }
    setError(null)
    setFile(f)
  }

  async function onSubmit() {
    if (!file || !jobRole) return
    setLoading(true)
    setError(null)
    try {
      const result = await uploadResume(file, jobRole)
      localStorage.setItem("sage_candidate_id", result.candidate_id)
      localStorage.setItem("sage_interview_id", result.interview_id)
      navigate("/interview", {
        state: { candidateId: result.candidate_id, interviewId: result.interview_id },
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <div className="absolute top-6 left-6 font-semibold text-xl text-[#0A0A0A]">SAGE</div>
      <div className="max-w-xl mx-auto pt-20 px-4">
        <Link
          to="/home"
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft size={16} />
          Back to Home
        </Link>
        <div className="space-y-2">
          <div className="text-3xl font-semibold text-[#0A0A0A]">Upload Your Resume</div>
          <div className="text-sm text-gray-600">
            We'll analyze your resume and prepare a personalized interview
          </div>
        </div>

        <div className="mt-10 space-y-6">
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
              "border-2 border-dashed rounded-lg p-16 text-center cursor-pointer transition",
              dragging ? "border-[#2563EB] bg-blue-50/40" : "border-gray-300 hover:border-[#2563EB]",
            ].join(" ")}
          >
            <UploadIcon className="mx-auto mb-4 text-gray-500" size={48} />
            <div className="text-base font-medium text-[#0A0A0A]">Drag and drop your PDF</div>
            <div className="text-sm text-gray-600">
              or <span className="text-[#2563EB]">click to browse</span>
            </div>
          </div>

          {fileMeta ? (
            <Card className="p-6 flex items-center justify-between border border-[#E5E7EB]">
              <div className="flex items-center gap-3">
                <FileText className="text-gray-600" />
                <div>
                  <div className="text-base font-semibold text-[#0A0A0A]">{fileMeta.name}</div>
                  <div className="text-sm text-gray-600">{fileMeta.size}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className="text-green-600" />
                <button
                  type="button"
                  className="text-gray-500 hover:text-gray-700"
                  onClick={() => setFile(null)}
                >
                  <X />
                </button>
              </div>
            </Card>
          ) : null}

          <div className="space-y-2">
            <div className="text-sm font-medium text-[#0A0A0A]">Job Role</div>
            <select
              className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
              value={jobRole}
              onChange={(e) => setJobRole(e.target.value as JobRole | "")}
            >
              <option value="">Select a role</option>
              {JOB_ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          {error ? <div className="text-sm text-red-600">{error}</div> : null}

          <Button className="w-full" disabled={!file || !jobRole || loading} onClick={onSubmit}>
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="animate-spin" />
                Beginning...
              </span>
            ) : (
              "Begin Interview"
            )}
          </Button>

          {loading ? (
            <Card className="p-4 border border-[#E5E7EB] bg-white">
              <div className="flex items-center justify-between text-sm">
                <div className="inline-flex items-center gap-2 text-gray-700">
                  <Loader2 className="animate-spin" size={16} />
                  <span>{loadingSteps[loadingStepIndex]}</span>
                </div>
                <div className="text-gray-500">
                  {loadingStepIndex + 1}/{loadingSteps.length}
                </div>
              </div>
              <div className="mt-3">
                <Progress value={((loadingStepIndex + 1) / loadingSteps.length) * 100} />
              </div>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  )
}
