import { useState } from 'react'
import { Calculator, Pencil, Filter as FilterIcon, FileText } from 'lucide-react'
import { toast } from 'sonner'
import { useData } from '@/lib/data'
import { MEASURES, MEASURES_TOTAL, type Measure } from '@/data/plan-seed'
import { PageHeader } from '@/components/org/page-header'
import { ListToolbar } from '@/components/org/list-toolbar'
import { Panel, DetailSection } from '@/components/org/panel'
import { CreateRecordDialog, type CreateField, type CreateValues } from '@/components/org/create-record-dialog'
import { usePlanRecordsStore } from '@/lib/store'
import { DataTable, type Column } from '@/components/org/data-table'
import { EmptyState } from '@/components/org/empty-state'
import { ListPagination } from '@/components/org/pagination'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const PERIOD_TYPES = ['All', 'Monthly', 'Year-to-Date (YTD)', 'Half-to-Date (HTD)', 'Quarterly'] as const

const MEASURE_FIELDS: CreateField[] = [
  { name: 'name', label: 'Measure Name', required: true, placeholder: 'Shipped — Bookings YTD', full: true },
  { name: 'periodType', label: 'Period Type', kind: 'select', required: true, options: ['Monthly', 'Year-to-Date (YTD)', 'Half-to-Date (HTD)', 'Quarterly'] },
  { name: 'creditTypes', label: 'Credit Types', placeholder: 'Comma-separated, e.g. Bookings, ACV' },
  { name: 'description', label: 'Description', placeholder: 'Optional', full: true },
]

function splitChips(raw: string): string[] {
  return raw.split(',').map((c) => c.trim()).filter(Boolean)
}

function FilterField({ label, chips }: { label: string; chips: string[] }) {
  return (
    <div className="space-y-1.5" data-test-id={`measure-filter-${label.toLowerCase()}`}>
      <Label className="font-mono text-[11px] uppercase tracking-[0.09em] text-muted-foreground">
        {label} <span className="normal-case tracking-normal text-muted-foreground/70">(optional)</span>
      </Label>
      {chips.length > 0 ? (
        <div className="flex flex-wrap gap-1.5 rounded-md border border-border bg-muted/40 p-2">
          {chips.map((c) => (
            <Badge key={c} variant="secondary" className="gap-1 font-normal">{c}</Badge>
          ))}
        </div>
      ) : (
        <div className="flex h-9 items-center rounded-md border border-border px-3 text-sm text-muted-foreground/60">
          Select Items
        </div>
      )}
    </div>
  )
}

