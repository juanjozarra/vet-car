import type { HistoryEntrySummary } from './vehicleHistory'

export type HistoryFilters = {
  query: string
  type: HistoryEntrySummary['type'] | 'ALL'
  source: HistoryEntrySummary['source'] | 'ALL'
}

export const EMPTY_HISTORY_FILTERS: HistoryFilters = { query: '', type: 'ALL', source: 'ALL' }

/** Free-text match over description, taller and autor + type/source narrowing. */
export function filterHistoryEntries(
  entries: HistoryEntrySummary[],
  { query, type, source }: HistoryFilters
): HistoryEntrySummary[] {
  const q = query.trim().toLowerCase()
  return entries.filter(
    e =>
      (type === 'ALL' || e.type === type) &&
      (source === 'ALL' || e.source === source) &&
      (q === '' ||
        e.description.toLowerCase().includes(q) ||
        (e.workshopName?.toLowerCase().includes(q) ?? false) ||
        (e.createdByName?.toLowerCase().includes(q) ?? false))
  )
}
