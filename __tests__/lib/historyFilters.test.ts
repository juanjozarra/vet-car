import { EMPTY_HISTORY_FILTERS, filterHistoryEntries } from '@/lib/historyFilters'
import type { HistoryEntrySummary } from '@/lib/vehicleHistory'

function entry(overrides: Partial<HistoryEntrySummary>): HistoryEntrySummary {
  return {
    id: 'e1',
    type: 'REPAIR',
    description: 'Cambio de pastillas',
    performedAt: '2026-01-01T00:00:00.000Z',
    odometerReading: null,
    cost: null,
    photoUrl: null,
    source: 'MECHANIC',
    createdById: 'u1',
    createdByName: 'Ana',
    workshopName: 'Taller Sur',
    ...overrides,
  }
}

const entries = [
  entry({ id: 'a', type: 'REPAIR', source: 'MECHANIC', description: 'Cambio de pastillas' }),
  entry({ id: 'b', type: 'MAINTENANCE', source: 'OWNER', description: 'Service de aceite', workshopName: null, createdByName: 'Beto' }),
  entry({ id: 'c', type: 'UPGRADE', source: 'MECHANIC', description: 'Llantas nuevas', workshopName: 'Norte Motors' }),
]

const ids = (list: HistoryEntrySummary[]) => list.map(e => e.id)

describe('filterHistoryEntries', () => {
  it('returns everything with the empty filter', () => {
    expect(ids(filterHistoryEntries(entries, EMPTY_HISTORY_FILTERS))).toEqual(['a', 'b', 'c'])
  })

  it('narrows by type and by source', () => {
    expect(ids(filterHistoryEntries(entries, { ...EMPTY_HISTORY_FILTERS, type: 'UPGRADE' }))).toEqual(['c'])
    expect(ids(filterHistoryEntries(entries, { ...EMPTY_HISTORY_FILTERS, source: 'OWNER' }))).toEqual(['b'])
  })

  it('matches description, workshop and author case-insensitively', () => {
    expect(ids(filterHistoryEntries(entries, { ...EMPTY_HISTORY_FILTERS, query: 'ACEITE' }))).toEqual(['b'])
    expect(ids(filterHistoryEntries(entries, { ...EMPTY_HISTORY_FILTERS, query: 'norte' }))).toEqual(['c'])
    expect(ids(filterHistoryEntries(entries, { ...EMPTY_HISTORY_FILTERS, query: 'beto' }))).toEqual(['b'])
  })

  it('combines filters and ignores surrounding whitespace', () => {
    expect(
      ids(filterHistoryEntries(entries, { query: '  llantas ', type: 'UPGRADE', source: 'MECHANIC' }))
    ).toEqual(['c'])
    expect(ids(filterHistoryEntries(entries, { query: 'llantas', type: 'REPAIR', source: 'ALL' }))).toEqual([])
  })
})
