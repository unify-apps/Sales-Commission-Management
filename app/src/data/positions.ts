// Positions, read live from the ICM automation suite.
//
// The page never reads the Position object directly. Authorization lives in the
// callable, so a screen that reached around it could show org structure it is not
// entitled to — `ICM | List Positions` is the only way in, and it resolves occupancy
// in bulk so a list of N positions is still one call.

import { useMemo } from 'react'
import { useData, type UseDataResult } from '@/lib/data'
import { LIST_POSITIONS } from './callables'

/** What `ICM | List Positions` returns per row. */
export interface LivePosition {
  positionId: string
  positionCode: string
  positionName: string
  occupancy: 'OCCUPIED' | 'VACANT' | 'CONFLICT'
  payeeId?: string
  employeeId?: string
  payeeName?: string
  effectiveStart?: string
  effectiveEnd?: string
  allocationPct?: number
}

export interface LivePositionsQuery {
  /** matches a position code or a name, case-insensitively; '' means everything */
  search?: string
  /** the date occupancy is resolved as of — 'YYYY-MM-DD' or epoch millis */
  asOfDate: string
  limit?: number
  offset?: number
  /** false skips the occupancy fold entirely, for a plain list */
  includeOccupancy?: boolean
}

/**
 * `CONFLICT` is not an error: two assignments cover that date, so the automation
 * refuses to name an occupant rather than picking one. Render it as its own state —
 * collapsing it into VACANT hides a real data problem until it becomes a wrong payout.
 */
export function useLivePositions(
  query: LivePositionsQuery,
): UseDataResult<LivePosition[]> {
  // every input is sent as a string; the automation parses and validates them
  const parameters = useMemo(
    () => ({
      search: query.search ?? '',
      asOfDate: query.asOfDate,
      limit: String(query.limit ?? 50),
      offset: String(query.offset ?? 0),
      includeOccupancy: String(query.includeOccupancy ?? true),
    }),
    [query.search, query.asOfDate, query.limit, query.offset, query.includeOccupancy],
  )

  return useData<LivePosition[]>('icm-live-positions', 'callable', {
    binding: LIST_POSITIONS,
    parameters,
    recordsPath: 'positions',
    enabled: Boolean(query.asOfDate),
  })
}
