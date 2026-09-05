import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export interface TierRow {
  id: string
  name: string
  low: string
  high: string
  rate: string
  formula: string
}

export function makeTierRow(): TierRow {
  return { id: crypto.randomUUID().slice(0, 8), name: '', low: '', high: '', rate: '', formula: '' }
}

const COLS = ['Tier Name', 'Low', 'High', 'Rate', 'Formula'] as const
const GRID = 'grid grid-cols-[1.2fr_1fr_1fr_1fr_1.4fr_44px] gap-2'

export function TieredTable({
  rows,
  onChange,
}: {
  rows: TierRow[]
  onChange: (rows: TierRow[]) => void
}) {
  function patch(id: string, key: keyof TierRow, value: string) {
    onChange(rows.map((r) => (r.id === id ? { ...r, [key]: value } : r)))
  }
  function remove(id: string) {
    onChange(rows.filter((r) => r.id !== id))
  }

  return (
    <div data-test-id="tiered-table">
      <div className="mb-4 grid grid-cols-3 gap-6 text-sm">
        <div>
          <div className="font-mono text-[11px] uppercase tracking-[0.09em] text-muted-foreground">Type</div>
          <div className="mt-0.5 text-foreground">Plan</div>
        </div>
        <div>
          <div className="font-mono text-[11px] uppercase tracking-[0.09em] text-muted-foreground">Name</div>
          <div className="mt-0.5 text-foreground">(Plan) Default</div>
        </div>
        <div>
          <div className="font-mono text-[11px] uppercase tracking-[0.09em] text-muted-foreground">Person Name</div>
          <div className="mt-0.5 text-muted-foreground">—</div>
        </div>
      </div>

      <div className="overflow-hidden rounded-md border border-border">
        <div className={`${GRID} border-b border-border bg-muted/50 px-3 py-2 font-mono text-[11px] uppercase tracking-[0.09em] text-muted-foreground`}>
          {COLS.map((c) => <span key={c}>{c}</span>)}
          <span className="sr-only">Remove</span>
        </div>

        {rows.length === 0 ? (
          <div className="px-3 py-6 text-center text-sm text-muted-foreground" data-test-id="tiered-empty">
            No tiers yet. Add a row to define your rate bands.
          </div>
        ) : (
          rows.map((r, i) => (
            <div key={r.id} className={`${GRID} items-center border-b border-border px-3 py-2 last:border-b-0`} data-test-id={`tier-row-${r.id}`}>
              <Input value={r.name} onChange={(e) => patch(r.id, 'name', e.target.value)} placeholder={`Tier ${i + 1}`} className="h-8" data-test-id={`tier-${r.id}-name`} />
              <Input value={r.low} onChange={(e) => patch(r.id, 'low', e.target.value)} type="number" placeholder="0" className="h-8" data-test-id={`tier-${r.id}-low`} />
              <Input value={r.high} onChange={(e) => patch(r.id, 'high', e.target.value)} type="number" placeholder="∞" className="h-8" data-test-id={`tier-${r.id}-high`} />
              <Input value={r.rate} onChange={(e) => patch(r.id, 'rate', e.target.value)} type="number" placeholder="%" className="h-8" data-test-id={`tier-${r.id}-rate`} />
              <Input value={r.formula} onChange={(e) => patch(r.id, 'formula', e.target.value)} placeholder="Optional formula" className="h-8 font-mono text-[12px]" data-test-id={`tier-${r.id}-formula`} />
              <Button type="button" variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-destructive" onClick={() => remove(r.id)} aria-label="Remove tier" data-test-id={`tier-${r.id}-remove`}>
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))
        )}
      </div>

      <Button type="button" variant="ghost" size="sm" className="mt-3 text-primary" onClick={() => onChange([...rows, makeTierRow()])} data-test-id="tiered-add-row">
        <Plus className="size-4" />
        Add Row
      </Button>
    </div>
  )
}
