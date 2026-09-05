import { Link } from 'react-router-dom'
import { FileDown, MessageSquareWarning, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'
import { useData } from '@/lib/data'
import { STATEMENTS, type Statement } from '@/data/statement-seed'
import { repStatement, sumQuarters } from '@/data/rep'
import { formatMoney, initials } from '@/lib/format'
import { PERIOD_LABEL } from '@/lib/period'
import { PageHeader } from '@/components/org/page-header'
import { Panel } from '@/components/org/panel'
import { Button } from '@/components/ui/button'

const EMPTY_QUARTER = { q1: 0, q2: 0, q3: 0, q4: 0, year: 0 }

function MetaField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5" data-test-id={`rep-meta-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}>
      <span className="font-mono text-[11px] uppercase tracking-[0.09em] text-muted-foreground">{label}</span>
      <span className="text-sm text-foreground">{value}</span>
    </div>
  )
}

function PaymentTile({ sub, label, value, currency }: { sub: string; label: string; value: number; currency: string }) {
  return (
    <div className="flex-1 px-6 py-5" data-test-id={`rep-payment-${label.toLowerCase().replace(/\s+/g, '-')}`}>
      <div className="font-mono text-[11px] uppercase tracking-[0.09em] text-muted-foreground">{sub}</div>
      <div className="mt-1 font-heading text-3xl text-foreground">{formatMoney(value, currency)}</div>
      <div className="mt-0.5 text-sm text-muted-foreground">{label}</div>
    </div>
  )
}

function SummaryTile({ label, value, currency }: { label: string; value: number; currency: string }) {
  return (
    <div className="px-6 py-5" data-test-id={`rep-summary-${label.toLowerCase()}`}>
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="mt-1 font-heading text-2xl text-foreground">{formatMoney(value, currency)}</div>
    </div>
  )
}

export default function RepIncentives() {
  // Seed-backed read so the Data panel sees the flow; the persona resolves the row.
  const { data } = useData<Statement[]>('rep-statements', 'seed', STATEMENTS)
  const fallback = repStatement()
  const statement = (data ?? []).find((s) => s.profileId === fallback.profileId) ?? fallback

  const c = statement.currency
  const ytdCredit = statement.attainment.reduce(
    (acc, q) => acc + sumQuarters(q.quotaRows.find((r) => r.label.includes('Credit'))?.values ?? EMPTY_QUARTER),
    0,
  )
  const totalCommissions = statement.commissions.find((l) => l.emphasis) ?? statement.commissions[0]
  const ytdCommissions = totalCommissions ? sumQuarters(totalCommissions.values) : 0
  const ytdOrders = ytdCredit // credited bookings stand in for order value in this view
  const ytdBonuses = Math.max(0, statement.payments.ytd - ytdCommissions)
  const otePct = statement.ote > 0 ? ((statement.payments.ytd / statement.ote) * 100).toFixed(2) : '0.00'

  return (
    <div data-test-id="rep-incentives-page">
      <PageHeader
        eyebrow="My Statements"
        title="Incentive Statement"
        subtitle={`Your earnings and quota attainment for ${PERIOD_LABEL}.`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" className="h-9" onClick={() => toast('Submit Inquiry', { description: 'Raise a question about this statement.' })} data-test-id="rep-inquiry">
              <MessageSquareWarning className="size-4" />
              Submit Inquiry
            </Button>
            <Button variant="outline" size="sm" className="h-9" onClick={() => toast('Export', { description: 'Preparing the statement PDF.' })} data-test-id="rep-export">
              <FileDown className="size-4" />
              PDF
            </Button>
          </div>
        }
      />

      {/* Identity card */}
      <Panel padded className="mb-5" data-test-id="rep-header-card">
        <div className="flex flex-wrap items-start gap-5">
          <div className="flex size-16 shrink-0 items-center justify-center rounded-lg bg-primary font-heading text-2xl text-primary-foreground">
            {initials(statement.name)}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-heading text-2xl font-normal text-foreground">
              {statement.name} <span className="text-muted-foreground">({statement.employeeId})</span>
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">Position Period · {statement.currentPeriod}</p>
            <div className="mt-4 grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-3 lg:grid-cols-4">
              <MetaField label="Region" value={statement.region} />
              <MetaField label="Manager" value={statement.manager} />
              <MetaField label="Team" value={statement.team} />
              <MetaField label="Currency" value={statement.currency} />
              <MetaField label="Target Incentives" value={formatMoney(statement.targetVariable, c)} />
              <MetaField label="OTE" value={formatMoney(statement.ote, c)} />
              <MetaField label="PAR — Attainment Rate" value={statement.parRate} />
              <MetaField label="PCR — Commission Rate" value={statement.pcrRate} />
            </div>
          </div>
        </div>
      </Panel>

      {/* Payments */}
      <Panel className="mb-5" data-test-id="rep-payments">
        <div className="border-b border-border px-5 py-3">
          <h3 className="font-heading text-xl font-normal text-foreground">Payments</h3>
        </div>
        <div className="flex flex-col divide-y divide-border sm:flex-row sm:divide-x sm:divide-y-0">
          <PaymentTile sub={statement.currentPeriod} label="Current Period" value={statement.payments.current} currency={c} />
          <PaymentTile sub={statement.previousPeriod} label="Previous Period" value={statement.payments.previous} currency={c} />
          <div className="flex-1 px-6 py-5" data-test-id="rep-payment-ytd">
            <div className="font-mono text-[11px] uppercase tracking-[0.09em] text-muted-foreground">{statement.year}</div>
            <div className="mt-1 font-heading text-3xl text-primary">{formatMoney(statement.payments.ytd, c)}</div>
            <div className="mt-0.5 text-sm text-muted-foreground">Year to Date · {otePct}% of OTE</div>
          </div>
        </div>
      </Panel>

      {/* Year-to-Date Summary */}
      <Panel className="mb-5" data-test-id="rep-ytd-summary">
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <h3 className="font-heading text-xl font-normal text-foreground">Year-to-Date Summary</h3>
          <span className="font-mono text-[11px] uppercase tracking-[0.09em] text-muted-foreground">{statement.year}</span>
        </div>
        <div className="grid grid-cols-2 divide-x divide-y divide-border sm:grid-cols-4 sm:divide-y-0">
          <SummaryTile label="Credits" value={ytdCredit} currency={c} />
          <SummaryTile label="Commissions" value={ytdCommissions} currency={c} />
          <SummaryTile label="Orders" value={ytdOrders} currency={c} />
          <SummaryTile label="Bonuses" value={ytdBonuses} currency={c} />
        </div>
      </Panel>

      <div className="flex justify-end">
        <Button asChild variant="ghost" size="sm" data-test-id="rep-view-performance">
          <Link to="/rep/performance">
            View my performance
            <ArrowRight className="size-4" />
          </Link>
        </Button>
      </div>
    </div>
  )
}
