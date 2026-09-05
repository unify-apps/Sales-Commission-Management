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
 * `ICM | List Positions` — a paged, searchable list of positions with their
 * occupancy resolved as of a date. Occupancy is folded in bulk by the automation,
 * so the page never makes one call per row.
 */
export const LIST_POSITIONS: CallableBinding = {
  id: 'e_6a9bd839f684ae7710066170',
  context: {
    appName: 'callables',
    resourceName: 'callables_call_automation',
    resourceVersion: 1575,
  },
  automationId: '6a9bcafbc4f2d5527e3c324c',
  overridable: ['search', 'asOfDate', 'limit', 'offset', 'includeOccupancy'],
}

/**
 * Every callables request carries this; it tells the runtime which app and page the
 * call came from. Omit it and the call is rejected.
 */
export function internals() {
  return { m: 'BUILDER', s: PAGE_SLUG, c: 'PLATFORM', p: 'browser' } as const
}
