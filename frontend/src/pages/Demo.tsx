import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { ArrowLeft, CheckCircle, Moon, Sun, Upload } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { JOB_ROLES } from "@/lib/constants"
import { useTheme } from "@/lib/theme-context"

type Step = "intro" | "setup"

export default function DemoPage() {
  const navigate = useNavigate()
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === "dark"

  const [step, setStep] = useState<Step>("intro")
  const [file, setFile] = useState<File | null>(null)
  const [jobRole, setJobRole] = useState<(typeof JOB_ROLES)[number]>("Software Engineer")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const pageBg = isDark ? "bg-zinc-950 text-white" : "bg-[#FAFAFA] text-black"
  const header = isDark ? "bg-zinc-950/80 border-zinc-800" : "bg-white/80 border-gray-200"
  const cardBg = isDark ? "bg-zinc-900 border-zinc-800" : "bg-white border-gray-200"
  const outline = isDark ? "border-zinc-700 text-white hover:bg-white/10" : "border-gray-300 text-gray-900 hover:bg-gray-50"

  const canStart = Boolean(file && jobRole && !loading)

  const helperText = useMemo(() => {
    if (!file) return "Upload a resume PDF to begin."
    if (!jobRole) return "Select a role."
    return "Ready to begin the demo interview."
  }, [file, jobRole])

  async function beginDemo() {
    if (!file) return
    setLoading(true)
    setError(null)
    try {
      const demoEmail = `demo+${Date.now()}@sage.ai`
      const demoName = "Demo Candidate"
      const r = await fetch("http://localhost:8000/api/auth/candidate-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: demoName, email: demoEmail }),
      })
      if (!r.ok) {
        const e = (await r.json().catch(() => ({}))) as { detail?: string }
        throw new Error(e.detail || "Demo login failed")
      }
      const auth = (await r.json()) as { token: string; candidate: { id: string; name?: string; email?: string } }

      const fd = new FormData()
      fd.append("file", file)
      fd.append("job_role", jobRole)
      fd.append("candidate_id", String(auth.candidate.id))

      const res = await fetch("http://localhost:8000/api/upload-resume", {
        method: "POST",
        headers: auth.token ? { Authorization: `Bearer ${auth.token}` } : {},
        body: fd,
      })
      if (!res.ok) {
        const e = (await res.json().catch(() => ({}))) as { detail?: string }
        throw new Error(e.detail || "Upload failed")
      }
      const data = (await res.json()) as { candidate_id: string; interview_id: string }
      try {
        const raw = localStorage.getItem("sage_demo_interview_ids") || "[]"
        const ids = (JSON.parse(raw) as unknown[]).filter((x): x is string => typeof x === "string")
        if (!ids.includes(data.interview_id)) ids.push(data.interview_id)
        localStorage.setItem("sage_demo_interview_ids", JSON.stringify(ids))
      } catch {
        localStorage.setItem("sage_demo_interview_ids", JSON.stringify([data.interview_id]))
      }

      navigate("/interview", {
        state: { candidateId: data.candidate_id, interviewId: data.interview_id, jobRole, demoMode: true, demoToken: auth.token },
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : "Demo failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={["min-h-screen", pageBg].join(" ")}>
      <header className={["sticky top-0 z-50 border-b backdrop-blur-lg", header].join(" ")}>
        <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <button type="button" onClick={() => navigate("/home")} className="flex items-center gap-2 font-bold text-xl">
            <ArrowLeft className="w-4 h-4" /> SAGE
          </button>
          <div className="flex items-center gap-2">
            <Button
              size="icon"
              variant="outline"
              onClick={toggleTheme}
              className={isDark ? "border-zinc-800 bg-transparent hover:bg-zinc-900" : "border-gray-200 bg-white hover:bg-gray-50"}
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
            <Button variant="outline" className={outline} onClick={() => navigate("/login")}>
              Login
            </Button>
          </div>
        </nav>
      </header>

      <main className="px-4 py-16">
        <div className="mx-auto max-w-3xl space-y-6">
          {step === "intro" ? (
            <Card className={["p-8 rounded-xl", cardBg].join(" ")}>
              <div className="text-3xl font-bold">Demo Mode</div>
              <div className="text-muted-foreground mt-2">
                Run a full end-to-end interview in minutes. Upload a resume, choose a role, and start the AI voice interview.
              </div>
              <div className="mt-6 flex gap-3 flex-wrap">
                <Button
                  className={isDark ? "bg-white text-black hover:bg-white/90 border border-white" : "bg-black text-white hover:bg-black/90 border border-black"}
                  onClick={() => setStep("setup")}
                >
                  Start Demo
                </Button>
                <Button variant="outline" className={outline} onClick={() => navigate("/home")}>
                  Back to Home
                </Button>
              </div>
            </Card>
          ) : null}

          {step === "setup" ? (
            <Card className={["p-8 rounded-xl", cardBg].join(" ")}>
              <div className="text-2xl font-semibold">Start Demo Interview</div>
              <div className="text-muted-foreground mt-1">Upload a resume and select a role to begin.</div>

              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="text-sm font-medium">Resume PDF</div>
                  <div
                    className={["border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors", isDark ? "border-zinc-700 hover:border-white/40" : "border-gray-200 hover:border-black/30"].join(" ")}
                    onClick={() => document.getElementById("demo-resume")?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault()
                      const f = e.dataTransfer.files?.[0]
                      if (f) setFile(f)
                    }}
                  >
                    {file ? (
                      <div className="text-green-500">
                        <CheckCircle className="w-8 h-8 mx-auto mb-2" />
                        <div className={["text-sm font-medium", isDark ? "text-white" : "text-black"].join(" ")}>{file.name}</div>
                        <div className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(0)} KB</div>
                      </div>
                    ) : (
                      <div className="text-muted-foreground">
                        <Upload className="w-8 h-8 mx-auto mb-2" />
                        <div className="text-sm">Drag & drop or click to browse</div>
                      </div>
                    )}
                    <input
                      id="demo-resume"
                      type="file"
                      accept=".pdf"
                      className="hidden"
                      onChange={(e) => setFile(e.target.files?.[0] || null)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-medium">Role</div>
                  <select
                    value={jobRole}
                    onChange={(e) => setJobRole(e.target.value as (typeof JOB_ROLES)[number])}
                    className={["h-11 w-full rounded-lg border px-3 text-sm outline-none", isDark ? "bg-zinc-800 border-zinc-700 text-zinc-50" : "bg-white border-gray-200 text-gray-900"].join(" ")}
                  >
                    {JOB_ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>

                  <div className="mt-4">
                    <div className="text-xs text-muted-foreground">{helperText}</div>
                  </div>
                </div>
              </div>

              {error ? <div className="mt-4 text-sm text-red-500">{error}</div> : null}

              <div className="mt-6 flex gap-3 flex-wrap">
                <Button
                  disabled={!canStart}
                  className={isDark ? "bg-white text-black hover:bg-white/90 border border-white" : "bg-black text-white hover:bg-black/90 border border-black"}
                  onClick={() => void beginDemo()}
                >
                  {loading ? "Starting..." : "Begin Demo Interview"}
                </Button>
                <Button variant="outline" className={outline} onClick={() => navigate("/home")}>
                  Cancel
                </Button>
              </div>
            </Card>
          ) : null}
        </div>
      </main>
    </div>
  )
}
