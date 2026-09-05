import { useState } from 'react'
import { Filter, Plus, X } from 'lucide-react'
import type { FilterOption } from '@/data/use-profile-filters'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

/**
 * The operators `ICM | List Profiles` actually implements — and only those.
 *
 * `contains` is the callable's `search`: a case-insensitive match across
 * employeeId, name and email, run SERVER-side inside the store filter.
 * `is` is an equality match, on a status string or on a lookup id.
 *
 * There is deliberately no `is not`, `starts with` or `is empty`. None exists in
 * the contract, and each would have to be applied to the page after it was
 * fetched — which makes `total` count rows the caller cannot see and `hasMore`
 * lie, so the table would show a short page and stop. Adding one is a change to
 * the automation, not to this component.
 */
export const OPERATORS = {
  is: 'is',
  contains: 'contains',
} as const

export type FilterOperator = keyof typeof OPERATORS

export type FilterField =
  | 'search'
  | 'status'
  | 'titleId'
  | 'territoryId'
  | 'managerPositionId'

interface FieldSpec {
  field: FilterField
  label: string
  /** `text` takes a typed value; `lookup` picks an id from a list. */
  kind: 'text' | 'lookup'
  operators: FilterOperator[]
}

export const FILTER_FIELDS: FieldSpec[] = [
  { field: 'search', label: 'Person', kind: 'text', operators: ['contains'] },
  { field: 'status', label: 'Status', kind: 'lookup', operators: ['is'] },
  { field: 'titleId', label: 'Title', kind: 'lookup', operators: ['is'] },
  { field: 'territoryId', label: 'Territory', kind: 'lookup', operators: ['is'] },
  { field: 'managerPositionId', label: 'Manager', kind: 'lookup', operators: ['is'] },
]

const SPEC = new Map(FILTER_FIELDS.map((f) => [f.field, f]))

export const STATUS_OPTIONS: FilterOption[] = [
  { id: 'ACTIVE', label: 'Active' },
  { id: 'TERMINATED', label: 'Terminated' },
]

export interface FilterCondition {
  /** Stable across renders so a row keeps focus while its neighbours change. */
  key: string
  field: FilterField
  operator: FilterOperator
  /** '' until filled — an incomplete row narrows nothing. */
  value: string
}

let nextKey = 0
const newKey = () => `c${(nextKey += 1)}`

export function newCondition(field: FilterField, value = ''): FilterCondition {
  return { key: newKey(), field, operator: SPEC.get(field)!.operators[0], value }
}

/** The field the toolbar's search box is a shortcut for. */
export const SEARCH_FIELD: FilterField = 'search'

/**
 * Upsert the search text as a condition. The toolbar box and the panel's
 * `Person contains` row are two surfaces onto ONE value — keeping them as
 * separate state is how they drift, and only one of them could win the query
 * parameter anyway.
 */
export function withSearch(conditions: FilterCondition[], value: string): FilterCondition[] {
  const existing = conditions.some((c) => c.field === SEARCH_FIELD)
  if (existing) {
    return conditions.map((c) => (c.field === SEARCH_FIELD ? { ...c, value } : c))
  }
  // first, so the panel reads `WHERE Person contains ...` the way the box does
  return [newCondition(SEARCH_FIELD, value), ...conditions]
}

/** What the toolbar box shows: the raw text, including while it is incomplete. */
export function searchText(conditions: FilterCondition[]): string {
  return conditions.find((c) => c.field === SEARCH_FIELD)?.value ?? ''
}

/** The row the panel opens with when nothing has been filtered yet. */
export const defaultConditions = (): FilterCondition[] => [newCondition('search')]

/** Only complete rows are sent; a half-built row must not filter anything out. */
export function activeConditions(conditions: FilterCondition[]) {
  return conditions.filter((c) => c.value.trim() !== '')
}

export type FilterOptionsByField = Partial<Record<FilterField, FilterOption[]>>

interface ProfileFilterProps {
  conditions: FilterCondition[]
  onApply: (next: FilterCondition[]) => void
  options: FilterOptionsByField
  loading?: boolean
  truncated?: boolean
}

