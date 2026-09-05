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
  expect(LIST_POSITIONS.automationId).toBeTruthy()
  expect(LIST_POSITIONS.context.appName).toBe('callables')
  expect(LIST_POSITIONS.context.resourceName).toBe('callables_call_automation')
  expect(LIST_POSITIONS.overridable).toContain('asOfDate')
})
