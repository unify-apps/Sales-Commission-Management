import { useMemo } from 'react'
import {
  useExecuteWorkflowNode,
  useExecuteWorkflowNodeMutation,
} from '@unifyapps/app-builder-sdk/hooks/workflow'

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

/** Config for `kind: 'callable'` — an AUTOMATION run, not an object read. */
export interface CallableBinding_Run {
  binding: CallableBinding
  /** every automation input, already defaulted — see `titleArgs` */
  parameters: Record<string, string>
  /** which key on the automation's own result holds the rows */
  recordsPath?: string
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
// `@/data/bindings`, written by provision_data_sources). 'callable' is still a
// declaration only.
export function useData<T>(id: string, kind: 'seed', seed: T): UseDataResult<T>
export function useData<T>(
  id: string,
  kind: 'storage',
  config: StorageBinding,
): UseDataResult<T>
export function useData<T>(
  id: string,
  kind: 'callable',
  config: CallableBinding_Run,
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
    return useCallable<T>(config as CallableBinding_Run)
  }
  return { data: undefined, loading: false, error: undefined, refetch: NOOP }
}

// `parameters` is REPLACED rather than merged: the stored copy holds `{{ }}` templates,
// and an un-overridden one would reach the automation as the literal string
// "{{limit}}". __internals__ is nested under its own key — never spread flat.
//
// The automation's own output IS `data.response` — status, totals and rows together —
// so there is no `response.objects` envelope to unwrap here the way a storage fetch has.
function useCallable<T>(config: CallableBinding_Run): UseDataResult<T> {
  const binding = config?.binding
  const enabled = Boolean(binding?.id) && config?.enabled !== false

  const inputs = useMemo(
    () => ({
      ...binding?.storedInputs,
      parameters: { __internals__: internals(), ...(config?.parameters ?? {}) },
    }),
    [binding?.storedInputs, config?.parameters],
  )

  const query = useExecuteWorkflowNode(
    { id: binding?.id, context: binding?.context, inputs },
    { query: { enabled } },
  )

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

/**
 * WRITE through a callable. Same stored-input rule as the read: the whole set every
 * time, `parameters` replaced, `__internals__` nested.
 *
 * The automation answers a business STATUS, not an HTTP code — a refused write is a
 * perfectly healthy 200 carrying `DUPLICATE_TITLE_CODE`. Callers must branch on
 * `status`; this hook deliberately does not throw for them.
 */
export function useCallableMutation(binding: CallableBinding) {
  const mutation = useExecuteWorkflowNodeMutation()

  const run = async (parameters: Record<string, string>) => {
    // The hook's variables are `{ data: request }` — the request is NOT passed
    // directly (SDK: `await mutateAsync({ data: request })`).
    const data = await mutation.mutateAsync({
      data: {
        id: binding.id,
        context: binding.context,
        inputs: {
          ...binding.storedInputs,
          parameters: { __internals__: internals(), ...parameters },
        },
      },
    })
    return (data as { response?: Record<string, unknown> } | undefined)?.response ?? {}
  }

  return { run, pending: mutation.isPending ?? false }
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