export function ProfileFilter({
  conditions,
  onApply,
  options,
  loading = false,
  truncated = false,
}: ProfileFilterProps) {
  const [open, setOpen] = useState(false)
  // The panel edits a DRAFT. Nothing reaches the query until Apply, so a
  // half-built clause never fires a fetch and the table does not flicker through
  // states the user is still typing.
  const [draft, setDraft] = useState<FilterCondition[]>(conditions)

  // Re-seed as the panel OPENS, so a cancelled edit is genuinely discarded rather
  // than lingering as the next session's starting point. Done in the open handler
  // and not an effect: opening is the event that causes it.
  function handleOpenChange(next: boolean) {
    if (next) setDraft(conditions.length > 0 ? conditions : defaultConditions())
    setOpen(next)
  }

  const appliedCount = activeConditions(conditions).length
  const usedFields = new Set(draft.map((c) => c.field))
  // The callable takes ONE value per field, so a second row on the same field
  // could not be expressed. Offering it and then ignoring it would be worse.
  const unusedField = FILTER_FIELDS.find((f) => !usedFields.has(f.field))

  function update(key: string, patch: Partial<FilterCondition>) {
    setDraft((rows) => rows.map((c) => (c.key === key ? { ...c, ...patch } : c)))
  }

  function apply() {
    onApply(activeConditions(draft))
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-9" data-test-id="profiles-filter-trigger">
          <Filter className="size-4" />
          Filter
          {appliedCount > 0 ? (
            <span
              className="ml-1 flex size-5 items-center justify-center rounded-full bg-primary font-mono text-[11px] text-primary-foreground"
              data-test-id="profiles-filter-count"
            >
              {appliedCount}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[620px] p-0" data-test-id="profiles-filter-panel">
        <div className="grid gap-2 px-4 py-3">
          {draft.map((condition, index) => (
            <ConditionRow
              key={condition.key}
              condition={condition}
              /* Rows are ANDed: the callable intersects them, never unions. */
              prefix={index === 0 ? 'WHERE' : 'AND'}
              usedFields={usedFields}
              options={
                condition.field === 'status'
                  ? STATUS_OPTIONS
                  : (options[condition.field] ?? [])
              }
              loading={loading}
              onFieldChange={(field) =>
                update(condition.key, {
                  field,
                  operator: SPEC.get(field)!.operators[0],
                  // a value from the old field cannot mean anything on the new one
                  value: '',
                })
              }
              onOperatorChange={(operator) => update(condition.key, { operator })}
              onValueChange={(value) => update(condition.key, { value })}
              // The panel always keeps one row: an empty panel gives nothing to
              // act on, and "Clear all" already covers wanting no filters.
              canRemove={draft.length > 1}
              onRemove={() => setDraft((rows) => rows.filter((c) => c.key !== condition.key))}
            />
          ))}
        </div>

        <Separator />
        <div className="flex items-center justify-between px-3 py-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-8"
            disabled={!unusedField}
            onClick={() => unusedField && setDraft((rows) => [...rows, newCondition(unusedField.field)])}
            data-test-id="profiles-filter-add"
          >
            <Plus className="size-4" />
            Add filter
          </Button>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-muted-foreground"
              onClick={() => setDraft(defaultConditions())}
              data-test-id="profiles-filter-clear"
            >
              Clear all
            </Button>
            <Button size="sm" className="h-8" onClick={apply} data-test-id="profiles-filter-apply">
              Apply
            </Button>
          </div>
        </div>

        {truncated ? (
          <>
            <Separator />
            <p className="px-4 py-2 text-xs text-muted-foreground">
              Values found in the first 200 profiles.
            </p>
          </>
        ) : null}
      </PopoverContent>
    </Popover>
  )
}

function ConditionRow({
  condition,
  prefix,
  usedFields,
  options,
  loading,
  onFieldChange,
  onOperatorChange,
  onValueChange,
  canRemove,
  onRemove,
}: {
  condition: FilterCondition
  prefix: string
  usedFields: Set<FilterField>
  options: FilterOption[]
  loading: boolean
  onFieldChange: (field: FilterField) => void
  onOperatorChange: (operator: FilterOperator) => void
  onValueChange: (value: string) => void
  canRemove: boolean
  onRemove: () => void
}) {
  const spec = SPEC.get(condition.field)!
  const noValues = spec.kind === 'lookup' && options.length === 0

  return (
    <div className="flex items-center gap-2" data-test-id={`profiles-filter-row-${condition.field}`}>
      <span className="w-12 shrink-0 font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
        {prefix}
      </span>

      <Select value={condition.field} onValueChange={(v) => onFieldChange(v as FilterField)}>
        <SelectTrigger className="h-9 w-[140px]" data-test-id={`profiles-filter-field-${condition.field}`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {FILTER_FIELDS.map((f) => (
            <SelectItem
              key={f.field}
              value={f.field}
              // already spoken for by another row
              disabled={f.field !== condition.field && usedFields.has(f.field)}
            >
              {f.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Only the operators this field really supports — see OPERATORS. */}
      <Select
        value={condition.operator}
        onValueChange={(v) => onOperatorChange(v as FilterOperator)}
        disabled={spec.operators.length < 2}
      >
        <SelectTrigger className="h-9 w-[110px]" data-test-id={`profiles-filter-op-${condition.field}`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {spec.operators.map((op) => (
            <SelectItem key={op} value={op}>
              {OPERATORS[op]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {spec.kind === 'text' ? (
        <Input
          value={condition.value}
          onChange={(e) => onValueChange(e.target.value)}
          placeholder="name, email or Employee ID"
          className="h-9 flex-1"
          data-test-id={`profiles-filter-value-${condition.field}`}
        />
      ) : (
        <Select value={condition.value} onValueChange={onValueChange} disabled={loading || noValues}>
          <SelectTrigger className="h-9 flex-1" data-test-id={`profiles-filter-value-${condition.field}`}>
            <SelectValue placeholder={loading ? 'Loading…' : noValues ? 'None available' : 'value'} />
          </SelectTrigger>
          <SelectContent>
            {options.map((o) => (
              <SelectItem key={o.id} value={o.id}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <Button
        variant="ghost"
        size="icon"
        className="size-8 shrink-0 text-muted-foreground"
        disabled={!canRemove}
        onClick={onRemove}
        aria-label={canRemove ? 'Remove filter' : 'The first filter cannot be removed'}
        data-test-id={`profiles-filter-remove-${condition.field}`}
      >
        <X className="size-4" />
      </Button>
    </div>
  )
}
