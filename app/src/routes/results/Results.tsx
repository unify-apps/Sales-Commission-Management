import { useState } from 'react'
import { Coins, ChevronDown, FileText, Link2 } from 'lucide-react'
import { toast } from 'sonner'
import { useData } from '@/lib/data'
import { RESULTS, SAVED_VIEWS, type ResultRow, type ResultType } from '@/data/results-seed'
import { formatMoney } from '@/lib/format'
import { PageHeader } from '@/components/org/page-header'
import { ListToolbar } from '@/components/org/list-toolbar'
import { Panel, DetailField, DetailSection } from '@/components/org/panel'
import { DataTable, type Column } from '@/components/org/data-table'
import { EmptyState } from '@/components/org/empty-state'
import { ResultStatusChip } from '@/components/org/run-status'
import { Badge } from '@/components/ui/badge'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const TYPES: Array<ResultType | 'All'> = ['All', 'Credit', 'Commission', 'Bonus', 'Draw']

export default function Results() {
  const { data, loading } = useData<ResultRow[]>('results-rows', 'seed', RESULTS)
  const [search, setSearch] = useState('')
  const [type, setType] = useState<ResultType | 'All'>('All')
  const [selected, setSelected] = useState<ResultRow | null>(null)

  const allRows = data ?? []
  // Counts derived from the real rows so the chips always match what's in the table.
  const countFor = (t: ResultType | 'All') =>
    t === 'All' ? allRows.length : allRows.filter((r) => r.type === t).length

  const rows = allRows
    .filter((r) => (type === 'All' ? true : r.type === type))
    .filter((r) => `${r.resultName} ${r.person} ${r.orderCode}`.toLowerCase().includes(search.toLowerCase()))

  const columns: Column<ResultRow>[] = [
    { key: 'status', header: 'Status', width: '12%', cell: (r) => <ResultStatusChip status={r.status} /> },
    { key: 'type', header: 'Type', cell: (r) => <Badge variant="secondary" className="font-normal">{r.type}</Badge> },
    { key: 'name', header: 'Result Name', width: '22%', cell: (r) => <span className="text-sm font-medium text-foreground">{r.resultName}</span> },
    { key: 'person', header: 'Person', cell: (r) => <span className="text-sm text-foreground">{r.person}</span> },
    { key: 'amount', header: 'Amount', align: 'right', cell: (r) => <span className="font-mono text-[13px] tabular-nums text-foreground">{formatMoney(r.amount, r.currency)}</span> },
    { key: 'order', header: 'Order Code', cell: (r) => <span className="font-mono text-[12px] text-muted-foreground">{r.orderCode}</span> },
    { key: 'group', header: 'Business Group', cell: (r) => <span className="text-sm text-muted-foreground">{r.businessGroup}</span> },
  ]

  return (
    <div data-test-id="results-page">
      <PageHeader
        eyebrow="Results"
        title="Results"
        subtitle="Credits, Commissions, Bonuses and Draws — the calculation results on the way to a payout — in one table, filtered by type."
        actions={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9" data-test-id="saved-views">
                Saved Views
                <ChevronDown className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Saved Views</DropdownMenuLabel>
              {SAVED_VIEWS.map((v) => (
                <DropdownMenuItem key={v} onClick={() => toast('View applied', { description: v })}>{v}</DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        }
      />

      {/* Type filter chips — counts derived from the loaded rows */}
      <div className="mb-4 flex flex-wrap gap-2" data-test-id="results-type-chips">
        {TYPES.map((t) => {
          const active = type === t
          const count = countFor(t)
          return (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              data-test-id={`type-chip-${t.toLowerCase()}`}
              className={cn(
                'inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors',
                active
                  ? 'border-primary/30 bg-primary/10 text-primary'
                  : 'border-border bg-card text-muted-foreground hover:bg-muted',
              )}
            >
              {t}
              <span className="font-mono text-xs tabular-nums opacity-70">{count.toLocaleString()}</span>
            </button>
          )
        })}
      </div>

      <ListToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search result name, person, order code…"
        showUpload={false}
      />
      <Panel>
        <DataTable<ResultRow>
          testId="results-table"
          columns={columns}
          rows={rows}
          rowId={(r) => r.id}
          loading={loading}
          onRowClick={(r) => setSelected(r)}
          empty={<EmptyState icon={Coins} title="No results match" description="Adjust the type filter or search to see components." />}
        />
      </Panel>

      <Sheet open={selected != null} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent className="w-full gap-0 overflow-auto p-0 sm:!max-w-2xl" data-test-id="result-detail-sheet">
          {selected ? (
            <>
              <SheetHeader className="border-b border-border px-6 py-4">
                <span className="text-sm text-muted-foreground">Result</span>
                <SheetTitle className="flex items-center gap-3 font-heading text-2xl font-normal">
                  {selected.resultName}
                  <ResultStatusChip status={selected.status} />
                </SheetTitle>
              </SheetHeader>
              <div className="space-y-5 bg-muted/50 px-6 py-6">
                <DetailSection title="Result Details" icon={<FileText className="size-4" />}>
                  <DetailField label="Result Name" value={selected.resultName} />
                  <DetailField label="Type" value={<Badge variant="secondary" className="font-normal">{selected.type}</Badge>} />
                  <DetailField label="Status" value={<ResultStatusChip status={selected.status} />} />
                  <DetailField label="Amount" value={<span className="font-mono tabular-nums">{formatMoney(selected.amount, selected.currency)}</span>} />
                  <DetailField label="Person" value={selected.person} />
                  <DetailField label="Business Group" value={selected.businessGroup} />
                </DetailSection>
                <DetailSection title="Source" icon={<Link2 className="size-4" />}>
                  <DetailField label="Order Code" value={<span className="font-mono text-[13px]">{selected.orderCode}</span>} />
                  <DetailField label="Currency" value={selected.currency} />
                </DetailSection>
              </div>
              <div className="sticky bottom-0 flex justify-end gap-2 border-t border-border bg-card px-6 py-3">
                <Button variant="outline" onClick={() => toast('View Order', { description: selected.orderCode })} data-test-id="result-view-order">View Order</Button>
                <Button onClick={() => setSelected(null)} data-test-id="result-detail-close">Close</Button>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  )
}
