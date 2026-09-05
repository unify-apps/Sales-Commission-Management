import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Table2, TrendingUp, BarChart3, FileSpreadsheet, LayoutList, Spline } from 'lucide-react'
import { toast } from 'sonner'
import { useData } from '@/lib/data'
import {
  REFERENCE_TABLES,
  REFERENCE_TABLES_TOTAL,
  type ReferenceTable,
  type ReferenceKind,
} from '@/data/plan-seed'
import { PageHeader } from '@/components/org/page-header'
import { ListToolbar } from '@/components/org/list-toolbar'
import { Panel } from '@/components/org/panel'
import { DataTable, type Column } from '@/components/org/data-table'
import { EmptyState } from '@/components/org/empty-state'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ReferenceTableSheet } from '@/components/plan/reference-table-sheet'
import { cn } from '@/lib/utils'

const KIND_META: Record<ReferenceKind, { label: string; icon: typeof BarChart3 }> = {
  tiered: { label: 'Tiered', icon: BarChart3 },
  curve: { label: 'Curve', icon: TrendingUp },
}

const FILTERS = ['all', 'tiered', 'curve'] as const

export default function ReferenceTables() {
  const { data, loading } = useData<ReferenceTable[]>('plan-reference-tables', 'seed', REFERENCE_TABLES)
  const [search, setSearch] = useState('')
  const [kind, setKind] = useState<string>('all')
  const [chooserOpen, setChooserOpen] = useState(false)
  const [selected, setSelected] = useState<ReferenceTable | null>(null)
  const navigate = useNavigate()

  const rows = (data ?? [])
    .filter((t) => (kind === 'all' ? true : t.kind === kind))
    .filter((t) =>
      `${t.name} ${t.assignmentName ?? ''} ${t.personName ?? ''}`.toLowerCase().includes(search.toLowerCase()),
    )

  const columns: Column<ReferenceTable>[] = [
    {
      key: 'name',
      header: 'Table Name',
      width: '22%',
      cell: (t) => {
        const Icon = KIND_META[t.kind].icon
        return (
          <div className="flex items-center gap-2.5">
            <Icon className="size-4 shrink-0 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">{t.name}</span>
          </div>
        )
      },
    },
    { key: 'unit', header: 'Unit Type', cell: (t) => <span className="font-mono text-[12px] text-muted-foreground">{t.unitType}</span> },
    {
      key: 'kind',
      header: 'Kind',
      cell: (t) => <Badge variant="secondary" className="font-normal">{KIND_META[t.kind].label}</Badge>,
    },
    {
      key: 'type',
      header: 'Type',
      cell: (t) => (
        <Badge
          variant="outline"
          className={cn('font-normal', t.type === 'Plan' ? 'text-muted-foreground' : 'border-primary/20 bg-primary/10 text-primary')}
        >
          {t.type}
        </Badge>
      ),
    },
    { key: 'assign', header: 'Name', cell: (t) => <span className="block max-w-[200px] truncate text-sm text-muted-foreground">{t.assignmentName ?? '—'}</span> },
    { key: 'person', header: 'Person Name', cell: (t) => <span className="block max-w-[180px] truncate text-sm text-foreground">{t.personName ?? '—'}</span> },
    { key: 'group', header: 'Business Group', cell: (t) => <span className="block max-w-[160px] truncate text-sm text-muted-foreground">{t.businessGroup ?? '—'}</span> },
  ]

  return (
    <div data-test-id="reference-tables-page">
      <PageHeader
        eyebrow="Plan Design"
        title="Reference Tables"
        subtitle="Rate tables and pay curves in one object. Give it an input, get a value back — the kind decides how the input is matched. Assignment can be plan-level or per position."
        meta={`${REFERENCE_TABLES_TOTAL} tables`}
        actions={
          <Button
            variant="outline"
            size="sm"
            className="h-9"
            onClick={() => toast('Create Upload Template', { description: 'Downloads a CSV template for bulk table upload.' })}
            data-test-id="create-upload-template"
          >
            <FileSpreadsheet className="size-4" />
            Create Upload Template
          </Button>
        }
      />
      <ListToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search Rate Table Name…"
        onCreate={() => setChooserOpen(true)}
        extra={
          <Tabs value={kind} onValueChange={setKind}>
            <TabsList className="h-9" data-test-id="reference-kind-filter">
              {FILTERS.map((f) => (
                <TabsTrigger key={f} value={f} className="capitalize">{f}</TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        }
      />
      <Panel>
        <DataTable
          testId="reference-tables-table"
          columns={columns}
          rows={rows}
          rowId={(t) => t.id}
          loading={loading}
          onRowClick={(t) => setSelected(t)}
          empty={<EmptyState icon={Table2} title="No reference tables" description="No tables of this kind yet. Create a tiered or curve table." />}
        />
      </Panel>

      <Dialog open={chooserOpen} onOpenChange={setChooserOpen}>
        <DialogContent data-test-id="reference-type-chooser">
          <DialogHeader>
            <DialogTitle className="font-heading text-2xl font-normal">Create Reference Table</DialogTitle>
            <DialogDescription>Which kind of table do you want to create?</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => navigate('/plan/reference-tables/new?type=tiered')}
              className="group rounded-lg border border-border bg-background p-5 text-left transition-colors hover:border-primary/50 hover:bg-accent/40"
              data-test-id="choose-tiered"
            >
              <LayoutList className="size-6 text-primary" />
              <div className="mt-3 font-heading text-lg text-foreground">Tiered Table</div>
              <p className="mt-1 text-sm text-muted-foreground">Rate bands with Low / High ranges and a rate or formula per tier.</p>
            </button>
            <button
              type="button"
              onClick={() => navigate('/plan/reference-tables/new?type=curve')}
              className="group rounded-lg border border-border bg-background p-5 text-left transition-colors hover:border-primary/50 hover:bg-accent/40"
              data-test-id="choose-curve"
            >
              <Spline className="size-6 text-primary" />
              <div className="mt-3 font-heading text-lg text-foreground">Curve Table</div>
              <p className="mt-1 text-sm text-muted-foreground">A pay curve mapping quota attainment to a personal-target multiplier.</p>
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <ReferenceTableSheet
        table={selected}
        open={selected !== null}
        onOpenChange={(o) => !o && setSelected(null)}
      />
    </div>
  )
}
