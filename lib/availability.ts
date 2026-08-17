export interface WorkshopHoursWindow {
  dayOfWeek: number
  opensMinute: number
  closesMinute: number
}

export interface GetAvailableSlotsParams {
  hours: WorkshopHoursWindow[]
  slotDurationMinutes: number
  bookedTimes: Date[]
  now: Date
  daysAhead?: number
  minLeadMinutes?: number
}

export function getAvailableSlots({
  hours,
  slotDurationMinutes,
  bookedTimes,
  now,
  daysAhead = 14,
  minLeadMinutes = 120,
}: GetAvailableSlotsParams): Date[] {
  if (slotDurationMinutes <= 0) return []

  const bookedTimestamps = new Set(bookedTimes.map(d => d.getTime()))
  const earliestAllowed = new Date(now.getTime() + minLeadMinutes * 60_000)
  const slots: Date[] = []

  // opensMinute/closesMinute are naive wall-clock minutes with no timezone of their own —
  // anchor them to UTC (not the server process's local TZ, e.g. UTC in Docker/Vercel vs.
  // whatever a dev machine has) so the encoded hour is stable across deployments. The
  // client formats these slots with `timeZone: 'UTC'` too — see ScheduleView.tsx.
  for (let dayOffset = 0; dayOffset < daysAhead; dayOffset++) {
    const day = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + dayOffset))
    const dayWindows = hours.filter(h => h.dayOfWeek === day.getUTCDay())

    for (const window of dayWindows) {
      for (
        let minute = window.opensMinute;
        minute + slotDurationMinutes <= window.closesMinute;
        minute += slotDurationMinutes
      ) {
        const slotStart = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), 0, minute))
        if (slotStart < earliestAllowed) continue
        if (bookedTimestamps.has(slotStart.getTime())) continue
        slots.push(slotStart)
      }
    }
  }

  return slots
}

// Slots are UTC-anchored naive wall-clock times (see the comment in getAvailableSlots).
// Every surface that renders a scheduledAt must format in UTC or it will show an hour
// the workshop never opened. These live here, beside the anchoring, so a new caller
// reaches for them instead of building a formatter with the wrong timezone.
export const SLOT_TIME_FORMATTER = new Intl.DateTimeFormat('es-AR', {
  hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC',
})
// For surfaces that list slots across several days — a bare time there is ambiguous,
// because the reader cannot tell today's 09:00 from next Tuesday's.
export const SLOT_DATE_TIME_FORMATTER = new Intl.DateTimeFormat('es-AR', {
  day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC',
})
export const SLOT_DAY_FORMATTER = new Intl.DateTimeFormat('es-AR', {
  day: 'numeric', timeZone: 'UTC',
})
export const SLOT_MONTH_FORMATTER = new Intl.DateTimeFormat('es-AR', {
  month: 'short', timeZone: 'UTC',
})
