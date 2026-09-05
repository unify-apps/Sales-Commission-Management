import { useMemo } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
} from 'recharts'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'

export interface CurveRow {
  id: string
  quotaAttainment: string
  personalTarget: string
  rateMultiplier: string
}

export function makeCurveRow(): CurveRow {
  return { id: crypto.randomUUID().slice(0, 8), quotaAttainment: '', personalTarget: '', rateMultiplier: '' }
}

const COLS = ['Threshold', '% Quota Attainment', '% Personal Target', 'Personal Rate Multiplier'] as const
const GRID = 'grid grid-cols-[110px_1fr_1fr_1fr_44px] gap-2'

export function CurveTable({
  threshold,
  onThresholdChange,
  rows,
  onChange,
  capAtTarget,
  onCapChange,
}: {
  threshold: string
  onThresholdChange: (v: string) => void
  rows: CurveRow[]
  onChange: (rows: CurveRow[]) => void
  capAtTarget: boolean
  onCapChange: (v: boolean) => void
}) {
  function patch(id: string, key: keyof CurveRow, value: string) {
    onChange(rows.map((r) => (r.id === id ? { ...r, [key]: value } : r)))
  }
  function remove(id: string) {
    onChange(rows.filter((r) => r.id !== id))
  }

  const chartData = useMemo(() => {
    const points = [
      { x: Number(threshold) || 0, y: 0 },
      ...rows
        .map((r) => ({ x: Number(r.quotaAttainment), y: Number(r.personalTarget) }))
        .filter((p) => !Number.isNaN(p.x) && !Number.isNaN(p.y) && (p.x !== 0 || p.y !== 0)),
    ].sort((a, b) => a.x - b.x)
    return points.length >= 2 ? points : []
  }, [threshold, rows])

  return (
    <div data-test-id="curve-table">
      <p className="mb-4 text-sm text-muted-foreground">
        Enter the Threshold and Tiers below. The tiers will automatically be sorted upon Save.
      </p>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div>
          <div className="overflow-hidden rounded-md border border-border">
            <div className={`${GRID} border-b border-border bg-muted/50 px-3 py-2 font-mono text-[11px] uppercase tracking-[0.09em] text-muted-foreground`}>
              <span>Tier</span>
              {COLS.slice(1).map((c) => <span key={c}>{c}</span>)}
              <span className="sr-only">Remove</span>
            </div>

            {/* Threshold row */}
            <div className={`${GRID} items-center border-b border-border px-3 py-2`} data-test-id="curve-threshold-row">
              <span className="text-sm font-medium text-foreground">Threshold</span>
              <Input value={threshold} onChange={(e) => onThresholdChange(e.target.value)} type="number" placeholder="0" className="h-8" data-test-id="curve-threshold" />
              <span className="text-sm text-muted-foreground">0</span>
              <span className="text-sm text-muted-foreground">Not Available</span>
              <span />
            </div>

            {rows.map((r, i) => (
              <div key={r.id} className={`${GRID} items-center border-b border-border px-3 py-2 last:border-b-0`} data-test-id={`curve-row-${r.id}`}>
                <span className="text-sm font-medium text-foreground">Tier {i + 1}</span>
                <Input value={r.quotaAttainment} onChange={(e) => patch(r.id, 'quotaAttainment', e.target.value)} type="number" placeholder="%" className="h-8" data-test-id={`curve-${r.id}-quota`} />
                <Input value={r.personalTarget} onChange={(e) => patch(r.id, 'personalTarget', e.target.value)} type="number" placeholder="%" className="h-8" data-test-id={`curve-${r.id}-target`} />
                <Input value={r.rateMultiplier} onChange={(e) => patch(r.id, 'rateMultiplier', e.target.value)} type="number" placeholder="0" className="h-8" data-test-id={`curve-${r.id}-mult`} />
                <Button type="button" variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-destructive" onClick={() => remove(r.id)} aria-label="Remove tier" data-test-id={`curve-${r.id}-remove`}>
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
          </div>

          <Button type="button" variant="ghost" size="sm" className="mt-3 text-primary" onClick={() => onChange([...rows, makeCurveRow()])} data-test-id="curve-add-row">
            <Plus className="size-4" />
            Add Row
          </Button>

          <div className="mt-5">
            <div className="font-mono text-[11px] uppercase tracking-[0.09em] text-muted-foreground">Cap Percentage</div>
            <div className="mt-2 flex items-center gap-2">
              <Checkbox id="cap-target" checked={capAtTarget} onCheckedChange={(v) => onCapChange(v === true)} data-test-id="curve-cap" />
              <Label htmlFor="cap-target" className="font-normal">Cap at Personal target</Label>
            </div>
          </div>
        </div>

        {/* Chart preview */}
        <div className="rounded-md border border-border bg-card p-4" data-test-id="curve-chart">
          <div className="mb-2 font-mono text-[11px] uppercase tracking-[0.09em] text-muted-foreground">% Personal Target</div>
          <div className="h-64">
            {chartData.length >= 2 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="x" type="number" stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} tickFormatter={(v) => `${v}%`} />
                  <YAxis stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
                  <RTooltip
                    formatter={(v) => `${Number(v)}%`}
                    labelFormatter={(v) => `Quota ${Number(v)}%`}
                    contentStyle={{ background: 'var(--color-popover)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12 }}
                  />
                  <Line type="monotone" dataKey="y" stroke="var(--chart-1)" strokeWidth={2.5} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-center text-sm text-muted-foreground" data-test-id="curve-chart-empty">
                Enter a threshold and at least one tier to preview the pay curve.
              </div>
            )}
          </div>
          <div className="mt-1 text-center font-mono text-[11px] uppercase tracking-[0.09em] text-muted-foreground">% Quota Attainment</div>
        </div>
      </div>
    </div>
  )
}
