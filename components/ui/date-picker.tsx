"use client"

import * as React from "react"
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

const WEEKDAY_LABELS = ["D", "L", "M", "M", "J", "V", "S"]
const MONTH_FORMATTER = new Intl.DateTimeFormat("es-AR", { month: "long", year: "numeric" })
const TRIGGER_FORMATTER = new Intl.DateTimeFormat("es-AR", { weekday: "short", day: "numeric", month: "short" })

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

function buildMonthGrid(month: Date): (Date | null)[] {
  const year = month.getFullYear()
  const m = month.getMonth()
  const daysInMonth = new Date(year, m + 1, 0).getDate()
  const leadingBlanks = new Date(year, m, 1).getDay()
  const cells: (Date | null)[] = Array.from({ length: leadingBlanks }, () => null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, m, d))
  return cells
}

interface DatePickerProps {
  selected: Date | null
  onSelect: (date: Date) => void
  isDayDisabled?: (date: Date) => boolean
  minMonth?: Date
  maxMonth?: Date
  placeholder?: string
  disabled?: boolean
  className?: string
}

function DatePicker({
  selected, onSelect, isDayDisabled, minMonth, maxMonth, placeholder = "Elegí una fecha", disabled, className,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)
  const [visibleMonth, setVisibleMonth] = React.useState(() => startOfMonth(selected ?? new Date()))

  const weeks = React.useMemo(() => buildMonthGrid(visibleMonth), [visibleMonth])
  const today = React.useMemo(() => new Date(), [])

  const canGoPrev = !minMonth || visibleMonth.getTime() > startOfMonth(minMonth).getTime()
  const canGoNext = !maxMonth || visibleMonth.getTime() < startOfMonth(maxMonth).getTime()

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (next) setVisibleMonth(startOfMonth(selected ?? new Date()))
  }

  function handleSelect(date: Date) {
    onSelect(date)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "flex h-11 items-center gap-2 rounded-lg border border-input bg-background px-3 text-sm text-foreground transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
        >
          <CalendarIcon className="size-4 shrink-0 text-muted-foreground" />
          <span className={cn(!selected && "text-muted-foreground")}>
            {selected ? capitalize(TRIGGER_FORMATTER.format(selected)) : placeholder}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[272px] p-3">
        <div className="flex items-center justify-between pb-2">
          <button
            type="button"
            aria-label="Mes anterior"
            disabled={!canGoPrev}
            onClick={() => setVisibleMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
            className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
          >
            <ChevronLeftIcon className="size-4" />
          </button>
          <span className="text-sm font-medium text-foreground">{capitalize(MONTH_FORMATTER.format(visibleMonth))}</span>
          <button
            type="button"
            aria-label="Mes siguiente"
            disabled={!canGoNext}
            onClick={() => setVisibleMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
            className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
          >
            <ChevronRightIcon className="size-4" />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1">
          {WEEKDAY_LABELS.map((label, i) => (
            <div key={i} className="flex h-7 items-center justify-center text-xs text-muted-foreground">
              {label}
            </div>
          ))}
          {weeks.map((date, i) => {
            if (!date) return <div key={i} />
            const isDisabled = isDayDisabled?.(date) ?? false
            const isSelected = selected !== null && isSameDay(date, selected)
            const isToday = isSameDay(date, today)
            return (
              <button
                key={i}
                type="button"
                disabled={isDisabled}
                onClick={() => handleSelect(date)}
                className={cn(
                  "flex h-8 items-center justify-center rounded-md text-sm transition-colors",
                  isDisabled
                    ? "cursor-not-allowed text-muted-foreground/30"
                    : isSelected
                      ? "bg-primary text-primary-foreground"
                      : "text-foreground hover:bg-accent",
                  !isSelected && isToday && "ring-1 ring-inset ring-border"
                )}
              >
                {date.getDate()}
              </button>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}

export { DatePicker }
