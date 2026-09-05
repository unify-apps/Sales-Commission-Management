import { test, expect } from 'bun:test'
import { useData } from './data'
import { extractCallable } from '@/data/bindings'
import { asOfDateFor } from '@/data/hierarchy'

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

test('useData returns undefined data for an unknown kind', () => {
  // 'storage' and 'callable' both run a dataSource binding and therefore use React
  // hooks, so neither can be called outside a component — their behaviour is covered
  // by the pure helpers below instead. Anything else still falls through to nothing.
  const r = useData('runReport', 'mystery' as never, { id: 'e_x' })
  expect(r.data).toBeUndefined()
  expect(r.loading).toBe(false)
})

test('extractCallable keeps the status rather than collapsing it', () => {
  // A transport 200 means the automation RAN, not that the work happened: an
  // INVALID_INPUT arrives as a perfectly healthy 200, so the status has to survive.
  const refused = extractCallable({ response: { status: 'INVALID_INPUT', success: false, message: 'bad date', rows: [] } })
  expect(refused?.status).toBe('INVALID_INPUT')
  expect(refused?.success).toBe(false)
  expect(refused?.message).toBe('bad date')

  const ok = extractCallable<{ id: string }>({ response: { status: 'OK', success: true, total: 2, rows: [{ id: 'a' }, { id: 'b' }] } })
  expect(ok?.rows).toHaveLength(2)
  expect(ok?.total).toBe(2)
})

test('extractCallable tolerates an already-unwrapped body', () => {
  const direct = extractCallable({ status: 'OK', success: true, rows: [] })
  expect(direct?.status).toBe('OK')
})

test('extractCallable returns undefined for a shape it does not recognise', () => {
  // Undefined, not an empty envelope: a response whose shape changed must not read
  // as "the automation answered with no rows".
  expect(extractCallable(null)).toBeUndefined()
  expect(extractCallable({ response: { objects: [] } })).toBeUndefined()
  expect(extractCallable('nope')).toBeUndefined()
})

test('asOfDateFor maps every version label to a date', () => {
  // The store has no version column, so the picker's label has to become a date.
  expect(asOfDateFor('FY27-ChargePoint FEB-2026')).toBe('2026-02-01')
  expect(asOfDateFor('FY26-ChargePoint JAN-2026')).toBe('2026-01-01')
  expect(asOfDateFor('FY26-ChargePoint DEC-2025')).toBe('2025-12-01')
  expect(asOfDateFor('FY26-ChargePoint NOV-2025')).toBe('2025-11-01')
})

test('asOfDateFor falls back to today for an unknown label', () => {
  const today = new Date().toISOString().slice(0, 10)
  expect(asOfDateFor('FY99-Something ELSE')).toBe(today)
})
