import { useState } from 'react'
import { Trophy, TrendingUp } from 'lucide-react'
import { Bar, BarChart, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useData } from '@/lib/data'
import { REP_DEALS, rankDeals, type Deal, type RankedDeal } from '@/data/rep-deals'
import { STATEMENTS, type Statement } from '@/data/statement-seed'
import { repStatement } from '@/data/rep'
import { formatMoney, formatDate } from '@/lib/format'
import { PageHeader } from '@/components/org/page-header'
import { Panel } from '@/components/org/panel'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'

const SORT = { expected: 'expected', gross: 'gross' } as const
type SortKey = (typeof SORT)[keyof typeof SORT]

const TOOLTIP_STYLE = {
  background: 'var(--popover)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  fontSize: 13,
  color: 'var(--foreground)',
} as const

function currentAttainment(statement: Statement): number {
  const ytd = statement.attainment[0]?.quotaRows.find((r) => r.label.includes('YTD'))?.values
  return ytd ? Math.round((ytd.q4 || ytd.q3 || ytd.q2 || ytd.q1) * 10) / 10 : 0
}

export default function RepSimulator() {
  const { data } = useData<Statement[]>('rep-statements', 'seed', STATEMENTS)
  const { data: deals } = useData<Deal[]>('rep-deals', 'seed', REP_DEALS)
  const fallback = repStatement()
  const statement = (data ?? []).find((s) => s.profileId === fallback.profileId) ?? fallback

  const [sort, setSort] = useState<SortKey>(SORT.expected)
  const attainment = currentAttainment(statement)
  const currency = statement.currency

  const ranked = rankDeals(deals ?? [], attainment)
  const ordered: RankedDeal[] =
    sort === SORT.gross ? [...ranked].sort((a, b) => b.grossCommission - a.grossCommission) : ranked
  const metric = (d: RankedDeal) => (sort === SORT.gross ? d.grossCommission : d.expectedCommission)

  const top = ordered[0]
  const chartData = ordered.map((d) => ({ account: d.account.split(' ')[0], value: Math.round(metric(d)), id: d.id }))

  return (
    <div data-test-id="rep-simulator-page">
      <PageHeader
        eyebrow="What-if · Deal Prioritization"
        title="Commission Simulator"
        subtitle="Rank your open deals by the commission they’d earn, so you close the highest-impact one first."
        actions={
          <Tabs value={sort} onValueChange={(v) => setSort(v as SortKey)}>
            <TabsList data-test-id="rep-sim-sort">
              <TabsTrigger value={SORT.expected} data-test-id="rep-sim-sort-expected">Expected</TabsTrigger>
              <TabsTrigger value={SORT.gross} data-test-id="rep-sim-sort-gross">Best case</TabsTrigger>
            </TabsList>
          </Tabs>
        }
      />

      {/* Recommendation + context */}
      <div className="mb-5 grid gap-4 lg:grid-cols-3">
        <Panel padded className="lg:col-span-2" data-test-id="rep-sim-recommendation">
          <div className="flex items-start gap-4">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Trophy className="size-5" />
            </div>
            <div className="min-w-0">
              <div className="font-mono text-[11px] uppercase tracking-[0.09em] text-muted-foreground">Prioritize first</div>
              {top ? (
                <>
                  <h2 className="mt-0.5 font-heading text-2xl font-normal text-foreground">{top.account}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {top.product} · {formatMoney(top.amount, currency)} deal · close by {formatDate(top.closeBy)}
                  </p>
                  <p className="mt-3 text-sm text-foreground">
                    Projected {sort === SORT.gross ? 'best-case' : 'expected'} commission{' '}
                    <span className="font-heading text-lg text-primary">{formatMoney(Math.round(metric(top)), currency)}</span>
                    {top.acceleratorPct > 0 && (
                      <span className="text-muted-foreground"> · includes a {top.acceleratorPct}% attainment accelerator</span>
                    )}
                  </p>
                </>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">No open deals to prioritize.</p>
              )}
            </div>
          </div>
        </Panel>
        <Panel padded data-test-id="rep-sim-attainment">
          <div className="flex items-center gap-2 text-muted-foreground">
            <TrendingUp className="size-4" />
            <span className="font-mono text-[11px] uppercase tracking-[0.09em]">Your YTD attainment</span>
          </div>
          <div className="mt-2 font-heading text-4xl text-foreground">{attainment.toFixed(1)}%</div>
          <p className="mt-2 text-sm text-muted-foreground">
            {attainment >= 100
              ? 'Above plan — every new deal earns the accelerated rate.'
              : attainment >= 85
                ? 'Close to plan — deals now carry a small accelerator.'
                : 'Below plan — deals earn the base rate until you reach 85%.'}
          </p>
        </Panel>
      </div>

      {/* Ranked chart */}
      <Panel padded className="mb-5" data-test-id="rep-sim-chart">
        <div className="mb-4 flex items-baseline justify-between">
          <h3 className="font-heading text-lg font-normal text-foreground">Commission by deal</h3>
          <span className="font-mono text-[11px] uppercase tracking-[0.09em] text-muted-foreground">
            {sort === SORT.gross ? 'Best case' : 'Expected (probability-weighted)'}
          </span>
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 4 }}>
            <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
            <XAxis dataKey="account" tickLine={false} axisLine={{ stroke: 'var(--border)' }} tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }} />
            <YAxis tickLine={false} axisLine={false} tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }} tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : `${v}`)} />
            <Tooltip cursor={{ fill: 'var(--muted)', opacity: 0.4 }} contentStyle={TOOLTIP_STYLE} formatter={(v) => [formatMoney(Number(v), currency), 'Commission']} />
            <Bar dataKey="value" name="Commission" radius={[6, 6, 0, 0]} barSize={46}>
              {chartData.map((d, i) => (
                <Cell key={d.id} fill={i === 0 ? 'var(--chart-2)' : 'var(--chart-1)'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Panel>

      {/* Ranked table */}
      <Panel data-test-id="rep-sim-table">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                {['#', 'Account', 'Product', 'Deal Size', 'Rate', 'Win %', sort === SORT.gross ? 'Best Case' : 'Expected'].map((h, i) => (
                  <th
                    key={h}
                    className={cn(
                      'px-4 py-2.5 font-mono text-[11px] uppercase tracking-[0.09em] text-muted-foreground',
                      i >= 3 ? 'text-right' : 'text-left',
                    )}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ordered.map((d, i) => (
                <tr
                  key={d.id}
                  className={cn('border-b border-border last:border-b-0', i === 0 && 'bg-primary/5')}
                  data-test-id={`rep-sim-row-${d.id}`}
                >
                  <td className="px-4 py-3 font-mono text-[13px] text-muted-foreground">{i + 1}</td>
                  <td className="px-4 py-3 font-medium text-foreground">{d.account}</td>
                  <td className="px-4 py-3 text-muted-foreground">{d.product}</td>
                  <td className="px-4 py-3 text-right font-mono text-[13px] tabular-nums text-foreground">{formatMoney(d.amount, currency)}</td>
                  <td className="px-4 py-3 text-right font-mono text-[13px] tabular-nums text-muted-foreground">
                    {(d.baseRatePct * d.productMultiplier).toFixed(2)}%
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-[13px] tabular-nums text-muted-foreground">{Math.round(d.closeProbability * 100)}%</td>
                  <td className="px-4 py-3 text-right font-mono text-[13px] font-medium tabular-nums text-foreground">
                    {formatMoney(Math.round(metric(d)), currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  )
}
