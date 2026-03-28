import { Link, useLocation, useNavigate } from "react-router-dom"
import { Moon, Sun } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useTheme } from "@/lib/theme-context"

export default function CandidateHeader() {
  const navigate = useNavigate()
  const location = useLocation()
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === "dark"

  const headerShell = isDark
    ? "bg-zinc-950/80 border-zinc-800 text-zinc-400"
    : "bg-white/80 border-gray-200 text-gray-600"
  const navButtonBase = isDark
    ? "text-sm text-white hover:text-white transition-colors px-3 py-2"
    : "text-sm text-gray-600 hover:text-gray-900 transition-colors px-3 py-2"

  function scrollToOnHome(id: string) {
    if (location.pathname === "/home") {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth" })
      return
    }
    navigate("/home")
    window.setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth" })
    }, 250)
  }

  return (
    <>
      <header
        className={["sticky top-0 z-50 backdrop-blur-lg border-b", headerShell].join(" ")}
        style={{ overflow: "visible" }}
      >
        <div className="max-w-6xl mx-auto flex items-center justify-between h-16 px-6">
          <Link to="/home" className={["font-bold text-xl", isDark ? "text-white" : "text-gray-900"].join(" ")}>
            SAGE
          </Link>

          <nav className="hidden md:flex items-center gap-2">
            <button type="button" className={navButtonBase} onClick={() => scrollToOnHome("how-it-works")}>
              Features
            </button>
            <button
              type="button"
              className={navButtonBase}
              onClick={() => navigate("/dashboard", { state: { tab: "pricing" } })}
            >
              Pricing
            </button>
            <button type="button" className={navButtonBase} onClick={() => scrollToOnHome("faq")}>
              FAQ
            </button>
          </nav>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="icon"
              variant="outline"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                toggleTheme()
              }}
              className={isDark ? "border-zinc-800 bg-transparent hover:bg-zinc-900" : "border-gray-200 bg-white hover:bg-gray-50"}
            >
              {isDark ? <Sun size={16} /> : <Moon size={16} />}
            </Button>
            <Button asChild className={isDark ? "bg-[#7C3AED] text-white hover:bg-[#7C3AED]/90" : "bg-black text-white hover:bg-black/90 border border-black"}>
              <Link to="/login">Login</Link>
            </Button>
          </div>
        </div>
      </header>
    </>
  )
}
