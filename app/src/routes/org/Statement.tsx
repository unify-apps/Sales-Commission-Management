import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { FileDown, FileText, MessageSquareWarning, UserRound } from 'lucide-react'
import { toast } from 'sonner'
import {
  RadialBar,
  RadialBarChart,
  PolarAngleAxis,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { useData } from '@/lib/data'
import { STATEMENTS, makeEmptyStatement, type Statement, type StatementLine, type QuotaAttainment, type QuarterValues } from '@/data/statement-seed'
import { PROFILES, type Profile } from '@/data/org-seed'
import { formatMoney, initials } from '@/lib/format'
import { PageHeader } from '@/components/org/page-header'
import { Panel } from '@/components/org/panel'
import { EmptyState } from '@/components/org/empty-state'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { YEAR_PERIODS, CURRENT_YEAR_PERIOD } from '@/lib/period'

const QUARTER_COLS = ['QTR-1', 'QTR-2', 'QTR-3', 'QTR-4'] as const

function MetaField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="font-mono text-[11px] uppercase tracking-[0.09em] text-muted-foreground">{label}</span>
      <span className="text-sm text-foreground">{value}</span>
    </div>
  )
}

function PaymentTile({ label, sub, value, currency, highlight }: { label: string; sub: string; value: number; currency: string; highlight?: boolean }) {
  return (
    <div className="flex-1 px-6 py-5" data-test-id={`payment-${label.toLowerCase().replace(/\s+/g, '-')}`}>
      <div className="font-mono text-[11px] uppercase tracking-[0.09em] text-muted-foreground">{sub}</div>
      <div className={cn('mt-1 font-heading text-3xl', highlight ? 'text-primary' : 'text-foreground')}>
        {formatMoney(value, currency)}
      </div>
      <div className="mt-0.5 text-sm text-muted-foreground">{label}</div>
    </div>
  )
}

function AttainmentGauge({ quota, currency }: { quota: QuotaAttainment; currency: string }) {
  const pct = Math.round(quota.yearlyPct * 10) / 10
  const clamped = Math.min(pct, 100)
  const over = pct >= 100
  const chartData = [{ name: quota.name, value: clamped, fill: over ? 'var(--chart-2)' : 'var(--chart-1)' }]
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-border bg-card p-5" data-test-id={`gauge-${quota.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}>
      <div className="text-center">
        <div className="font-heading text-lg text-foreground">{quota.name}</div>
        <div className="font-mono text-[11px] uppercase tracking-[0.09em] text-muted-foreground">{quota.basis}</div>
      </div>
      <div className="relative">
        <RadialBarChart
          width={180}
          height={110}
          cx={90}
          cy={100}
          innerRadius={62}
          outerRadius={92}
          startAngle={180}
          endAngle={0}
          barSize={14}
          data={chartData}
        >
          <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
          <RadialBar background={{ fill: 'var(--muted)' }} dataKey="value" cornerRadius={8} />
        </RadialBarChart>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-center">
          <span className={cn('font-heading text-3xl', over ? 'text-[color:var(--chart-2)]' : 'text-primary')}>
            {pct}
            <span className="text-lg">%</span>
          </span>
        </div>
      </div>
      <div className="text-xs text-muted-foreground">Attainment vs. quota · {currency}</div>
    </div>
  )
}

interface QuarterPoint {
  quarter: string
  commissions: number
  attainment: number
}

