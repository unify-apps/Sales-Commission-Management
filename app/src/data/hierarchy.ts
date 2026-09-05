import { useMemo } from 'react'
import { useData } from '@/lib/data'
import {
  LIST_POSITION_HIERARCHY,
  type HierarchyVersion,
  type PositionHierarchyRow,
} from './bindings'
import { toWireFilters, type FilterRow } from './hierarchy-filter'

/** Everything the page can ask the automation for. */
export interface HierarchyQuery {
  /** YYYY-MM-DD. Empty means the automation's own default, which is today. */
  asOfDate: string
  search: string
  filters: FilterRow[]
  rootOperator: 'AND' | 'OR'
  /**
   * A flat list wants only the rows that matched. A tree also needs each match's
   * ancestors, or it fragments into orphans — so the view says which it is.
   */
  includeAncestors: boolean
  limit: number
  offset: number
}

export const DEFAULT_PAGE_SIZE = 10

export function emptyQuery(asOfDate = ''): HierarchyQuery {
  return {
    asOfDate, search: '', filters: [], rootOperator: 'AND',
    includeAncestors: false, limit: DEFAULT_PAGE_SIZE, offset: 0,
  }
}

/**
 * A short label for one version. The date is what the callable wants; this is only
 * what the picker shows.
 */
export function versionLabel(asOfDate: string) {
  const parsed = new Date(`${asOfDate}T00:00:00Z`)
  // Loud rather than wrong: an unparseable value must not render as a plausible month.
  if (Number.isNaN(parsed.getTime())) return asOfDate
  const month = parsed.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' }).toUpperCase()
  return `${month}-${parsed.getUTCFullYear()}`
}

// The callable answers with '' for anything it could not resolve — a vacant seat, a
// contested date, a payee record that no longer exists. The page renders null as
// "Open seat" and '—', so the empty strings become null exactly once, here.
const orNull = (value: string | undefined) => (value ? value : null)

export interface HierarchyTableRow {
  id: string
  effectiveStart: string
  positionName: string
  positionCode: string
  person: string | null
  parentPosition: string | null
  parentPerson: string | null
  isRoot: boolean
  /** False when the row is present only because a match sits beneath it. */
  isMatch: boolean
  depth: number
}

function toHierarchyRow(row: PositionHierarchyRow): HierarchyTableRow {
  return {
    id: row.id,
    effectiveStart: row.effectiveStart,
    positionName: row.positionName,
    positionCode: row.positionCode,
    person: orNull(row.person),
    parentPosition: orNull(row.parentPosition),
    parentPerson: orNull(row.parentPerson),
    isRoot: row.isRoot,
    isMatch: row.isMatch !== false,
    depth: row.depth ?? 0,
  }
}

/**
 * The reporting structure for one as-of date, from `ICM | List Position Hierarchy`.
 *
 * Search, filters and paging all happen in the callable — the page sends the query
 * and renders the answer. Two consequences worth knowing:
 *
 * Rows come back with `isMatch: false` when they are only present because a match
 * sits beneath them. Filtering without those ancestors would orphan every match whose
 * manager did not match, and the tree would lose whole branches.
 *
 * `total` is the count AFTER filtering and BEFORE paging, so pagination reports the
 * real number rather than the size of the page it just received.
 */
export function useHierarchy(query: HierarchyQuery) {
  // Only complete rows are sent. A half-typed row would filter to nothing and read
  // as "no matches" while the user is still choosing a value.
  const wireFilters = useMemo(() => toWireFilters(query.filters), [query.filters])

  const parameters = useMemo(
    () => ({
      asOfDate: query.asOfDate,
      search: query.search,
      filters: wireFilters.length > 0 ? JSON.stringify(wireFilters) : '',
      rootOperator: query.rootOperator,
      includeAncestors: String(query.includeAncestors),
      limit: String(query.limit),
      offset: String(query.offset),
    }),
    [
      query.asOfDate, query.search, wireFilters, query.rootOperator,
      query.includeAncestors, query.limit, query.offset,
    ],
  )

  const result = useData<PositionHierarchyRow[]>('org-hierarchy', 'callable', {
    binding: LIST_POSITION_HIERARCHY,
    parameters,
  })

  // Three outcomes, not two. A read that FAILED is not a read that came back empty,
  // and on a comp system the difference matters: this structure decides who is paid
  // on whose deals, so a page that renders invented reporting lines — or claims a
  // version has none — is worse than one that admits it could not load. No `status`
  // once loading has finished means the automation never answered at all.
  const failed = Boolean(result.error) || (!result.loading && !result.status)

  // INVALID_INPUT arrives as a healthy 200 — a refused filter is not a failed read,
  // and it carries a message naming the row the automation would not accept.
  const refused = result.status === 'INVALID_INPUT'

  const rows = useMemo<HierarchyTableRow[]>(
    () => (failed || refused ? [] : (result.data ?? []).map(toHierarchyRow)),
    [failed, refused, result.data],
  )

  const versions = useMemo<HierarchyVersion[]>(
    () => result.availableVersions ?? [],
    [result.availableVersions],
  )

  return {
    rows,
    versions,
    loading: result.loading,
    failed,
    refused,
    total: result.total ?? 0,
    /** Rows that actually matched, excluding ancestors kept for context. */
    matched: result.matched ?? 0,
    hasMore: result.hasMore ?? false,
    status: result.status,
    message: result.message,
    refetch: result.refetch,
  }
}
