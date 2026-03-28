import { useEffect } from "react"

export default function Loader({ size = 28, color = "#7C3AED" }: { size?: number; color?: string }) {
  useEffect(() => {
    import("ldrs").then(({ hatch }) => hatch.register())
  }, [])

  return <l-hatch size={String(size)} stroke="4" speed="3.5" color={color} />
}

