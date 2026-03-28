declare module "@/components/GridScan.jsx" {
  import type { ComponentType } from "react"

  export type GridScanProps = {
    sensitivity?: number
    lineThickness?: number
    linesColor?: string
    scanColor?: string
    gridScale?: number
    scanOpacity?: number
    enablePost?: boolean
    bloomIntensity?: number
    chromaticAberration?: number
    noiseIntensity?: number
    [key: string]: unknown
  }

  export const GridScan: ComponentType<GridScanProps>
}
