import React, { useEffect, useState } from "react"

import { ThemeContext, type Theme } from "@/lib/theme-context"

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem("sage_theme")
    return saved === "light" || saved === "dark" ? saved : "dark"
  })

  useEffect(() => {
    localStorage.setItem("sage_theme", theme)
    document.documentElement.classList.remove("light", "dark")
    document.documentElement.classList.add(theme)
  }, [theme])

  const toggleTheme = () => setTheme((prev) => (prev === "dark" ? "light" : "dark"))

  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>
}
