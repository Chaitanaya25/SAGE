import PixelBlast from "@/components/PixelBlast.jsx"
import { useTheme } from "@/lib/theme-context"
import Particles from "@/components/Particles.jsx"

type Props = {
  variant: "particles" | "pixelblast"
}

export default function AnimatedBackground({ variant }: Props) {
  const { theme } = useTheme()

  if (variant === "particles") {
    return (
      <div className="fixed inset-0 z-0 pointer-events-none">
        <Particles
          particleColors={
            theme === "dark"
              ? ["#7C3AED", "#A855F7", "#C084FC", "#6D28D9"]
              : ["#FFFFFF", "#F8FAFC", "#E5E7EB"]
          }
          particleCount={420}
          particleSpread={14}
          speed={0.3}
          particleBaseSize={190}
          moveParticlesOnHover
          particleHoverFactor={1}
          alphaParticles
          disableRotation={false}
          pixelRatio={1}
        />
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-0 pointer-events-none">
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
