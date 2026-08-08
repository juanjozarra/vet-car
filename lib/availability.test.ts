import { getAvailableSlots } from './availability'

describe('getAvailableSlots', () => {
  // 2024-01-01 is a Monday (dayOfWeek = 1), used as a fixed, deterministic reference point.
  // Built with Date.UTC (not the local constructor) so the test is deterministic regardless
  // of the machine's timezone, matching getAvailableSlots' UTC-anchored slot generation.
  const monday = new Date(Date.UTC(2024, 0, 1, 8, 0))

  it('returns no slots for a day with no configured hours', () => {
    const slots = getAvailableSlots({
      hours: [{ dayOfWeek: 2, opensMinute: 540, closesMinute: 780 }], // Tuesday only
      slotDurationMinutes: 60,
      bookedTimes: [],
      now: monday,
      daysAhead: 1,
    })
    expect(slots).toEqual([])
  })

  it('generates one slot per hour within the configured window', () => {
    const slots = getAvailableSlots({
      hours: [{ dayOfWeek: 1, opensMinute: 540, closesMinute: 780 }], // Monday 9:00-13:00
      slotDurationMinutes: 60,
      bookedTimes: [],
      now: monday,
      daysAhead: 1,
      minLeadMinutes: 0,
    })
    expect(slots.map(s => s.getUTCHours())).toEqual([9, 10, 11, 12])
  })

  it('excludes already-booked slots', () => {
    const slots = getAvailableSlots({
      hours: [{ dayOfWeek: 1, opensMinute: 540, closesMinute: 780 }],
      slotDurationMinutes: 60,
      bookedTimes: [new Date(Date.UTC(2024, 0, 1, 10, 0))],
      now: monday,
      daysAhead: 1,
      minLeadMinutes: 0,
    })
    expect(slots.map(s => s.getUTCHours())).toEqual([9, 11, 12])
  })

  it('excludes slots inside the minimum lead time', () => {
    const slots = getAvailableSlots({
      hours: [{ dayOfWeek: 1, opensMinute: 540, closesMinute: 780 }],
      slotDurationMinutes: 60,
      bookedTimes: [],
      now: monday, // 8:00
      daysAhead: 1,
      minLeadMinutes: 120, // earliest allowed = 10:00
    })
    expect(slots.map(s => s.getUTCHours())).toEqual([10, 11, 12])
  })

  it('returns no slots and does not hang for a non-positive slotDurationMinutes', () => {
    const slots = getAvailableSlots({
      hours: [{ dayOfWeek: 1, opensMinute: 540, closesMinute: 780 }],
      slotDurationMinutes: 0,
      bookedTimes: [],
      now: monday,
      daysAhead: 1,
      minLeadMinutes: 0,
    })
    expect(slots).toEqual([])
  })

  it('projects slots across multiple days honoring day-of-week', () => {
    const slots = getAvailableSlots({
      hours: [
        { dayOfWeek: 1, opensMinute: 540, closesMinute: 600 }, // Monday 9-10
        { dayOfWeek: 3, opensMinute: 540, closesMinute: 600 }, // Wednesday 9-10
      ],
      slotDurationMinutes: 60,
      bookedTimes: [],
      now: monday,
      daysAhead: 7,
      minLeadMinutes: 0,
    })
    expect(slots).toHaveLength(2)
    expect(slots[0].getUTCDay()).toBe(1)
    expect(slots[1].getUTCDay()).toBe(3)
  })
})
