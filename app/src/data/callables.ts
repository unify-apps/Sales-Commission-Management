// Callable dataSources — the automations this app is allowed to run.
//
// A callable is an AUTOMATION on the platform, not an object read. The platform's
// callables safety check refuses to run one through execute-node unless a real
// `e_data_source` backs the call, so every entry here names a dataSource that was
// provisioned against THIS app's global page. Without it the request comes back
// `forbidden datasource: not found` — which is why an id is never typed by hand or
// carried over from another app.
//
// EVERY VALUE BELOW IS COPIED FROM THE STORED e_data_source ROW, and is only valid
// against that row. `validateDataSourceContextAndInputs` compares the request's context
// and input keys against it, so a `resourceVersion` or an input key set borrowed from a
// different dataSource fails with `forbidden datasource : invalid input` — a message
// that names inputs even when the context is what is wrong.
//
// To read a row: GET /api/entity/e_data_source/<id>. Searching that type needs a
// `properties.interfacePageId` filter and errors without one.

export interface CallableBinding {
  /** the e_data_source id that authorizes this call */
  readonly id: string
  /**
   * MIRROR OF THE STORED ROW'S CONTEXT. `resourceVersion` is compared and is
   * per-dataSource — a wrong one is `forbidden datasource : invalid input`, the same
   * error a bad INPUT gives, which makes it easy to go looking in the wrong place.
   * Read it off the row; never carry one over from another environment.
   */
  readonly context: {
    /** present on some rows and absent on others — mirror the row, do not normalise */
    readonly type?: string
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
 * `ICM | List Positions` — a paged, searchable list of positions with their occupancy
 * resolved as of a date. Occupancy is folded in bulk by the automation, so the page
 * never makes one call per row.
 *
 * Deployed on tool 2026-09-05, suite 22/22 green. Contract:
 * `ua-icm/docs/automations/list-positions.md`.
 */
export const LIST_POSITIONS: CallableBinding = {
  // `ds_list_positions`, provisioned by the platform's own tooling against this app's
  // global page. Read straight off the stored row — see the header note.
  id: 'e_6a9bd839f684ae7710066170',
  context: {
    appName: 'callables',
    resourceName: 'callables_call_automation',
    resourceVersion: 1575,
  },
  storedInputs: {
    automationId: '6a9bcafbc4f2d5527e3c324c',
    version: '-1',
    runtimeConnections: {},
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

// ---------------------------------------------------------------------------
// Every value below was READ BACK OFF THE STORED ROW and pasted, never typed by
// hand. The validator compares the request's context and input keys against the
// row it names, and the rows genuinely differ — some carry `context.type`, some
// carry `version`/`runtimeConnections` in their stored inputs. Normalising them
// into one shape is what produced `forbidden datasource` twice.
// ---------------------------------------------------------------------------

export const CREATE_POSITION: CallableBinding = {
  id: 'e_6a9c00f0f684ae771006f90d',
  context: {
      "resourceName": "callables_call_automation",
      "type": "APPLICATION",
      "appName": "callables",
      "resourceVersion": 1575
    },
  storedInputs: {
      "automationId": "6a9bfdeac4f2d5527e4c9a63",
      "parameters": {
        "positionCode": "{{positionCode}}",
        "name": "{{name}}",
        "titleId": "{{titleId}}",
        "payeeId": "{{payeeId}}",
        "effectiveStart": "{{effectiveStart}}"
      },
      "synchronous": true
    },
  overridable: ["positionCode","name","titleId","payeeId","effectiveStart"],
}

export const LIST_PAYEES: CallableBinding = {
  id: 'e_6a9c00f1a397f67f706d0241',
  context: {
      "resourceName": "callables_call_automation",
      "type": "APPLICATION",
      "appName": "callables",
      "resourceVersion": 1575
    },
  storedInputs: {
      "automationId": "6a9c001e723e7964da56efee",
      "parameters": {
        "search": "{{search}}",
        "limit": "{{limit}}",
        "offset": "{{offset}}",
        "activeOnly": "{{activeOnly}}"
      },
      "synchronous": true
    },
  overridable: ["search","limit","offset","activeOnly"],
}

export const LIST_TITLES: CallableBinding = {
  id: 'e_6a9c0376f684ae7710070c46',
  context: {
      "resourceName": "callables_call_automation",
      "type": "APPLICATION",
      "appName": "callables",
      "resourceVersion": 1575
    },
  storedInputs: {
      "automationId": "6a9bef655f22d93ee6e9b03a",
      "parameters": {
        "action": "{{action}}",
        "titleId": "{{titleId}}",
        "titleCode": "{{titleCode}}",
        "name": "{{name}}",
        "description": "{{description}}",
        "category": "{{category}}",
        "level": "{{level}}",
        "market": "{{market}}",
        "function": "{{function}}",
        "payPeriod": "{{payPeriod}}",
        "search": "{{search}}",
        "limit": "{{limit}}",
        "offset": "{{offset}}"
      },
      "synchronous": true
    },
  overridable: ["action","titleId","titleCode","name","description","category","level","market","function","payPeriod","search","limit","offset"],
}