export default function Measures() {
  const { data, loading } = useData<Measure[]>('plan-measures', 'seed', MEASURES)
  const [search, setSearch] = useState('')
  const [periodType, setPeriodType] = useState<string>('All')
  const [selected, setSelected] = useState<Measure | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const createdMeasures = usePlanRecordsStore((s) => s.measures)
  const addMeasure = usePlanRecordsStore((s) => s.addMeasure)

  function handleCreate(values: CreateValues) {
    const measure: Measure = {
      id: `measure-${Date.now()}`,
      name: values.name.trim(),
      periodType: values.periodType as Measure['periodType'],
      description: values.description.trim(),
      creditTypes: splitChips(values.creditTypes),
      products: [],
      customers: [],
      geographies: [],
    }
    addMeasure(measure)
    toast('Measure created', { description: `${measure.name} added.` })
  }

  const rows = [...createdMeasures, ...(data ?? [])]
    .filter((m) => (periodType === 'All' ? true : m.periodType === periodType))
    .filter((m) => m.name.toLowerCase().includes(search.toLowerCase()))

  const columns: Column<Measure>[] = [
    { key: 'name', header: 'Measure Name', width: '55%', cell: (m) => <span className="text-sm font-medium text-foreground">{m.name}</span> },
    { key: 'period', header: 'Period Type', cell: (m) => <span className="text-sm text-foreground">{m.periodType}</span> },
    {
      key: 'actions',
      header: '',
      align: 'right',
      width: '60px',
      cell: (m) => (
        <button
          type="button"
          className="text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
          onClick={(e) => {
            e.stopPropagation()
            setSelected(m)
          }}
          data-test-id={`measure-edit-${m.id}`}
          aria-label={`Edit ${m.name}`}
        >
          <Pencil className="size-4" />
        </button>
      ),
    },
  ]

  return (
    <div data-test-id="measures-page">
      <PageHeader
        eyebrow="Plan Design"
        title="Attainment Measures"
        subtitle="The only object that sums over a period — a saved query totalling credit types for a person over a window. That total, divided by a quota, is the attainment every curve consumes."
        meta={`${MEASURES_TOTAL} measures`}
      />
      <ListToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search"
        showUpload={false}
        onCreate={() => setCreateOpen(true)}
        extra={
          <Select value={periodType} onValueChange={setPeriodType}>
            <SelectTrigger className="h-9 w-[200px]" data-test-id="measure-period-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERIOD_TYPES.map((p) => (
                <SelectItem key={p} value={p}>{p === 'All' ? 'Period Type: All' : p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />
      <CreateRecordDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Create Attainment Measure"
        description="Name the measure, its period window and the credit types it sums."
        fields={MEASURE_FIELDS}
        submitLabel="Create"
        onSubmit={handleCreate}
        testId="create-measure-dialog"
      />
      <Panel>
        <DataTable
          testId="measures-table"
          columns={columns}
          rows={rows}
          rowId={(m) => m.id}
          loading={loading}
          onRowClick={(m) => setSelected(m)}
          empty={<EmptyState icon={Calculator} title="No measures match" description="Adjust your search or period type filter." />}
        />
        {!loading && rows.length > 0 ? (
          <ListPagination showingFrom={1} showingTo={rows.length} total={MEASURES_TOTAL} pages={1} testId="measures-pagination" />
        ) : null}
      </Panel>

      <Sheet open={selected != null} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent className="w-full gap-0 overflow-auto p-0 sm:!max-w-4xl" data-test-id="measure-edit-sheet">
          {selected ? (
            <>
              <SheetHeader className="border-b border-border px-6 py-4">
                <span className="text-sm text-muted-foreground">Attainment Measures</span>
                <SheetTitle className="font-heading text-2xl font-normal">{selected.name}</SheetTitle>
              </SheetHeader>

              <div className="space-y-5 bg-muted/50 px-6 py-6">
                <DetailSection title="General Details" icon={<FileText className="size-4" />}>
                  <div className="space-y-1.5">
                    <Label htmlFor="m-name">Name</Label>
                    <Input id="m-name" defaultValue={selected.name} data-test-id="measure-name-input" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="m-desc">Description <span className="text-muted-foreground/70">(optional)</span></Label>
                    <Textarea id="m-desc" defaultValue={selected.description} data-test-id="measure-desc-input" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="m-period">Period Type</Label>
                    <Select defaultValue={selected.periodType}>
                      <SelectTrigger id="m-period" data-test-id="measure-period-input">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PERIOD_TYPES.filter((p) => p !== 'All').map((p) => (
                          <SelectItem key={p} value={p}>{p}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </DetailSection>

                <DetailSection title="Filters" icon={<FilterIcon className="size-4" />}>
                  <p className="-mt-1 text-sm text-muted-foreground sm:col-span-4">Specify filters to be applied to this measure.</p>
                  <FilterField label="Products" chips={selected.products} />
                  <FilterField label="Customers" chips={selected.customers} />
                  <FilterField label="Geographies" chips={selected.geographies} />
                  <FilterField label="Credit Types" chips={selected.creditTypes} />
                </DetailSection>
              </div>

              <div className="sticky bottom-0 flex justify-end gap-2 border-t border-border bg-card px-6 py-3">
                <Button variant="ghost" onClick={() => setSelected(null)} data-test-id="measure-cancel">Cancel</Button>
                <Button
                  onClick={() => {
                    toast.success('Measure saved')
                    setSelected(null)
                  }}
                  data-test-id="measure-save"
                >
                  Save
                </Button>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  )
}
