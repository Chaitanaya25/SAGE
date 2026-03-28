import { GridScan } from "@/components/GridScan.jsx"
import PixelBlast from "@/components/PixelBlast.jsx"
import { useTheme } from "@/lib/theme-context"

type Props = {
  variant: "pixelblast" | "gridscan"
}

export default function AnimatedBackground({ variant }: Props) {
  const { theme } = useTheme()

  if (variant === "gridscan") {
    return (
      <div style={{ position: "absolute", inset: 0, zIndex: 0 }}>
        <GridScan
          sensitivity={0.55}
          lineThickness={1}
          linesColor={theme === "dark" ? "#392e4e" : "#d1d5db"}
          scanColor={theme === "dark" ? "#FF9FFC" : "#7C3AED"}
          gridScale={0.1}
          scanOpacity={0.4}
          enablePost
          bloomIntensity={0.6}
          chromaticAberration={0.002}
          noiseIntensity={0.01}
        />
      </div>
    )
  }

  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 0 }}>
      <PixelBlast
        variant="circle"
        pixelSize={4}
        color={theme === "dark" ? "#7C3AED" : "#0A0A0A"}
        patternScale={5.75}
        patternDensity={0.7}
        pixelSizeJitter={0}
        speed={0.75}
        edgeFade={0.25}
        enableRipples={false}
        transparent
      />
    </div>
  )
}
