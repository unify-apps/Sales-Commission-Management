import { test, expect } from 'bun:test'
import { useData } from './data'
import { extractCallable } from '@/data/bindings'
import { toWireFilters, operatorsFor } from '@/data/hierarchy-filter'

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

test('extractCallable returns undefined for a shape it does not recognise', () => {
  // Undefined, not an empty envelope: a response whose shape changed must not read
  // as "the automation answered with no rows".
  expect(extractCallable(null)).toBeUndefined()
  expect(extractCallable({ response: { objects: [] } })).toBeUndefined()
  expect(extractCallable('nope')).toBeUndefined()
})

test('toWireFilters drops a row the user has not finished', () => {
  // A half-typed row would filter to nothing and read as "no matches" while the user
  // is still choosing a value.
  const rows = [
    { id: 'a', property: 'parentPerson', operator: 'EQUAL' as const, value: 'Anita Serrano' },
    { id: 'b', property: 'positionName', operator: 'ICONTAINS' as const, value: '   ' },
  ]
  expect(toWireFilters(rows)).toEqual([
    { property: 'parentPerson', operator: 'EQUAL', value: 'Anita Serrano' },
  ])
})

test('toWireFilters keeps a value-less operator, and splits a list one', () => {
  expect(toWireFilters([{ id: 'a', property: 'person', operator: 'IS_EMPTY' as const, value: '' }]))
    .toEqual([{ property: 'person', operator: 'IS_EMPTY', value: '' }])

  expect(toWireFilters([{ id: 'b', property: 'parentPosition', operator: 'IN' as const, value: 'RSM — EU, RSM — APAC' }]))
    .toEqual([{ property: 'parentPosition', operator: 'IN', value: ['RSM — EU', 'RSM — APAC'] }])
})

test('operatorsFor gives dates their own menu', () => {
  // The automation REFUSES a text operator on a date, so the menu must never offer one.
  const dateOps = operatorsFor('date').map((o) => o.value)
  expect(dateOps).toContain('GTE')
  expect(dateOps).not.toContain('ICONTAINS')

  const textOps = operatorsFor('text').map((o) => o.value)
  expect(textOps).toContain('ICONTAINS')
  expect(textOps).not.toContain('GTE')
})
