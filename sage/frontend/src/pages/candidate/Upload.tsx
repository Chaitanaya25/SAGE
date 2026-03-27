import React, { useCallback, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { uploadResume } from "@/lib/api"
import { Button } from "@/components/ui/button"
import SplitText from "@/components/SplitText"
import FadeContent from "@/components/FadeContent"
import ClickSpark from "@/components/ClickSpark"
import { Upload as UploadIcon, CheckCircle, FileText, Loader2 } from "lucide-react"
import { JOB_ROLES } from "@/lib/constants"

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B"
  const units = ["B", "KB", "MB", "GB", "TB"]
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const value = bytes / Math.pow(1024, index)
  const formatted = value >= 10 || index === 0 ? value.toFixed(0) : value.toFixed(1)
  return `${formatted} ${units[index]}`
}

export default function Upload() {
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement | null>(null)

  const [file, setFile] = useState<File | null>(null)
  const [jobRole, setJobRole] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const onBrowse = useCallback(() => {
    inputRef.current?.click()
  }, [])

  const onFilePicked = useCallback((nextFile: File | null) => {
    if (!nextFile) return
    if (nextFile.type !== "application/pdf" && !nextFile.name.toLowerCase().endsWith(".pdf")) {
      alert("Please upload a PDF file.")
      return
    }
    setFile(nextFile)
  }, [])

  const onDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      e.stopPropagation()
      const dropped = e.dataTransfer.files?.[0] ?? null
      onFilePicked(dropped)
    },
    [onFilePicked]
  )

  const canSubmit = Boolean(file) && Boolean(jobRole) && !isLoading

  async function onSubmit() {
    if (!file || !jobRole || isLoading) return
    setIsLoading(true)
    try {
      const data: unknown = await uploadResume(file, jobRole)
      const candidateId = (data as { candidate_id?: unknown }).candidate_id
      const interviewId = (data as { interview_id?: unknown }).interview_id

      if (typeof candidateId !== "string" || typeof interviewId !== "string") {
        throw new Error("Unexpected server response")
      }

      navigate("/interview", { state: { candidateId, interviewId } })
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload failed"
      alert(message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <FadeContent blur={true} duration={800}>
      <div className="min-h-screen bg-[#FAFAFA] text-[#0A0A0A]">
        <div className="pt-6 pl-6 font-semibold text-xl text-[#0A0A0A]">SAGE</div>

        <div className="max-w-xl mx-auto pt-24 px-4">
          <SplitText
            text="Upload Your Resume"
            delay={80}
            splitType="chars"
            tag="h1"
            textAlign="left"
            className="text-4xl font-semibold text-[#0A0A0A] mb-3"
          />
          <div className="text-gray-500 mb-8">
            We'll analyze your resume and prepare a personalized interview
          </div>

          {!file ? (
            <div
              onClick={onBrowse}
              onDragOver={onDragOver}
              onDrop={onDrop}
              className="border-2 border-dashed border-gray-300 rounded-lg p-12 flex flex-col items-center justify-center cursor-pointer hover:border-[#2563EB] hover:bg-blue-50/30 transition-all duration-200 ease-out"
              role="button"
              tabIndex={0}
            >
              <UploadIcon size={48} className="text-gray-400" />
              <div className="text-gray-600 font-medium mt-4">
                Drag and drop your PDF here
              </div>
              <div className="text-[#2563EB] text-sm mt-1">or click to browse</div>
              <input
                ref={inputRef}
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={(e) => onFilePicked(e.target.files?.[0] ?? null)}
              />
            </div>
          ) : (
            <div className="flex items-center gap-3 bg-white border border-[#E5E7EB] rounded-lg p-4">
              <FileText size={20} className="text-green-600" />
              <div className="min-w-0">
                <div className="font-medium truncate">{file.name}</div>
                <div className="text-sm text-gray-500">{formatBytes(file.size)}</div>
              </div>
              <div className="ml-auto flex items-center gap-3">
                <CheckCircle size={20} className="text-green-600" />
                <button
                  type="button"
                  onClick={() => setFile(null)}
                  className="text-sm text-gray-500 hover:text-[#0A0A0A] transition-colors duration-200 ease-out"
                >
                  Remove
                </button>
              </div>
            </div>
          )}

          <div className="mt-6">
            <div className="text-sm font-medium text-gray-700 mb-2">Applying for</div>
            <select
              className="bg-white border border-[#E5E7EB] rounded-lg px-4 py-2.5 w-full text-[#0A0A0A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-colors duration-200 ease-out"
              value={jobRole}
              onChange={(e) => setJobRole(e.target.value)}
            >
              <option value="" disabled>
                Select a role...
              </option>
              {JOB_ROLES.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-6">
            <div className="h-12 w-full">
              <ClickSpark sparkColor="#2563EB">
                <Button
                  type="button"
                  onClick={onSubmit}
                  disabled={!canSubmit}
                  className="h-12 w-full bg-[#2563EB] text-white hover:bg-[#1D4ED8] transition-colors duration-200 ease-out"
                >
                  {isLoading ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Analyzing Resume...
                    </span>
                  ) : (
                    "Begin Interview"
                  )}
                </Button>
              </ClickSpark>
            </div>
          </div>
        </div>
      </div>
    </FadeContent>
  )
}
