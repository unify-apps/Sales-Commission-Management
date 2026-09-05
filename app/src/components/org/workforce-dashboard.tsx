import { useMemo } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Users, UserCheck, CircleDollarSign, Building2, Trophy } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useData } from '@/lib/data'
import { PROFILES, type Profile } from '@/data/org-seed'
import { formatMoney, initials } from '@/lib/format'
import { Panel } from '@/components/org/panel'

const TOP_PAYEES_COUNT = 5

// Statuses that count as an active, commission-earning payee.
const ACTIVE_STATUS = 'Active'
const CHART_COLORS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)']

function fmtCompact(v: number): string {
  if (Math.abs(v) >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`
  if (Math.abs(v) >= 1_000) return `$${Math.round(v / 1_000)}k`
  return `$${v}`
}

function countBy<T>(rows: T[], key: (r: T) => string): { name: string; value: number }[] {
  const map = new Map<string, number>()
  for (const r of rows) {
    const k = key(r)
    map.set(k, (map.get(k) ?? 0) + 1)
  }
  return [...map.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
}

function Stat({ icon: Icon, label, value, sub, testId }: { icon: LucideIcon; label: string; value: string; sub: string; testId: string }) {
  return (
    <Panel padded className="flex flex-col gap-2" data-test-id={testId}>
      <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.09em] text-muted-foreground">
        <Icon className="size-4 text-primary" />
        {label}
      </div>
      <div className="font-heading text-3xl tabular-nums text-foreground">{value}</div>
      <div className="text-[13px] text-muted-foreground">{sub}</div>
    </Panel>
  )
}

function InsightRow({ label, value, note, testId }: { label: string; value: string; note: string; testId: string }) {
  return (
    <div className="flex flex-1 items-center justify-between gap-3 py-3" data-test-id={testId}>
      <div className="min-w-0">
        <div className="truncate text-sm text-foreground">{label}</div>
        <div className="truncate text-[12px] text-muted-foreground">{note}</div>
      </div>
      <div className="shrink-0 font-heading text-2xl tabular-nums text-foreground">{value}</div>
    </div>
  )
}

function ChartCard({ title, sub, children, testId }: { title: string; sub: string; children: React.ReactNode; testId: string }) {
  return (
    <Panel padded className="flex flex-col" data-test-id={testId}>
      <div className="mb-1 font-heading text-lg text-foreground">{title}</div>
      <p className="mb-4 text-[13px] text-muted-foreground">{sub}</p>
      {children}
    </Panel>
  )
}

export function WorkforceDashboard() {
  const { data, loading } = useData<Profile[]>('org-profiles', 'seed', PROFILES)
  const profiles = data ?? []

  const metrics = useMemo(() => {
    const total = profiles.length
    const active = profiles.filter((p) => p.status === ACTIVE_STATUS).length
    const eligible = profiles.filter((p) => p.commissionEligible).length
    const totalTarget = profiles.reduce((sum, p) => sum + p.personalTarget, 0)
    const groups = new Set(profiles.map((p) => p.businessGroup)).size

    const byGroup = countBy(profiles, (p) => p.businessGroup)
    const byStatus = countBy(profiles, (p) => p.status)
    const byRegion = countBy(profiles, (p) => p.region)

    // Target per business group, for the ranked list.
    const targetByGroup = [...byGroup].map((g) => ({
      name: g.name,
      target: profiles.filter((p) => p.businessGroup === g.name).reduce((s, p) => s + p.personalTarget, 0),
    }))

    const avgTarget = total ? Math.round(totalTarget / total) : 0
    const topPayees = [...profiles].sort((a, b) => b.personalTarget - a.personalTarget).slice(0, TOP_PAYEES_COUNT)

    // Compensation leverage: how much variable target the workforce carries per $1 of salary.
    const totalSalary = profiles.reduce((s, p) => s + p.salary, 0)
    const leverage = totalSalary ? totalTarget / totalSalary : 0

    // Average tenure in years, from hire dates.
    const now = Date.now()
    const YEAR_MS = 1000 * 60 * 60 * 24 * 365.25
    const avgTenure = total
      ? profiles.reduce((s, p) => s + (now - new Date(p.hireDate).getTime()) / YEAR_MS, 0) / total
      : 0

    // Managers vs individual payees — span of the org.
    const managers = profiles.filter((p) => p.roleType === 'Manager').length

    return {
      total, active, eligible, totalTarget, avgTarget, groups,
      byGroup, byStatus, byRegion, targetByGroup, topPayees,
      totalSalary, leverage, avgTenure, managers,
    }
  }, [profiles])

  if (loading) {
    return (
      <section className="mb-8" data-test-id="workforce-dashboard-loading">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Panel key={i} padded className="h-28 animate-pulse bg-muted/40" data-test-id={`dashboard-skeleton-${i}`}>
              <span className="sr-only">Loading</span>
            </Panel>
          ))}
        </div>
      </section>
    )
  }

  const maxRegion = Math.max(...metrics.byRegion.map((r) => r.value), 1)
  const rankedTargets = [...metrics.targetByGroup].sort((a, b) => b.target - a.target)
  const maxTarget = Math.max(...rankedTargets.map((t) => t.target), 1)

  return (
    <section className="mb-10" data-test-id="workforce-dashboard">
      <div className="mb-3 flex items-baseline justify-between">
        <div className="font-mono text-[11px] uppercase tracking-[0.09em] text-muted-foreground">Workforce Overview</div>
        <div className="text-[13px] text-muted-foreground">Across all {metrics.total} profiles</div>
      </div>

      {/* KPI row */}
      <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          icon={Users}
          label="Total Payees"
          value={String(metrics.total)}
          sub={`${metrics.groups} business groups`}
          testId="stat-total"
        />
        <Stat
          icon={UserCheck}
          label="Active"
          value={String(metrics.active)}
          sub={`${metrics.total - metrics.active} not currently active`}
          testId="stat-active"
        />
        <Stat
          icon={CircleDollarSign}
          label="Commission Eligible"
          value={String(metrics.eligible)}
          sub={`${Math.round((metrics.eligible / metrics.total) * 100)}% of payees`}
          testId="stat-eligible"
        />
        <Stat
          icon={Building2}
          label="Combined Target"
          value={fmtCompact(metrics.totalTarget)}
          sub="Sum of personal targets"
          testId="stat-target"
        />
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard title="Headcount by business group" sub="Where the payees sit" testId="chart-headcount">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={metrics.byGroup} margin={{ top: 4, right: 8, bottom: 4, left: 0 }} barCategoryGap="28%">
              <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis dataKey="name" tickLine={false} axisLine={{ stroke: 'var(--border)' }} tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} interval={0} />
              <YAxis width={28} allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} />
              <Tooltip cursor={{ fill: 'var(--muted)', opacity: 0.5 }} content={<CountTooltip suffix="payees" />} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={56} fill="var(--chart-1)" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Status mix" sub="Employment status of all payees" testId="chart-status">
          <div className="flex items-center gap-4">
            <ResponsiveContainer width="60%" height={200}>
              <PieChart>
                <Pie data={metrics.byStatus} dataKey="value" nameKey="name" innerRadius={48} outerRadius={78} paddingAngle={2} stroke="var(--card)" strokeWidth={2}>
                  {metrics.byStatus.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CountTooltip suffix="payees" />} />
              </PieChart>
            </ResponsiveContainer>
            <ul className="flex flex-1 flex-col gap-2">
              {metrics.byStatus.map((s, i) => (
                <li key={s.name} className="flex items-center gap-2 text-[13px]" data-test-id={`status-legend-${s.name.toLowerCase().replace(/\s+/g, '-')}`}>
                  <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} aria-hidden />
                  <span className="flex-1 truncate text-muted-foreground">{s.name}</span>
                  <span className="font-mono tabular-nums text-foreground">{s.value}</span>
                </li>
              ))}
            </ul>
          </div>
        </ChartCard>

        <ChartCard title="Payees by region" sub="Coverage across territories" testId="chart-region">
          <ul className="flex flex-col gap-3">
            {metrics.byRegion.map((r) => (
              <li key={r.name} data-test-id={`region-row-${r.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}>
                <div className="mb-1 flex items-baseline justify-between text-[13px]">
                  <span className="text-muted-foreground">{r.name}</span>
                  <span className="font-mono tabular-nums text-foreground">{r.value}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${(r.value / maxRegion) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </ChartCard>
      </div>

      {/* Top payees + average target */}
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Panel padded className="lg:col-span-2" data-test-id="top-payees">
          <div className="mb-4 flex items-center gap-2">
            <Trophy className="size-4 text-primary" />
            <span className="font-heading text-lg text-foreground">Highest personal targets</span>
          </div>
          <ul className="flex flex-col divide-y divide-border">
            {metrics.topPayees.map((p, i) => (
              <li key={p.id} data-test-id={`top-payee-${p.id}`}>
                <Link
                  to={`/organization/profiles/${p.id}`}
                  className="flex items-center gap-3 py-2.5 transition-colors hover:bg-accent/40"
                >
                  <span className="w-4 shrink-0 text-center font-mono text-[13px] text-muted-foreground">{i + 1}</span>
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 font-mono text-[12px] font-medium text-primary">
                    {initials(p.personName)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-foreground">{p.personName}</span>
                    <span className="block truncate text-[12px] text-muted-foreground">{p.title} · {p.region}</span>
                  </span>
                  <span className="shrink-0 font-mono text-[13px] tabular-nums text-foreground">
                    {formatMoney(p.personalTarget, p.paymentCurrency)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel padded className="flex flex-col" data-test-id="comp-insights">
          <div className="mb-4 font-heading text-lg text-foreground">Compensation profile</div>
          <div className="flex flex-1 flex-col divide-y divide-border">
            <InsightRow
              label="Avg. personal target"
              value={fmtCompact(metrics.avgTarget)}
              note={`Combined ${fmtCompact(metrics.totalTarget)}`}
              testId="insight-avg-target"
            />
            <InsightRow
              label="Target-to-salary leverage"
              value={`${metrics.leverage.toFixed(1)}×`}
              note={`On ${fmtCompact(metrics.totalSalary)} base salary`}
              testId="insight-leverage"
            />
            <InsightRow
              label="Avg. tenure"
              value={`${metrics.avgTenure.toFixed(1)} yrs`}
              note={`${metrics.managers} managers, ${metrics.total - metrics.managers} payees`}
              testId="insight-tenure"
            />
            <InsightRow
              label="Coverage"
              value={`${metrics.groups} / ${metrics.byRegion.length}`}
              note="Business groups / regions"
              testId="insight-coverage"
            />
            <InsightRow
              label="Commission eligible"
              value={`${Math.round((metrics.eligible / metrics.total) * 100)}%`}
              note={`${metrics.eligible} of ${metrics.total} payees`}
              testId="insight-eligible-rate"
            />
          </div>
        </Panel>
      </div>

      {/* Target by business group */}
      <Panel padded className="mt-4" data-test-id="target-by-group">
        <div className="mb-4 font-heading text-lg text-foreground">Personal target by business group</div>
        <div className="flex flex-col gap-3">
          {rankedTargets.map((g) => (
            <div key={g.name} data-test-id={`target-row-${g.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}>
              <div className="mb-1 flex items-baseline justify-between text-sm">
                <span className="text-foreground">{g.name}</span>
                <span className="font-mono tabular-nums text-muted-foreground">{formatMoney(g.target)}</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-[color:var(--chart-2)]" style={{ width: `${(g.target / maxTarget) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </section>
  )
}

function CountTooltip({ active, payload, suffix }: { active?: boolean; payload?: Array<{ name: string; value: number }>; suffix: string }) {
  if (!active || !payload || payload.length === 0) return null
  const p = payload[0]
  return (
    <div className="rounded-md border border-border bg-popover px-3 py-2 shadow-md">
      <div className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground">{p.name}</div>
      <div className="font-mono text-sm font-semibold tabular-nums text-foreground">{p.value} {suffix}</div>
    </div>
  )
}
