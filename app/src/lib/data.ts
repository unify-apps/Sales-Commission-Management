import { useMemo } from 'react'
import { useExecuteWorkflowNode } from '@unifyapps/app-builder-sdk/hooks/workflow'

import { FETCH, andFilter, extractPage, pageInput, type LeafFilter } from '@/data/bindings'
import { internals, type CallableBinding } from '@/data/callables'

export type BindingKind = 'seed' | 'storage' | 'callable'

export interface UseDataResult<T> {
  data: T | undefined
  loading: boolean
  error: unknown
  refetch: () => void
  total?: number
  hasMore?: boolean
}

const NOOP = () => {}

/** Config for `kind: 'callable'` — an automation run through its dataSource. */
export interface CallableRun {
  /** the entry from `@/data/callables` that authorizes this call */
  binding: CallableBinding
  /** automation inputs; only keys in `binding.overridable` are accepted */
  parameters?: Record<string, string>
  /** where the rows sit in the automation's output, e.g. 'positions' */
  recordsPath?: string
  /** hold the call until its inputs are ready */
  enabled?: boolean
}

/** Config for `kind: 'storage'` — records read from a backend object. */
export interface StorageBinding {
  /** the entityType `create_object` returned, e.g. ENTITY.ticket */
  object: string
  /** filter leaves; [] or omitted means "no filter" */
  where?: LeafFilter[]
  sort?: Array<{ field: string; order: 'ASC' | 'DESC' }>
  limit?: number
  offset?: number
}

// The one convention the generator calls. The binding lives INLINE in the call:
//
//   const { data: products } = useData('products', 'seed', [ ... ])
//   const { data: tickets }  = useData('tickets', 'storage', { object: ENTITY.ticket })
//
// `id` is the stable key the property panel / extractor use to locate this binding —
// it is what puts the binding in the Data panel, and it is why every read goes through
// this function rather than calling the SDK hook directly. A component that reaches for
// `useExecuteWorkflowNode` itself works at run time and is INVISIBLE to the panel.
//
// For 'seed', the third argument IS the data — returned as-is, no fetch.
// For 'storage', the read executes the app's FETCH dataSource binding (see
// `@/data/bindings`, written by provision_data_sources).
// For 'callable', it runs an AUTOMATION through the dataSource that authorizes it
// (see `@/data/callables`) — a different mechanism from 'storage', which reads
// objects. Both go through this function so both appear in the Data panel.
export function useData<T>(id: string, kind: 'seed', seed: T): UseDataResult<T>
export function useData<T>(
  id: string,
  kind: 'storage',
  config: StorageBinding,
): UseDataResult<T>
export function useData<T>(
  id: string,
  kind: 'callable',
  config: CallableRun,
): UseDataResult<T>
export function useData<T>(id: string, kind: BindingKind, config: unknown): UseDataResult<T>
export function useData<T>(
  _id: string,
  kind: BindingKind,
  config: unknown,
): UseDataResult<T> {
  if (kind === 'seed') {
    return { data: config as T, loading: false, error: undefined, refetch: NOOP }
  }
  if (kind === 'storage') {
    return useStorage<T>(config as StorageBinding)
  }
  if (kind === 'callable') {
    return useCallable<T>(config as CallableRun)
  }
  return { data: undefined, loading: false, error: undefined, refetch: NOOP }
}

// An automation call. The inputs are the shape the platform's
// `validateDataSourceContextAndInputs` compares against the stored e_data_source row:
// the same `automationId` and `synchronous` it holds, with `parameters` filling in the
// `{{ }}` templates. Sending keys the row does not carry is refused, which is why the
// three below are all there is.
function useCallable<T>(config: CallableRun): UseDataResult<T> {
  const binding = config?.binding
  const enabled = Boolean(binding?.id) && config?.enabled !== false

  const inputs = useMemo(
    () => ({
      automationId: binding?.automationId,
      synchronous: true,
      parameters: { ...internals(), ...(config?.parameters ?? {}) },
    }),
    [binding?.automationId, config?.parameters],
  )

  const query = useExecuteWorkflowNode(
    { id: binding?.id, context: binding?.context, inputs },
    { query: { enabled } },
  )

  // The automation's own output IS `data.response` — status, totals and rows together.
  const response = (query.data as { response?: Record<string, unknown> } | undefined)
    ?.response

  const rows = useMemo(() => {
    if (!response) return undefined
    if (!config?.recordsPath) return response as T
    const at = response[config.recordsPath]
    return (Array.isArray(at) ? at : []) as T
  }, [response, config?.recordsPath])

  return {
    data: rows,
    loading: query.isLoading ?? false,
    error: query.error,
    refetch: query.refetch ?? NOOP,
    total: typeof response?.total === 'number' ? response.total : undefined,
    hasMore: typeof response?.hasMore === 'boolean' ? response.hasMore : undefined,
  }
}

function useStorage<T>(config: StorageBinding): UseDataResult<T> {
  const enabled = Boolean(config?.object) && Boolean(FETCH.id)
  const inputs = useMemo(
    () => ({
      // the WHOLE stored set — a subset is refused as "forbidden datasource :
      // invalid input", even one made only of overridable fields
      ...FETCH.storedInputs,
      object_type: config?.object,
      triggerInputCondition: andFilter(config?.where ?? []),
      sortBy: config?.sort ?? [],
      page: pageInput(config?.limit ?? 200, config?.offset ?? 0),
    }),
    [config?.object, config?.where, config?.sort, config?.limit, config?.offset],
  )

  const query = useExecuteWorkflowNode(
    { id: FETCH.id, context: FETCH.context, inputs },
    { query: { enabled } },
  )

  const page = useMemo(() => {
    if (!query.data) return undefined
    try {
      return extractPage<T extends Array<infer E> ? E : never>(query.data)
    } catch (error) {
      return { error } as never
    }
  }, [query.data])

  return {
    data: (page && 'records' in page ? page.records : undefined) as T | undefined,
    loading: query.isLoading ?? false,
    error: query.error ?? (page && 'error' in page ? page.error : undefined),
    refetch: query.refetch ?? NOOP,
    total: page && 'total' in page ? page.total : undefined,
    hasMore: page && 'hasMore' in page ? page.hasMore : undefined,
  }
}
