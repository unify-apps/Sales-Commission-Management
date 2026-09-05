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
