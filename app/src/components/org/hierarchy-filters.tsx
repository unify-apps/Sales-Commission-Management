import { Filter, Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  FILTER_PROPERTIES,
  describeRow,
  isComplete,
  newFilterRow,
  operatorTakesList,
  operatorTakesValue,
  operatorsFor,
  propertyFor,
  type FilterOperator,
  type FilterRow,
} from '@/data/hierarchy-filter'

interface HierarchyFiltersProps {
  rows: FilterRow[]
  rootOperator: 'AND' | 'OR'
  onChange: (rows: FilterRow[]) => void
  onRootOperatorChange: (operator: 'AND' | 'OR') => void
}

/** One [property] [operator] [value] row. */
function Row({
  row,
  index,
  rootOperator,
  onChange,
  onRemove,
  onRootOperatorChange,
}: {
  row: FilterRow
  index: number
  rootOperator: 'AND' | 'OR'
  onChange: (next: FilterRow) => void
  onRemove: () => void
  onRootOperatorChange: (operator: 'AND' | 'OR') => void
}) {
  const property = propertyFor(row.property)
  const operators = operatorsFor(property.kind)
  const takesValue = operatorTakesValue(row.operator)

  return (
    <div className="flex items-start gap-1.5" data-test-id={`filter-row-${index}`}>
      <div className="w-14 shrink-0 pt-1.5">
        {index === 0 ? (
          <span className="pl-1 font-mono text-[11px] uppercase text-muted-foreground">Where</span>
        ) : index === 1 ? (
          // Only the second row picks the join. The platform applies ONE root operator
          // to the whole set, so letting every row choose would imply a per-row mix the
          // automation cannot express.
          <Select value={rootOperator} onValueChange={(v) => onRootOperatorChange(v as 'AND' | 'OR')}>
            <SelectTrigger className="h-8 w-full px-2 font-mono text-[11px]" data-test-id="filter-root-operator">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="AND">and</SelectItem>
              <SelectItem value="OR">or</SelectItem>
            </SelectContent>
          </Select>
        ) : (
          <span className="pl-1 font-mono text-[11px] lowercase text-muted-foreground">
            {rootOperator.toLowerCase()}
          </span>
        )}
      </div>

      <Select
        value={row.property}
        onValueChange={(key) => {
          const next = propertyFor(key)
          // The operator menu is per data type, so switching to a date drops any text
          // operator that has no meaning there rather than sending one the automation
          // will refuse.
          const stillValid = operatorsFor(next.kind).some((o) => o.value === row.operator)
          onChange({
            ...row,
            property: key,
            operator: stillValid ? row.operator : operatorsFor(next.kind)[0].value,
            value: next.kind === propertyFor(row.property).kind ? row.value : '',
          })
        }}
      >
        <SelectTrigger className="h-8 w-[136px] text-[13px]" data-test-id={`filter-property-${index}`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {FILTER_PROPERTIES.map((p) => (
            <SelectItem key={p.key} value={p.key}>{p.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={row.operator}
        onValueChange={(op) => onChange({ ...row, operator: op as FilterOperator })}
      >
        <SelectTrigger className="h-8 w-[132px] text-[13px]" data-test-id={`filter-operator-${index}`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {operators.map((o) => (
            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {takesValue ? (
        <Input
          value={row.value}
          onChange={(e) => onChange({ ...row, value: e.target.value })}
          // No date picker exists in this app's ui primitives, so a date is typed. The
          // automation refuses anything that is not YYYY-MM-DD, and says so.
          placeholder={
            property.kind === 'date'
              ? 'YYYY-MM-DD'
              : operatorTakesList(row.operator)
                ? 'a, b, c'
                : 'value'
          }
          className="h-8 flex-1 text-[13px]"
          data-test-id={`filter-value-${index}`}
        />
      ) : (
        <div className="flex-1" />
      )}

      <Button
        variant="ghost"
        size="icon"
        className="size-8 shrink-0 text-muted-foreground"
        onClick={onRemove}
        aria-label="Remove this filter"
        data-test-id={`filter-remove-${index}`}
      >
        <X className="size-4" />
      </Button>
    </div>
  )
}

/**
 * The filter as an expression, not a pick-list: rows of property / operator / value
 * joined by one root AND/OR — the shape the platform's own filter menu produces.
 *
 * Every row is evaluated by the callable, never client-side. The automation adds back
 * the ancestors of whatever matched, so filtering never fragments the tree.
 */
export function HierarchyFilters({
  rows,
  rootOperator,
  onChange,
  onRootOperatorChange,
}: HierarchyFiltersProps) {
  // Only complete rows count. A row still being typed is not yet a filter.
  const active = rows.filter(isComplete).length

  const update = (index: number, next: FilterRow) =>
    onChange(rows.map((row, i) => (i === index ? next : row)))

  return (
    <div className="flex items-center gap-1">
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-9" data-test-id="hierarchy-filter">
            <Filter className="size-4" />
            {active === 1 ? (
              <span className="max-w-[220px] truncate">{describeRow(rows.filter(isComplete)[0])}</span>
            ) : (
              <>
                Filter
                {active > 1 ? (
                  <span className="ml-1 rounded-full bg-primary px-1.5 font-mono text-[10px] text-primary-foreground">
                    {active}
                  </span>
                ) : null}
              </>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-[560px] p-3" data-test-id="hierarchy-filter-panel">
          {rows.length === 0 ? (
            <p className="px-1 py-2 text-[13px] text-muted-foreground">
              No filters. Add one to narrow the reporting structure.
            </p>
          ) : (
            <div className="space-y-1.5">
              {rows.map((row, index) => (
                <Row
                  key={row.id}
                  row={row}
                  index={index}
                  rootOperator={rootOperator}
                  onChange={(next) => update(index, next)}
                  onRemove={() => onChange(rows.filter((_, i) => i !== index))}
                  onRootOperatorChange={onRootOperatorChange}
                />
              ))}
            </div>
          )}

          <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2"
              onClick={() => onChange([...rows, newFilterRow()])}
              data-test-id="filter-add"
            >
              <Plus className="size-4" />
              Add filter
            </Button>
            {rows.length > 0 ? (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-muted-foreground"
                onClick={() => onChange([])}
                data-test-id="filter-clear-all"
              >
                Clear all
              </Button>
            ) : null}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
