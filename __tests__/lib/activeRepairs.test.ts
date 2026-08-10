import { activeRepairsWhere, boardWorkOrdersWhere, pendingArrivalAppointmentsWhere, ACTIVE_REPAIR_GRACE_PERIOD_MS } from '@/lib/activeRepairs'

describe('activeRepairsWhere', () => {
  afterEach(() => jest.useRealTimers())

  it('scopes to the given owner', () => {
    const where = activeRepairsWhere('owner1') as any
    expect(where.vehicle).toEqual({ ownerId: 'owner1' })
  })

  it('always includes PENDING and IN_PROGRESS', () => {
    const where = activeRepairsWhere('owner1') as any
    expect(where.OR[0]).toEqual({ status: { in: ['PENDING', 'IN_PROGRESS'] } })
  })

  it('includes COMPLETED/CANCELLED only within the 24h grace window', () => {
    const now = new Date('2026-07-30T12:00:00.000Z')
    jest.useFakeTimers().setSystemTime(now)
    const where = activeRepairsWhere('owner1') as any
    expect(where.OR[1].status).toEqual({ in: ['COMPLETED', 'CANCELLED'] })
    expect(where.OR[1].closedAt.gte).toEqual(new Date(now.getTime() - ACTIVE_REPAIR_GRACE_PERIOD_MS))
  })
})

describe('boardWorkOrdersWhere', () => {
  afterEach(() => jest.useRealTimers())

  it('scopes to the workshop', () => {
    const where = boardWorkOrdersWhere('ws1') as any
    expect(where.mechanic).toEqual({ workshopId: 'ws1' })
  })

  it('always includes open tickets', () => {
    const where = boardWorkOrdersWhere('ws1') as any
    expect(where.OR[0]).toEqual({ status: { in: ['PENDING', 'IN_PROGRESS'] } })
  })

  it('includes closed tickets only within the 24h grace window', () => {
    const now = new Date('2026-08-09T12:00:00.000Z')
    jest.useFakeTimers().setSystemTime(now)
    const where = boardWorkOrdersWhere('ws1') as any
    expect(where.OR[1].status).toEqual({ in: ['COMPLETED', 'CANCELLED'] })
    expect(where.OR[1].closedAt.gte).toEqual(new Date(now.getTime() - ACTIVE_REPAIR_GRACE_PERIOD_MS))
  })
})

describe('pendingArrivalAppointmentsWhere', () => {
  it('matches this workshop\'s SCHEDULED appointments that have no work order yet', () => {
    const where = pendingArrivalAppointmentsWhere('ws1') as any
    expect(where.workshopId).toBe('ws1')
    expect(where.status).toBe('SCHEDULED')
    expect(where.workOrder).toBeNull()
  })

  it('excludes vehicles that already have an open ticket at this workshop', () => {
    const where = pendingArrivalAppointmentsWhere('ws1') as any
    expect(where.vehicle).toEqual({
      workOrders: {
        none: { status: { in: ['PENDING', 'IN_PROGRESS'] }, mechanic: { workshopId: 'ws1' } },
      },
    })
  })
})
