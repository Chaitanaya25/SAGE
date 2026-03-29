import { Link, useNavigate } from "react-router-dom"
import { Moon, Sun } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useTheme } from "@/lib/theme-context"

export default function HomeHeader() {
  const navigate = useNavigate()
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === "dark"

  const headerShell = isDark
    ? "bg-zinc-950/80 border-zinc-800 text-zinc-400"
    : "bg-white/80 border-gray-200 text-gray-600"

  const navLink = isDark
    ? "text-sm text-white hover:text-white transition-colors px-3 py-2"
    : "text-sm text-gray-600 hover:text-gray-900 transition-colors px-3 py-2"

  return (
    <header className={["sticky top-0 z-50 backdrop-blur-lg border-b", headerShell].join(" ")}>
      <div className="max-w-6xl mx-auto flex items-center justify-between h-16 px-6">
        <Link to="/home" className={["font-bold text-xl", isDark ? "text-white" : "text-gray-900"].join(" ")}>
          SAGE
        </Link>

        <nav className="hidden md:flex items-center gap-2">
          <a className={navLink} href="#how-it-works">
            Features
          </a>
          <Link className={navLink} to="/pricing">
            Pricing
          </Link>
          <a className={navLink} href="#faq">
            FAQ
          </a>
        </nav>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="icon"
            variant="outline"
            onClick={(e) => {
              e.preventDefault()
              toggleTheme()
            }}
            className={isDark ? "border-zinc-800 bg-transparent hover:bg-zinc-900" : "border-gray-200 bg-white hover:bg-gray-50"}
          >
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
          </Button>
          <Button
            variant="outline"
            className={isDark ? "bg-white text-black hover:bg-white/90 border border-white" : "bg-black text-white hover:bg-black/90 border border-black"}
            onClick={() => navigate("/demo")}
          >
            Try Demo
          </Button>
          <Button asChild className={isDark ? "bg-[#7C3AED] text-white hover:bg-[#7C3AED]/90" : "bg-black text-white hover:bg-black/90 border border-black"}>
            <Link to="/login">Login</Link>
          </Button>
        </div>
      </div>
    </header>
  )
}
