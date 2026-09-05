// Callable dataSources — the automations this app is allowed to run.
//
// A callable is an AUTOMATION on the platform, not an object read. The platform
// refuses to run one through execute-node unless a real `e_data_source` backs the
// call, so every entry here names a dataSource provisioned against THIS app's
// global page.
//
// EVERY VALUE BELOW IS COPIED FROM THE STORED e_data_source ROW and is only valid
// against that row. `validateDataSourceContextAndInputs` compares the request's
// CONTEXT and INPUT KEYS against it, so a borrowed `resourceVersion` or a missing
// input key fails with `forbidden datasource : invalid input` — a message that
// names inputs even when the context is what is wrong. That error cost this build
// an afternoon: the context was short a `resourceVersion` the whole time.
//
// To read a row: GET /api/entity/e_data_source/<id>. Searching that type needs a
// `properties.interfacePageId` filter and errors without one.

export interface CallableBinding {
  /** the e_data_source id that authorizes this call */
  readonly id: string
  /** MIRROR OF THE STORED ROW'S CONTEXT — `resourceVersion` is per-dataSource. */
  readonly context: {
    readonly type?: string
    readonly appName: string
    readonly resourceName: string
    readonly resourceVersion: number
  }
  /** The WHOLE input set stored on the row. Send all of it, every call. */
  readonly storedInputs: {
    readonly automationId: string
    /** '-1' — the latest deployed version. Only on rows whose stored set has it. */
    readonly version?: string
    readonly runtimeConnections?: Readonly<Record<string, unknown>>
    readonly synchronous: boolean
    readonly parameters: Readonly<Record<string, string>>
  }
  /** automation inputs the caller may supply */
  readonly overridable: readonly string[]
}

/**
 * The page every callable dataSource for this app is anchored to. Derived, never
 * hardcoded — a literal slug names whichever app it was copied from.
 */
export const PAGE_SLUG = `global-page-of-${import.meta.env.VITE_APPLICATION_ID}`

/**
 * Goes in `parameters.__internals__` — NESTED under that key, never spread flat.
 * It tells the runtime which app and page the call came from.
 */
export function internals() {
  return { m: 'BUILDER', s: PAGE_SLUG, c: 'PLATFORM', p: 'browser' } as const
}

/**
 * `ICM | List Profiles` — a paged, searchable, filterable list of payees, each with
 * the seat they hold as of a date, its title and territory, and their manager. Every
 * join is folded in bulk by the automation, so the page never makes one call per row.
 *
 * Deployed on tool, suite 14/14 green. Contract:
 * `ua-icm/docs/automations/list-profiles.md`.
 */
export const LIST_PROFILES: CallableBinding = {
  // `ds_list_profiles`, anchored to this app's global page. Read off the stored row.
  id: 'e_6a9c33daa397f67f706db4a6',
  context: {
    appName: 'callables',
    resourceName: 'callables_call_automation',
    resourceVersion: 1575,
  },
  storedInputs: {
    automationId: '6a9c00e1c4f2d5527e4cb2ee',
    version: '-1',
    runtimeConnections: {},
    synchronous: true,
    // the row's `{{ }}` templates; every one is overridden per call
    parameters: {
      search: '{{search}}',
      status: '{{status}}',
      titleId: '{{titleId}}',
      territoryId: '{{territoryId}}',
      managerPositionId: '{{managerPositionId}}',
      asOfDate: '{{asOfDate}}',
      limit: '{{limit}}',
      offset: '{{offset}}',
      includeOrg: '{{includeOrg}}',
    },
  },
  overridable: [
    'search',
    'status',
    'titleId',
    'territoryId',
    'managerPositionId',
    'asOfDate',
    'limit',
    'offset',
    'includeOrg',
  ],
}

/**
 * The execute-node envelope is `{ id, response, lookupReferences,
 * executionInstanceId }`, and for a callable the automation's whole `result`
 * object is `response`.
 *
 * Loud, not empty — the same choice `extractPage` makes in `bindings.ts`.
 * Returning a blank list for a response whose shape changed is the failure this
 * data layer exists to avoid.
 */
export function extractCallable<T>(data: unknown): T {
  if (data && typeof data === 'object' && 'response' in data) {
    const response = (data as { response?: unknown }).response
    if (response && typeof response === 'object') return response as T
  }
  if (data && typeof data === 'object' && 'status' in data) return data as T
  throw new Error('unexpected callable response: no `response` object')
}
