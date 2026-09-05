import { useMemo } from 'react'
import { useExecuteWorkflowNode } from '@unifyapps/app-builder-sdk/hooks/workflow'

import { LIST_PROFILES, extractCallable, internals } from './callables'

/** One row of `ICM | List Profiles`. Org structure only — the callable carries no money. */
export interface ProfileRow {
  payeeId: string
  employeeId: string
  name: string
  email: string
  status: string
  /** ASSIGNED · UNASSIGNED · CONFLICT · UNKNOWN (only when org was not resolved). */
  assignment: string
  matchCount: number
  positionId: string
  positionCode: string
  positionName: string
  titleId: string
  titleName: string
  territoryId: string
  territoryName: string
  managerPositionId: string
  managerPayeeId: string
  managerName: string
  allocationPct: number | null
  effectiveStart: number | null
  effectiveEnd: number | null
  hireDate: number | null
  terminationDate: number | null
}

interface ListProfilesResult {
  status: string
  success: boolean
  message: string
  asOfDate: string
  total: number
  hasMore: boolean
  offset: number
  limit: number
  orgResolved: boolean
  joinsTruncated: boolean
  counts: { total: number; assigned: number; unassigned: number; conflict: number }
  profiles: ProfileRow[]
}

export interface ProfilesQuery {
  /** Matched server-side against employeeId OR name OR email, case-insensitively. */
  search?: string
  /** `Payee.status`, e.g. ACTIVE / TERMINATED. Uppercased inside the callable. */
  status?: string
  titleId?: string
  territoryId?: string
  managerPositionId?: string
  /** `YYYY-MM-DD`, read as midnight UTC. Blank means today. */
  asOfDate?: string
  limit?: number
  offset?: number
  /** false skips every org join and returns payees alone. */
  includeOrg?: boolean
}

export interface UseProfilesResult {
  rows: ProfileRow[]
  total: number
  hasMore: boolean
  /** The callable's own status — branch on this, never on the transport. */
  status: string | undefined
  message: string | undefined
  /** The date the callable actually resolved against; it echoes it back. */
  asOfDate: string | undefined
  counts: ListProfilesResult['counts'] | undefined
  loading: boolean
  error: unknown
  refetch: () => void
}

const NOOP = () => {}
const EMPTY: ProfileRow[] = []

/**
 * Every input the callable takes is a STRING, and it applies its own defaults to
 * `""` — real callers send empty strings for what they did not fill, so `""` is
 * the value each field is designed around rather than an edge case. Sending a
 * number, or omitting a key, is not the contract.
 */
function toParameters(q: ProfilesQuery) {
  return {
    search: q.search?.trim() ?? '',
    status: q.status ?? '',
    titleId: q.titleId ?? '',
    territoryId: q.territoryId ?? '',
    managerPositionId: q.managerPositionId ?? '',
    asOfDate: q.asOfDate ?? '',
    limit: q.limit === undefined ? '' : String(q.limit),
    offset: q.offset === undefined ? '' : String(q.offset),
    includeOrg: q.includeOrg === false ? 'false' : '',
  }
}

/** Reads `ICM | List Profiles` through the `listProfiles` data source. */
export function useProfiles(query: ProfilesQuery): UseProfilesResult {
  const enabled = Boolean(LIST_PROFILES.id)

  // Callers pass `query` as a fresh object literal every render, so memoising on
  // it directly would never hit. Key on the serialised parameters instead: it is
  // stable BY VALUE, which is what the query cache needs, and it keeps the
  // dependency list honest rather than listing nine fields the linter cannot
  // check.
  const parametersKey = JSON.stringify(toParameters(query))

  // The WHOLE stored input set, with every templated parameter replaced. A subset
  // — of the inputs OR of the parameter keys — is refused as
  // "forbidden datasource : invalid input", and so is a context missing its
  // `resourceVersion`. Spreading the binding is what keeps both right by
  // construction rather than by remembering.
  const inputs = useMemo(
    () => ({
      ...LIST_PROFILES.storedInputs,
      parameters: {
        ...(JSON.parse(parametersKey) as ReturnType<typeof toParameters>),
        // NESTED under this key, never spread flat: it tells the runtime which
        // app and page the call came from.
        __internals__: internals(),
      },
    }),
    [parametersKey],
  )

  const result = useExecuteWorkflowNode(
    { id: LIST_PROFILES.id, context: LIST_PROFILES.context, inputs },
    { query: { enabled } },
  )

  const payload = useMemo(() => {
    if (!result.data) return undefined
    try {
      return extractCallable<ListProfilesResult>(result.data)
    } catch (error) {
      return { error } as const
    }
  }, [result.data])

  const ok = payload && !('error' in payload) ? payload : undefined

  return {
    rows: ok?.profiles ?? EMPTY,
    total: ok?.total ?? 0,
    hasMore: ok?.hasMore ?? false,
    status: ok?.status,
    message: ok?.message,
    asOfDate: ok?.asOfDate,
    counts: ok?.counts,
    loading: result.isLoading ?? false,
    error: result.error ?? (payload && 'error' in payload ? payload.error : undefined),
    refetch: result.refetch ?? NOOP,
  }
}
