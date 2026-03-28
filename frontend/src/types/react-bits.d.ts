declare module "@/components/RotatingText.jsx" {
  import type { ComponentType } from "react"

  export type RotatingTextProps = {
    texts: string[]
    mainClassName?: string
    staggerFrom?: string
    initial?: Record<string, unknown>
    animate?: Record<string, unknown>
    exit?: Record<string, unknown>
    staggerDuration?: number
    splitLevelClassName?: string
    transition?: Record<string, unknown>
    rotationInterval?: number
  }

  const RotatingText: ComponentType<RotatingTextProps>
  export default RotatingText
}

declare module "@/components/ScrollFloat.jsx" {
  import type { ComponentType, ReactNode } from "react"

  export type ScrollFloatProps = {
    children?: ReactNode
    animationDuration?: number
    ease?: string
    scrollStart?: string
    scrollEnd?: string
    stagger?: number
    className?: string
  }

  const ScrollFloat: ComponentType<ScrollFloatProps>
  export default ScrollFloat
}

declare module "@/components/VariableProximity.jsx" {
  import type { ComponentType, RefObject } from "react"

  export type VariableProximityProps = {
    label: string
    className?: string
    fromFontVariationSettings?: string
    toFontVariationSettings?: string
    containerRef: RefObject<HTMLElement | null>
    radius?: number
    falloff?: string
  }

  const VariableProximity: ComponentType<VariableProximityProps>
  export default VariableProximity
}
