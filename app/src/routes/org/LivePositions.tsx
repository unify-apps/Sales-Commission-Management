import { useState } from 'react'
import { Briefcase } from 'lucide-react'
import { useLivePositions, type LivePosition } from '@/data'
import { PageHeader } from '@/components/org/page-header'
import { DataTable, type Column } from '@/components/org/data-table'
import { EmptyState } from '@/components/org/empty-state'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

// Occupancy is a three-state answer, not a boolean. CONFLICT means two assignments
// covered the date and the automation refused to pick one — it gets its own colour
// because hiding it behind "vacant" is how a wrong payout reaches someone.
const OCCUPANCY_VARIANT = {
  OCCUPIED: 'default',
  VACANT: 'secondary',
  CONFLICT: 'destructive',
} as const

const COLUMNS: Column<LivePosition>[] = [
  {
    key: 'position',
    header: 'Position',
    cell: (row) => (
      <div className="min-w-0">
        <div className="truncate font-medium text-foreground">{row.positionCode}</div>
        <div className="truncate text-xs text-muted-foreground">{row.name}</div>
      </div>
    ),
  },
  {
    key: 'person',
    header: 'Person',
    // The payee fields come back as '' — never absent — so every fallback here tests
    // truthiness, not nullishness. A dangling payeeId leaves the position OCCUPIED but
    // unnamed; say so rather than rendering a blank that reads like "nobody".
    cell: (row) =>
      row.payeeName ? (
        <span className="text-foreground">{row.payeeName}</span>
      ) : (
        <span className="text-muted-foreground">
          {row.occupancy === 'OCCUPIED' ? 'Unnamed payee' : '—'}
        </span>
      ),
  },
  {
    key: 'employeeId',
    header: 'Employee ID',
    cell: (row) => (
      <span className="font-mono text-xs text-muted-foreground">
        {row.employeeId || '—'}
      </span>
    ),
  },
  {
    key: 'occupancy',
    header: 'Occupancy',
    align: 'right',
    // matchCount is what makes CONFLICT actionable: it says how many assignments
    // overlapped, which is the first thing anyone fixing the data needs to know.
    cell: (row) => (
      <div className="flex items-center justify-end gap-2">
        {row.occupancy === 'CONFLICT' && (
          <span className="text-xs text-muted-foreground">{row.matchCount} assignments</span>
        )}
        <Badge variant={OCCUPANCY_VARIANT[row.occupancy]}>{row.occupancy}</Badge>
      </div>
    ),
  },
]

const DEFAULT_AS_OF = '2026-03-14'

export default function LivePositions() {
  const [asOfDate, setAsOfDate] = useState(DEFAULT_AS_OF)
  const [search, setSearch] = useState('')

  const { data, loading, error, total } = useLivePositions({ asOfDate, search })
  const rows = data ?? []

  return (
    <div data-test-id="live-positions-page">
      <PageHeader
        eyebrow="Organization"
        title="Positions (live)"
        subtitle="Read from the ICM | List Positions automation. Change the date and the occupant changes with it."
        meta={total === undefined ? undefined : `${total} position${total === 1 ? '' : 's'}`}
      />

      <div className="flex flex-wrap items-end gap-4 py-4">
        <div className="grid gap-1.5">
          <Label htmlFor="as-of">As of</Label>
          <Input
            id="as-of"
            type="date"
            value={asOfDate}
            onChange={(event) => setAsOfDate(event.target.value)}
            className="w-44"
          />
        </div>
        <div className="grid flex-1 gap-1.5 min-w-56">
          <Label htmlFor="position-search">Search</Label>
          <Input
            id="position-search"
            value={search}
            placeholder="Position code or name"
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
      </div>

      {error ? (
        <EmptyState
          icon={Briefcase}
          title="Couldn't load positions"
          description="The positions automation didn't answer. Check the date, then try again."
        />
      ) : (
        <DataTable
          columns={COLUMNS}
          rows={rows}
          rowId={(row) => row.positionId}
          loading={loading}
          testId="live-positions-table"
          empty={
            <EmptyState
              icon={Briefcase}
              title="No positions match"
              description="Nothing exists for this date and search. Widen either one."
            />
          }
        />
      )}
    </div>
  )
}
