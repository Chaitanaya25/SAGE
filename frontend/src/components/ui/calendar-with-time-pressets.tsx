import { useMemo, useState } from "react"

import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"

type Props = {
  value?: { date: Date | undefined; time: string | null }
  onChange?: (next: { date: Date | undefined; time: string | null }) => void
  className?: string
}

export function Calendar20({ value, onChange, className }: Props) {
  const [internalDate, setInternalDate] = useState<Date | undefined>(value?.date)
  const [internalTime, setInternalTime] = useState<string | null>(value?.time ?? null)

  const presets = useMemo(
    () => ["09:00 AM", "10:30 AM", "01:00 PM", "03:00 PM", "06:00 PM"] as const,
    []
  )

  const selectedDate = value ? value.date : internalDate
  const selectedTime = value ? value.time : internalTime

  function setNext(next: { date: Date | undefined; time: string | null }) {
    if (onChange) {
      onChange(next)
      return
    }
    setInternalDate(next.date)
    setInternalTime(next.time)
  }

  return (
    <div className={cn("p-4 w-[360px]", className)}>
      <Calendar
        mode="single"
        selected={selectedDate}
        onSelect={(d) => setNext({ date: d, time: selectedTime })}
      />
      <div className="mt-4 grid grid-cols-3 gap-2">
        {presets.map((t) => (
          <button
            key={t}
            type="button"
            className={cn(
              "h-9 rounded-lg border text-xs transition-colors",
              selectedTime === t ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-accent"
            )}
            onClick={() => setNext({ date: selectedDate, time: t })}
          >
            {t}
          </button>
        ))}
      </div>
    </div>
  )
}
