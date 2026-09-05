import { useState } from 'react'
import { Play, Pause, Lock, Activity } from 'lucide-react'
import { toast } from 'sonner'
import { useData } from '@/lib/data'
import { RUNS, RUNS_TOTAL, type Run, type RunType } from '@/data/orders-seed'
import { PageHeader } from '@/components/org/page-header'
import { ListToolbar } from '@/components/org/list-toolbar'
import { Panel } from '@/components/org/panel'
import { DataTable, type Column } from '@/components/org/data-table'
import { EmptyState } from '@/components/org/empty-state'
import { ListPagination } from '@/components/org/pagination'
import { StateChip } from '@/components/org/run-status'
import { DetailField, DetailSection } from '@/components/org/panel'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { cn } from '@/lib/utils'

const TYPE_FILTER = ['All', 'Batch', 'Release', 'Notification', 'Pause'] as const

const ACTIONS = [
  { label: 'Start a Run', icon: Play, primary: true },
  { label: 'Add Pause', icon: Pause, primary: false },
  { label: 'Finalize Period', icon: Lock, primary: false },
] as const

export default function Runs() {
  const { data, loading } = useData<Run[]>('orders-runs', 'seed', RUNS)
  const [search, setSearch] = useState('')
  const [type, setType] = useState<string>('All')
  const [selected, setSelected] = useState<Run | null>(null)

  const rows = (data ?? [])
    .filter((r) => (type === 'All' ? true : r.type === (type as RunType)))
    .filter((r) => `${r.name} ${r.startedBy}`.toLowerCase().includes(search.toLowerCase()))

  const columns: Column<Run>[] = [
    { key: 'state', header: 'Status', width: '14%', cell: (r) => <StateChip state={r.state} label={r.stateLabel} /> },
    { key: 'type', header: 'Type', cell: (r) => <Badge variant="secondary" className="font-normal">{r.type}</Badge> },
    { key: 'name', header: 'Name', width: '26%', cell: (r) => <span className="text-sm font-medium text-foreground">{r.name}</span> },
    { key: 'by', header: 'Started By', cell: (r) => <span className="text-sm text-muted-foreground">{r.startedBy}</span> },
    { key: 'started', header: 'Started', cell: (r) => <span className="font-mono text-[12px] text-muted-foreground">{r.started}</span> },
    {
      key: 'results',
      header: 'Results',
      align: 'right',
      cell: (r) =>
        r.processed == null ? (
          <span className="text-muted-foreground/50">—</span>
        ) : (
          <span className="font-mono text-[12px] tabular-nums">
            <span className="text-foreground">{r.processed.toLocaleString()}</span>
            {r.failed ? <span className="text-destructive"> · {r.failed} failed</span> : <span className="text-muted-foreground"> processed</span>}
          </span>
        ),
    },
  ]

  return (
    <div data-test-id="runs-page">
      <PageHeader
        eyebrow="Orders"
        title="Runs"
        subtitle="One chronological log of every job — batches, releases, notifications and pauses — whatever state it's in."
        meta={`${RUNS_TOTAL} runs`}
      />

      {/* Persistent action bar */}
      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card p-2" data-test-id="runs-action-bar">
        {ACTIONS.map((a) => {
          const Icon = a.icon
          return (
            <Button
              key={a.label}
              variant={a.primary ? 'default' : 'outline'}
              size="sm"
              className="h-9"
              onClick={() => toast(a.label, { description: `${a.label} triggered.` })}
              data-test-id={`run-action-${a.label.toLowerCase().replace(/\s+/g, '-')}`}
            >
              <Icon className="size-4" />
              {a.label}
            </Button>
          )
        })}
      </div>

      <ListToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search run name or who started it…"
        showUpload={false}
        extra={
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="h-9 w-[160px]" data-test-id="runs-type-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TYPE_FILTER.map((t) => (
                <SelectItem key={t} value={t}>{t === 'All' ? 'Type: All' : t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />
      <Panel>
        <DataTable<Run>
          testId="runs-table"
          columns={columns}
          rows={rows}
          rowId={(r) => r.id}
          loading={loading}
          onRowClick={(r) => setSelected(r)}
          empty={<EmptyState icon={Activity} title="No runs match" description="Adjust the type filter or search to see jobs." />}
        />
        {!loading && rows.length > 0 ? (
          <ListPagination showingFrom={1} showingTo={rows.length} total={RUNS_TOTAL} pages={5} testId="runs-pagination" />
        ) : null}
      </Panel>

      <Sheet open={selected != null} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent className="w-full gap-0 overflow-auto p-0 sm:!max-w-2xl" data-test-id="run-detail-sheet">
          {selected ? (
            <>
              <SheetHeader className="border-b border-border px-6 py-4">
                <span className="text-sm text-muted-foreground">Run · {selected.type}</span>
                <SheetTitle className="flex items-center gap-3 font-heading text-2xl font-normal">
                  {selected.name}
                  <StateChip state={selected.state} label={selected.stateLabel} />
                </SheetTitle>
              </SheetHeader>
              <div className="space-y-8 px-6 py-6">
                <DetailSection title="Run Details">
                  <DetailField label="Type" value={selected.type} />
                  <DetailField label="Status" value={selected.stateLabel} />
                  <DetailField label="Started By" value={selected.startedBy} />
                  <DetailField label="Started" value={<span className="font-mono text-[13px]">{selected.started}</span>} />
                  <DetailField
                    label="Results Processed"
                    value={selected.processed == null ? '—' : <span className="font-mono tabular-nums">{selected.processed.toLocaleString()}</span>}
                  />
                  <DetailField
                    label="Results Failed"
                    value={
                      selected.failed == null ? (
                        '—'
                      ) : (
                        <span className={cn('font-mono tabular-nums', selected.failed > 0 ? 'text-destructive' : 'text-foreground')}>
                          {selected.failed.toLocaleString()}
                        </span>
                      )
                    }
                  />
                </DetailSection>
                {selected.state === 'in_progress' ? (
                  <div className="rounded-md border border-[#cfe0f5] bg-[#e6eef9] px-4 py-3 text-sm text-[#2f5fa8]" data-test-id="run-live-note">
                    This job is running now — the log updates as it progresses.
                  </div>
                ) : null}
              </div>
              <div className="sticky bottom-0 flex justify-end gap-2 border-t border-border bg-card px-6 py-3">
                {selected.state === 'in_progress' ? (
                  <Button variant="outline" onClick={() => toast('Stop run')} data-test-id="run-stop">Stop</Button>
                ) : null}
                <Button onClick={() => setSelected(null)} data-test-id="run-close">Close</Button>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  )
}
