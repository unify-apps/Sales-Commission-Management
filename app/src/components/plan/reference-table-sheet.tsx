import { useNavigate } from 'react-router-dom'
import { Pencil, StickyNote, History, Table2, TrendingUp } from 'lucide-react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from 'recharts'
import type { ReferenceTable } from '@/data/plan-seed'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { DetailField, DetailSection } from '@/components/org/panel'

const TIER_COLS = ['Tier Name', 'Low', 'High', 'Rate', 'Formula'] as const
const CURVE_POINTS = [0, 100, 130, 150, 200, 300] as const
const TIER_EDGES = [0, 100000, 500000, 1500000, 5000000, 15000000, 50000000] as const

/** Deterministic sample tier bands derived from the table's row count. */
function sampleTiers(table: ReferenceTable) {
  const count = Math.max(1, Math.min(table.rows, 6))
  return Array.from({ length: count }, (_, i) => ({
    name: `Tier-${i + 1}`,
    low: TIER_EDGES[i].toLocaleString(),
    high: (TIER_EDGES[i + 1] ?? 0).toLocaleString(),
    rate: (3 + i * 0.5).toString(),
  }))
}

function curveData() {
  return CURVE_POINTS.map((x) => ({ x, y: x }))
}

export function ReferenceTableSheet({
  table,
  open,
  onOpenChange,
}: {
  table: ReferenceTable | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const navigate = useNavigate()
  if (!table) return null

  const isCurve = table.kind === 'curve'
  const editType = isCurve ? 'curve' : 'tiered'

  function handleEdit() {
    if (!table) return
    onOpenChange(false)
    navigate(`/plan/reference-tables/new?type=${editType}&id=${table.id}`)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 p-0 sm:!max-w-4xl"
        data-test-id="reference-table-sheet"
      >
        <SheetHeader className="flex-row items-center justify-between gap-3 space-y-0 border-b border-border py-4 pl-6 pr-14">
          <SheetTitle className="min-w-0 truncate font-heading text-2xl font-normal">{table.name}</SheetTitle>
          <Button variant="outline" size="sm" onClick={handleEdit} className="shrink-0" data-test-id="reference-table-edit">
            <Pencil className="size-4" />
            Edit
          </Button>
        </SheetHeader>

        <div className="flex-1 space-y-5 overflow-y-auto bg-muted/50 px-6 py-6">
          <DetailSection title="General Details" icon={<StickyNote className="size-4" />}>
            <DetailField label="Name" value={table.name} />
            <DetailField label={isCurve ? 'Unit Type' : 'Attainment Unit Type'} value={table.unitType} />
            <DetailField label="Kind" value={isCurve ? 'Curve' : 'Tiered'} />
            <DetailField label="Type" value={table.type} />
          </DetailSection>

          <DetailSection title="Version Info" icon={<History className="size-4" />}>
            <DetailField label="Effective Start" value={table.effectiveStart} />
            <DetailField label="Effective End" value="End of Time" />
            <DetailField label="Version" value={table.version} />
          </DetailSection>

          <DetailSection title={isCurve ? 'Pay Curve' : 'Rate Table'} icon={isCurve ? <TrendingUp className="size-4" /> : <Table2 className="size-4" />}>
            <DetailField label="Assignment" value={table.type} />
            <DetailField label="Name" value={table.assignmentName ?? '(Plan) Default'} />
            <DetailField label="Person Name" value={table.personName ?? '—'} />
            <div className="sm:col-span-4">
            {isCurve ? (
              <div className="rounded-lg border border-border bg-card p-4" data-test-id="sheet-curve-chart">
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={curveData()} margin={{ top: 8, right: 12, bottom: 8, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                      <XAxis
                        dataKey="x"
                        type="number"
                        domain={[0, 300]}
                        tick={{ fontSize: 11 }}
                        stroke="var(--color-muted-foreground)"
                        label={{ value: '% Quota Attainment', position: 'insideBottom', offset: -4, fontSize: 11 }}
                      />
                      <YAxis
                        domain={[0, 300]}
                        tick={{ fontSize: 11 }}
                        stroke="var(--color-muted-foreground)"
                        label={{ value: '% Personal Target', angle: -90, position: 'insideLeft', fontSize: 11 }}
                      />
                      <Area type="monotone" dataKey="y" stroke="var(--chart-1)" fill="var(--chart-1)" fillOpacity={0.15} dot />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : (
              <div className="overflow-hidden rounded-lg border border-border" data-test-id="sheet-tiered-grid">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      {TIER_COLS.map((c) => (
                        <th key={c} className="px-3 py-2.5 text-left font-medium text-muted-foreground">{c}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sampleTiers(table).map((row) => (
                      <tr key={row.name} className="border-b border-border last:border-0" data-test-id={`sheet-tier-${row.name}`}>
                        <td className="px-3 py-2.5 text-foreground">{row.name}</td>
                        <td className="px-3 py-2.5 font-mono text-[12px] tabular-nums text-foreground">{row.low}</td>
                        <td className="px-3 py-2.5 font-mono text-[12px] tabular-nums text-foreground">{row.high}</td>
                        <td className="px-3 py-2.5 font-mono text-[12px] tabular-nums text-foreground">{row.rate}</td>
                        <td className="px-3 py-2.5 text-muted-foreground">—</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            </div>
          </DetailSection>
        </div>
      </SheetContent>
    </Sheet>
  )
}
