import { useMemo, useState } from 'react'
import { ArrowRight, TrendingUp, TrendingDown, FlaskConical } from 'lucide-react'
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  Legend,
} from 'recharts'
import { formatMoney } from '@/lib/format'
import { Panel } from '@/components/org/panel'
import { EmptyState } from '@/components/org/empty-state'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { modelPayout, buildCurve } from './simulate'
import { usePayoutSimRules } from './use-payout-sim-rules'

const DEFAULT_CREDIT = 250000
const ATTAIN_MIN = 0
const ATTAIN_MAX = 200
const DEFAULT_ATTAIN = 100
const SIM_DISCLAIMER =
  'Estimates above do not represent real cash earnings and are for demonstration purposes only'

function ResultCard({ label, value, sub, testId }: { label: string; value: string; sub?: string; testId: string }) {
  return (
    <div className="flex-1 rounded-lg border border-border bg-card p-4" data-test-id={testId}>
      <div className="font-mono text-[11px] uppercase tracking-[0.09em] text-muted-foreground">{label}</div>
      <div className="mt-1 font-heading text-3xl tabular-nums text-foreground">{value}</div>
      {sub ? <div className="mt-0.5 text-[13px] text-muted-foreground">{sub}</div> : null}
    </div>
  )
}

/** What-if simulator body — rendered inside the Simulator hub's "Simulator" tab. */
export function SimulateTab({
  ruleId,
  setRuleId,
  onManageRules,
}: {
  ruleId: string
  setRuleId: (id: string) => void
  onManageRules: () => void
}) {
  // Model against the live payout rules from the Rules library.
  const rules = usePayoutSimRules()
  const [credit, setCredit] = useState(String(DEFAULT_CREDIT))
  const [proposedRate, setProposedRate] = useState<number | null>(null)
  const [attainment, setAttainment] = useState(DEFAULT_ATTAIN)

  const rule = rules.find((r) => r.id === ruleId) ?? rules[0]

  const targetCredit = Number(credit) || 0
  // Attainment scales the target credit into the credit the rep actually books.
  const creditNum = Math.round(targetCredit * (attainment / 100))
  const effectiveProposed = proposedRate ?? rule?.rate ?? 0

  const currentPayout = rule ? modelPayout(creditNum, rule.rate, rule) : 0
  const proposedPayout = rule ? modelPayout(creditNum, effectiveProposed, rule) : 0
  const delta = proposedPayout - currentPayout
  const deltaPct = currentPayout > 0 ? (delta / currentPayout) * 100 : 0

  const curve = useMemo(
    () => (rule ? buildCurve(rule, effectiveProposed, Math.max(creditNum, DEFAULT_CREDIT)) : []),
    [rule, effectiveProposed, creditNum],
  )

  function handleRuleChange(id: string) {
    setRuleId(id)
    setProposedRate(null)
  }

  if (!rule) {
    return (
      <Panel data-test-id="simulator-tab">
        <EmptyState
          icon={FlaskConical}
          title="No payout rules to simulate"
          description="Create a payout rule in the Rules library, then model it here."
          action={<Button size="sm" onClick={onManageRules}>Go to Payout rules</Button>}
        />
      </Panel>
    )
  }

  const currency = 'USD'

  return (
    <div data-test-id="simulator-tab">
      <div className="grid gap-5 lg:grid-cols-[340px_1fr]">
        {/* Inputs */}
        <Panel padded className="space-y-5 self-start" data-test-id="simulator-inputs">
          <div className="space-y-1.5">
            <Label>Payout Rule</Label>
            <Select value={ruleId} onValueChange={handleRuleChange}>
              <SelectTrigger data-test-id="sim-rule"><SelectValue /></SelectTrigger>
              <SelectContent>
                {rules.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <p className="pt-1 font-mono text-[11px] text-muted-foreground">{rule.creditFormula} · {rule.rateType}</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sim-credit">Target Credit (Amount)</Label>
            <Input id="sim-credit" type="number" min="0" value={credit} onChange={(e) => setCredit(e.target.value)} data-test-id="sim-credit" />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Proposed Rate</Label>
              <span className="font-mono text-sm tabular-nums text-foreground">{effectiveProposed.toFixed(1)}%</span>
            </div>
            <Slider
              value={[effectiveProposed]}
              min={0}
              max={25}
              step={0.5}
              onValueChange={(v) => setProposedRate(v[0])}
              data-test-id="sim-rate"
            />
            <p className="font-mono text-[11px] text-muted-foreground">Current rate: {rule.rate}%</p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Quota Attainment</Label>
              <span className="font-mono text-sm tabular-nums text-foreground">{attainment}%</span>
            </div>
            <Slider
              value={[attainment]}
              min={ATTAIN_MIN}
              max={ATTAIN_MAX}
              step={5}
              onValueChange={(v) => setAttainment(Math.round(v[0]))}
              data-test-id="sim-attainment"
            />
            <p className="font-mono text-[11px] text-muted-foreground">Credit booked: {formatMoney(creditNum, 'USD')} of {formatMoney(targetCredit, 'USD')} target.</p>
          </div>
        </Panel>

        {/* Results */}
        <div className="space-y-5">
          <div className="flex flex-col gap-4 sm:flex-row" data-test-id="simulator-results">
            <ResultCard label="Current Payout" value={formatMoney(currentPayout, currency)} sub={`at ${rule.rate}%`} testId="result-current" />
            <ResultCard label="Proposed Payout" value={formatMoney(proposedPayout, currency)} sub={`at ${effectiveProposed.toFixed(1)}%`} testId="result-proposed" />
            <div className="flex-1 rounded-lg border border-border bg-card p-4" data-test-id="result-delta">
              <div className="font-mono text-[11px] uppercase tracking-[0.09em] text-muted-foreground">Impact</div>
              <div className={`mt-1 flex items-center gap-1.5 font-heading text-3xl tabular-nums ${delta >= 0 ? 'text-primary' : 'text-destructive'}`}>
                {delta >= 0 ? <TrendingUp className="size-5" /> : <TrendingDown className="size-5" />}
                {delta >= 0 ? '+' : ''}{formatMoney(delta, currency)}
              </div>
              <div className="mt-0.5 text-[13px] text-muted-foreground">{delta >= 0 ? '+' : ''}{deltaPct.toFixed(1)}% vs current</div>
            </div>
          </div>

          <Panel padded data-test-id="simulator-chart">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-heading text-lg text-foreground">Payout by Credit Amount</h2>
              <span className="font-mono text-[11px] uppercase tracking-[0.09em] text-muted-foreground">{rule.resultName}</span>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={curve} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis dataKey="credit" tickFormatter={(v) => `${Math.round(v / 1000)}k`} stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} />
                  <YAxis tickFormatter={(v) => `${Math.round(v / 1000)}k`} stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                  <RTooltip
                    formatter={(v) => formatMoney(Number(v), currency)}
                    labelFormatter={(v) => `Credit ${formatMoney(Number(v), currency)}`}
                    contentStyle={{ background: 'var(--color-popover)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="current" name="Current" stroke="var(--chart-3)" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="proposed" name="Proposed" stroke="var(--chart-1)" strokeWidth={2.5} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-3 flex items-center gap-1.5 text-[12px] text-muted-foreground">
              <ArrowRight className="size-3.5" />
              {SIM_DISCLAIMER}
            </p>
          </Panel>
        </div>
      </div>
    </div>
  )
}
