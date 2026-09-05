// Callable dataSources — the automations this app is allowed to run.
//
// A callable is an AUTOMATION on the platform, not an object read. The platform's
// callables safety check refuses to run one through execute-node unless a real
// `e_data_source` backs the call, so every entry here names a dataSource that was
// provisioned against THIS app's global page. Without it the request comes back
// `forbidden datasource: not found` — which is why an id is never typed by hand or
// carried over from another app.
//
// `context` and `automationId` must match the stored dataSource exactly: the platform
// runs `validateDataSourceContextAndInputs`, comparing the request against the row.
// `overridable` lists the automation inputs the app may set per call; everything else
// on the row is fixed.

export interface CallableBinding {
  /** the e_data_source id that authorizes this call */
  readonly id: string
  /**
   * The stored row's context, COMPLETE. Every key is compared, `type` included —
   * omitting it is `forbidden datasource : invalid input`, the same error a missing
   * input key gives, which makes it easy to misread as an inputs problem.
   */
  readonly context: {
    readonly type: string
    readonly appName: string
    readonly resourceName: string
    readonly resourceVersion: number
  }
  /**
   * The WHOLE input set stored on the e_data_source row. Send all of it, every call.
   *
   * This is not style. `validateDataSourceContextAndInputs` compares the request's
   * input KEYS against the row's, and a subset is refused with
   * `forbidden datasource : invalid input` — verified against tool: dropping
   * `synchronous`, dropping `automationId`, or nesting either one inside
   * `parameters` all produce that error, and a wrong `context.resourceVersion`
   * produces it too. Spreading this object is what makes the key set right by
   * construction instead of by remembering.
   */
  readonly storedInputs: {
    readonly automationId: string
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
 * `ICM | List Positions` — a paged, searchable list of positions with their occupancy
 * resolved as of a date. Occupancy is folded in bulk by the automation, so the page
 * never makes one call per row.
 *
 * Deployed on tool 2026-09-05, suite 22/22 green. Contract:
 * `ua-icm/docs/automations/list-positions.md`.
 */
export const LIST_POSITIONS: CallableBinding = {
  id: 'e_6a9bd39bf684ae771006508f',
  context: {
    type: 'APPLICATION',
    appName: 'callables',
    resourceName: 'callables_call_automation',
    resourceVersion: 2832,
  },
  storedInputs: {
    automationId: '6a9bcafbc4f2d5527e3c324c',
    synchronous: true,
    // the row's `{{ }}` templates; every one is overridden per call
    parameters: {
      search: '{{search}}',
      asOfDate: '{{asOfDate}}',
      limit: '{{limit}}',
      offset: '{{offset}}',
      includeOccupancy: '{{includeOccupancy}}',
    },
  },
  overridable: ['search', 'asOfDate', 'limit', 'offset', 'includeOccupancy'],
}

/**
 * Goes in `parameters.__internals__` — NESTED under that key, never spread flat.
 * It tells the runtime which app and page the call came from.
 */
export function internals() {
  return { m: 'BUILDER', s: PAGE_SLUG, c: 'PLATFORM', p: 'browser' } as const
}
