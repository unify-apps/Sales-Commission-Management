import { useState } from 'react'
import { LayoutGrid, Clock, Briefcase } from 'lucide-react'
import { useData } from '@/lib/data'
import { POSITIONS, type Position } from '@/data/org-seed'
import { formatDate } from '@/lib/format'
import { PageHeader } from '@/components/org/page-header'
import { ListToolbar } from '@/components/org/list-toolbar'
import { Panel, RecordName, DetailField, DetailSection } from '@/components/org/panel'
import { DataTable, type Column } from '@/components/org/data-table'
import { EmptyState } from '@/components/org/empty-state'
import { CreateRecordDialog, type CreateField, type CreateValues } from '@/components/org/create-record-dialog'
import { useOrgRecordsStore } from '@/lib/store'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { toast } from 'sonner'

const GROUPS = ['ChargePoint NA', 'ChargePoint EU', 'ChargePoint APAC']

const POSITION_FIELDS: CreateField[] = [
  { name: 'positionName', label: 'Position Name', required: true, placeholder: 'AE — West 05', full: true },
  { name: 'title', label: 'Title', required: true, placeholder: 'Account Executive' },
  { name: 'personName', label: 'Person (Latest)', placeholder: 'Leave blank for open seat' },
  { name: 'businessGroup', label: 'Business Group', kind: 'select', required: true, options: GROUPS },
  { name: 'incentiveStart', label: 'Incentive Start', placeholder: 'YYYY-MM-DD' },
]

export default function Positions() {
  const { data, loading } = useData<Position[]>('org-positions', 'seed', POSITIONS)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Position | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const created = useOrgRecordsStore((s) => s.positions)
  const addPosition = useOrgRecordsStore((s) => s.addPosition)

  function handleCreate(values: CreateValues) {
    const position: Position = {
      id: `position-${Date.now()}`,
      positionName: values.positionName.trim(),
      title: values.title.trim(),
      personName: values.personName.trim() || null,
      businessGroup: values.businessGroup,
      incentiveStart: values.incentiveStart.trim() || new Date().toISOString().slice(0, 10),
      incentiveEnd: null,
    }
    addPosition(position)
    toast('Position created', { description: `${position.positionName} added.` })
  }

  const positions = [...created, ...(data ?? [])]
  const filtered = positions.filter((p) =>
    `${p.positionName} ${p.title} ${p.personName ?? ''} ${p.businessGroup}`.toLowerCase().includes(search.toLowerCase()),
  )

  const columns: Column<Position>[] = [
    { key: 'name', header: 'Position', width: '24%', cell: (p) => <RecordName name={p.positionName} sub={p.title} /> },
    {
      key: 'person',
      header: 'Person (Latest)',
      cell: (p) =>
        p.personName ? (
          <span className="text-sm text-foreground">{p.personName}</span>
        ) : (
          <Badge variant="outline" className="border-dashed font-normal text-muted-foreground">Open seat</Badge>
        ),
    },
    { key: 'group', header: 'Business Group', cell: (p) => <span className="text-sm text-muted-foreground">{p.businessGroup}</span> },
    { key: 'start', header: 'Incentive Start', align: 'right', cell: (p) => <span className="font-mono text-[13px] text-muted-foreground">{formatDate(p.incentiveStart)}</span> },
  ]

  return (
    <div data-test-id="positions-page">
      <PageHeader
        eyebrow="Organization"
        title="Positions"
        subtitle="The job seats that carry quotas, plans, and rate tables. A person occupies a position; the seat outlives personnel churn."
        meta={`${filtered.length} positions`}
      />
      <ListToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search position name…"
        onCreate={() => setCreateOpen(true)}
        createLabel="Create"
      />
      <CreateRecordDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Create Position"
        description="Add a new job seat that can carry quotas and plans."
        fields={POSITION_FIELDS}
        onSubmit={handleCreate}
        testId="create-position-dialog"
      />
      <Panel>
        <DataTable
          testId="positions-table"
          columns={columns}
          rows={filtered}
          rowId={(p) => p.id}
          loading={loading}
          onRowClick={(p) => setSelected(p)}
          empty={<EmptyState icon={LayoutGrid} title="No positions match" description="Adjust your search or create a new position seat." />}
        />
      </Panel>

      <Sheet open={selected != null} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent className="w-full gap-0 overflow-auto p-0 sm:!max-w-3xl" data-test-id="position-detail-sheet">
          {selected ? (
            <>
              <SheetHeader className="border-b border-border px-6 py-4">
                <SheetTitle className="font-heading text-2xl font-normal">{selected.positionName}</SheetTitle>
              </SheetHeader>
              <div className="space-y-8 px-6 py-6">
                <DetailSection title="Version Info" icon={<Clock className="size-4" />}>
                  <DetailField label="Effective Start Date" value={formatDate(selected.incentiveStart)} />
                  <DetailField label="Effective End Date" value={selected.incentiveEnd ? formatDate(selected.incentiveEnd) : 'End of Time'} />
                  <DetailField label="Description" value="—" />
                </DetailSection>
                <DetailSection title="Position Info" icon={<Briefcase className="size-4" />}>
                  <DetailField label="Position Name" value={selected.positionName} />
                  <DetailField label="Incentive Start Date" value={formatDate(selected.incentiveStart)} />
                  <DetailField label="Incentive End Date" value={selected.incentiveEnd ? formatDate(selected.incentiveEnd) : '—'} />
                  <DetailField label="Title" value={selected.title} />
                  <DetailField label="Business Group" value={selected.businessGroup} />
                  <DetailField
                    label="Person Name (Latest)"
                    value={selected.personName ?? <Badge variant="outline" className="border-dashed font-normal text-muted-foreground">Open seat</Badge>}
                  />
                </DetailSection>
              </div>
              <div className="sticky bottom-0 flex justify-end gap-2 border-t border-border bg-card px-6 py-3">
                <Button variant="outline" onClick={() => toast('Edit Position')} data-test-id="position-edit">Edit</Button>
                <Button onClick={() => setSelected(null)} data-test-id="position-close">Close</Button>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  )
}
