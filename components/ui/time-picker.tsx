"use client"

import * as React from "react"
import { ClockIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

const HOURS = Array.from({ length: 24 }, (_, i) => i)
const MINUTES = Array.from({ length: 60 }, (_, i) => i)

function pad(n: number): string {
  return String(n).padStart(2, "0")
}

function parseValue(value: string): { hour: number; minute: number } {
  const [h, m] = value.split(":").map(Number)
  return { hour: Number.isFinite(h) ? h : 0, minute: Number.isFinite(m) ? m : 0 }
}

interface TimePickerProps {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  className?: string
}

function TimePicker({ value, onChange, disabled, className }: TimePickerProps) {
  const [open, setOpen] = React.useState(false)
  const { hour, minute } = parseValue(value)

  function commit(nextHour: number, nextMinute: number) {
    onChange(`${pad(nextHour)}:${pad(nextMinute)}`)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          data-slot="time-picker-trigger"
          className={cn(
            "flex h-9 w-32 items-center gap-2 rounded-lg border border-input bg-background px-2.5 text-sm text-foreground transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
        >
          <ClockIcon className="size-4 shrink-0 text-muted-foreground" />
          <span className="font-mono">{pad(hour)}:{pad(minute)}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-2">
        <div className="flex gap-1">
          <TimeColumn values={HOURS} selected={hour} onSelect={h => commit(h, minute)} />
          <div className="flex items-center px-0.5 text-muted-foreground">:</div>
          <TimeColumn values={MINUTES} selected={minute} onSelect={m => commit(hour, m)} />
        </div>
      </PopoverContent>
    </Popover>
  )
}

function TimeColumn({
  values, selected, onSelect,
}: {
  values: number[]
  selected: number
  onSelect: (value: number) => void
}) {
  const selectedRef = React.useRef<HTMLButtonElement>(null)

  React.useEffect(() => {
    selectedRef.current?.scrollIntoView({ block: "center" })
  }, [])

  return (
    <div className="flex max-h-56 w-14 flex-col gap-0.5 overflow-y-auto">
      {values.map(v => (
        <button
          key={v}
          ref={v === selected ? selectedRef : undefined}
          type="button"
          onClick={() => onSelect(v)}
          className={cn(
            "shrink-0 rounded-md px-2 py-1.5 text-center font-mono text-sm transition-colors",
            v === selected
              ? "bg-primary/10 text-primary"
              : "text-foreground hover:bg-accent"
          )}
        >
          {pad(v)}
        </button>
      ))}
    </div>
  )
}

export { TimePicker }
