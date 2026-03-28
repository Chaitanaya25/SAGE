import { createContext, useContext } from "react"

export type Theme = "light" | "dark"
export type ThemeContextType = { theme: Theme; toggleTheme: () => void }

export const ThemeContext = createContext<ThemeContextType>({
  theme: "dark",
  toggleTheme: () => {},
})

export const useTheme = () => useContext(ThemeContext)

