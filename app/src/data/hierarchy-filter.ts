// The filter model the Hierarchy page speaks, matching the shape the platform's own
// filter menu produces: rows of [property] [operator] [value], combined by one root
// AND/OR. The callable evaluates it; nothing is filtered client-side.

export type FilterKind = 'text' | 'date'

export type FilterOperator =
  | 'EQUAL' | 'NOT_EQUAL'
  | 'ICONTAINS' | 'NOT_ICONTAINS' | 'STARTS_WITH' | 'ENDS_WITH'
  | 'IN' | 'NOT_IN'
  | 'GT' | 'GTE' | 'LT' | 'LTE'
  | 'IS_EMPTY' | 'IS_NOT_EMPTY'

export interface FilterProperty {
  key: string
  label: string
  kind: FilterKind
}

/**
 * Only the four columns the table actually shows.
 *
 * Filtering by something not on screen gives fewer rows with no visible reason why,
 * and no way to tell a correct filter from a broken one. `positionCode` is the one
 * exception: it is rendered as part of the Position column's own text.
 */
export const FILTER_PROPERTIES: FilterProperty[] = [
  { key: 'positionName', label: 'Position', kind: 'text' },
  { key: 'positionCode', label: 'Position code', kind: 'text' },
  { key: 'person', label: 'Person', kind: 'text' },
  { key: 'parentPosition', label: 'Parent position', kind: 'text' },
  { key: 'parentPerson', label: 'Parent person', kind: 'text' },
  { key: 'effectiveStart', label: 'Effective start', kind: 'date' },
]

// These lists must stay equal to the ones the automation validates against. It
// REFUSES an operator it does not know rather than skipping the row, so offering one
// it has never heard of turns the whole request into INVALID_INPUT.
const TEXT_OPERATORS: Array<{ value: FilterOperator; label: string }> = [
  { value: 'EQUAL', label: 'is' },
  { value: 'NOT_EQUAL', label: 'is not' },
  { value: 'ICONTAINS', label: 'contains' },
  { value: 'NOT_ICONTAINS', label: 'does not contain' },
  { value: 'STARTS_WITH', label: 'starts with' },
  { value: 'ENDS_WITH', label: 'ends with' },
  { value: 'IN', label: 'is any of' },
  { value: 'NOT_IN', label: 'is none of' },
  { value: 'IS_EMPTY', label: 'is empty' },
  { value: 'IS_NOT_EMPTY', label: 'is not empty' },
]

const DATE_OPERATORS: Array<{ value: FilterOperator; label: string }> = [
  { value: 'EQUAL', label: 'on' },
  { value: 'NOT_EQUAL', label: 'not on' },
  { value: 'GT', label: 'after' },
  { value: 'GTE', label: 'on or after' },
  { value: 'LT', label: 'before' },
  { value: 'LTE', label: 'on or before' },
  { value: 'IS_EMPTY', label: 'is empty' },
  { value: 'IS_NOT_EMPTY', label: 'is not empty' },
]

export function operatorsFor(kind: FilterKind) {
  return kind === 'date' ? DATE_OPERATORS : TEXT_OPERATORS
}

export function propertyFor(key: string): FilterProperty {
  return FILTER_PROPERTIES.find((p) => p.key === key) ?? FILTER_PROPERTIES[0]
}

/** These two take no value at all — the row is complete without one. */
export function operatorTakesValue(operator: FilterOperator) {
  return operator !== 'IS_EMPTY' && operator !== 'IS_NOT_EMPTY'
}

/** `is any of` / `is none of` take a comma-separated list. */
export function operatorTakesList(operator: FilterOperator) {
  return operator === 'IN' || operator === 'NOT_IN'
}

export interface FilterRow {
  /** Stable across edits so React keys survive reordering. */
  id: string
  property: string
  operator: FilterOperator
  value: string
}

let rowCounter = 0
export function newFilterRow(): FilterRow {
  rowCounter += 1
  return { id: `f${rowCounter}`, property: 'parentPerson', operator: 'EQUAL', value: '' }
}

/** A row the caller has not finished typing must not be sent — it would filter to nothing. */
export function isComplete(row: FilterRow) {
  if (!operatorTakesValue(row.operator)) return true
  return row.value.trim().length > 0
}

/**
 * The wire shape. `IN`/`NOT_IN` send an array; everything else sends a string, which
 * is what the automation validates against.
 */
export function toWireFilters(rows: FilterRow[]) {
  return rows.filter(isComplete).map((row) => ({
    property: row.property,
    operator: row.operator,
    value: operatorTakesList(row.operator)
      ? row.value.split(',').map((part) => part.trim()).filter(Boolean)
      : operatorTakesValue(row.operator)
        ? row.value.trim()
        : '',
  }))
}

/** A one-line summary for the trigger button, e.g. "Parent person is Anita Serrano". */
export function describeRow(row: FilterRow) {
  const prop = propertyFor(row.property)
  const op = operatorsFor(prop.kind).find((o) => o.value === row.operator)
  const label = `${prop.label} ${op?.label ?? row.operator}`
  return operatorTakesValue(row.operator) ? `${label} ${row.value}`.trim() : label
}
