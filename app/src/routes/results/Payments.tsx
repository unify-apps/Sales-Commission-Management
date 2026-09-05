import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Wallet, Send, Plus, Lock, Calculator, ArrowUpRight, FileText, Link2 } from 'lucide-react'
import { toast } from 'sonner'
import { useData } from '@/lib/data'
import { PAYMENTS, type PaymentRow, type PaymentTab } from '@/data/results-seed'
import { formatMoney } from '@/lib/format'
import { PageHeader } from '@/components/org/page-header'
import { ListToolbar } from '@/components/org/list-toolbar'
import { Panel, DetailField, DetailSection } from '@/components/org/panel'
import { DataTable, type Column } from '@/components/org/data-table'
import { EmptyState } from '@/components/org/empty-state'
import { ResultStatusChip } from '@/components/org/run-status'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'

const TABS: Array<{ id: PaymentTab; label: string }> = [
  { id: 'payments', label: 'Payments' },
  { id: 'balances', label: 'Balances' },
  { id: 'manual', label: 'Manual Payments' },
]

const ACTIONS = [
  { label: 'Release Payments', icon: Send, primary: true },
  { label: 'Add Manual Payment', icon: Plus, primary: false },
  { label: 'Finalize Period', icon: Lock, primary: false },
  { label: 'Calculate Balances', icon: Calculator, primary: false },
] as const

export default function Payments() {
  const { data, loading } = useData<PaymentRow[]>('payments-rows', 'seed', PAYMENTS)
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<PaymentTab>('payments')
  const [selected, setSelected] = useState<PaymentRow | null>(null)
  const navigate = useNavigate()

  const rows = (data ?? [])
    .filter((p) => p.tab === tab)
    .filter((p) => `${p.person} ${p.orderCode} ${p.paymentType}`.toLowerCase().includes(search.toLowerCase()))

  const columns: Column<PaymentRow>[] = [
    { key: 'status', header: 'Status', width: '12%', cell: (p) => <ResultStatusChip status={p.status} /> },
    { key: 'type', header: 'Payment Type', cell: (p) => <span className="text-sm text-foreground">{p.paymentType}</span> },
    { key: 'person', header: 'Person', cell: (p) => <span className="text-sm text-foreground">{p.person}</span> },
    { key: 'order', header: 'Order Code', cell: (p) => <span className="font-mono text-[12px] text-muted-foreground">{p.orderCode}</span> },
    { key: 'amount', header: 'Payment', align: 'right', cell: (p) => <span className="font-mono text-[13px] tabular-nums text-foreground">{formatMoney(p.amount, p.currency)}</span> },
    {
      key: 'traced',
      header: 'Traced to Results',
      cell: (p) =>
        p.tracedResultId ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              navigate(`/results/results?highlight=${p.tracedResultId}`)
            }}
            className="inline-flex items-center gap-1 rounded-md border border-primary/20 bg-primary/5 px-2 py-1 text-[13px] text-primary transition-colors hover:bg-primary/10"
            data-test-id={`traced-${p.id}`}
          >
            {p.tracedResultName}
            <ArrowUpRight className="size-3.5" />
          </button>
        ) : (
          <span className="text-muted-foreground/50">—</span>
        ),
    },
  ]

  return (
    <div data-test-id="payments-page">
      <PageHeader
        eyebrow="Results"
        title="Payments"
        subtitle="The combined, payable record after commissions, bonuses and draw recovery are netted together — one layer downstream of Results."
      />

      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card p-2" data-test-id="payments-action-bar">
        {ACTIONS.map((a) => {
          const Icon = a.icon
          return (
            <Button
              key={a.label}
              variant={a.primary ? 'default' : 'outline'}
              size="sm"
              className="h-9"
              onClick={() => toast(a.label, { description: 'This process will be added to the Queue.' })}
              data-test-id={`payment-action-${a.label.toLowerCase().replace(/\s+/g, '-')}`}
            >
              <Icon className="size-4" />
              {a.label}
            </Button>
          )
        })}
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as PaymentTab)} className="mb-4">
        <TabsList data-test-id="payments-tabs">
          {TABS.map((t) => (
            <TabsTrigger key={t.id} value={t.id} data-test-id={`payments-tab-${t.id}`}>{t.label}</TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <ListToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search person, order code, payment type…"
        showUpload={false}
      />
      <Panel>
        <DataTable<PaymentRow>
          testId="payments-table"
          columns={columns}
          rows={rows}
          rowId={(p) => p.id}
          loading={loading}
          onRowClick={(p) => setSelected(p)}
          empty={<EmptyState icon={Wallet} title="No payments" description="No records in this tab match your search." />}
        />
      </Panel>

      <Sheet open={selected != null} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent className="w-full gap-0 overflow-auto p-0 sm:!max-w-2xl" data-test-id="payment-detail-sheet">
          {selected ? (
            <>
              <SheetHeader className="border-b border-border px-6 py-4">
                <span className="text-sm text-muted-foreground">Payment</span>
                <SheetTitle className="flex items-center gap-3 font-heading text-2xl font-normal">
                  {selected.paymentType}
                  <ResultStatusChip status={selected.status} />
                </SheetTitle>
              </SheetHeader>
              <div className="space-y-5 bg-muted/50 px-6 py-6">
                <DetailSection title="Payment Details" icon={<FileText className="size-4" />}>
                  <DetailField label="Payment Type" value={selected.paymentType} />
                  <DetailField label="Status" value={<ResultStatusChip status={selected.status} />} />
                  <DetailField label="Person" value={selected.person} />
                  <DetailField label="Amount" value={<span className="font-mono tabular-nums">{formatMoney(selected.amount, selected.currency)}</span>} />
                  <DetailField label="Currency" value={selected.currency} />
                  <DetailField label="Order Code" value={<span className="font-mono text-[13px]">{selected.orderCode}</span>} />
                </DetailSection>
                <DetailSection title="Traced to Results" icon={<Link2 className="size-4" />}>
                  <DetailField
                    label="Result"
                    value={
                      selected.tracedResultId ? (
                        <button
                          type="button"
                          onClick={() => navigate(`/results/results?highlight=${selected.tracedResultId}`)}
                          className="inline-flex items-center gap-1 rounded-md border border-primary/20 bg-primary/5 px-2 py-1 text-[13px] text-primary transition-colors hover:bg-primary/10"
                          data-test-id="payment-traced-link"
                        >
                          {selected.tracedResultName}
                          <ArrowUpRight className="size-3.5" />
                        </button>
                      ) : (
                        <span className="text-muted-foreground/50">—</span>
                      )
                    }
                  />
                </DetailSection>
              </div>
              <div className="sticky bottom-0 flex justify-end gap-2 border-t border-border bg-card px-6 py-3">
                <Button onClick={() => setSelected(null)} data-test-id="payment-detail-close">Close</Button>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  )
}
