import { useMemo } from 'react'
import { Info } from 'lucide-react'
import {
  Bar,
  Line,
  ComposedChart,
  BarChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  Cell,
  ResponsiveContainer,
} from 'recharts'
import { formatMoney } from '@/lib/format'
import { Panel } from '@/components/org/panel'

// --- The commission plan, stated once and reused everywhere below ---
const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'] as const
// The annual quota is split across quarters as a rising ramp (sums to 1.00).
const QUOTA_WEIGHTS = [0.205, 0.236, 0.264, 0.295] as const
// What the rep actually booked each quarter, as a share of THAT quarter's quota.
const ATTAINMENT_RATIO = [0.89, 1.12, 1.05, 1.09] as const
// Above quota, every extra dollar pays 1.5x the normal rate — the "accelerator".
const ACCEL_MULTIPLIER = 1.5

const TOOLTIP_STYLE = {
  background: 'var(--popover)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  fontSize: 13,
  color: 'var(--foreground)',
} as const

const moneyTick = (v: number) => (Math.abs(v) >= 1000 ? `$${Math.round(v / 1000)}k` : `$${v}`)
const roundTo = (v: number, step: number) => Math.round(v / step) * step

type PerfPoint = {
  period: string
  quota: number
  booked: number
  attainmentPct: number
  cumAttainment: number
  base: number
  accelerated: number
}

