import { useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { Quota } from '@/data/plan-seed'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

// Calendar year: Q1 = Jan/Feb/Mar, Q2 = Apr/May/Jun, Q3 = Jul/Aug/Sep, Q4 = Oct/Nov/Dec.
const MONTH_ORDER = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'] as const
const MONTHS_PER_QUARTER = 3
const MONTHS_PER_HALF = 6

const DISTRIBUTIONS = {
  even: 'Even split',
  seasonal: 'Seasonal shape',
} as const
type DistributionKey = keyof typeof DISTRIBUTIONS

// Relative weights per month for the "seasonal shape" — sums to 12 so an even year is preserved.
const SEASONAL_WEIGHTS = [0.72, 0.84, 1.02, 0.84, 0.96, 1.2, 0.84, 0.96, 1.08, 0.84, 1.02, 1.68] as const

function fmtMoney(v: number) {
  return `$${Math.round(v).toLocaleString('en-US')}`
}

function fmtCompact(v: number) {
  if (Math.abs(v) >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`
  if (Math.abs(v) >= 1_000) return `$${Math.round(v / 1_000)}k`
  return `$${v}`
}

/** Build the 12 month labels for a YEAR-XXXX period (calendar year, JAN through DEC). */
function monthLabels(period: string): string[] {
  const startYear = Number(period.replace('YEAR-', '')) || new Date().getFullYear()
  const yy = String(startYear % 100).padStart(2, '0')
  return MONTH_ORDER.map((m) => `${m}-${yy}`)
}

function distribute(annual: number, key: DistributionKey): number[] {
  if (key === 'even') {
    const base = Math.round(annual / 12 / 100) * 100
    return MONTH_ORDER.map((_, i) => (i === 11 ? annual - base * 11 : base))
  }
  const raw = SEASONAL_WEIGHTS.map((w) => Math.round((annual * w) / 12 / 100) * 100)
  const drift = annual - raw.reduce((a, b) => a + b, 0)
  raw[11] += drift
  return raw
}

function Band({
  label,
  sublabel,
  children,
}: {
  label: string
  sublabel?: string
  children: React.ReactNode
}) {
  return (
    <div className="grid grid-cols-[112px_1fr] items-stretch border-t border-border">
      <div className="flex flex-col justify-center bg-muted/30 px-4 py-3">
        <span className="font-mono text-[11px] font-medium uppercase tracking-[0.09em] text-muted-foreground">{label}</span>
        {sublabel ? <span className="font-mono text-[10px] text-muted-foreground/70">{sublabel}</span> : null}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  )
}

/** A rollup cell that spans `span` month-columns: label left, derived total right. */
function RollupRow({ groups }: { groups: Array<{ label: string; value: number; span: number }> }) {
  return (
    <div className="grid grid-cols-12">
      {groups.map((g, i) => (
        <div
          key={g.label}
          className={cn('flex items-baseline justify-between gap-2 px-4 py-3', i > 0 && 'border-l border-border')}
          style={{ gridColumn: `span ${g.span} / span ${g.span}` }}
        >
          <span className="truncate font-mono text-[12px] text-muted-foreground">{g.label}</span>
          <span className="font-mono text-[13px] font-semibold tabular-nums text-foreground">{fmtMoney(g.value)}</span>
        </div>
      ))}
    </div>
  )
}

export function QuotaBreakdownCard({ quota }: { quota: Quota }) {
  const [dist, setDist] = useState<DistributionKey>('seasonal')
  const [months, setMonths] = useState<number[]>(() => distribute(quota.yearValue, 'seasonal'))

  const labels = monthLabels(quota.period)
  const year = quota.period.replace('YEAR-', '')

  const quarters = Array.from({ length: 4 }, (_, q) =>
    months.slice(q * MONTHS_PER_QUARTER, q * MONTHS_PER_QUARTER + MONTHS_PER_QUARTER).reduce((a, b) => a + b, 0),
  )
  const halves = Array.from({ length: 2 }, (_, h) =>
    months.slice(h * MONTHS_PER_HALF, h * MONTHS_PER_HALF + MONTHS_PER_HALF).reduce((a, b) => a + b, 0),
  )
  const total = months.reduce((a, b) => a + b, 0)
  const chartData = labels.map((lbl, i) => ({ month: lbl, value: months[i] }))
  const maxMonth = months.length ? Math.max(...months) : 0

  function handleMonth(i: number, raw: string) {
    const n = Number(raw.replace(/[^0-9.-]/g, ''))
    setMonths((prev) => prev.map((v, idx) => (idx === i ? (Number.isFinite(n) ? n : 0) : v)))
  }

  function handleDistribute(key: DistributionKey) {
    setDist(key)
    setMonths(distribute(quota.yearValue, key))
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card" data-test-id="quota-breakdown-card">
      <div className="flex items-start justify-between gap-4 px-5 pb-4 pt-5">
        <div>
          <h3 className="font-heading text-xl font-normal text-foreground">Quota breakdown</h3>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {labels[0]} through {labels[11]}. Only months are editable — every roll-up above is derived.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] uppercase tracking-[0.09em] text-muted-foreground">Distribute</span>
          <Select value={dist} onValueChange={(v) => handleDistribute(v as DistributionKey)}>
            <SelectTrigger className="h-9 w-[168px]" data-test-id="quota-distribute"><SelectValue /></SelectTrigger>
            <SelectContent>
              {(Object.keys(DISTRIBUTIONS) as DistributionKey[]).map((k) => (
                <SelectItem key={k} value={k}>{DISTRIBUTIONS[k]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Band label="Year">
        <RollupRow groups={[{ label: `YEAR-${year}`, value: total, span: 12 }]} />
      </Band>

      <Band label="Semiannual">
        <RollupRow
          groups={[
            { label: `H1-${year}`, value: halves[0], span: 6 },
            { label: `H2-${year}`, value: halves[1], span: 6 },
          ]}
        />
      </Band>

      <Band label="Quarters">
        <RollupRow
          groups={quarters.map((v, q) => ({ label: `QTR-${q + 1}-${year}`, value: v, span: 3 }))}
        />
      </Band>

      <Band label="Months" sublabel="editable">
        {/* One column per quarter, each stacking its 3 calendar months vertically:
            Q1 = Jan/Feb/Mar, Q2 = Apr/May/Jun, and so on. */}
        <div className="grid grid-cols-1 gap-px bg-border sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, q) => (
            <div key={`quota-quarter-col-${q}`} className="flex flex-col gap-px bg-border">
              {labels
                .slice(q * MONTHS_PER_QUARTER, q * MONTHS_PER_QUARTER + MONTHS_PER_QUARTER)
                .map((lbl, j) => {
                  const i = q * MONTHS_PER_QUARTER + j
                  return (
                    <div
                      key={lbl}
                      className="flex items-center justify-between gap-2 bg-card px-4 py-2.5"
                      data-test-id={`quota-month-${lbl}`}
                    >
                      <span className="font-mono text-[11px] uppercase tracking-[0.06em] text-muted-foreground">{lbl}</span>
                      <Input
                        value={fmtMoney(months[i])}
                        onChange={(e) => handleMonth(i, e.target.value)}
                        inputMode="numeric"
                        aria-label={`Quota for ${lbl}`}
                        className="h-8 w-[108px] px-2 text-right font-mono text-[13px] tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                        data-test-id={`quota-month-input-${lbl}`}
                      />
                    </div>
                  )
                })}
            </div>
          ))}
        </div>
      </Band>

      <div className="border-t border-border px-5 pb-5 pt-4" data-test-id="quota-breakdown-chart">
        <div className="mb-3 flex items-baseline justify-between">
          <span className="font-mono text-[11px] uppercase tracking-[0.09em] text-muted-foreground">
            Monthly distribution
          </span>
          <span className="font-mono text-[12px] tabular-nums text-muted-foreground">
            Total {fmtMoney(total)}
          </span>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 4, left: 8 }} barCategoryGap="22%">
            <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={{ stroke: 'var(--border)' }}
              tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
              interval={0}
            />
            <YAxis
              width={52}
              tickLine={false}
              axisLine={false}
              tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
              tickFormatter={(v) => fmtCompact(Number(v))}
            />
            <Tooltip
              cursor={{ fill: 'var(--muted)', opacity: 0.5 }}
              content={({ active, payload, label }) =>
                active && payload && payload.length ? (
                  <div className="rounded-md border border-border bg-popover px-3 py-2 shadow-md">
                    <div className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground">{label}</div>
                    <div className="font-mono text-sm font-semibold tabular-nums text-foreground">
                      {fmtMoney(Number(payload[0].value))}
                    </div>
                  </div>
                ) : null
              }
            />
            <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={40}>
              {chartData.map((d) => (
                <Cell
                  key={d.month}
                  fill={d.value === maxMonth ? 'var(--chart-1)' : 'var(--chart-2)'}
                  fillOpacity={d.value === maxMonth ? 1 : 0.55}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
