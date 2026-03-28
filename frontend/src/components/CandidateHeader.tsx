import { useState } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { BarChart3, Calendar, FileSearch, Mic, Moon, Sun } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useTheme } from "@/lib/theme-context"

export default function CandidateHeader() {
  const navigate = useNavigate()
  const location = useLocation()
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === "dark"

  const [activeDropdown, setActiveDropdown] = useState<string | null>(null)

  const headerShell = isDark
    ? "bg-zinc-950/80 border-zinc-800 text-zinc-400"
    : "bg-white/80 border-gray-200 text-gray-600"
  const dropdownShell = isDark
    ? "bg-zinc-900/95 border-zinc-800 text-zinc-50"
    : "bg-white/95 border-gray-200 text-gray-900"
  const navButtonBase = isDark
    ? "text-sm text-white hover:text-white transition-colors px-3 py-2"
    : "text-sm text-gray-600 hover:text-gray-900 transition-colors px-3 py-2"

  const iconShell = isDark ? "bg-zinc-800" : "bg-gray-100"
  const iconColor = isDark ? "text-white" : "text-gray-900"
  const descColor = isDark ? "text-zinc-400" : "text-gray-600"
  const hoverItem = isDark ? "hover:bg-zinc-800/50" : "hover:bg-gray-100"

  function go(path: string) {
    setActiveDropdown(null)
    navigate(path)
  }

  function goFaq() {
    if (location.pathname === "/home") {
      document.getElementById("faq")?.scrollIntoView({ behavior: "smooth" })
      return
    }
    navigate("/pricing#faq")
  }

  return (
    <>
      <style>{`
        @keyframes sageDropdownIn { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }
        .sage-dropdown { animation: sageDropdownIn 200ms ease-out; }
      `}</style>

      <header
        className={["sticky top-0 z-50 backdrop-blur-lg border-b", headerShell].join(" ")}
        style={{ overflow: "visible" }}
      >
        <div className="max-w-6xl mx-auto flex items-center justify-between h-16 px-6">
          <Link to="/home" className={["font-bold text-xl", isDark ? "text-white" : "text-gray-900"].join(" ")}>
            SAGE
          </Link>

          <nav className="hidden md:flex items-center gap-2">
            <div
              className="relative"
              onMouseEnter={() => setActiveDropdown("product")}
              onMouseLeave={() => setActiveDropdown(null)}
            >
              <button type="button" className={navButtonBase}>
                Product
              </button>
              {activeDropdown === "product" ? (
                <div
                  className={[
                    "sage-dropdown absolute top-[100%] left-0 mt-2 z-[100] backdrop-blur-xl border rounded-xl p-4 shadow-2xl min-w-[520px] relative before:content-[''] before:absolute before:-top-2 before:left-0 before:right-0 before:h-2",
                    dropdownShell,
                  ].join(" ")}
                  style={{ position: "absolute", top: "100%", left: "0", zIndex: 9999, marginTop: "4px" }}
                >
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => go("/analyze")} className={["flex items-start gap-3 p-3 rounded-lg text-left", hoverItem].join(" ")}>
                      <div className={["h-10 w-10 rounded-lg p-2 flex items-center justify-center", iconShell].join(" ")}>
                        <FileSearch className={iconColor} size={18} />
                      </div>
                      <div>
                        <div className={["text-sm font-medium", isDark ? "text-white" : "text-gray-900"].join(" ")}>Resume Analysis</div>
                        <div className={["text-xs", descColor].join(" ")}>ATS-style resume scoring with skill matching and hiring probability</div>
                      </div>
                    </button>

                    <button type="button" onClick={() => go("/interviews")} className={["flex items-start gap-3 p-3 rounded-lg text-left", hoverItem].join(" ")}>
                      <div className={["h-10 w-10 rounded-lg p-2 flex items-center justify-center", iconShell].join(" ")}>
                        <Mic className={iconColor} size={18} />
                      </div>
                      <div>
                        <div className={["text-sm font-medium", isDark ? "text-white" : "text-gray-900"].join(" ")}>Voice Interview</div>
                        <div className={["text-xs", descColor].join(" ")}>Real-time AI voice interview with dynamic questioning</div>
                      </div>
                    </button>

                    <button type="button" onClick={() => go("/schedule")} className={["flex items-start gap-3 p-3 rounded-lg text-left", hoverItem].join(" ")}>
                      <div className={["h-10 w-10 rounded-lg p-2 flex items-center justify-center", iconShell].join(" ")}>
                        <Calendar className={iconColor} size={18} />
                      </div>
                      <div>
                        <div className={["text-sm font-medium", isDark ? "text-white" : "text-gray-900"].join(" ")}>Schedule Assessment</div>
                        <div className={["text-xs", descColor].join(" ")}>Manage booked sessions and reserve a new slot</div>
                      </div>
                    </button>

                    <button type="button" onClick={() => go("/done")} className={["flex items-start gap-3 p-3 rounded-lg text-left", hoverItem].join(" ")}>
                      <div className={["h-10 w-10 rounded-lg p-2 flex items-center justify-center", iconShell].join(" ")}>
                        <BarChart3 className={iconColor} size={18} />
                      </div>
                      <div>
                        <div className={["text-sm font-medium", isDark ? "text-white" : "text-gray-900"].join(" ")}>Score Dashboard</div>
                        <div className={["text-xs", descColor].join(" ")}>View evaluation scores and improvement areas</div>
                      </div>
                    </button>
                  </div>
                </div>
              ) : null}
            </div>

            <button type="button" className={navButtonBase} onClick={() => navigate("/pricing")}>
              Pricing
            </button>
            <button type="button" className={navButtonBase} onClick={goFaq}>
              FAQ
            </button>
          </nav>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="icon"
              variant="outline"
              onClick={toggleTheme}
              className={isDark ? "border-zinc-800 bg-transparent hover:bg-zinc-900" : "border-gray-200 bg-white hover:bg-gray-50"}
            >
              {isDark ? <Sun size={16} /> : <Moon size={16} />}
            </Button>
            <Button asChild variant="outline" className={isDark ? "border-zinc-700 text-white bg-transparent hover:bg-zinc-900" : "border-black text-black hover:bg-black hover:text-white"}>
              <Link to="/hr/login">HR Portal</Link>
            </Button>
            <Button asChild className={isDark ? "bg-[#7C3AED] text-white hover:bg-[#7C3AED]/90" : "bg-black text-white hover:bg-black/90 border border-black"}>
              <Link to="/upload">Start Assessment</Link>
            </Button>
          </div>
        </div>
      </header>
    </>
  )
}
