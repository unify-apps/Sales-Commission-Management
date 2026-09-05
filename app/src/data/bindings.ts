// Placeholder — `provision_data_sources` REWRITES this file with this app's
// five dataSource ids. Until then every id is empty and the storage reads are
// disabled, so an unprovisioned app calls nothing rather than the wrong thing.
// A UI-only app never provisions and never uses these.
// These five bindings are OBJECT-AGNOSTIC: the object is chosen per call via
// `object_type`, so they serve every object this app has. Never provision more.
//
// Every call must send the WHOLE stored input set — spread `storedInputs` and
// override only the fields listed in `overridable`.

export const ENTITY: Record<string, string> = {
  // filled in by the builder: <name>: '<entityType from create_object>',
}

export const FETCH = {
  id: "",
  context: {"appName": "storage_by_unifyapps", "resourceName": "storage_by_unifyapps_fetch_records"},
  storedInputs: {
  "numberOfRecordsToFetch": "MULTIPLE",
  "shouldSearchInAnalyticsStore": false,
  "includeCurrentUserPermissions": false,
  "includeRoleMappings": false,
  "readThroughSessionVariables": false,
  "translationsOption": "DEFAULT",
  "includeTotalCount": true,
  "object_type": "{{object_type}}",
  "triggerInputCondition": "{{triggerInputCondition}}",
  "page": "{{page}}",
  "sortBy": "{{sortBy}}"
},
  overridable: ["object_type", "triggerInputCondition", "page", "sortBy"],
} as const

export const FETCH_ONE = {
  id: "",
  context: {"appName": "storage_by_unifyapps", "resourceName": "storage_by_unifyapps_fetch_records"},
  storedInputs: {
  "numberOfRecordsToFetch": "SINGLE",
  "shouldSearchInAnalyticsStore": false,
  "includeCurrentUserPermissions": false,
  "includeRoleMappings": false,
  "readThroughSessionVariables": false,
  "translationsOption": "DEFAULT",
  "object_type": "{{object_type}}",
  "triggerInputCondition": "{{triggerInputCondition}}"
},
  overridable: ["object_type", "triggerInputCondition"],
} as const

export const CREATE = {
  id: "",
  context: {"appName": "storage_by_unifyapps", "resourceName": "storage_by_unifyapps_create_record"},
  storedInputs: {
  "useRawPayload": true,
  "writeThroughSessionVariables": false,
  "object_type": "{{object_type}}",
  "rawPayload": "{{rawPayload}}"
},
  overridable: ["object_type", "rawPayload"],
} as const

export const UPDATE = {
  id: "",
  context: {"appName": "storage_by_unifyapps", "resourceName": "storage_by_unifyapps_update_record_by_id"},
  storedInputs: {
  "useRawPayload": true,
  "upsert": false,
  "writeThroughSessionVariables": false,
  "object_type": "{{object_type}}",
  "recordId": "{{recordId}}",
  "rawPayload": "{{rawPayload}}"
},
  overridable: ["object_type", "recordId", "rawPayload"],
} as const

export const DELETE = {
  id: "",
  context: {"appName": "storage_by_unifyapps", "resourceName": "storage_by_unifyapps_delete_record_by_id"},
  storedInputs: {
  "writeThroughSessionVariables": false,
  "object_type": "{{object_type}}",
  "entityId": "{{entityId}}"
},
  overridable: ["object_type", "entityId"],
} as const

// Standard pagination page object.
export function pageInput(limit = 200, offset = 0) {
  return { paginateBy: 'OFFSET', limit, offset } as const
}

export type LeafFilter = {
  property: string
  filter: { operator: string; value: unknown }
}

/**
 * The storage node's filter is a FilterConditionsField, NOT the entity API's
 * `{op, field, values}` — that shape is accepted with a 200 and SILENTLY IGNORED
 * (verified: it returned all 32 records instead of the 8 that matched). `value` is
 * singular; a `values` array errors the workflow. `{}` means no filter.
 * Property paths: the record id is `id`, every schema field is `properties.<key>`.
 */
export function andFilter(leaves: LeafFilter[]) {
  if (leaves.length === 0) return {}
  return { operator: 'AND', filters: leaves }
}

/** The execute-node envelope: `{ lookupReferences, response: { cursor, total, objects, hasMore }, id }`. */
export type FetchPage<T> = { records: T[]; total: number; hasMore: boolean; cursor?: string }

