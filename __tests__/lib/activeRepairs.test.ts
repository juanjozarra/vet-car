import { activeRepairsWhere, boardWorkOrdersWhere, pendingArrivalAppointmentsWhere, ACTIVE_REPAIR_GRACE_PERIOD_MS } from '@/lib/activeRepairs'

describe('activeRepairsWhere', () => {
  afterEach(() => jest.useRealTimers())

  it('scopes to the owner and includes open tickets plus closed ones within the 24h grace window', () => {
    const now = new Date('2026-07-30T12:00:00.000Z')
    jest.useFakeTimers().setSystemTime(now)
    expect(activeRepairsWhere('owner1')).toEqual({
      vehicle: { ownerId: 'owner1' },
      OR: [
        { status: { in: ['PENDING', 'IN_PROGRESS'] } },
        {
          status: { in: ['COMPLETED', 'CANCELLED'] },
          closedAt: { gte: new Date(now.getTime() - ACTIVE_REPAIR_GRACE_PERIOD_MS) },
        },
      ],
    })
  })
})

describe('boardWorkOrdersWhere', () => {
  afterEach(() => jest.useRealTimers())

  it('scopes to the workshop and includes open tickets plus closed ones within the 24h grace window', () => {
    const now = new Date('2026-08-09T12:00:00.000Z')
    jest.useFakeTimers().setSystemTime(now)
    expect(boardWorkOrdersWhere('ws1')).toEqual({
      mechanic: { workshopId: 'ws1' },
      OR: [
        { status: { in: ['PENDING', 'IN_PROGRESS'] } },
        {
          status: { in: ['COMPLETED', 'CANCELLED'] },
          closedAt: { gte: new Date(now.getTime() - ACTIVE_REPAIR_GRACE_PERIOD_MS) },
        },
      ],
    })
  })
})

describe('pendingArrivalAppointmentsWhere', () => {
  it('matches this workshop\'s SCHEDULED appointments with no work order yet, excluding vehicles that already have an open ticket here', () => {
    expect(pendingArrivalAppointmentsWhere('ws1')).toEqual({
      workshopId: 'ws1',
      status: 'SCHEDULED',
      workOrder: null,
      vehicle: {
        workOrders: {
          none: { status: { in: ['PENDING', 'IN_PROGRESS'] }, mechanic: { workshopId: 'ws1' } },
        },
      },
    })
  })
})
