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
// against that row. The runtime compares the request's context and input keys against
// it, so a `resourceVersion` or an input key set borrowed from a different dataSource
// fails with `forbidden datasource : invalid input` — a message that names inputs even
// when the context is what is wrong.
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
   */
  readonly context: {
    readonly appName: string
    readonly resourceName: string
    readonly resourceVersion: number
  }
  /**
   * The WHOLE input set stored on the e_data_source row. Send all of it, every call.
   * A subset is refused with `forbidden datasource : invalid input`. Spreading this
   * object is what makes the key set right by construction instead of by remembering.
   */
  readonly storedInputs: {
    readonly automationId: string
    /** '-1' — the latest deployed version of the automation */
    readonly version: string
    readonly runtimeConnections: Readonly<Record<string, unknown>>
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

/** The automation's input names. One place, so the caller and the row cannot drift. */
export const TITLE_PARAMS = [
  'action',
  'titleId',
  'titleCode',
  'name',
  'description',
  'category',
  'level',
  'market',
  'function',
  'payPeriod',
  'search',
  'limit',
  'offset',
] as const

export type TitleParam = (typeof TITLE_PARAMS)[number]

const titleTemplates = Object.fromEntries(
  TITLE_PARAMS.map((p) => [p, `{{${p}}}`]),
) as Record<TitleParam, string>

/**
 * `ICM | Manage Titles` — the Titles catalog behind one callable: LIST reads it,
 * CREATE adds one, UPDATE edits one. The unique key (`titleCode`) is pre-checked
 * inside the automation, so a collision comes back as a status and never as an
 * engine error.
 *
 * Deployed on tool 2026-09-05. Contract: `ua-icm/docs/automations/manage-titles.md`.
 */
export const MANAGE_TITLES: CallableBinding = {
  // `ds_manage_titles`, provisioned against this app's global page
  // (`e_global_app-1621b11a65c8`). Read straight off the stored row.
  id: 'e_6a9bf21ba397f67f706cc6ee',
  context: {
    appName: 'callables',
    resourceName: 'callables_call_automation',
    resourceVersion: 1575,
  },
  storedInputs: {
    automationId: '6a9bef655f22d93ee6e9b03a',
    version: '-1',
    runtimeConnections: {},
    synchronous: true,
    // the row's `{{ }}` templates; every one is overridden per call
    parameters: titleTemplates,
  },
  overridable: TITLE_PARAMS,
}

/**
 * Goes in `parameters.__internals__` — NESTED under that key, never spread flat.
 * It tells the runtime which app and page the call came from.
 */
export function internals() {
  return { m: 'BUILDER', s: PAGE_SLUG, c: 'PLATFORM', p: 'browser' } as const
}

/**
 * The automation treats "" as "not supplied" and applies its own defaults, so every
 * parameter is sent on every call and none is ever omitted. An omitted key would
 * reach the automation as the literal string "{{titleCode}}".
 */
export function titleArgs(over: Partial<Record<TitleParam, string>>) {
  const out = {} as Record<TitleParam, string>
  for (const p of TITLE_PARAMS) out[p] = over[p] ?? ''
  return out
}
