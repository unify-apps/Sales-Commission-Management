import { useMemo } from 'react'
import { useExecuteWorkflowNode } from '@unifyapps/app-builder-sdk/hooks/workflow'

import { LIST_POSITION_HIERARCHY, extractCallable, internals } from './callables'
import { useProfiles } from './use-profiles'

/** One row of `ICM | List Position Hierarchy` — flat, with a parent pointer. */
interface HierarchyRow {
  id: string
  versionName: string
  effectiveStart: string
  positionId: string
  positionCode: string
  positionName: string
  /** Who held the seat on the as-of date. Empty when the seat was vacant. */
  person: string
  parentPositionId: string
  parentPosition: string
  parentPerson: string
  isRoot: boolean
}

interface ListHierarchyResult {
  status: string
  total: number
  rootCount: number
  /** Seats with more than one reporting row in force — a data problem, surfaced. */
  overlapping: number
  rows: HierarchyRow[]
}

export interface ChainNode {
  positionId: string
  positionCode: string
  positionName: string
  person: string
  /**
   * The occupant's employee id, from the profiles read — the hierarchy call does
   * not carry it. It is what the detail route is keyed on, so a node without one
   * (a vacant seat, or somebody absent from the profile page) is not navigable
   * rather than navigating to a dead end.
   */
  employeeId: string
  /** From `PositionAttribute` via the profiles read — the hierarchy call has no title. */
  title: string
  /** True for the person the chain was built for. */
  isSelf: boolean
}

export interface UseProfileHierarchyResult {
  /** Root FIRST, the person last — the order the org chart is drawn in. */
  chain: ChainNode[]
  /** The immediate manager's name, or '' at the root. */
  reportsTo: string
  /**
   * Direct reports of any seat, keyed by that seat's positionId. The WHOLE tree
   * is in here, so expanding a node costs no extra call — the structure came
   * back in one read and walking it is free.
   */
  childrenOf: Map<string, ChainNode[]>
  loading: boolean
  error: unknown
  /** True when the walk stopped without reaching a root — a broken parent link. */
  broken: boolean
}

/**
 * How much of the tree is read to walk one chain. The whole structure is one
 * bulk read rather than a call per level, which is what stops a five-deep org
 * costing five round trips.
 */
const SCAN_LIMIT = 200

const EMPTY: ChainNode[] = []

/**
 * The reporting chain above one position, as of a date.
 *
 * Two reads, both bulk: the hierarchy itself, and the profile list for the
 * TITLES the hierarchy call does not carry (they live on `PositionAttribute`,
 * which the profiles callable already folds in). They are joined on
 * `positionId`, never on person name — two people can share a name and a name is
 * not a key.
 */
export function useProfileHierarchy(
  positionId: string | undefined,
  asOfDate: string,
): UseProfileHierarchyResult {
  const enabled = Boolean(positionId) && Boolean(LIST_POSITION_HIERARCHY.id)

  const query = useExecuteWorkflowNode(
    {
      id: LIST_POSITION_HIERARCHY.id,
      context: LIST_POSITION_HIERARCHY.context,
      inputs: {
        ...LIST_POSITION_HIERARCHY.storedInputs,
        parameters: {
          asOfDate,
          versionName: '',
          search: '',
          limit: String(SCAN_LIMIT),
          offset: '0',
          __internals__: internals(),
        },
      },
    },
    { query: { enabled } },
  )

  // Titles by position, from the same as-of date so a re-levelled seat shows the
  // title it carried then.
  const profiles = useProfiles({ asOfDate, limit: SCAN_LIMIT, offset: 0, enabled })

  // Both joins come off the same profiles read, keyed on position.
  const { titleByPosition, employeeByPosition } = useMemo(() => {
    const titles = new Map<string, string>()
    const employees = new Map<string, string>()
    for (const row of profiles.rows) {
      if (!row.positionId) continue
      if (row.titleName) titles.set(row.positionId, row.titleName)
      if (row.employeeId) employees.set(row.positionId, row.employeeId)
    }
    return { titleByPosition: titles, employeeByPosition: employees }
  }, [profiles.rows])

  return useMemo(() => {
    const loading = (query.isLoading ?? false) || profiles.loading
    const none = new Map<string, ChainNode[]>()
    if (!positionId || !query.data) {
      return { chain: EMPTY, reportsTo: '', childrenOf: none, loading, error: query.error, broken: false }
    }

    let result: ListHierarchyResult
    try {
      result = extractCallable<ListHierarchyResult>(query.data)
    } catch (error) {
      return { chain: EMPTY, reportsTo: '', childrenOf: none, loading: false, error, broken: false }
    }

    const byPosition = new Map(result.rows.map((r) => [r.positionId, r]))

    const toNode = (row: HierarchyRow, self: boolean): ChainNode => ({
      positionId: row.positionId,
      positionCode: row.positionCode,
      positionName: row.positionName,
      person: row.person,
      employeeId: employeeByPosition.get(row.positionId) ?? '',
      title: titleByPosition.get(row.positionId) ?? '',
      isSelf: self,
    })

    // Every seat's direct reports, built once from the same rows.
    const childrenOf = new Map<string, ChainNode[]>()
    for (const row of result.rows) {
      if (!row.parentPositionId) continue
      const siblings = childrenOf.get(row.parentPositionId) ?? []
      siblings.push(toNode(row, row.positionId === positionId))
      childrenOf.set(row.parentPositionId, siblings)
    }
    for (const siblings of childrenOf.values()) {
      siblings.sort((a, b) => (a.person || a.positionCode).localeCompare(b.person || b.positionCode))
    }

    const self = byPosition.get(positionId)
    if (!self) {
      // The person holds a seat that is in no reporting row — not an error, just
      // somebody not placed in the hierarchy yet.
      return { chain: EMPTY, reportsTo: '', childrenOf, loading: false, error: undefined, broken: false }
    }

    // Walk UP to the root, guarding against a cycle: a bad parent link would
    // otherwise spin here forever rather than showing anything.
    const upward: HierarchyRow[] = []
    const visited = new Set<string>()
    let cursor: HierarchyRow | undefined = self
    while (cursor && !visited.has(cursor.positionId)) {
      visited.add(cursor.positionId)
      upward.push(cursor)
      if (cursor.isRoot || !cursor.parentPositionId) break
      cursor = byPosition.get(cursor.parentPositionId)
    }

    const last = upward[upward.length - 1]
    const broken = !last?.isRoot && Boolean(last?.parentPositionId)

    const chain: ChainNode[] = upward
      .slice()
      .reverse()
      .map((row) => toNode(row, row.positionId === positionId))

    return {
      chain,
      reportsTo: self.parentPerson || '',
      childrenOf,
      loading: false,
      error: undefined,
      broken,
    }
  }, [positionId, query.data, query.isLoading, query.error, profiles.loading, titleByPosition, employeeByPosition])
}
