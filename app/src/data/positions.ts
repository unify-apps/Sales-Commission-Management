// Positions, read live from the ICM | List Positions automation.
//
// The page never reads a Position object directly — the automation is the only way
// in, and it resolves occupancy in bulk so a list of N positions is still one call.

import { useMemo } from 'react'
import { useExecuteWorkflowNode } from '@unifyapps/app-builder-sdk/hooks/workflow'
import { LIST_POSITIONS, internals } from './callables'

const DEFAULT_LIMIT = 50
const DEFAULT_OFFSET = 0

/** Occupancy is a three-state answer, not a boolean. */
export type Occupancy = 'OCCUPIED' | 'VACANT' | 'CONFLICT'

/** What `ICM | List Positions` returns per row. */
export interface LivePosition {
  positionId: string
  positionCode: string
  name: string
  active: boolean
  occupancy: Occupancy
  payeeId?: string
  employeeId?: string
  payeeName?: string
  matchCount?: number
}

/** The automation's full output envelope (see get_automation_schema). */
interface ListPositionsResponse {
  success?: boolean
  message?: string
  total?: number
  positions?: LivePosition[]
}

export interface LivePositionsQuery {
  /** matches a position code or name, case-insensitively; '' means everything */
  search?: string
  /** the date occupancy is resolved as of — 'YYYY-MM-DD' */
  asOfDate: string
}

export interface LivePositionsResult {
  positions: LivePosition[]
  total?: number
  loading: boolean
  error: unknown
  refetch: () => void
}

/**
 * A read-on-load query: the automation only reads, so it runs on mount and caches
 * by request. `CONFLICT` is not an error — two assignments cover the date and the
 * automation refuses to pick one; render it as its own state.
 */
export function useLivePositions(query: LivePositionsQuery): LivePositionsResult {
  const inputs = useMemo(
    () => ({
      automationId: LIST_POSITIONS.automationId,
      version: '-1',
      runtimeConnections: {},
      parameters: {
        __internals__: internals(),
        // every input is sent as a string; the automation parses and validates them
        search: query.search ?? '',
        asOfDate: query.asOfDate,
        limit: String(DEFAULT_LIMIT),
        offset: String(DEFAULT_OFFSET),
        includeOccupancy: 'true',
      },
      synchronous: true,
    }),
    [query.search, query.asOfDate],
  )

  const result = useExecuteWorkflowNode(
    { id: LIST_POSITIONS.id, context: LIST_POSITIONS.context, inputs },
    { query: { enabled: Boolean(query.asOfDate) } },
  )

  const response = (result.data?.response ?? {}) as ListPositionsResponse

  return {
    positions: response.positions ?? [],
    total: response.total,
    loading: result.isLoading ?? false,
    error: result.error,
    refetch: result.refetch ?? (() => {}),
  }
}