function StatTile({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="flex flex-col gap-1" data-test-id={`perf-stat-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}>
      <span className="font-mono text-[11px] uppercase tracking-[0.09em] text-muted-foreground">{label}</span>
      <span className="font-heading text-2xl text-foreground">{value}</span>
      <span className="text-xs text-muted-foreground">{hint}</span>
    </div>
  )
}

function ReadThis({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-start gap-2 rounded-md border border-border bg-muted/50 px-3 py-2.5 text-sm text-muted-foreground">
      <Info className="mt-0.5 size-4 shrink-0 text-primary" />
      <p>{children}</p>
    </div>
  )
}

/**
 * A rep's year at a glance, derived entirely from two plan numbers:
 *  - annualQuota: the bookings target for the year
 *  - targetPay:   the commission earned for hitting exactly 100% of quota
 * The base commission rate is targetPay / annualQuota, so every chart below is
 * internally consistent — no magic numbers.
 */
export function ProfilePerformance({
  annualQuota,
  targetPay,
  currency,
}: {
  annualQuota: number
  targetPay: number
  currency: string
}) {
  const baseRate = targetPay / annualQuota
  const accelRate = baseRate * ACCEL_MULTIPLIER

  const { points, ytdQuota, ytdBooked, ytdAttainment, ytdBase, ytdAccel, ytdEarned } = useMemo(() => {
    let cumQuota = 0
    let cumBooked = 0
    const points: PerfPoint[] = QUARTERS.map((period, i) => {
      const quota = roundTo(annualQuota * QUOTA_WEIGHTS[i], 500)
      const booked = roundTo(quota * ATTAINMENT_RATIO[i], 500)
      cumQuota += quota
      cumBooked += booked
      const base = Math.round(Math.min(booked, quota) * baseRate)
      const accelerated = Math.round(Math.max(booked - quota, 0) * accelRate)
      return {
        period,
        quota,
        booked,
        attainmentPct: Math.round((booked / quota) * 1000) / 10,
        cumAttainment: cumQuota > 0 ? Math.round((cumBooked / cumQuota) * 1000) / 10 : 0,
        base,
        accelerated,
      }
    })
    const ytdQuota = points.reduce((a, p) => a + p.quota, 0)
    const ytdBooked = points.reduce((a, p) => a + p.booked, 0)
    const ytdBase = points.reduce((a, p) => a + p.base, 0)
    const ytdAccel = points.reduce((a, p) => a + p.accelerated, 0)
    return {
      points,
      ytdQuota,
      ytdBooked,
      ytdAttainment: ytdQuota > 0 ? Math.round((ytdBooked / ytdQuota) * 1000) / 10 : 0,
      ytdBase,
      ytdAccel,
      ytdEarned: ytdBase + ytdAccel,
    }
  }, [annualQuota, baseRate, accelRate])

  const money = (v: number) => formatMoney(v, currency)
  const basePct = (baseRate * 100).toFixed(1)
  const accelPct = (accelRate * 100).toFixed(1)

  return (
    <div className="space-y-5" data-test-id="profile-performance">
      {/* Headline stats */}
      <div className="grid grid-cols-2 gap-x-8 gap-y-5 rounded-lg border border-border bg-card p-5 sm:grid-cols-4" data-test-id="perf-stats">
        <StatTile label="Annual Quota" value={money(ytdQuota)} hint="Bookings target for the year" />
        <StatTile label="Booked So Far" value={money(ytdBooked)} hint={`${ytdAttainment}% of quota`} />
        <StatTile label="Commission Earned" value={money(ytdEarned)} hint={`Target at 100% is ${money(targetPay)}`} />
        <StatTile label="From Accelerator" value={money(ytdAccel)} hint="Extra pay for beating quota" />
      </div>

      {/* The plan, in one plain sentence */}
      <ReadThis>
        The whole page comes from two numbers: an <span className="font-medium text-foreground">annual quota of {money(annualQuota)}</span>{' '}
        (how much you&apos;re asked to book) and a <span className="font-medium text-foreground">target commission of {money(targetPay)}</span>{' '}
        (what you earn for hitting it exactly). That works out to{' '}
        <span className="font-medium text-foreground">{basePct}%</span> of every dollar you book — and{' '}
        <span className="font-medium text-foreground">{accelPct}%</span> on dollars booked <em>above</em> quota.
      </ReadThis>

      {/* Chart 1: Bookings vs quota, with cumulative attainment line */}
      <Panel padded data-test-id="perf-chart-pacing">
        <div className="mb-1 font-heading text-lg font-normal text-foreground">Are you keeping up with quota?</div>
        <ReadThis>
          <span className="font-medium text-foreground">Grey bar</span> = the quota for that quarter.{' '}
          <span className="font-medium text-foreground">Green bar</span> = what you actually booked. When the green bar is
          taller, you beat quota that quarter. The <span className="font-medium text-foreground">line</span> is your
          running total for the year (right axis) — above the dashed 100% line means you&apos;re ahead of plan overall.
          Right now you&apos;re at <span className="font-medium text-foreground">{ytdAttainment}%</span>.
        </ReadThis>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="period" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis yAxisId="money" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={moneyTick} />
            <YAxis yAxisId="pct" orientation="right" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v: number) => `${v}%`} domain={[0, 140]} />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              formatter={(value, name) => (name === 'Attainment (running)' ? [`${value}%`, name] : [money(Number(value)), name])}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />
            <Bar yAxisId="money" dataKey="quota" name="Quota" fill="var(--muted-foreground)" fillOpacity={0.3} radius={[4, 4, 0, 0]} />
            <Bar yAxisId="money" dataKey="booked" name="Booked" fill="var(--chart-2)" radius={[4, 4, 0, 0]} />
            <ReferenceLine yAxisId="pct" y={100} stroke="var(--muted-foreground)" strokeDasharray="4 4" label={{ value: '100% plan', position: 'right', fontSize: 11, fill: 'var(--muted-foreground)' }} />
            <Line yAxisId="pct" type="monotone" dataKey="cumAttainment" name="Attainment (running)" stroke="var(--chart-3)" strokeWidth={2.5} dot={{ r: 3 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </Panel>

      {/* Chart 2: Commission composition */}
      <Panel padded data-test-id="perf-chart-earnings">
        <div className="mb-1 font-heading text-lg font-normal text-foreground">Where your commission comes from</div>
        <ReadThis>
          Each bar is one quarter&apos;s commission, in two parts.{' '}
          <span className="font-medium text-foreground">Base</span> ({basePct}%) is what you earn up to quota.{' '}
          <span className="font-medium text-foreground">Accelerator</span> ({accelPct}%) is the bonus rate on anything
          booked above quota — it only appears in quarters you beat plan. Of your {money(ytdEarned)} total,{' '}
          <span className="font-medium text-foreground">{money(ytdAccel)}</span> came from the accelerator.
        </ReadThis>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="period" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={moneyTick} />
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(value, name) => [money(Number(value)), name]} />
            <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />
            <Bar dataKey="base" name={`Base (${basePct}%)`} stackId="pay" fill="var(--chart-1)" />
            <Bar dataKey="accelerated" name={`Accelerator (${accelPct}%)`} stackId="pay" fill="var(--chart-4)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Panel>

      {/* The exact numbers, so nothing is hidden behind a chart */}
      <Panel data-test-id="perf-table">
        <div className="border-b border-border px-5 py-3.5 font-heading text-lg font-normal text-foreground">The exact numbers</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-test-id="perf-table-grid">
            <thead>
              <tr className="border-b border-border text-left">
                {['Quarter', 'Quota', 'Booked', 'Attainment', 'Base', 'Accelerator', 'Commission'].map((h) => (
                  <th key={h} className="px-5 py-2.5 font-mono text-[11px] uppercase tracking-[0.09em] text-muted-foreground last:text-right">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {points.map((p) => (
                <tr key={p.period} className="border-b border-border last:border-b-0" data-test-id={`perf-row-${p.period.toLowerCase()}`}>
                  <td className="px-5 py-2.5 font-medium text-foreground">{p.period}</td>
                  <td className="px-5 py-2.5 font-mono tabular-nums text-muted-foreground">{money(p.quota)}</td>
                  <td className="px-5 py-2.5 font-mono tabular-nums text-foreground">{money(p.booked)}</td>
                  <td className="px-5 py-2.5 tabular-nums">
                    <span className={p.attainmentPct >= 100 ? 'text-[color:var(--chart-2)]' : 'text-muted-foreground'}>{p.attainmentPct}%</span>
                  </td>
                  <td className="px-5 py-2.5 font-mono tabular-nums text-muted-foreground">{money(p.base)}</td>
                  <td className="px-5 py-2.5 font-mono tabular-nums text-muted-foreground">{p.accelerated > 0 ? money(p.accelerated) : '—'}</td>
                  <td className="px-5 py-2.5 text-right font-mono tabular-nums font-medium text-foreground">{money(p.base + p.accelerated)}</td>
                </tr>
              ))}
              <tr className="bg-muted/40" data-test-id="perf-row-total">
                <td className="px-5 py-2.5 font-medium text-foreground">Year</td>
                <td className="px-5 py-2.5 font-mono tabular-nums text-muted-foreground">{money(ytdQuota)}</td>
                <td className="px-5 py-2.5 font-mono tabular-nums text-foreground">{money(ytdBooked)}</td>
                <td className="px-5 py-2.5 font-mono tabular-nums font-medium text-foreground">{ytdAttainment}%</td>
                <td className="px-5 py-2.5 font-mono tabular-nums text-muted-foreground">{money(ytdBase)}</td>
                <td className="px-5 py-2.5 font-mono tabular-nums text-muted-foreground">{money(ytdAccel)}</td>
                <td className="px-5 py-2.5 text-right font-mono tabular-nums font-semibold text-foreground">{money(ytdEarned)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Panel>

      {/* Chart 3: attainment per quarter, colored by whether it cleared quota */}
      <Panel padded data-test-id="perf-chart-scorecard">
        <div className="mb-1 font-heading text-lg font-normal text-foreground">Which quarters beat quota?</div>
        <ReadThis>
          Each bar is a quarter&apos;s bookings as a percent of that quarter&apos;s quota.{' '}
          <span className="font-medium text-foreground">Green</span> bars reached or passed 100% (and earned the
          accelerator); <span className="font-medium text-foreground">amber</span> bars fell short.
        </ReadThis>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="period" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v: number) => `${v}%`} domain={[0, 140]} />
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(value) => [`${value}%`, 'Attainment']} />
            <ReferenceLine y={100} stroke="var(--muted-foreground)" strokeDasharray="4 4" />
            <Bar dataKey="attainmentPct" name="Attainment" radius={[4, 4, 0, 0]}>
              {points.map((p) => (
                <Cell key={p.period} fill={p.attainmentPct >= 100 ? 'var(--chart-2)' : 'var(--chart-5)'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Panel>
    </div>
  )
}
