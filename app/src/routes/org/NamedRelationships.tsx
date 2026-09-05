import { useState } from 'react'
import { Link2, Clock, Waypoints } from 'lucide-react'
import { useData } from '@/lib/data'
import { NAMED_RELATIONSHIPS, type NamedRelationship } from '@/data/org-seed'
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
import { ArrowRight } from 'lucide-react'
import { toast } from 'sonner'

const RELATIONSHIP_TYPES = ['Overlay', 'Mentor', 'Split Credit', 'Matrix']
const REL_VERSION = 'FY27-ChargePoint FEB-2026'

const RELATIONSHIP_FIELDS: CreateField[] = [
  { name: 'name', label: 'Relationship Name', required: true, placeholder: 'West Overlay — Q1', full: true },
  { name: 'relationshipType', label: 'Type', kind: 'select', required: true, options: RELATIONSHIP_TYPES },
  { name: 'fromPosition', label: 'From Position', required: true, placeholder: 'AE — West 04' },
  { name: 'toPosition', label: 'To Position', required: true, placeholder: 'RSM — West' },
]

export default function NamedRelationships() {
  const { data, loading } = useData<NamedRelationship[]>('org-named-relationships', 'seed', NAMED_RELATIONSHIPS)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<NamedRelationship | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const created = useOrgRecordsStore((s) => s.namedRelationships)
  const addNamedRelationship = useOrgRecordsStore((s) => s.addNamedRelationship)

  function handleCreate(values: CreateValues) {
    const rel: NamedRelationship = {
      id: `rel-${Date.now()}`,
      name: values.name.trim(),
      relationshipType: values.relationshipType,
      fromPosition: values.fromPosition.trim(),
      toPosition: values.toPosition.trim(),
      version: REL_VERSION,
    }
    addNamedRelationship(rel)
    toast('Named Relationship created', { description: `${rel.name} added.` })
  }

  const rels = [...created, ...(data ?? [])]
  const filtered = rels.filter((r) =>
    `${r.name} ${r.relationshipType} ${r.fromPosition} ${r.toPosition}`.toLowerCase().includes(search.toLowerCase()),
  )

  const columns: Column<NamedRelationship>[] = [
    { key: 'name', header: 'Relationship', width: '26%', cell: (r) => <RecordName name={r.name} sub={r.version} /> },
    { key: 'type', header: 'Type', cell: (r) => <Badge variant="secondary" className="font-normal">{r.relationshipType}</Badge> },
    {
      key: 'route',
      header: 'From → To',
      cell: (r) => (
        <span className="inline-flex items-center gap-2 text-sm text-foreground">
          {r.fromPosition}
          <ArrowRight className="size-3.5 text-muted-foreground" />
          {r.toPosition}
        </span>
      ),
    },
  ]

  return (
    <div data-test-id="named-relationships-page">
      <PageHeader
        eyebrow="Organization"
        title="Named Relationships"
        subtitle="Non-standard position-to-position links — overlay, mentor, or split-credit — used by crediting rules outside the primary hierarchy."
        meta={`${filtered.length} relationships`}
      />
      <ListToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search relationship, position…"
        onCreate={() => setCreateOpen(true)}
        createLabel="Create"
      />
      <CreateRecordDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Create Named Relationship"
        description="Define a From → To position link used by crediting rules."
        fields={RELATIONSHIP_FIELDS}
        onSubmit={handleCreate}
        testId="create-relationship-dialog"
      />
      <Panel>
        <DataTable
          testId="named-relationships-table"
          columns={columns}
          rows={filtered}
          rowId={(r) => r.id}
          loading={loading}
          onRowClick={(r) => setSelected(r)}
          empty={
            <EmptyState
              icon={Link2}
              title="No Named Relationships"
              description="No overlay, mentor, or split-credit relationships have been defined yet. Create one to route credit outside the management hierarchy."
            />
          }
        />
      </Panel>

      <Sheet open={selected != null} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent className="w-full gap-0 overflow-auto p-0 sm:!max-w-3xl" data-test-id="relationship-detail-sheet">
          {selected ? (
            <>
              <SheetHeader className="border-b border-border px-6 py-4">
                <SheetTitle className="font-heading text-2xl font-normal">{selected.name}</SheetTitle>
              </SheetHeader>
              <div className="space-y-5 bg-muted/50 px-6 py-6">
                <DetailSection title="Version Info" icon={<Clock className="size-4" />}>
                  <DetailField label="Version" value={selected.version} />
                  <DetailField label="Relationship Type" value={<Badge variant="secondary" className="font-normal">{selected.relationshipType}</Badge>} />
                </DetailSection>
                <DetailSection title="Relationship Info" icon={<Waypoints className="size-4" />}>
                  <DetailField label="Name" value={selected.name} />
                  <DetailField label="From Position" value={selected.fromPosition} />
                  <DetailField label="To Position" value={selected.toPosition} />
                  <DetailField
                    label="Route"
                    value={
                      <span className="inline-flex items-center gap-2">
                        {selected.fromPosition}
                        <ArrowRight className="size-3.5 text-muted-foreground" />
                        {selected.toPosition}
                      </span>
                    }
                  />
                </DetailSection>
              </div>
              <div className="sticky bottom-0 flex justify-end gap-2 border-t border-border bg-card px-6 py-3">
                <Button variant="outline" onClick={() => toast('Edit Named Relationship')} data-test-id="relationship-edit">Edit</Button>
                <Button onClick={() => setSelected(null)} data-test-id="relationship-close">Close</Button>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  )
}
