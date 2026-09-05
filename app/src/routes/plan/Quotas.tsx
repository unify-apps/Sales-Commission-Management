import { useState } from 'react'
import { Target, Plus, X, Clock, FileText, LayoutList } from 'lucide-react'
import { toast } from 'sonner'
import { useData } from '@/lib/data'
import { QUOTAS, QUOTAS_TOTAL, makeBreakdown, type Quota } from '@/data/plan-seed'
import { usePlanRecordsStore } from '@/lib/store'
import { PageHeader } from '@/components/org/page-header'
import { QuotaBreakdownCard } from '@/components/plan/quota-breakdown-card'
import { CreateRecordDialog, type CreateField, type CreateValues } from '@/components/org/create-record-dialog'
import { CURRENT_YEAR_PERIOD } from '@/lib/period'
import { ListToolbar } from '@/components/org/list-toolbar'
import { Panel, DetailField, DetailSection } from '@/components/org/panel'
import { DataTable, type Column } from '@/components/org/data-table'
import { EmptyState } from '@/components/org/empty-state'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
import { cn } from '@/lib/utils'

const CLASSIFICATIONS = ['All', 'BOOKINGS', 'ACV', 'LICENSES', 'REVENUE'] as const

function num(v: number) {
  return v.toLocaleString('en-US')
}

const QUOTA_FIELDS: CreateField[] = [
  { name: 'name', label: 'Quota Name', required: true, placeholder: 'Booked Quota', full: true },
  { name: 'period', label: 'Quota Period', required: true, placeholder: 'YEAR-2026' },
  { name: 'type', label: 'Type', kind: 'select', required: true, options: ['Plan', 'Position', 'Title'] },
  { name: 'classification', label: 'Classification', kind: 'select', required: true, options: ['BOOKINGS', 'ACV', 'LICENSES', 'REVENUE'] },
  { name: 'unitType', label: 'Unit Type', kind: 'select', required: true, options: ['USD', 'EUR', 'GBP', 'Units'] },
  { name: 'yearValue', label: 'Year Value', kind: 'number', placeholder: '1000000' },
  { name: 'personName', label: 'Person Name', placeholder: 'Optional' },
  { name: 'businessGroup', label: 'Business Group', placeholder: 'Optional' },
]

