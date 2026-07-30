import { activeRepairsWhere, ACTIVE_REPAIR_GRACE_PERIOD_MS } from '@/lib/activeRepairs'

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
