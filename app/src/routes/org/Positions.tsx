import { useState } from 'react'
import { LayoutGrid, Briefcase } from 'lucide-react'
import { useLivePositions, type LivePosition, type Occupancy } from '@/data'
import { formatDate } from '@/lib/format'
import { PageHeader } from '@/components/org/page-header'
import { Panel, RecordName, DetailField, DetailSection } from '@/components/org/panel'
import { DataTable, type Column } from '@/components/org/data-table'
import { EmptyState } from '@/components/org/empty-state'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'

// The occupant is resolved as of a date, so a fixed default keeps the first render
// deterministic; the user changes it with the picker.
const DEFAULT_AS_OF = '2026-03-14'

// Occupancy is a three-state answer, not a boolean. CONFLICT means two assignments
// covered the date and the automation refused to pick one — it gets its own colour
// because hiding it behind "vacant" is how a wrong payout reaches someone.
const OCCUPANCY_VARIANT: Record<Occupancy, 'default' | 'secondary' | 'destructive'> = {
  OCCUPIED: 'default',
  VACANT: 'secondary',
  CONFLICT: 'destructive',
}

export default function Positions() {
  const [asOfDate, setAsOfDate] = useState(DEFAULT_AS_OF)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<LivePosition | null>(null)

  const { positions, total, loading, error } = useLivePositions({ asOfDate, search })

  const columns: Column<LivePosition>[] = [
    {
      key: 'name',
      header: 'Position',
      width: '26%',
      cell: (p) => <RecordName name={p.positionCode} sub={p.name} />,
    },
    {
      key: 'person',
      header: 'Person',
      cell: (p) =>
        p.payeeName ? (
          <span className="text-sm text-foreground">{p.payeeName}</span>
        ) : (
          <span className="text-sm text-muted-foreground">
            {p.occupancy === 'OCCUPIED' ? 'Unnamed payee' : '—'}
          </span>
        ),
    },
    {
      key: 'employeeId',
      header: 'Employee ID',
      cell: (p) => <span className="font-mono text-[13px] text-muted-foreground">{p.employeeId ?? '—'}</span>,
    },
    {
      key: 'occupancy',
      header: 'Occupancy',
      align: 'right',
      cell: (p) => <Badge variant={OCCUPANCY_VARIANT[p.occupancy]}>{p.occupancy}</Badge>,
    },
  ]

  return (
    <div data-test-id="positions-page">
      <PageHeader
        eyebrow="Organization"
        title="Positions"
        subtitle="The job seats that carry quotas, plans, and rate tables, read live from the ICM | List Positions automation. Change the date and the occupant changes with it."
        meta={total === undefined ? undefined : `${total} position${total === 1 ? '' : 's'}`}
      />

      <div className="flex flex-wrap items-end gap-4 py-4" data-test-id="positions-toolbar">
        <div className="grid gap-1.5" data-test-id="positions-asof-field">
          <Label htmlFor="positions-as-of">As of</Label>
          <Input
            id="positions-as-of"
            type="date"
            value={asOfDate}
            onChange={(event) => setAsOfDate(event.target.value)}
            className="w-44"
            data-test-id="positions-asof-input"
          />
        </div>
        <div className="grid min-w-56 flex-1 gap-1.5" data-test-id="positions-search-field">
          <Label htmlFor="positions-search">Search</Label>
          <Input
            id="positions-search"
            value={search}
            placeholder="Position code or name…"
            onChange={(event) => setSearch(event.target.value)}
            data-test-id="positions-search-input"
          />
        </div>
      </div>

      {error ? (
        <Panel>
          <EmptyState
            icon={Briefcase}
            title="Couldn't load positions"
            description="The positions automation didn't answer. Check the date, then try again."
          />
        </Panel>
      ) : (
        <Panel>
          <DataTable
            testId="positions-table"
            columns={columns}
            rows={positions}
            rowId={(p) => p.positionId}
            loading={loading}
            onRowClick={(p) => setSelected(p)}
            empty={<EmptyState icon={LayoutGrid} title="No positions match" description="Nothing exists for this date and search. Widen either one." />}
          />
        </Panel>
      )}

      <Sheet open={selected != null} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent className="w-full gap-0 overflow-auto p-0 sm:!max-w-3xl" data-test-id="position-detail-sheet">
          {selected ? (
            <>
              <SheetHeader className="border-b border-border px-6 py-4">
                <SheetTitle className="font-heading text-2xl font-normal">{selected.positionCode}</SheetTitle>
              </SheetHeader>
              <div className="space-y-8 px-6 py-6">
                <DetailSection title="Position Info" icon={<Briefcase className="size-4" />}>
                  <DetailField label="Position Code" value={selected.positionCode} />
                  <DetailField label="Position Name" value={selected.name} />
                  <DetailField label="As Of Date" value={formatDate(asOfDate)} />
                  <DetailField label="Active" value={selected.active ? 'Yes' : 'No'} />
                  <DetailField
                    label="Occupancy"
                    value={<Badge variant={OCCUPANCY_VARIANT[selected.occupancy]}>{selected.occupancy}</Badge>}
                  />
                  <DetailField
                    label="Payee Name"
                    value={
                      selected.payeeName ?? (
                        <span className="text-muted-foreground">
                          {selected.occupancy === 'OCCUPIED' ? 'Unnamed payee' : '—'}
                        </span>
                      )
                    }
                  />
                  <DetailField label="Employee ID" value={selected.employeeId ?? '—'} />
                </DetailSection>
              </div>
              <div className="sticky bottom-0 flex justify-end gap-2 border-t border-border bg-card px-6 py-3">
                <Button onClick={() => setSelected(null)} data-test-id="position-close">Close</Button>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  )
}