export default function Quotas() {
  const { data, loading } = useData<Quota[]>('plan-quotas', 'seed', QUOTAS)
  const [search, setSearch] = useState('')
  const [classification, setClassification] = useState<string>('All')
  const [showFilter, setShowFilter] = useState(false)
  const [selected, setSelected] = useState<Quota | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const createdQuotas = usePlanRecordsStore((s) => s.quotas)
  const addQuota = usePlanRecordsStore((s) => s.addQuota)

  function handleCreate(values: CreateValues) {
    const period = values.period.trim() || CURRENT_YEAR_PERIOD
    const yearValue = Number(values.yearValue) || 0
    const quota: Quota = {
      id: `quota-${Date.now()}`,
      name: values.name.trim(),
      period,
      type: values.type as Quota['type'],
      assignmentName: null,
      personName: values.personName.trim() || null,
      yearValue,
      unitType: values.unitType,
      businessGroup: values.businessGroup.trim() || null,
      classification: values.classification,
      description: null,
      effectiveStart: period,
      effectiveEnd: period,
      breakdown: makeBreakdown(period, yearValue),
    }
    addQuota(quota)
    toast('Quota created', { description: `${quota.name} (${quota.period}) added.` })
  }

  const rows = [...createdQuotas, ...(data ?? [])]
    .filter((q) => (classification === 'All' ? true : q.classification === classification))
    .filter((q) =>
      `${q.name} ${q.period} ${q.assignmentName ?? ''} ${q.personName ?? ''}`
        .toLowerCase()
        .includes(search.toLowerCase()),
    )
    // Open on the current fiscal period: current-period rows first, then newest → oldest.
    .sort((a, b) => {
      if (a.period === CURRENT_YEAR_PERIOD && b.period !== CURRENT_YEAR_PERIOD) return -1
      if (b.period === CURRENT_YEAR_PERIOD && a.period !== CURRENT_YEAR_PERIOD) return 1
      return b.period.localeCompare(a.period)
    })

  function handleReset() {
    setSearch('')
    setClassification('All')
    setShowFilter(false)
  }

  const columns: Column<Quota>[] = [
    { key: 'name', header: 'Quota Name', width: '14%', cell: (q) => <span className="text-sm font-medium text-foreground">{q.name}</span> },
    { key: 'period', header: 'Quota Period', cell: (q) => <span className="font-mono text-[13px] text-foreground">{q.period}</span> },
    {
      key: 'type',
      header: 'Type',
      cell: (q) => (
        <Badge
          variant="outline"
          className={cn('font-normal', q.type === 'Plan' ? 'text-muted-foreground' : 'border-primary/20 bg-primary/10 text-primary')}
        >
          {q.type}
        </Badge>
      ),
    },
    { key: 'assignName', header: 'Name', cell: (q) => <span className="block max-w-[180px] truncate text-sm text-muted-foreground">{q.assignmentName ?? '—'}</span> },
    { key: 'person', header: 'Person Name', cell: (q) => <span className="block max-w-[180px] truncate text-sm text-foreground">{q.personName ?? '—'}</span> },
    { key: 'value', header: 'Year Value', align: 'right', cell: (q) => <span className="font-mono text-[13px] tabular-nums text-foreground">{num(q.yearValue)}</span> },
    { key: 'unit', header: 'Unit Type', cell: (q) => <span className="text-sm text-muted-foreground">{q.unitType}</span> },
    { key: 'group', header: 'Business Group', cell: (q) => <span className="block max-w-[160px] truncate text-sm text-muted-foreground">{q.businessGroup ?? '—'}</span> },
  ]

  return (
    <div data-test-id="quotas-page">
      <PageHeader
        eyebrow="Plan Design"
        title="Quotas"
        subtitle="The targets every payout is measured against — attached at plan, position or person level, effective-dated, and broken down across the year."
        meta={`${QUOTAS_TOTAL.toLocaleString()} quotas`}
      />
      <ListToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search Quota Name or Assignment…"
        onCreate={() => setCreateOpen(true)}
        extra={
          <>
            <Select value={classification} onValueChange={setClassification}>
              <SelectTrigger className="h-9 w-[190px]" data-test-id="quota-classification">
                <SelectValue placeholder="Quota Classification" />
              </SelectTrigger>
              <SelectContent>
                {CLASSIFICATIONS.map((c) => (
                  <SelectItem key={c} value={c}>{c === 'All' ? 'Quota Classification' : c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="ghost" size="sm" className="h-9 text-primary" onClick={() => setShowFilter((v) => !v)} data-test-id="quota-add-filter">
              <Plus className="size-4" />
              Add Filter
            </Button>
            <Button variant="ghost" size="sm" className="h-9 text-muted-foreground" onClick={handleReset} data-test-id="quota-reset">
              <X className="size-4" />
              Reset
            </Button>
          </>
        }
      />
      <CreateRecordDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Create Quota"
        description="Define the target, its classification, unit type and period."
        fields={QUOTA_FIELDS}
        onSubmit={handleCreate}
        testId="create-quota-dialog"
      />
      {showFilter ? (
        <div className="mb-4 rounded-md border border-dashed border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground" data-test-id="quota-filter-hint">
          Add attribute filters on Type, Person, Business Group, or Year Value to narrow the list.
        </div>
      ) : null}
      <Panel>
        <DataTable
          testId="quotas-table"
          columns={columns}
          rows={rows}
          rowId={(q) => q.id}
          loading={loading}
          onRowClick={(q) => setSelected(q)}
          empty={<EmptyState icon={Target} title="No quotas match" description="Adjust your search or classification filter." />}
        />
      </Panel>

      <Sheet open={selected != null} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent className="w-full gap-0 overflow-auto p-0 sm:!max-w-[1120px]" data-test-id="quota-detail-sheet">
          {selected ? (
            <>
              <SheetHeader className="border-b border-border px-6 py-4">
                <SheetTitle className="flex items-center gap-2 font-heading text-2xl font-normal">
                  {selected.name}
                  <span className="text-base text-muted-foreground">({selected.type})</span>
                </SheetTitle>
              </SheetHeader>

              <div className="space-y-5 bg-muted/50 px-6 py-6">
                <DetailSection title="Quota Details" icon={<FileText className="size-4" />}>
                  <DetailField label="Name" value={selected.name} />
                  <DetailField label="Quota Period" value={<span className="font-mono">{selected.period}</span>} />
                  <DetailField label="Value" value={<span className="font-mono tabular-nums">{num(selected.yearValue)}</span>} />
                  <DetailField label="Classification" value={selected.classification} />
                  <DetailField label="Unit Type" value={selected.unitType} />
                  <DetailField label="Description" value={selected.description ?? '—'} />
                  <DetailField label="Tags" value="—" />
                </DetailSection>

                <DetailSection title={`${selected.type} Details · Version Info`} icon={<Clock className="size-4" />}>
                  <DetailField label="Effective Start" value={selected.effectiveStart} />
                  <DetailField label="Effective End" value={selected.effectiveEnd} />
                  <DetailField label="Description" value="—" />
                </DetailSection>

                <DetailSection title="Assignment" icon={<LayoutList className="size-4" />}>
                  <DetailField label="Name" value={selected.assignmentName ?? `(${selected.type}) Default`} />
                  <DetailField label="Type" value={selected.type} />
                  <DetailField label="Unit Type" value={selected.unitType} />
                  <DetailField label="Person Name" value={selected.personName ?? '—'} />
                </DetailSection>

                <div data-test-id="quota-breakdown-section">
                  <QuotaBreakdownCard quota={selected} />
                </div>
              </div>

              <div className="sticky bottom-0 flex justify-end border-t border-border bg-card px-6 py-3">
                <Button onClick={() => setSelected(null)} data-test-id="quota-detail-close">Close</Button>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  )
}
