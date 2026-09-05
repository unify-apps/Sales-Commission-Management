import { useState } from 'react'
import { Ban, Flag, Inbox, ShieldCheck, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { useData } from '@/lib/data'
import {
  ORDERS_STAGING,
  ORDERS_PROCESSED,
  ORDERS_STAGING_TOTAL,
  ORDERS_PROCESSED_TOTAL,
  VALIDATION_RULES,
  type Order,
  type ValidationRule,
} from '@/data/orders-seed'
import { formatMoney } from '@/lib/format'
import { PageHeader } from '@/components/org/page-header'
import { ListToolbar } from '@/components/org/list-toolbar'
import { Panel } from '@/components/org/panel'
import { DataTable, type Column } from '@/components/org/data-table'
import { EmptyState } from '@/components/org/empty-state'
import { ListPagination } from '@/components/org/pagination'
import { OrderStatusChip } from '@/components/org/run-status'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
import { DetailField, DetailSection } from '@/components/org/panel'
import { CreateRecordDialog, type CreateField, type CreateValues } from '@/components/org/create-record-dialog'
import { usePlanRecordsStore } from '@/lib/store'
import { cn } from '@/lib/utils'

const TABS = ['staging', 'processed', 'rules'] as const
type Tab = (typeof TABS)[number]

const STATUS_FILTER = ['All', 'Validated', 'New', 'Blocked', 'Needs Review'] as const

const ORDER_FIELDS: CreateField[] = [
  { name: 'orderCode', label: 'Order Code', required: true, placeholder: '0068Z00001abcdEQAX' },
  { name: 'itemCode', label: 'Item Code', required: true, placeholder: 'ITEM-0001' },
  { name: 'amount', label: 'Amount', kind: 'number', required: true, placeholder: '42000' },
  { name: 'currency', label: 'Currency', kind: 'select', required: true, options: ['USD', 'EUR', 'GBP'] },
  { name: 'assignedTo', label: 'Assigned To', required: true, placeholder: 'Marcus Lin' },
  { name: 'batch', label: 'Batch', placeholder: 'FEB-2026' },
]

function orderColumns(): Column<Order>[] {
  return [
    { key: 'status', header: 'Status', width: '15%', cell: (o) => <OrderStatusChip status={o.status} /> },
    { key: 'code', header: 'Order Code', cell: (o) => <span className="font-mono text-[12px] text-foreground">{o.orderCode}</span> },
    { key: 'item', header: 'Item Code', cell: (o) => <span className="font-mono text-[12px] text-muted-foreground">{o.itemCode}</span> },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right',
      cell: (o) => <span className="font-mono text-[13px] tabular-nums text-foreground">{formatMoney(o.amount, o.currency)}</span>,
    },
    { key: 'assigned', header: 'Assigned To', cell: (o) => <span className="text-sm text-foreground">{o.assignedTo}</span> },
    { key: 'batch', header: 'Batch', cell: (o) => <span className="text-sm text-muted-foreground">{o.batch}</span> },
    { key: 'incentive', header: 'Incentive Date', align: 'right', cell: (o) => <span className="font-mono text-[12px] text-muted-foreground">{o.incentiveDate}</span> },
  ]
}

