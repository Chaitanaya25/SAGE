import { useEffect, useMemo, useState } from "react"
import NumberFlow from "@number-flow/react"

type Props = {
  to: number
  suffix?: string
  prefix?: string
  className?: string
}

export default function CountUp({ to, suffix, prefix, className }: Props) {
  const [value, setValue] = useState<number>(0)

  useEffect(() => {
    const t = window.setTimeout(() => setValue(to), 50)
    return () => window.clearTimeout(t)
  }, [to])

  const format = useMemo(() => {
    const hasDecimals = Math.abs(to % 1) > 0
    return hasDecimals
      ? ({ minimumFractionDigits: 1, maximumFractionDigits: 1 } as const)
      : ({ maximumFractionDigits: 0 } as const)
  }, [to])

  return (
    <NumberFlow
      className={className}
      value={value}
      format={format}
      prefix={prefix}
      suffix={suffix}
      transformTiming={{ duration: 700, easing: "cubic-bezier(0.22, 0.61, 0.36, 1)" }}
      opacityTiming={{ duration: 350, easing: "cubic-bezier(0.22, 0.61, 0.36, 1)" }}
      spinTiming={{ duration: 700, easing: "cubic-bezier(0.22, 0.61, 0.36, 1)" }}
    />
  )
}
