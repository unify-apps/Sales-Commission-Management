import { Boxes, Database } from 'lucide-react'
import type { SourceObject } from '@/data/integration-seed'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'
import { SectionTitle } from './section-title'

export function ObjectSelection({
  objects,
  selected,
  onToggle,
}: {
  objects: SourceObject[]
  selected: string[]
  onToggle: (id: string) => void
}) {
  if (objects.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border py-16 text-center" data-test-id="objects-empty">
        <Database className="mx-auto size-6 text-muted-foreground" />
        <p className="mt-2 text-sm text-muted-foreground">No objects available — connect a source app first.</p>
      </div>
    )
  }
  return (
    <div>
      <SectionTitle
        title="Which objects represent the source of truth?"
        hint="Only objects from the connected app are shown. Selected objects feed the field mapping."
      />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" data-test-id="objects-grid">
        {objects.map((obj) => {
          const checked = selected.includes(obj.id)
          return (
            <button
              key={obj.id}
              type="button"
              onClick={() => onToggle(obj.id)}
              data-test-id={`object-card-${obj.id}`}
              className={cn(
                'flex flex-col gap-3 rounded-lg border p-4 text-left transition-colors',
                checked
                  ? 'border-primary bg-[color-mix(in_srgb,var(--color-primary),transparent_94%)]'
                  : 'border-border bg-card hover:bg-black/[0.03]',
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="flex size-9 items-center justify-center rounded-md bg-muted text-muted-foreground">
                    <Boxes className="size-4" />
                  </span>
                  <div className="text-[15px] font-medium leading-tight text-foreground">{obj.name}</div>
                </div>
                <Checkbox checked={checked} className="mt-1" data-test-id={`object-check-${obj.id}`} />
              </div>
              <p className="text-sm text-muted-foreground">{obj.description}</p>
              <div className="mt-auto flex items-center gap-2 pt-1">
                <span className="font-mono text-xs tabular-nums text-muted-foreground">
                  {obj.recordCount.toLocaleString()} records
                </span>
                {obj.recommended ? (
                  <Badge variant="outline" className="border-[#b7d8c4] bg-[#e9f5ee] font-normal text-[#2f6b4a]">
                    Recommended
                  </Badge>
                ) : null}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
