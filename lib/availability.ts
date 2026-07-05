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

  for (let dayOffset = 0; dayOffset < daysAhead; dayOffset++) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + dayOffset)
    const dayWindows = hours.filter(h => h.dayOfWeek === day.getDay())

    for (const window of dayWindows) {
      for (
        let minute = window.opensMinute;
        minute + slotDurationMinutes <= window.closesMinute;
        minute += slotDurationMinutes
      ) {
        const slotStart = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, minute)
        if (slotStart < earliestAllowed) continue
        if (bookedTimestamps.has(slotStart.getTime())) continue
        slots.push(slotStart)
      }
    }
  }

  return slots
}