function EarningsChart({ data, currency }: { data: QuarterPoint[]; currency: string }) {
  return (
    <Panel padded className="mb-5" data-test-id="statement-earnings-chart">
      <div className="mb-4 flex items-baseline justify-between">
        <h3 className="font-heading text-xl font-normal text-foreground">Earnings &amp; Attainment</h3>
        <span className="text-sm text-muted-foreground">Commissions ({currency}) vs. YTD attainment %</span>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 4 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
          <XAxis
            dataKey="quarter"
            tickLine={false}
            axisLine={{ stroke: 'var(--border)' }}
            tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
          />
          <YAxis
            yAxisId="left"
            tickLine={false}
            axisLine={false}
            tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
            tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : `${v}`)}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tickLine={false}
            axisLine={false}
            tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
            tickFormatter={(v: number) => `${v}%`}
          />
          <Tooltip
            cursor={{ fill: 'var(--muted)', opacity: 0.4 }}
            contentStyle={{
              background: 'var(--popover)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              fontSize: 13,
              color: 'var(--foreground)',
            }}
            formatter={(value, name) => {
              const num = Number(value)
              return name === 'Attainment %'
                ? [`${num}%`, name as string]
                : [formatMoney(num, currency), name as string]
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />
          <Bar yAxisId="left" dataKey="commissions" name="Commissions" fill="var(--chart-1)" radius={[6, 6, 0, 0]} barSize={44} />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="attainment"
            name="Attainment %"
            stroke="var(--chart-3)"
            strokeWidth={2}
            dot={{ r: 4, fill: 'var(--chart-3)' }}
            activeDot={{ r: 5 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </Panel>
  )
}

type RowUnit = 'percent' | 'currency' | 'count'

function rowUnit(label: string, tableUnit: 'USD' | 'Qty'): RowUnit {
  if (label.includes('%')) return 'percent'
  if (tableUnit === 'Qty') return 'count'
  return 'currency'
}

const SUM = (vs: QuarterValues) => vs.q1 + vs.q2 + vs.q3 + vs.q4

/**
 * The value shown in the period-total (YEAR) column.
 *  - currency / count rows: sum of the four quarters.
 *  - percent rows: the recomputed full-year attainment (total credit ÷ total quota),
 *    NEVER the sum of quarterly percentages.
 */
function yearTotal(line: StatementLine, unit: RowUnit, credit?: QuarterValues, quota?: QuarterValues): number {
  if (unit !== 'percent') return SUM(line.values)
  if (credit && quota) {
    const q = SUM(quota)
    if (q > 0) return (SUM(credit) / q) * 100
  }
  // Fallback: the last populated quarter's YTD figure (already cumulative).
  return line.values.q4 || line.values.q3 || line.values.q2 || line.values.q1
}

function ReportTable({
  title,
  columnLabel,
  lines,
  year,
  tableUnit,
  moneyFmt,
}: {
  title: string
  columnLabel: string
  lines: StatementLine[]
  year: string
  tableUnit: 'USD' | 'Qty'
  moneyFmt: (v: number) => string
}) {
  const yr = year.replace('YEAR-', '')
  const creditRow = lines.find((l) => l.label.includes('Credit'))?.values
  const quotaRow = lines.find((l) => l.label.includes('Quota'))?.values
  const formatByUnit = (v: number, unit: RowUnit): string => {
    if (unit === 'percent') return `${(Math.round(v * 10) / 10).toFixed(1)}%`
    if (unit === 'count') return v.toLocaleString('en-US')
    return moneyFmt(v)
  }
  return (
    <div data-test-id={`report-${title.toLowerCase()}`}>
      <h3 className="mb-2 text-sm font-semibold text-foreground">{title}</h3>
      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-2.5 text-left font-mono text-[11px] uppercase tracking-[0.09em] text-muted-foreground">
                {columnLabel}
              </th>
              {QUARTER_COLS.map((c) => (
                <th key={c} className="px-4 py-2.5 text-right font-mono text-[11px] uppercase tracking-[0.09em] text-muted-foreground">
                  {c}-{yr}
                </th>
              ))}
              <th className="px-4 py-2.5 text-right font-mono text-[11px] uppercase tracking-[0.09em] text-foreground">
                {year}
              </th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line) => {
              const unit = rowUnit(line.label, tableUnit)
              const yearValue = yearTotal(line, unit, creditRow, quotaRow)
              const cells = [line.values.q1, line.values.q2, line.values.q3, line.values.q4, yearValue]
              return (
                <tr
                  key={line.label}
                  className={cn('border-b border-border last:border-b-0', line.emphasis && 'bg-muted/30')}
                  data-test-id={`report-row-${line.label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
                >
                  <td className={cn('px-4 py-2.5 text-foreground', line.emphasis ? 'font-semibold' : 'text-muted-foreground')}>
                    {line.label}
                  </td>
                  {cells.map((v, i) => (
                    <td
                      key={i}
                      className={cn(
                        'px-4 py-2.5 text-right font-mono text-[13px] tabular-nums',
                        i === 4 ? 'font-medium text-foreground' : 'text-muted-foreground',
                        line.emphasis && 'text-foreground',
                      )}
                    >
                      {formatByUnit(v, unit)}
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function Statement() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data: statements } = useData<Statement[]>('rep-statements', 'seed', STATEMENTS)
  const { data: profiles } = useData<Profile[]>('org-profiles', 'seed', PROFILES)
  const [year, setYear] = useState<string>(CURRENT_YEAR_PERIOD)

  const profile = (profiles ?? []).find((p) => p.id === id)
  const existing = (statements ?? []).find((s) => s.profileId === id)
  const statement =
    existing ?? (profile ? makeEmptyStatement(profile.id, profile.personName, profile.employeeId, profile.paymentCurrency) : undefined)

  if (!statement) {
    return (
      <div data-test-id="statement-missing">
        <EmptyState
          icon={UserRound}
          title="Statement unavailable"
          description="No incentive statement is available for this profile in the selected period."
          action={<Button variant="outline" onClick={() => navigate('/organization/profiles')}>Back to Profiles</Button>}
        />
      </div>
    )
  }

  const money = (v: number) => formatMoney(v, statement.currency)
  const otePct = statement.ote > 0 ? ((statement.payments.ytd / statement.ote) * 100).toFixed(2) : '0.00'

  const totalCommissions = statement.commissions.find((l) => l.emphasis) ?? statement.commissions[0]
  const ytdRow = statement.attainment[0]?.quotaRows.find((r) => r.label.includes('YTD'))
  const chartData: QuarterPoint[] = QUARTER_COLS.map((c, i) => {
    const key = (['q1', 'q2', 'q3', 'q4'] as const)[i]
    return {
      quarter: `${c}-${year.replace('YEAR-', '')}`,
      commissions: totalCommissions ? totalCommissions.values[key] : 0,
      attainment: ytdRow ? Math.round(ytdRow.values[key] * 10) / 10 : 0,
    }
  })

  return (
    <div data-test-id="statement-page">
      <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground" data-test-id="statement-breadcrumb">
        <Link to="/organization/profiles" className="border-b border-transparent hover:border-current">Profiles</Link>
        <span>/</span>
        <Link to={`/organization/profiles/${statement.profileId}`} className="border-b border-transparent hover:border-current">{statement.name}</Link>
        <span>/</span>
        <span className="text-foreground">Incentive Statement</span>
      </div>

      <PageHeader
        eyebrow="Rep Dashboard"
        title="Incentive Statement"
        subtitle="A rep-facing view of current earnings, quota attainment, and a full period-by-period drill-down."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger className="h-9 w-[140px]" data-test-id="statement-year">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {YEAR_PERIODS.map((y) => (
                  <SelectItem key={y} value={y}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" className="h-9" onClick={() => toast('Submit Inquiry', { description: 'Raise a question about this statement.' })} data-test-id="statement-inquiry">
              <MessageSquareWarning className="size-4" />
              Submit Inquiry
            </Button>
            <Button variant="outline" size="sm" className="h-9" onClick={() => toast('Export', { description: 'Preparing the statement PDF.' })} data-test-id="statement-export">
              <FileDown className="size-4" />
              PDF
            </Button>
          </div>
        }
      />

      {/* Header card */}
      <Panel padded className="mb-5" data-test-id="statement-header-card">
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
              <MetaField label="Target Variable" value={money(statement.targetVariable)} />
              <MetaField label="Manager" value={statement.manager} />
              <MetaField label="Region" value={statement.region} />
              <MetaField label="Team" value={statement.team} />
              <MetaField label="Currency" value={statement.currency} />
              <MetaField label="PAR — Personal Attainment Rate" value={statement.parRate} />
              <MetaField label="PCR — Personal Commission Rate" value={statement.pcrRate} />
              <MetaField label="OTE" value={money(statement.ote)} />
            </div>
          </div>
        </div>
      </Panel>

      {/* Payments */}
      <Panel className="mb-5" data-test-id="statement-payments">
        <div className="border-b border-border px-5 py-3">
          <h3 className="font-heading text-xl font-normal text-foreground">Payments</h3>
        </div>
        <div className="flex flex-col divide-y divide-border sm:flex-row sm:divide-x sm:divide-y-0">
          <PaymentTile label="Current Period" sub={statement.currentPeriod} value={statement.payments.current} currency={statement.currency} />
          <PaymentTile label="Previous Period" sub={statement.previousPeriod} value={statement.payments.previous} currency={statement.currency} />
          <div className="flex-1 px-6 py-5" data-test-id="payment-ytd">
            <div className="font-mono text-[11px] uppercase tracking-[0.09em] text-muted-foreground">{statement.year}</div>
            <div className="mt-1 font-heading text-3xl text-primary">{money(statement.payments.ytd)}</div>
            <div className="mt-0.5 text-sm text-muted-foreground">Year to Date · {otePct}% of OTE</div>
          </div>
        </div>
      </Panel>

      {/* Earnings & Attainment chart */}
      <EarningsChart data={chartData} currency={statement.currency} />

      {/* Quota Attainment */}
      <section className="mb-5" data-test-id="statement-attainment">
        <h3 className="mb-3 font-heading text-xl font-normal text-foreground">Quota Attainment</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {statement.attainment.map((quota) => (
            <AttainmentGauge key={quota.name} quota={quota} currency={statement.currency} />
          ))}
        </div>
      </section>

      {/* Full Report */}
      <Panel padded data-test-id="statement-full-report">
        <div className="mb-4 flex items-center gap-2">
          <FileText className="size-4 text-primary" />
          <h3 className="font-heading text-xl font-normal text-foreground">Full Report</h3>
          <span className="font-mono text-[11px] uppercase tracking-[0.09em] text-muted-foreground">{year}</span>
        </div>
        <div className="space-y-6">
          {statement.attainment.map((quota) => (
            <ReportTable
              key={quota.name}
              title="Quotas"
              columnLabel={quota.name}
              lines={quota.quotaRows.map((r) => ({ label: r.label, values: r.values }))}
              year={year}
              tableUnit={quota.unit}
              moneyFmt={money}
            />
          ))}
          <ReportTable title="Commissions" columnLabel="Total Commissions" lines={statement.commissions} year={year} tableUnit="USD" moneyFmt={money} />
          <ReportTable title="Payments" columnLabel="Total Pending" lines={statement.paymentLines} year={year} tableUnit="USD" moneyFmt={money} />
        </div>
      </Panel>
    </div>
  )
}
