import { useEffect, useRef, useState } from "react"
import type { CSSProperties } from "react"
import { Link, useNavigate } from "react-router-dom"
import { ArrowRight, Mail, Moon, Sun } from "lucide-react"

import AnimatedBackground from "@/components/AnimatedBackground"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { candidateLogin } from "@/lib/api"
import { useTheme } from "@/lib/theme-context"

export default function Login() {
  const navigate = useNavigate()
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === "dark"
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (!canvas || !ctx) return
    const particleRgb = isDark ? "250,250,250" : "10,10,10"

    const setSize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    setSize()

    type Particle = { x: number; y: number; v: number; o: number }
    let particles: Particle[] = []
    let raf = 0

    const make = (): Particle => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      v: Math.random() * 0.25 + 0.05,
      o: Math.random() * 0.35 + 0.15,
    })

    const init = () => {
      particles = []
      const count = Math.floor((canvas.width * canvas.height) / 9000)
      for (let i = 0; i < count; i++) particles.push(make())
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      particles.forEach((p) => {
        p.y -= p.v
        if (p.y < 0) {
          p.x = Math.random() * canvas.width
          p.y = canvas.height + Math.random() * 40
          p.v = Math.random() * 0.25 + 0.05
          p.o = Math.random() * 0.35 + 0.15
        }
        ctx.fillStyle = `rgba(${particleRgb},${p.o})`
        ctx.fillRect(p.x, p.y, 0.7, 2.2)
      })
      raf = requestAnimationFrame(draw)
    }

    const onResize = () => {
      setSize()
      init()
    }

    window.addEventListener("resize", onResize)
    init()
    raf = requestAnimationFrame(draw)
    return () => {
      window.removeEventListener("resize", onResize)
      cancelAnimationFrame(raf)
    }
  }, [isDark])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const result = await candidateLogin(email.trim(), name.trim())
      localStorage.setItem("sage_token", result.token)
      localStorage.setItem("sage_candidate", JSON.stringify(result.candidate))
      navigate("/home")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed")
    } finally {
      setLoading(false)
    }
  }

  const sectionStyle = {
    "--sage-line": isDark ? "#27272a" : "#e5e7eb",
    "--sage-shimmer": isDark ? "rgba(250,250,250,.24)" : "rgba(10,10,10,.12)",
  } as CSSProperties

  return (
    <section
      className={[
        "fixed inset-0 transition-colors duration-300",
        isDark ? "bg-zinc-950 text-zinc-50" : "bg-white text-zinc-950",
      ].join(" ")}
      style={sectionStyle}
    >
      <style>{`
        .accent-lines{position:absolute;inset:0;pointer-events:none;opacity:.7}
        .hline,.vline{position:absolute;background:var(--sage-line);will-change:transform,opacity}
        .hline{left:0;right:0;height:1px;transform:scaleX(0);transform-origin:50% 50%;animation:drawX .8s cubic-bezier(.22,.61,.36,1) forwards}
        .vline{top:0;bottom:0;width:1px;transform:scaleY(0);transform-origin:50% 0%;animation:drawY .9s cubic-bezier(.22,.61,.36,1) forwards}
        .hline:nth-child(1){top:18%;animation-delay:.12s}
        .hline:nth-child(2){top:50%;animation-delay:.22s}
        .hline:nth-child(3){top:82%;animation-delay:.32s}
        .vline:nth-child(4){left:22%;animation-delay:.42s}
        .vline:nth-child(5){left:50%;animation-delay:.54s}
        .vline:nth-child(6){left:78%;animation-delay:.66s}
        .hline::after,.vline::after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,transparent,var(--sage-shimmer),transparent);opacity:0;animation:shimmer .9s ease-out forwards}
        .hline:nth-child(1)::after{animation-delay:.12s}
        .hline:nth-child(2)::after{animation-delay:.22s}
        .hline:nth-child(3)::after{animation-delay:.32s}
        .vline:nth-child(4)::after{animation-delay:.42s}
        .vline:nth-child(5)::after{animation-delay:.54s}
        .vline:nth-child(6)::after{animation-delay:.66s}
        @keyframes drawX{0%{transform:scaleX(0);opacity:0}60%{opacity:.95}100%{transform:scaleX(1);opacity:.7}}
        @keyframes drawY{0%{transform:scaleY(0);opacity:0}60%{opacity:.95}100%{transform:scaleY(1);opacity:.7}}
        @keyframes shimmer{0%{opacity:0}35%{opacity:.25}100%{opacity:0}}

        .card-animate{opacity:0;transform:translateY(20px);animation:fadeUp .8s cubic-bezier(.22,.61,.36,1) .4s forwards}
        @keyframes fadeUp{to{opacity:1;transform:translateY(0)}}
      `}</style>

      <div className={isDark ? "opacity-60" : "opacity-20"}>
        <AnimatedBackground variant="pixelblast" />
      </div>

      <div className="absolute inset-0 pointer-events-none [background:radial-gradient(80%_60%_at_50%_30%,rgba(255,255,255,0.06),transparent_60%)]" />

      <div className="accent-lines z-[1]">
        <div className="hline" />
        <div className="hline" />
        <div className="hline" />
        <div className="vline" />
        <div className="vline" />
        <div className="vline" />
      </div>

      <canvas
        ref={canvasRef}
        className={[
          "absolute inset-0 w-full h-full pointer-events-none z-[1] transition-opacity duration-300",
          isDark ? "opacity-50 mix-blend-screen" : "opacity-20",
        ].join(" ")}
      />

      <header
        className={[
          "absolute left-0 right-0 top-0 z-10 flex items-center justify-between px-6 py-4 border-b transition-colors duration-300",
          isDark ? "border-zinc-800/80" : "border-gray-200",
        ].join(" ")}
      >
        <span className={["text-xs tracking-[0.14em] uppercase", isDark ? "text-zinc-400" : "text-zinc-600"].join(" ")}>
          SAGE
        </span>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="icon"
            variant="outline"
            className={[
              "h-9 w-9 rounded-lg transition-colors duration-300",
              isDark
                ? "border-zinc-800 bg-zinc-900 text-zinc-50 hover:bg-zinc-900/80"
                : "border-gray-200 bg-white text-zinc-900 hover:bg-gray-50",
            ].join(" ")}
            onClick={toggleTheme}
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <Button
            asChild
            variant="outline"
            className={[
              "h-9 rounded-lg transition-colors duration-300",
              isDark
                ? "border-zinc-800 bg-zinc-900 text-zinc-50 hover:bg-zinc-900/80"
                : "border-gray-200 bg-white text-zinc-900 hover:bg-gray-50",
            ].join(" ")}
          >
            <Link to="/hr/login">
              <span className="mr-2">HR Portal</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </header>

      <div className="h-full w-full grid place-items-center px-4 relative z-10">
        <Card
          className={[
            "card-animate w-full max-w-sm backdrop-blur supports-[backdrop-filter]:backdrop-blur transition-colors duration-300",
            isDark ? "border-zinc-800 bg-zinc-900/70" : "border-gray-200 bg-white/85",
          ].join(" ")}
        >
          <CardHeader className="space-y-1">
            <CardTitle className={["text-2xl", isDark ? "text-zinc-50" : "text-zinc-950"].join(" ")}>
              Sign in to SAGE
            </CardTitle>
            <CardDescription className={isDark ? "text-zinc-400" : "text-zinc-600"}>
              AI-Powered Recruitment Platform
            </CardDescription>
          </CardHeader>

          <CardContent className="grid gap-5">
            <form className="grid gap-5" onSubmit={onSubmit}>
              <div className="grid gap-2">
                <Label htmlFor="name" className={isDark ? "text-zinc-300" : "text-zinc-800"}>
                  Full Name
                </Label>
                <div className="relative">
                  <Mail
                    className={[
                      "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4",
                      isDark ? "text-zinc-500" : "text-zinc-400",
                    ].join(" ")}
                  />
                  <Input
                    id="name"
                    placeholder="Your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={[
                      "pl-10 transition-colors duration-300",
                      isDark
                        ? "bg-zinc-950 border-zinc-800 text-zinc-50 placeholder:text-zinc-600"
                        : "bg-white border-gray-200 text-zinc-900 placeholder:text-zinc-400",
                    ].join(" ")}
                    required
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="email" className={isDark ? "text-zinc-300" : "text-zinc-800"}>
                  Email Address
                </Label>
                <div className="relative">
                  <Mail
                    className={[
                      "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4",
                      isDark ? "text-zinc-500" : "text-zinc-400",
                    ].join(" ")}
                  />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={[
                      "pl-10 transition-colors duration-300",
                      isDark
                        ? "bg-zinc-950 border-zinc-800 text-zinc-50 placeholder:text-zinc-600"
                        : "bg-white border-gray-200 text-zinc-900 placeholder:text-zinc-400",
                    ].join(" ")}
                    required
                  />
                </div>
              </div>

              {error ? (
                <div className={["text-sm", isDark ? "text-red-400" : "text-red-600"].join(" ")}>
                  {error}
                </div>
              ) : null}

              <Button
                className={[
                  "w-full h-10 rounded-lg transition-colors duration-300",
                  isDark
                    ? "bg-zinc-50 text-zinc-900 hover:bg-zinc-200"
                    : "bg-[#2563EB] text-white hover:bg-[#2563EB]/90",
                ].join(" ")}
                disabled={loading}
                type="submit"
              >
                {loading ? "Signing in..." : "Begin as Candidate"}
              </Button>
            </form>
          </CardContent>

          <CardFooter className={["flex items-center justify-center text-sm", isDark ? "text-zinc-400" : "text-zinc-600"].join(" ")}>
            <Link className={isDark ? "text-zinc-200 hover:underline" : "text-[#2563EB] hover:underline"} to="/hr/login">
              HR Portal →
            </Link>
          </CardFooter>
        </Card>
      </div>
    </section>
  )
}
