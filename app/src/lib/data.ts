import { useMemo } from 'react'
import { useExecuteWorkflowNode } from '@unifyapps/app-builder-sdk/hooks/workflow'

import {
  FETCH,
  andFilter,
  extractCallable,
  extractPage,
  internals,
  pageInput,
  type CallableBinding,
  type CallableEnvelope,
  type LeafFilter,
} from '@/data/bindings'

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

/** Config for `kind: 'callable'` — a deployed automation invoked by the app. */
export interface CallableConfig {
  /** The binding from `@/data/bindings`. Its `id` is a dataSource id, not the automation's. */
  binding: CallableBinding
  /** Per-call inputs for the automation. Sent under `parameters`. */
  parameters?: Record<string, unknown>
}

/** What a callable read hands back on top of the usual result. */
export interface UseCallableResult<T> extends UseDataResult<T> {
  /** The automation's own status — 'OK', 'INVALID_INPUT', … Undefined until it answers. */
  status?: string
  /** Human-readable and safe to show. Present on every non-success outcome. */
  message?: string
  /** Rows that actually matched, where the automation distinguishes them from context. */
  matched?: number
  /** Whatever list of options the automation derived from the data it read. */
  availableVersions?: Array<{ asOfDate: string; epoch: number }>
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
// For 'callable', it invokes a deployed automation through that automation's own
// dataSource binding — the layer rule this app follows is that a screen calls a
// callable and the callable reads, because authorization lives in the callable
// and a page that reaches around it can show somebody else's pay.
export function useData<T>(id: string, kind: 'seed', seed: T): UseDataResult<T>
export function useData<T>(
  id: string,
  kind: 'storage',
  config: StorageBinding,
): UseDataResult<T>
export function useData<T>(
  id: string,
  kind: 'callable',
  config: CallableConfig,
): UseCallableResult<T>
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
    return useCallable<T>(config as CallableConfig)
  }
  return { data: undefined, loading: false, error: undefined, refetch: NOOP }
}

function useCallable<T>(config: CallableConfig): UseCallableResult<T> {
  const bindingId = config?.binding?.id ?? ''
  const enabled = Boolean(bindingId)

  // The runtime wants the dataSource's whole stored input set, not just the bits
  // that vary — `version: '-1'` means "the deployed copy", and a request missing
  // any of these is refused rather than defaulted.
  //
  // `__internals__` rides INSIDE parameters, which is where the platform's own
  // builder puts it. The call currently succeeds without it, but matching the
  // request the platform makes of itself is worth more than relying on that
  // staying true. It goes first so a caller can never shadow it.
  const inputs = useMemo(
    () => ({
      automationId: config?.binding?.automationId,
      runtimeConnections: {},
      version: '-1',
      synchronous: true,
      parameters: { __internals__: internals(), ...(config?.parameters ?? {}) },
    }),
    [config?.binding?.automationId, config?.parameters],
  )

  const query = useExecuteWorkflowNode(
    { id: bindingId, context: config?.binding?.context, inputs },
    { query: { enabled } },
  )

  const body = useMemo<CallableEnvelope<unknown> | undefined>(
    () => (query.data ? extractCallable(query.data) : undefined),
    [query.data],
  )

  // There is deliberately NO fallback. This app renders someone's reporting
  // structure, and substituting invented rows for a call that did not answer is
  // worse than showing nothing: the caller cannot tell the two apart. An
  // unprovisioned binding reports "not loaded", same as any other failure.
  if (!enabled) {
    return { data: undefined, loading: false, error: undefined, refetch: NOOP }
  }

  return {
    data: body?.rows as T | undefined,
    loading: query.isLoading ?? false,
    error: query.error,
    refetch: query.refetch ?? NOOP,
    total: body?.total,
    hasMore: body?.hasMore,
    status: body?.status,
    message: body?.message,
    matched: body?.matched,
    availableVersions: body?.availableVersions,
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
