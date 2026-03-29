import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Building2, Eye, EyeOff, Lock, Mail, Moon, Sun, User } from "lucide-react"

import Loader from "@/components/Loader"
import PixelBlast from "@/components/PixelBlast.jsx"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { candidateLogin, hrLogin } from "@/lib/api"
import { useTheme } from "@/lib/theme-context"

export default function Login() {
  const navigate = useNavigate()
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === "dark"

  const [role, setRole] = useState<"candidate" | "hr">("candidate")

  const [candidateName, setCandidateName] = useState("")
  const [candidateEmail, setCandidateEmail] = useState("")

  const [isHrSignup, setIsHrSignup] = useState(false)
  const [hrEmail, setHrEmail] = useState(localStorage.getItem("sage_hr_email") || "")
  const [hrPassword, setHrPassword] = useState("")
  const [hrCompany, setHrCompany] = useState("")
  const [hrName, setHrName] = useState("")
  const [hrConfirmPassword, setHrConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)

  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function onCandidateLogin(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const result = await candidateLogin(candidateEmail.trim(), candidateName.trim())
      localStorage.setItem("sage_token", result.token)
      localStorage.setItem("sage_candidate", JSON.stringify(result.candidate))
      localStorage.setItem("sage_role", "candidate")
      if (result?.candidate?.id) localStorage.setItem("sage_candidate_id", String(result.candidate.id))
      navigate("/dashboard")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed")
    } finally {
      setLoading(false)
    }
  }

  async function onHrLogin(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const result = await hrLogin(hrEmail.trim(), hrPassword.trim())
      localStorage.setItem("sage_token", result.token)
      localStorage.setItem("sage_user", JSON.stringify(result.user))
      localStorage.setItem("sage_role", "hr")
      localStorage.setItem("sage_hr_email", hrEmail.trim())
      localStorage.setItem("sage_company", String(result.user?.company ?? "SAGE"))
      navigate("/hr/dashboard")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed")
    } finally {
      setLoading(false)
    }
  }

  async function onHrSignup(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (hrPassword !== hrConfirmPassword) {
      setError("Passwords don't match")
      return
    }
    setLoading(true)
    try {
      const res = await fetch("http://localhost:8000/api/auth/hr-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: hrEmail.trim(),
          password: hrPassword,
          name: hrName.trim(),
          company_name: hrCompany.trim(),
        }),
      })
      if (!res.ok) {
        const e = (await res.json().catch(() => ({}))) as { detail?: string }
        setError(e.detail || "Signup failed")
        return
      }
      const data = (await res.json()) as { token: string; user: { company?: string } }
      localStorage.setItem("sage_token", data.token)
      localStorage.setItem("sage_role", "hr")
      localStorage.setItem("sage_company", String(data.user?.company ?? hrCompany.trim()))
      localStorage.setItem("sage_hr_email", hrEmail.trim())
      setIsHrSignup(false)
      navigate("/hr/dashboard")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className={["fixed inset-0 transition-colors duration-300", isDark ? "bg-zinc-950 text-zinc-50" : "bg-white text-zinc-950"].join(" ")}>
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className={isDark ? "opacity-70" : "opacity-30"}>
          <PixelBlast
            variant="circle"
            pixelSize={7}
            color={isDark ? "#7C3AED" : "#0A0A0A"}
            patternScale={7.5}
            patternDensity={0.85}
            pixelSizeJitter={0}
            speed={0.9}
            edgeFade={0.2}
            enableRipples={false}
            transparent
          />
        </div>
      </div>

      <header className={["absolute left-0 right-0 top-0 z-20 flex items-center justify-between px-6 py-4 border-b transition-colors duration-300 pointer-events-auto", isDark ? "border-zinc-800/80" : "border-gray-200"].join(" ")}>
        <span className={["text-xs tracking-[0.14em] uppercase", isDark ? "text-zinc-400" : "text-zinc-600"].join(" ")}>
          SAGE
        </span>
        <Button
          type="button"
          size="icon"
          variant="outline"
          className={[
            "h-9 w-9 rounded-lg transition-colors duration-300",
            isDark ? "border-zinc-800 bg-zinc-900 text-zinc-50 hover:bg-zinc-900/80" : "border-gray-200 bg-white text-zinc-900 hover:bg-gray-50",
          ].join(" ")}
          onClick={(e) => {
            e.preventDefault()
            toggleTheme()
          }}
        >
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
      </header>

      <div className="h-full w-full grid place-items-center px-4 relative z-10">
        <Card className={["w-full max-w-md backdrop-blur supports-[backdrop-filter]:backdrop-blur transition-colors duration-300", isDark ? "border-zinc-800 bg-zinc-900/70" : "border-gray-200 bg-white/90"].join(" ")}>
          <CardHeader className="space-y-1">
            <CardTitle className={["text-2xl", isDark ? "text-zinc-50" : "text-zinc-950"].join(" ")}>
              Login
            </CardTitle>
            <CardDescription className={isDark ? "text-zinc-400" : "text-zinc-600"}>
              Choose your role to continue
            </CardDescription>
          </CardHeader>

          <CardContent className="grid gap-4">
            <Tabs value={role} onValueChange={(v) => setRole(v as "candidate" | "hr")}>
              <TabsList
                className={[
                  "grid grid-cols-2",
                  isDark ? "bg-transparent" : "bg-transparent",
                ].join(" ")}
              >
                <TabsTrigger
                  value="candidate"
                  className={[
                    "transition-colors",
                    isDark
                      ? "data-[state=active]:bg-white data-[state=active]:text-black data-[state=inactive]:bg-black data-[state=inactive]:text-white"
                      : "data-[state=active]:bg-black data-[state=active]:text-white data-[state=inactive]:bg-white data-[state=inactive]:text-black",
                  ].join(" ")}
                >
                  Candidate
                </TabsTrigger>
                <TabsTrigger
                  value="hr"
                  className={[
                    "transition-colors",
                    isDark
                      ? "data-[state=active]:bg-white data-[state=active]:text-black data-[state=inactive]:bg-black data-[state=inactive]:text-white"
                      : "data-[state=active]:bg-black data-[state=active]:text-white data-[state=inactive]:bg-white data-[state=inactive]:text-black",
                  ].join(" ")}
                >
                  HR Staff
                </TabsTrigger>
              </TabsList>

              <TabsContent value="candidate">
                <form className="grid gap-4" onSubmit={onCandidateLogin}>
                  <div className="grid gap-2">
                    <Label htmlFor="candidate-name">Name</Label>
                    <div className="relative">
                      <User className={["absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4", isDark ? "text-zinc-500" : "text-zinc-400"].join(" ")} />
                      <Input
                        id="candidate-name"
                        placeholder="Your name"
                        value={candidateName}
                        onChange={(e) => setCandidateName(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="candidate-email">Email</Label>
                    <div className="relative">
                      <Mail className={["absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4", isDark ? "text-zinc-500" : "text-zinc-400"].join(" ")} />
                      <Input
                        id="candidate-email"
                        type="email"
                        placeholder="Enter your email"
                        value={candidateEmail}
                        onChange={(e) => setCandidateEmail(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  {error ? <div className={["text-sm", isDark ? "text-red-400" : "text-red-600"].join(" ")}>{error}</div> : null}

                  <Button className={isDark ? "bg-[#7C3AED] hover:bg-[#7C3AED]/90 text-white" : "bg-black text-white hover:bg-black/90 border border-black"} disabled={loading} type="submit">
                    {loading ? (
                      <span className="inline-flex items-center gap-2">
                        <Loader size={16} color="#FFFFFF" />
                        Logging in...
                      </span>
                    ) : (
                      "Login"
                    )}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="hr">
                <form className="grid gap-4" onSubmit={isHrSignup ? onHrSignup : onHrLogin}>
                  {isHrSignup ? (
                    <>
                      <div className="grid gap-2">
                        <Label htmlFor="hr-company">Company Name</Label>
                        <div className="relative">
                          <Building2 className={["absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4", isDark ? "text-zinc-500" : "text-zinc-400"].join(" ")} />
                          <Input
                            id="hr-company"
                            placeholder="Company name"
                            value={hrCompany}
                            onChange={(e) => setHrCompany(e.target.value)}
                            className="pl-10"
                            required
                          />
                        </div>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="hr-name">Full Name</Label>
                        <div className="relative">
                          <User className={["absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4", isDark ? "text-zinc-500" : "text-zinc-400"].join(" ")} />
                          <Input
                            id="hr-name"
                            placeholder="Your name"
                            value={hrName}
                            onChange={(e) => setHrName(e.target.value)}
                            className="pl-10"
                            required
                          />
                        </div>
                      </div>
                    </>
                  ) : null}
                  <div className="grid gap-2">
                    <Label htmlFor="hr-email">Email</Label>
                    <div className="relative">
                      <Mail className={["absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4", isDark ? "text-zinc-500" : "text-zinc-400"].join(" ")} />
                      <Input
                        id="hr-email"
                        type="email"
                        placeholder="Enter your email"
                        value={hrEmail}
                        onChange={(e) => setHrEmail(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="hr-password">Password</Label>
                    <div className="relative">
                      <Lock className={["absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4", isDark ? "text-zinc-500" : "text-zinc-400"].join(" ")} />
                      <Input
                        id="hr-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        value={hrPassword}
                        onChange={(e) => setHrPassword(e.target.value)}
                        className="pl-10 pr-10"
                        required
                      />
                      <button
                        type="button"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        className={["absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-md", isDark ? "text-zinc-400 hover:text-zinc-200" : "text-zinc-500 hover:text-zinc-800"].join(" ")}
                        onClick={() => setShowPassword((v) => !v)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {isHrSignup ? (
                    <div className="grid gap-2">
                      <Label htmlFor="hr-confirm">Confirm Password</Label>
                      <div className="relative">
                        <Lock className={["absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4", isDark ? "text-zinc-500" : "text-zinc-400"].join(" ")} />
                        <Input
                          id="hr-confirm"
                          type={showPassword ? "text" : "password"}
                          placeholder="Confirm password"
                          value={hrConfirmPassword}
                          onChange={(e) => setHrConfirmPassword(e.target.value)}
                          className="pl-10"
                          required
                        />
                      </div>
                    </div>
                  ) : null}

                  {error ? <div className={["text-sm", isDark ? "text-red-400" : "text-red-600"].join(" ")}>{error}</div> : null}

                  <Button className={isDark ? "bg-[#7C3AED] hover:bg-[#7C3AED]/90 text-white" : "bg-black text-white hover:bg-black/90 border border-black"} disabled={loading} type="submit">
                    {loading ? (
                      <span className="inline-flex items-center gap-2">
                        <Loader size={16} color="#FFFFFF" />
                        Logging in...
                      </span>
                    ) : (
                      isHrSignup ? "Create HR Account" : "Login"
                    )}
                  </Button>

                  {!isHrSignup ? (
                    <div className="flex items-center justify-between text-xs">
                      <button
                        type="button"
                        className={["underline underline-offset-4", isDark ? "text-zinc-300" : "text-zinc-700"].join(" ")}
                        onClick={() => {
                          setError(null)
                          setIsHrSignup(true)
                        }}
                      >
                        Don't have an account? Sign up
                      </button>
                      <span className={isDark ? "text-zinc-400" : "text-zinc-600"}>Demo: admin@sage.ai / sage2025</span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className={["text-xs underline underline-offset-4 text-left", isDark ? "text-zinc-300" : "text-zinc-700"].join(" ")}
                      onClick={() => {
                        setError(null)
                        setIsHrSignup(false)
                      }}
                    >
                      Already have an account? Login
                    </button>
                  )}
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </section>
  )
}
