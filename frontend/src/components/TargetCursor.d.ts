import type { ComponentType } from "react"

export type TargetCursorProps = {
  targetSelector?: string
  spinDuration?: number
  hideDefaultCursor?: boolean
  hoverDuration?: number
  parallaxOn?: boolean
}

declare const TargetCursor: ComponentType<TargetCursorProps>
export default TargetCursor

