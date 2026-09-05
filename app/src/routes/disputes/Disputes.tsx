import { useState } from 'react'
import { Plus, ShieldAlert } from 'lucide-react'
import { useDisputeStore, DISPUTE_STATUSES, type Dispute, type DisputeStatus } from '@/lib/store'
import { formatMoney, formatDate } from '@/lib/format'
import { PageHeader } from '@/components/org/page-header'
import { ListToolbar } from '@/components/org/list-toolbar'
import { Panel } from '@/components/org/panel'
import { DataTable, type Column } from '@/components/org/data-table'
import { EmptyState } from '@/components/org/empty-state'
import { DisputeStatusChip, DisputePriorityChip } from '@/components/org/dispute-chips'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { NewDisputeSheet } from './NewDisputeSheet'
import { DisputeDetailSheet } from './DisputeDetailSheet'

const STATUS_FILTER = ['All', ...DISPUTE_STATUSES] as const

function Kpi({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <Panel padded className="flex-1" data-test-id={`kpi-${label.toLowerCase().replace(/\s+/g, '-')}`}>
      <div className="font-mono text-[11px] uppercase tracking-[0.09em] text-muted-foreground">{label}</div>
      <div className={`mt-1 font-heading text-3xl ${tone ?? 'text-foreground'}`}>{value}</div>
    </Panel>
  )
}

export default function Disputes() {
  // Select raw state; derive below (zustand v5 selectors must be stable).
  const disputes = useDisputeStore((s) => s.disputes)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<string>('All')
  const [createOpen, setCreateOpen] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const rows = disputes
    .filter((d) => (status === 'All' ? true : d.status === status))
    .filter((d) => `${d.reference} ${d.title} ${d.raisedBy} ${d.owner}`.toLowerCase().includes(search.toLowerCase()))

  const selected = selectedId ? disputes.find((d) => d.id === selectedId) ?? null : null

  const openCount = disputes.filter((d) => d.status === 'Open').length
  const reviewCount = disputes.filter((d) => d.status === 'In Review').length
  const resolvedCount = disputes.filter((d) => d.status === 'Resolved').length

  const columns: Column<Dispute>[] = [
    { key: 'ref', header: 'Reference', cell: (d) => <span className="font-mono text-[13px] text-foreground">{d.reference}</span> },
    {
      key: 'title',
      header: 'Dispute',
      width: '28%',
      cell: (d) => (
        <div className="min-w-0">
          <div className="text-sm font-medium text-foreground">{d.title}</div>
          <div className="font-mono text-[11px] text-muted-foreground">{d.flaggedValue || '—'}</div>
        </div>
      ),
    },
    { key: 'type', header: 'Type', cell: (d) => <Badge variant="secondary" className="font-normal">{d.type}</Badge> },
    { key: 'priority', header: 'Priority', cell: (d) => <DisputePriorityChip priority={d.priority} /> },
    { key: 'raised', header: 'Raised By', cell: (d) => <span className="text-sm text-muted-foreground">{d.raisedBy}</span> },
    { key: 'owner', header: 'Owner', cell: (d) => <span className="text-sm text-foreground">{d.owner}</span> },
    { key: 'amount', header: 'Amount', align: 'right', cell: (d) => <span className="font-mono text-[13px] tabular-nums text-muted-foreground">{d.disputedAmount > 0 ? formatMoney(d.disputedAmount, d.currency) : '—'}</span> },
    { key: 'updated', header: 'Updated', cell: (d) => <span className="font-mono text-[12px] text-muted-foreground">{formatDate(d.updatedAt)}</span> },
    { key: 'status', header: 'Status', align: 'right', cell: (d) => <DisputeStatusChip status={d.status} /> },
  ]

  return (
    <div data-test-id="disputes-page">
      <PageHeader
        eyebrow="Dispute Management"
        title="Disputes"
        subtitle="A rep flags a number, it routes to an owner, and it's tracked to resolution."
        actions={
          <Button size="sm" className="h-9" onClick={() => setCreateOpen(true)} data-test-id="raise-dispute">
            <Plus className="size-4" />
            Raise Dispute
          </Button>
        }
      />

      <div className="mb-5 flex flex-col gap-4 sm:flex-row" data-test-id="dispute-kpis">
        <Kpi label="Open" value={openCount} tone="text-[#2f5fa8]" />
        <Kpi label="In Review" value={reviewCount} tone="text-[#a8681a]" />
        <Kpi label="Resolved" value={resolvedCount} tone="text-primary" />
        <Kpi label="Total" value={disputes.length} />
      </div>

      <ListToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search reference, title, person…"
        showUpload={false}
        extra={
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="h-9 w-[150px]" data-test-id="dispute-status-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_FILTER.map((s) => (
                <SelectItem key={s} value={s}>{s === 'All' ? 'Status: All' : (s as DisputeStatus)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      <Panel>
        <DataTable<Dispute>
          testId="disputes-table"
          columns={columns}
          rows={rows}
          rowId={(d) => d.id}
          onRowClick={(d) => setSelectedId(d.id)}
          empty={
            <EmptyState
              icon={ShieldAlert}
              title="No disputes"
              description="Nothing matches this filter. Raise a dispute to flag a number for review."
              action={<Button size="sm" onClick={() => setCreateOpen(true)}><Plus className="size-4" />Raise Dispute</Button>}
            />
          }
        />
      </Panel>

      <NewDisputeSheet open={createOpen} onOpenChange={setCreateOpen} />
      <DisputeDetailSheet dispute={selected} onClose={() => setSelectedId(null)} />
    </div>
  )
}