export function extractPage<T>(data: unknown): FetchPage<T> {
  // ALREADY EXTRACTED. `useData` hands back the records array, and a wrapper that
  // extracts it a second time used to hit the throw below on the first row that
  // arrived — uncaught, blanking the page on a green build. An array is a shape we
  // recognise, so pass it through. (`total`/`hasMore` are gone by then; read them off
  // `useData` instead of re-deriving them here.)
  if (Array.isArray(data)) {
    const records = data as T[]
    return { records, total: records.length, hasMore: false }
  }
  const response = (data as { response?: Record<string, unknown> } | null)?.response
  if (!response || !Array.isArray(response.objects)) {
    // Loud, not empty. Returning [] here would render "no records" for a response whose
    // shape changed — the failure mode this whole data layer exists to avoid.
    throw new Error('unexpected fetch response: no response.objects')
  }
  return {
    records: response.objects as T[],
    total: typeof response.total === 'number' ? response.total : response.objects.length,
    hasMore: response.hasMore === true,
    cursor: typeof response.cursor === 'string' ? response.cursor : undefined,
  }
}

export function extractRecords<T>(data: unknown): T[] {
  return extractPage<T>(data).records
}

/** One record — from a SINGLE fetch, or the first row of a list. */
export function extractRecord<T>(data: unknown): T | undefined {
  const envelope = data as { response?: Record<string, unknown> } | null
  const response = envelope?.response
  if (response && !Array.isArray(response.objects) && 'id' in response) return response as T
  // already extracted — a bare record, same tolerance as the array above. The raw
  // envelope also carries a top-level `id`, so the `response` key is what tells them
  // apart; it is checked first.
  if (data && typeof data === 'object' && !('response' in data) && 'id' in data) {
    return data as T
  }
  return extractPage<T>(data).records[0]
}

// Callable dataSources — the automations this app is allowed to run.
//
// A callable is an AUTOMATION on the platform, not an object read. The platform's
// callables safety check refuses to run one through execute-node unless a real
// e_data_source backs the call, so every entry here names a dataSource that was
// provisioned against THIS app's global page. Without it the request comes back
// `forbidden datasource: not found` — which is why an id is never typed by hand.

export interface CallableBinding {
  /** the e_data_source id that authorizes this call */
  readonly id: string
  readonly context: {
    readonly appName: string
    readonly resourceName: string
    readonly resourceVersion: number
  }
  /** the workflow definition this dataSource is bound to */
  readonly automationId: string
  /** automation inputs the caller may supply */
  readonly overridable: readonly string[]
}

/**
 * The page every callable dataSource for this app is anchored to. Derived, never
 * hardcoded — a literal slug names whichever app it was copied from.
 */
export const PAGE_SLUG = `global-page-of-${import.meta.env.VITE_APPLICATION_ID}`

/**
 * `ICM | List Position Hierarchy` — the reporting structure as of a date.
 *
 * One row per position in force that day, each side named and its occupant
 * resolved in bulk, plus the root the store cannot hold: PositionHierarchy
 * requires a parent, so the top of the tree has no row of its own and the
 * automation puts it back.
 */
export const LIST_POSITION_HIERARCHY: CallableBinding = {
  id: 'e_6a9bec1aa397f67f706cb0ac',
  context: {
    appName: 'callables',
    resourceName: 'callables_call_automation',
    resourceVersion: 1575,
  },
  automationId: '6a9be08e57dcee3b72fe372c',
  overridable: ['asOfDate', 'versionName', 'search', 'limit', 'offset'],
}

/**
 * Every callables request carries this; it tells the runtime which app and page the
 * call came from. Omit it and the call is rejected.
 */
export function internals() {
  return { m: 'BUILDER', s: PAGE_SLUG, c: 'PLATFORM', p: 'browser' } as const
}

/** The row `ICM | List Position Hierarchy` returns. Empty string means "not resolved". */
export interface PositionHierarchyRow {
  id: string
  versionName: string
  /** YYYY-MM-DD */
  effectiveStart: string
  positionId: string
  positionCode: string
  positionName: string
  /** '' when the seat is vacant, or when two assignments contest the date. */
  person: string
  parentPositionId: string
  parentPosition: string
  parentPerson: string
  isRoot: boolean
}

/** The envelope every ICM callable answers with. Branch on `status`, never the HTTP code. */
export interface CallableEnvelope<T> {
  status: string
  success: boolean
  message?: string
  total?: number
  hasMore?: boolean
  rows?: T[]
}

/**
 * A callable's result, unwrapped from the execute-node envelope.
 *
 * A transport 200 means the automation RAN, not that the work happened — an
 * `INVALID_INPUT` arrives as a perfectly healthy 200 — so the status is carried
 * through rather than collapsed into success/failure here.
 */
export function extractCallable<T>(data: unknown): CallableEnvelope<T> | undefined {
  if (!data || typeof data !== 'object') return undefined
  const envelope = data as { response?: unknown; status?: unknown }
  const body = (envelope.response ?? envelope) as CallableEnvelope<T>
  if (!body || typeof body !== 'object' || typeof body.status !== 'string') return undefined
  return body
}
