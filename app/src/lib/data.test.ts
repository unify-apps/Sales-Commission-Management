import { test, expect } from 'bun:test'
import { useData } from './data'
import { LIST_POSITIONS } from '@/data/callables'

test('useData seed returns the inline list data', () => {
  const r = useData<Array<{ id: string }>>('products', 'seed', [{ id: 'p1' }, { id: 'p2' }])
  expect(r.data).toEqual([{ id: 'p1' }, { id: 'p2' }])
  expect(r.loading).toBe(false)
  expect(r.error).toBeUndefined()
  expect(typeof r.refetch).toBe('function')
})

test('useData seed returns inline scalar data', () => {
  const r = useData<{ total: number }>('summary', 'seed', { total: 7 })
  expect(r.data).toEqual({ total: 7 })
})

// 'storage' and 'callable' both run a dataSource and therefore use React hooks, so
// neither can be called outside a component — they are covered by page tests, not here.

test('a callable binding carries what the platform validator compares', () => {
  // validateDataSourceContextAndInputs checks the request against the stored
  // e_data_source row. A binding missing any of these produces a request the platform
  // rejects as `forbidden datasource`, so an empty string here is a real defect.
  expect(LIST_POSITIONS.id).toMatch(/^e_/)
  expect(LIST_POSITIONS.storedInputs.automationId).toBeTruthy()
  expect(LIST_POSITIONS.overridable).toContain('asOfDate')

  // The context is compared key by key. `type` is the one that is easy to drop,
  // because leaving it out fails as "invalid input" — which reads like an inputs
  // problem and sends you looking in the wrong place.
  expect(LIST_POSITIONS.context).toEqual({
    appName: 'callables',
    resourceName: 'callables_call_automation',
    resourceVersion: 1575,
  })

  // The stored input set is three keys. Sending a subset — or nesting one of them
  // inside `parameters` — is refused, so the binding must carry all three.
  expect(Object.keys(LIST_POSITIONS.storedInputs).sort()).toEqual([
    'automationId',
    'parameters',
    'runtimeConnections',
    'synchronous',
    'version',
  ])
})
