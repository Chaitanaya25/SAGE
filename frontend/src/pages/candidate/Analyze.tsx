import { useMemo, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { CheckCircle, FileText, Upload as UploadIcon, X as XIcon } from "lucide-react"
import { motion } from "framer-motion"
import { PolarAngleAxis, PolarGrid, Radar, RadarChart } from "recharts"

import AnimatedBackground from "@/components/AnimatedBackground"
import CandidateHeader from "@/components/CandidateHeader"
import Loader from "@/components/Loader"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { JOB_ROLES } from "@/lib/constants"
import { useTheme } from "@/lib/theme-context"

type AnalysisState = "idle" | "loading" | "done"

const SKILL_LABELS: Record<string, string> = {
  python: "Python",
  javascript: "JavaScript",
  react: "React",
  typescript: "TypeScript",
  nodejs: "Node.js",
  sql: "SQL",
  aws: "AWS",
  docker: "Docker",
  "machine-learning": "Machine Learning",
  git: "Git",
  "rest-api": "REST APIs",
  graphql: "GraphQL",
  tailwind: "Tailwind CSS",
  figma: "Figma",
  agile: "Agile/Scrum",
}

function formatPercent(n: number) {
  return `${Math.round(n)}%`
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

function normalizeSkillKey(raw: string) {
  const v = raw.trim().toLowerCase()
  if (v === "node") return "nodejs"
  if (v === "rest") return "rest-api"
  if (v === "machine learning") return "machine-learning"
  return v.replace(/\s+/g, "-")
}

export default function Analyze() {
  const navigate = useNavigate()
  const { theme } = useTheme()
  const isDark = theme === "dark"
  const inputRef = useRef<HTMLInputElement | null>(null)

  const [file, setFile] = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)
  const [jobDescription, setJobDescription] = useState("")
  const [jdError, setJdError] = useState<string | null>(null)
  type JobRole = (typeof JOB_ROLES)[number]
  const [targetRole, setTargetRole] = useState<JobRole | "">(JOB_ROLES[0] ?? "")
  const [analysisState, setAnalysisState] = useState<AnalysisState>("idle")

  const cardShell = isDark
    ? "bg-zinc-900/60 border-zinc-800 text-zinc-50"
    : "bg-white border-gray-200 text-gray-900"

  const accent = isDark ? "#7C3AED" : "#2563EB"

  const radarData = useMemo(
    () => [
      { skill: "Technical Skills", score: 85 },
      { skill: "Experience Match", score: 70 },
      { skill: "Education", score: 90 },
      { skill: "Keywords Match", score: 65 },
      { skill: "Formatting", score: 80 },
      { skill: "Role Fit", score: 75 },
    ],
    []
  )

  const chartConfig = useMemo(() => {
    const config: ChartConfig = {
      score: { label: "Score", color: accent },
    }
    return config
  }, [accent])

  const atsScore = 78
  const hiringProbability = 72

  const jdSkills = useMemo(() => {
    const text = jobDescription.toLowerCase()
    const candidates = [
      "python",
      "javascript",
      "react",
      "typescript",
      "node",
      "sql",
      "aws",
      "docker",
      "machine learning",
      "git",
      "rest",
      "graphql",
      "tailwind",
      "figma",
      "agile",
    ]
    return candidates.filter((k) => text.includes(k))
  }, [jobDescription])

  const resumeSkillKeys = useMemo(() => {
    if (!file) return new Set<string>()
    return new Set<string>(["react", "typescript", "sql", "git", "rest-api"])
  }, [file])

  const matchedSkills = useMemo(() => {
    const jd = new Set(jdSkills.map(normalizeSkillKey))
    return Array.from(resumeSkillKeys).filter((k) => jd.has(k))
  }, [jdSkills, resumeSkillKeys])

  const missingSkills = useMemo(() => {
    const jd = new Set(jdSkills.map(normalizeSkillKey))
    const miss = Array.from(jd).filter((k) => !resumeSkillKeys.has(k))
    return miss.slice(0, 6).map((k) => SKILL_LABELS[k] ?? k)
  }, [jdSkills, resumeSkillKeys])

  function openPicker() {
    inputRef.current?.click()
  }

  function onFilesSelected(files: FileList | null) {
    const f = files?.[0]
    if (!f) return
    setFile(f)
  }

  const ring = useMemo(() => {
    const pct = clamp(atsScore, 0, 100)
    const radius = 52
    const circumference = 2 * Math.PI * radius
    const dash = (pct / 100) * circumference
    const gap = circumference - dash
    const color = pct >= 75 ? "#16A34A" : pct >= 50 ? "#CA8A04" : "#DC2626"
    return { radius, circumference, dash, gap, color }
  }, [atsScore])

  async function analyze() {
    if (!file) return
    if (!jobDescription.trim()) {
      setJdError("Job description is required to run analysis.")
      return
    }
    setAnalysisState("loading")
    await new Promise((r) => setTimeout(r, 3000))
    setAnalysisState("done")
  }

  return (
    <div className={["min-h-screen relative", isDark ? "bg-black text-zinc-50" : "bg-white text-gray-900"].join(" ")}>
      <AnimatedBackground variant="particles" />

      <div className="relative z-10">
        <CandidateHeader />

        <div className="max-w-6xl mx-auto pt-24 px-4 pb-16">
          <div className="space-y-1">
            <div className="text-2xl font-semibold">ATS Resume Analysis</div>
            <div className="text-sm text-muted-foreground">
              Simulated analysis for the demo — backend integration can be added later.
            </div>
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
            <div className="text-lg font-semibold">Paste Job Description</div>
            <textarea
              className={[
                "mt-4 w-full min-h-[200px] rounded-lg border px-3 py-2 text-sm outline-none transition-colors",
                isDark
                  ? "bg-zinc-950 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-[#7C3AED]"
                  : "bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-[#2563EB]",
              ].join(" ")}
              placeholder="Paste job description text here..."
              value={jobDescription}
              onChange={(e) => {
                setJobDescription(e.target.value)
                if (jdError) setJdError(null)
              }}
            />
            {jdError ? <div className="mt-2 text-sm text-red-500">{jdError}</div> : null}

            <div className="mt-4 grid grid-cols-1 gap-3">
              <div className="space-y-2">
                <Label>Target Role</Label>
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

              <Button
                className={[
                  "w-full",
                  isDark ? "bg-[#7C3AED] text-white hover:bg-[#7C3AED]/90" : "bg-[#2563EB] text-white hover:bg-[#2563EB]/90",
                ].join(" ")}
                disabled={!file || !jobDescription.trim() || analysisState === "loading"}
                onClick={analyze}
              >
                {analysisState === "loading" ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="inline-flex">
                      <Loader size={16} color={isDark ? "#FFFFFF" : "#FFFFFF"} />
                    </span>
                    Analyzing...
                  </span>
                ) : (
                  "Analyze Resume"
                )}
              </Button>
            </div>
          </Card>
        </div>

        {analysisState === "done" && jobDescription.trim() ? (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="mt-8 space-y-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className={["p-6 backdrop-blur-sm", cardShell].join(" ")}>
                <div className="flex items-center justify-center">
                  <div className="relative h-36 w-36">
                    <svg className="h-36 w-36 -rotate-90" viewBox="0 0 120 120">
                      <circle
                        cx="60"
                        cy="60"
                        r={ring.radius}
                        stroke={isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)"}
                        strokeWidth="10"
                        fill="none"
                      />
                      <circle
                        cx="60"
                        cy="60"
                        r={ring.radius}
                        stroke={ring.color}
                        strokeWidth="10"
                        fill="none"
                        strokeDasharray={`${ring.dash} ${ring.gap}`}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center text-center">
                      <div>
                        <div className="text-5xl font-bold">{atsScore}</div>
                        <div className="text-sm text-muted-foreground">/100</div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-4 text-center">
                  <div className="text-sm font-medium">ATS Compatibility Score</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Your resume matches {atsScore}% of the job requirements
                  </div>
                </div>
              </Card>

              <Card className={["p-6 backdrop-blur-sm", cardShell].join(" ")}>
                <div className="text-sm font-medium">Fit Radar</div>
                <div className="mt-4 h-[240px] w-full">
                  <ChartContainer config={chartConfig} className="h-full w-full">
                    <RadarChart data={radarData}>
                      <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                      <PolarGrid />
                      <PolarAngleAxis dataKey="skill" />
                      <Radar
                        name="score"
                        dataKey="score"
                        stroke="var(--color-score)"
                        fill="var(--color-score)"
                        fillOpacity={0.3}
                        dot={{ r: 4 }}
                      />
                    </RadarChart>
                  </ChartContainer>
                </div>
              </Card>

              <Card className={["p-6 backdrop-blur-sm", cardShell].join(" ")}>
                <div className="text-5xl font-bold" style={{ color: accent }}>
                  {formatPercent(hiringProbability)}
                </div>
                <div className="mt-2 text-sm font-medium">Hiring Probability</div>
                <div className="mt-1 text-xs text-muted-foreground">Based on resume-JD match analysis</div>
                <div className="mt-4">
                  <Progress value={hiringProbability} />
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg border p-2 text-xs" style={{ borderColor: isDark ? "#27272a" : "#e5e7eb" }}>
                    <div className="font-semibold">12 / 15</div>
                    <div className="text-muted-foreground">keywords</div>
                  </div>
                  <div className="rounded-lg border p-2 text-xs" style={{ borderColor: isDark ? "#27272a" : "#e5e7eb" }}>
                    <div className="font-semibold">3 / 4</div>
                    <div className="text-muted-foreground">skills</div>
                  </div>
                  <div className="rounded-lg border p-2 text-xs" style={{ borderColor: isDark ? "#27272a" : "#e5e7eb" }}>
                    <div className="font-semibold">{missingSkills.length}</div>
                    <div className="text-muted-foreground">gaps</div>
                  </div>
                </div>
              </Card>
            </div>

            <Card className={["p-6 backdrop-blur-sm", cardShell].join(" ")}>
              <div className="text-lg font-semibold">Skill Gap Analysis</div>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="text-sm font-medium">Matched Skills</div>
                  <div className="mt-3 space-y-2">
                    {(matchedSkills.length ? matchedSkills : Array.from(resumeSkillKeys).slice(0, 4)).map((k) => (
                      <div key={k} className="flex items-center gap-2 text-sm">
                        <CheckCircle className="text-green-500" size={16} />
                        <span>{SKILL_LABELS[k] ?? k}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium">Missing Skills</div>
                  <div className="mt-3 space-y-2">
                    {(missingSkills.length ? missingSkills : ["GraphQL", "AWS", "Docker"]).map((s) => (
                      <div key={s} className="flex items-center gap-2 text-sm">
                        <XIcon className="text-red-500" size={16} />
                        <span>{s}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="mt-6">
                <div className="text-sm font-medium">Recommendations</div>
                <ul className="mt-2 space-y-1 text-sm text-muted-foreground list-disc pl-5">
                  <li>Add role-specific keywords from the job description into your experience bullets.</li>
                  <li>Quantify impact with metrics (latency, revenue, adoption) to strengthen experience match.</li>
                  <li>Highlight top required skills in a dedicated Skills section near the top of the resume.</li>
                </ul>
              </div>
            </Card>

            <Card className={["p-6 backdrop-blur-sm", cardShell].join(" ")}>
              <div className="text-lg font-semibold">Detailed Breakdown</div>
              <div className="mt-4">
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="k" className={isDark ? "border-zinc-800" : "border-gray-200"}>
                    <AccordionTrigger>Keyword Analysis</AccordionTrigger>
                    <AccordionContent>
                      Matched: React, TypeScript, SQL, Git. Missing: GraphQL, Docker, AWS. Consider adding exact keyword
                      variants present in the job description.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="e" className={isDark ? "border-zinc-800" : "border-gray-200"}>
                    <AccordionTrigger>Experience Assessment</AccordionTrigger>
                    <AccordionContent>
                      Strong alignment in core responsibilities. Add one bullet emphasizing ownership and cross-team
                      collaboration to better match seniority signals.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="ed" className={isDark ? "border-zinc-800" : "border-gray-200"}>
                    <AccordionTrigger>Education Match</AccordionTrigger>
                    <AccordionContent>
                      Education criteria satisfied. Consider adding relevant coursework or certifications if available.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="f" className={isDark ? "border-zinc-800" : "border-gray-200"}>
                    <AccordionTrigger>Formatting Score</AccordionTrigger>
                    <AccordionContent>
                      Readability is strong. Ensure consistent bullet punctuation, and keep section headings uniform for
                      ATS parsing.
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
            </Card>

            <div className="flex flex-col sm:flex-row gap-3 justify-end">
              <Button
                className={isDark ? "bg-[#7C3AED] text-white hover:bg-[#7C3AED]/90" : "bg-[#2563EB] text-white hover:bg-[#2563EB]/90"}
                onClick={() => navigate("/upload")}
              >
                Proceed to Interview
              </Button>
              <Button
                variant="outline"
                className={isDark ? "border-zinc-700 bg-transparent hover:bg-zinc-900" : "border-gray-200"}
                onClick={() => console.log("download report")}
              >
                Download Report
              </Button>
            </div>
          </motion.div>
        ) : null}
        </div>
      </div>
    </div>
  )
}