function OrderDetailSheet({ order, onClose }: { order: Order | null; onClose: () => void }) {
  return (
    <Sheet open={order != null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full gap-0 overflow-auto p-0 sm:!max-w-2xl" data-test-id="order-detail-sheet">
        {order ? (
          <>
            <SheetHeader className="border-b border-border px-6 py-4">
              <span className="text-sm text-muted-foreground">Order</span>
              <SheetTitle className="flex items-center gap-3 font-heading text-2xl font-normal">
                {order.orderCode}
                <OrderStatusChip status={order.status} />
              </SheetTitle>
            </SheetHeader>
            <div className="space-y-5 bg-muted/50 px-6 py-6">
              {order.blockingRule ? (
                <div
                  className={cn(
                    'flex items-start gap-2 rounded-md border px-4 py-3 text-sm',
                    order.status === 'Blocked'
                      ? 'border-destructive/30 bg-destructive/10 text-destructive'
                      : 'border-[#e8c894] bg-[#fdf6ec] text-[#a8681a]',
                  )}
                  data-test-id="order-rule-banner"
                >
                  {order.status === 'Blocked' ? <Ban className="mt-0.5 size-4 shrink-0" /> : <Flag className="mt-0.5 size-4 shrink-0" />}
                  <span>
                    <span className="font-medium">{order.status === 'Blocked' ? 'Blocked by rule: ' : 'Flagged for review: '}</span>
                    {order.blockingRule}
                  </span>
                </div>
              ) : null}
              <DetailSection title="Order Details">
                <DetailField label="Order Code" value={<span className="font-mono text-[13px]">{order.orderCode}</span>} />
                <DetailField label="Item Code" value={<span className="font-mono text-[13px]">{order.itemCode}</span>} />
                <DetailField label="Status" value={order.status} />
                <DetailField label="Status Date" value={order.statusDate} />
                <DetailField label="Amount" value={<span className="font-mono tabular-nums">{formatMoney(order.amount, order.currency)}</span>} />
                <DetailField label="Assigned To" value={order.assignedTo} />
                <DetailField label="Batch" value={order.batch} />
                <DetailField label="Incentive Date" value={order.incentiveDate} />
              </DetailSection>
            </div>
            <div className="sticky bottom-0 flex justify-end gap-2 border-t border-border bg-card px-6 py-3">
              <Button variant="outline" onClick={() => toast('Change Assignment')} data-test-id="order-reassign">Change Assignment</Button>
              <Button onClick={onClose} data-test-id="order-close">Close</Button>
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}

function StagingTab() {
  const { data, loading } = useData<Order[]>('orders-staging', 'seed', ORDERS_STAGING)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('All')
  const [selected, setSelected] = useState<Order | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const createdOrders = usePlanRecordsStore((s) => s.orders)
  const addOrder = usePlanRecordsStore((s) => s.addOrder)

  function handleCreate(values: CreateValues) {
    const today = new Date().toISOString().slice(0, 10)
    const order: Order = {
      id: `order-${Date.now()}`,
      status: 'New',
      statusDate: today,
      orderCode: values.orderCode.trim(),
      itemCode: values.itemCode.trim(),
      amount: Number(values.amount) || 0,
      currency: values.currency,
      assignedTo: values.assignedTo.trim(),
      batch: values.batch.trim() || 'FEB-2026',
      incentiveDate: today,
      lifecycle: 'staging',
    }
    addOrder(order)
    toast('Order created', { description: `${order.orderCode} added to Staging.` })
  }

  const rows = [...createdOrders, ...(data ?? [])]
    .filter((o) => (status === 'All' ? true : o.status === status))
    .filter((o) => `${o.orderCode} ${o.itemCode} ${o.assignedTo}`.toLowerCase().includes(search.toLowerCase()))

  const columns = orderColumns()

  return (
    <>
      <ListToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search Order Code, Item Code, Assignment…"
        onCreate={() => setCreateOpen(true)}
        extra={
          <>
            <Select value="FEB-2026 (Open)">
              <SelectTrigger className="h-9 w-[170px]" data-test-id="orders-period">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="FEB-2026 (Open)">FEB-2026 (Open)</SelectItem>
                <SelectItem value="JAN-2026 (Closed)">JAN-2026 (Closed)</SelectItem>
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-9 w-[150px]" data-test-id="orders-status-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_FILTER.map((s) => (
                  <SelectItem key={s} value={s}>{s === 'All' ? 'Status: All' : s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        }
      />
      <Panel>
        <DataTable<Order>
          testId="staging-table"
          columns={columns}
          rows={rows}
          rowId={(o) => o.id}
          loading={loading}
          onRowClick={(o) => setSelected(o)}
          empty={<EmptyState icon={Inbox} title="No staged orders" description="No orders match this period, status, or search." />}
        />
        {!loading && rows.length > 0 ? (
          <ListPagination showingFrom={1} showingTo={Math.min(50, rows.length)} total={ORDERS_STAGING_TOTAL} pages={5} testId="staging-pagination" />
        ) : null}
      </Panel>
      <CreateRecordDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Create Order"
        description="Add a staged order by hand. It enters as New and runs through validation."
        fields={ORDER_FIELDS}
        submitLabel="Create"
        onSubmit={handleCreate}
        testId="create-order-dialog"
      />
      <OrderDetailSheet order={selected} onClose={() => setSelected(null)} />
    </>
  )
}

function ProcessedTab() {
  const { data, loading } = useData<Order[]>('orders-processed', 'seed', ORDERS_PROCESSED)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Order | null>(null)

  const rows = (data ?? []).filter((o) =>
    `${o.orderCode} ${o.itemCode} ${o.assignedTo}`.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <>
      <ListToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search processed orders…"
        showUpload={false}
      />
      <Panel>
        <DataTable<Order>
          testId="processed-table"
          columns={orderColumns()}
          rows={rows}
          rowId={(o) => o.id}
          loading={loading}
          onRowClick={(o) => setSelected(o)}
          empty={<EmptyState icon={Inbox} title="No processed orders" description="Orders appear here once incentives are calculated." />}
        />
        {!loading && rows.length > 0 ? (
          <ListPagination showingFrom={1} showingTo={Math.min(50, rows.length)} total={ORDERS_PROCESSED_TOTAL} pages={5} testId="processed-pagination" />
        ) : null}
      </Panel>
      <OrderDetailSheet order={selected} onClose={() => setSelected(null)} />
    </>
  )
}

function RulesTab() {
  const { data, loading } = useData<ValidationRule[]>('orders-validation-rules', 'seed', VALIDATION_RULES)
  const [search, setSearch] = useState('')

  const rows = (data ?? []).filter((r) => `${r.name} ${r.checks}`.toLowerCase().includes(search.toLowerCase()))

  const columns: Column<ValidationRule>[] = [
    { key: 'name', header: 'Rule Name', width: '20%', cell: (r) => <span className="text-sm font-medium text-foreground">{r.name}</span> },
    { key: 'checks', header: 'What it checks', cell: (r) => <span className="text-sm text-muted-foreground">{r.checks}</span> },
    {
      key: 'action',
      header: 'On failure',
      cell: (r) =>
        r.action === 'Block' ? (
          <Badge variant="outline" className="gap-1 border-destructive/30 bg-destructive/10 font-normal text-destructive">
            <Ban className="size-3" /> Block
          </Badge>
        ) : (
          <Badge variant="outline" className="gap-1 border-[#e8c894] bg-[#fdf6ec] font-normal text-[#a8681a]">
            <Flag className="size-3" /> Flag for review
          </Badge>
        ),
    },
    { key: 'error', header: 'Error ID', cell: (r) => <span className="font-mono text-[12px] text-muted-foreground">{r.errorId}</span> },
    { key: 'start', header: 'Active Since', align: 'right', cell: (r) => <span className="font-mono text-[12px] text-muted-foreground">{r.activeStart}</span> },
  ]

  return (
    <>
      <ListToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search validation rules…"
        showUpload={false}
        onCreate={() => toast('New Rule', { description: 'Opens the 3-step builder: scope → test → message.' })}
        createLabel="New Rule"
      />
      <Panel>
        <DataTable<ValidationRule>
          testId="rules-table"
          columns={columns}
          rows={rows}
          rowId={(r) => r.id}
          loading={loading}
          empty={
            <EmptyState
              icon={ShieldCheck}
              title="No validation rules"
              description="Add a rule to police what enters Staging. New Rule opens a three-step builder."
              action={<Button size="sm" onClick={() => toast('New Rule')}><Plus className="size-4" />New Rule</Button>}
            />
          }
        />
      </Panel>
    </>
  )
}

export default function Orders() {
  const [tab, setTab] = useState<Tab>('staging')

  return (
    <div data-test-id="orders-page">
      <PageHeader
        eyebrow="Orders"
        title="Orders"
        subtitle="Staging and Processed orders with the validation rules that govern them — all in one place, so a blocked order shows which rule stopped it."
        meta={`${ORDERS_STAGING_TOTAL.toLocaleString()} staged`}
      />
      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)} className="mb-4">
        <TabsList data-test-id="orders-tabs">
          <TabsTrigger value="staging" data-test-id="tab-staging">Staging</TabsTrigger>
          <TabsTrigger value="processed" data-test-id="tab-processed">Processed</TabsTrigger>
          <TabsTrigger value="rules" data-test-id="tab-rules">Rules</TabsTrigger>
        </TabsList>
      </Tabs>

      {tab === 'staging' ? <StagingTab /> : tab === 'processed' ? <ProcessedTab /> : <RulesTab />}
    </div>
  )
}
