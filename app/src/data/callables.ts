// Callable data sources — a page calling a DEPLOYED automation.
//
// Deliberately NOT in `bindings.ts`: that file's header says
// `provision_data_sources` REWRITES it with the app's five storage dataSource
// ids, so anything hand-added there is lost the next time the app is
// provisioned. These are a different family and live in their own file.
//
// Every call must send the WHOLE stored input set and override only the fields
// the stored set marks with a `{{template}}` placeholder. Sending a subset — or
// changing a field the stored set holds as a literal — is refused with
// `forbidden datasource : invalid input`, which is a 500 and reads like a bug on
// the server. Same rule as `FETCH` in `bindings.ts`.

export const LIST_PROFILES = {
  /** The `e_data_source` entity on app `app-1621b11a65c8` (Ledger), tool prod. */
  id: 'e_6a9c33daa397f67f706db4a6',
  context: {
    appName: 'callables',
    resourceName: 'callables_call_automation',
  },
  storedInputs: {
    // `ICM | List Profiles`. The DEPLOYED copy is what a caller reaches.
    automationId: '6a9c00e1c4f2d5527e4cb2ee',
    synchronous: true,
    // The one overridable field. It is a TEMPLATE, not a literal: with literals
    // stored here the caller could never vary search, filters or paging, which
    // is the entire reason this data source exists.
    parameters: '{{parameters}}',
  },
  overridable: ['parameters'],
} as const

/**
 * The execute-node envelope is `{ id, response, lookupReferences,
 * executionInstanceId }` (ExecuteWorkflowNodeResponse), and for a callable the
 * automation's whole `result` object is `response`.
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
  // Already unwrapped by a caller upstream — tolerated, same as extractPage does
  // for a bare array, because double-extraction is the easiest mistake to make.
  if (data && typeof data === 'object' && 'status' in data) return data as T
  throw new Error('unexpected callable response: no `response` object')
}
