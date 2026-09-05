import { useState } from 'react'
import { LayoutGrid, Clock, Briefcase } from 'lucide-react'
import { useLivePositions, type LivePosition } from '@/data'
import { formatDate, formatEpoch } from '@/lib/format'
import { PageHeader } from '@/components/org/page-header'
import { ListToolbar } from '@/components/org/list-toolbar'
import { toast } from 'sonner'
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

// The occupant is resolved as of a date, so a fixed default keeps the first
// render deterministic; the user changes it with the picker.
const DEFAULT_AS_OF = '2026-03-14'

// Occupancy is a three-state answer, not a boolean. CONFLICT means two
// assignments covered the date and the automation refused to pick one — it gets
// its own colour because hiding it behind "vacant" is how a wrong payout lands.
const OCCUPANCY_VARIANT = {
  OCCUPIED: 'default',
  VACANT: 'secondary',
  CONFLICT: 'destructive',
} as const

export default function Positions() {
  const [asOfDate, setAsOfDate] = useState(DEFAULT_AS_OF)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<LivePosition | null>(null)

  const { data, loading, error, total } = useLivePositions({ asOfDate, search })
  const positions = data ?? []

  const columns: Column<LivePosition>[] = [
    {
      key: 'name',
      header: 'Position',
      width: '26%',
      // the seat's own name over the title it carries — the title comes from the
      // PositionAttribute row in force on the as-of date, so it is '' for a seat
      // that has none rather than a guess from a neighbouring row
      cell: (p) => <RecordName name={p.name} sub={p.titleName || undefined} />,
    },
    {
      key: 'person',
      header: 'Person (Latest)',
      // Four states, not two. "Open seat" is only correct for VACANT; a CONFLICT is a
      // data problem the screen must not launder into an empty seat, and an OCCUPIED
      // row whose payee record is gone is occupied by someone we cannot name.
      cell: (p) => {
        if (p.occupancy === 'CONFLICT') {
          return <Badge variant="destructive">Conflicting assignments</Badge>
        }
        if (p.occupancy === 'VACANT') {
          return (
            <Badge variant="outline" className="border-dashed font-normal text-muted-foreground">
              Open seat
            </Badge>
          )
        }
        return p.payeeName ? (
          <span className="text-sm text-foreground">{p.payeeName}</span>
        ) : (
          <span className="text-sm text-muted-foreground">Unnamed payee</span>
        )
      },
    },
    {
      key: 'effectiveFrom',
      // NOT "Incentive Start" — that field does not exist in ICM. This is when the
      // position's current attributes took effect, which is what the model holds.
      header: 'Effective From',
      align: 'right',
      cell: (p) => (
        <span className="font-mono text-[13px] text-muted-foreground">
          {formatEpoch(p.attributeEffectiveStart)}
        </span>
      ),
    },
  ]

  return (
    <div data-test-id="positions-page">
      <PageHeader
        eyebrow="Organization"
        title="Positions"
        subtitle="The job seats that carry quotas, plans, and rate tables. A person occupies a position; the seat outlives personnel churn."
        meta={total === undefined ? undefined : `${total} position${total === 1 ? '' : 's'}`}
        actions={
          <div className="flex items-center gap-2" data-test-id="positions-asof-field">
            <Label htmlFor="positions-as-of" className="whitespace-nowrap text-muted-foreground">
              As of
            </Label>
            <Input
              id="positions-as-of"
              type="date"
              value={asOfDate}
              onChange={(event) => setAsOfDate(event.target.value)}
              className="h-9 w-40"
              data-test-id="positions-asof-input"
            />
          </div>
        }
      />

      <ListToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search position name…"
        onCreate={() =>
          toast('Create position', {
            description:
              'Positions are created through the ICM automation suite; no create callable is wired to this screen yet.',
          })
        }
        createLabel="Create"
      />

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
                {/* The window belongs to the ONE assignment that resolved this row, so it
                    only means anything when the row is OCCUPIED. On VACANT there is no
                    assignment and on CONFLICT there are several — printing a date for
                    either would be a confident answer about a position nobody provably
                    holds. matchCount is what makes a CONFLICT actionable, so it always
                    shows. */}
                <DetailSection title="Version Info" icon={<Clock className="size-4" />}>
                  <DetailField label="As Of Date" value={formatDate(asOfDate)} />
                  <DetailField
                    label="Assignments Covering This Date"
                    value={String(selected.matchCount)}
                  />
                  <DetailField
                    label="Attributes Effective From"
                    value={formatEpoch(selected.attributeEffectiveStart)}
                  />
                  {selected.occupancy === 'OCCUPIED' ? (
                    <>
                      <DetailField
                        label="Effective Start"
                        value={formatEpoch(selected.effectiveStart)}
                      />
                      <DetailField
                        label="Effective End"
                        // null here is open-ended, not unknown — say which
                        value={
                          selected.effectiveEnd == null
                            ? 'Open-ended'
                            : formatEpoch(selected.effectiveEnd)
                        }
                      />
                      <DetailField
                        label="Allocation"
                        value={
                          selected.allocationPct == null
                            ? '—'
                            : `${selected.allocationPct}%`
                        }
                      />
                    </>
                  ) : null}
                </DetailSection>
                <DetailSection title="Position Info" icon={<Briefcase className="size-4" />}>
                  <DetailField label="Position Code" value={selected.positionCode} />
                  <DetailField label="Position Name" value={selected.name} />
                  <DetailField label="Title" value={selected.titleName || '—'} />
                  <DetailField
                    label="Occupancy"
                    value={<Badge variant={OCCUPANCY_VARIANT[selected.occupancy]}>{selected.occupancy}</Badge>}
                  />
                  <DetailField
                    label="Payee Name"
                    value={selected.payeeName || <span className="text-muted-foreground">{selected.occupancy === 'OCCUPIED' ? 'Unnamed payee' : '—'}</span>}
                  />
                  <DetailField label="Employee ID" value={selected.employeeId || '—'} />
                  <DetailField label="Active" value={selected.active ? 'Yes' : 'No'} />
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
