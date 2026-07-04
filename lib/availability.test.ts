import { getAvailableSlots } from './availability'

describe('getAvailableSlots', () => {
  // 2024-01-01 is a Monday (dayOfWeek = 1), used as a fixed, deterministic reference point.
  const monday = new Date(2024, 0, 1, 8, 0)

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
    expect(slots.map(s => s.getHours())).toEqual([9, 10, 11, 12])
  })

  it('excludes already-booked slots', () => {
    const slots = getAvailableSlots({
      hours: [{ dayOfWeek: 1, opensMinute: 540, closesMinute: 780 }],
      slotDurationMinutes: 60,
      bookedTimes: [new Date(2024, 0, 1, 10, 0)],
      now: monday,
      daysAhead: 1,
      minLeadMinutes: 0,
    })
    expect(slots.map(s => s.getHours())).toEqual([9, 11, 12])
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
    expect(slots.map(s => s.getHours())).toEqual([10, 11, 12])
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
    expect(slots[0].getDay()).toBe(1)
    expect(slots[1].getDay()).toBe(3)
  })
})
