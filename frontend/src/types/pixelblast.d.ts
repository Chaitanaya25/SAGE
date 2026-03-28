declare module "@/components/PixelBlast.jsx" {
  import type { ComponentType } from "react"

  export type PixelBlastProps = {
    variant?: string
    pixelSize?: number
    color?: string
    patternScale?: number
    patternDensity?: number
    speed?: number
    edgeFade?: number
    transparent?: boolean
    enableRipples?: boolean
    [key: string]: unknown
  }

  const PixelBlast: ComponentType<PixelBlastProps>
  export default PixelBlast
}

