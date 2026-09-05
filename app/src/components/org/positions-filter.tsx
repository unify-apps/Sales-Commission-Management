import { useState } from 'react'
import { Filter as FilterIcon, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

/** Sent straight to `ICM | List Positions`; every field is optional and '' means "don't filter". */
export interface PositionFilters {
  positionCode: string
  name: string
  personName: string
  occupancy: string
}

export const EMPTY_POSITION_FILTERS: PositionFilters = {
  positionCode: '',
  name: '',
  personName: '',
  occupancy: '',
}

export function countActiveFilters(f: PositionFilters): number {
  return Object.values(f).filter((v) => v.trim() !== '').length
}

// 'any' rather than '' as the select's value: a Radix SelectItem cannot hold an
// empty string, so the sentinel is mapped back to '' on the way out.
const ANY = 'any'

/**
 * The four fields split into two kinds and it is worth knowing which is which:
 * position code and name are stored on the row and narrow server-side, while
 * person and occupancy only exist once the automation has resolved assignments
 * as of the date, so those make it fold before paging. The callable bounds that
 * scan and reports `truncated` when it bites.
 */
export function PositionsFilter({
  value,
  onChange,
}: {
  value: PositionFilters
  onChange: (next: PositionFilters) => void
}) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<PositionFilters>(value)
  const active = countActiveFilters(value)

  function openChange(next: boolean) {
    // reopen shows what is actually applied, not a half-typed draft from last time
    if (next) setDraft(value)
    setOpen(next)
  }

  function apply() {
    onChange(draft)
    setOpen(false)
  }

  function clear() {
    setDraft(EMPTY_POSITION_FILTERS)
    onChange(EMPTY_POSITION_FILTERS)
    setOpen(false)
  }

  const field = (key: keyof PositionFilters, label: string, placeholder: string) => (
    <div className="grid gap-1.5">
      <Label htmlFor={`positions-filter-${key}`}>{label}</Label>
      <Input
        id={`positions-filter-${key}`}
        value={draft[key]}
        placeholder={placeholder}
        onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
        onKeyDown={(e) => {
          if (e.key === 'Enter') apply()
        }}
        data-test-id={`positions-filter-${key}`}
      />
    </div>
  )

  return (
    <Popover open={open} onOpenChange={openChange}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-9" data-test-id="list-toolbar-filter">
          <FilterIcon className="size-4" />
          Filter
          {active > 0 ? (
            <Badge variant="secondary" className="ml-1 px-1.5 font-mono text-[11px]">
              {active}
            </Badge>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80" data-test-id="positions-filter-panel">
        <div className="grid gap-3">
          {field('positionCode', 'Position Code', 'POS-W-AE')}
          {field('name', 'Position Name', 'AE — West')}
          {field('personName', 'Person Name', 'Priya')}

          <div className="grid gap-1.5">
            <Label htmlFor="positions-filter-occupancy">Occupancy</Label>
            <Select
              value={draft.occupancy === '' ? ANY : draft.occupancy}
              onValueChange={(v) => setDraft({ ...draft, occupancy: v === ANY ? '' : v })}
            >
              <SelectTrigger id="positions-filter-occupancy" className="w-full" data-test-id="positions-filter-occupancy">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ANY}>Any</SelectItem>
                <SelectItem value="OCCUPIED">Occupied</SelectItem>
                <SelectItem value="VACANT">Vacant</SelectItem>
                <SelectItem value="CONFLICT">Conflict</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between pt-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={clear}
              disabled={active === 0 && countActiveFilters(draft) === 0}
              data-test-id="positions-filter-clear"
            >
              <X className="size-4" />
              Clear
            </Button>
            <Button size="sm" onClick={apply} data-test-id="positions-filter-apply">
              Apply
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
