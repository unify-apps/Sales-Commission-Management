import { useMemo } from 'react'
import { ArrowRight, Waypoints, Wand2 } from 'lucide-react'
import {
  FIELD_TYPE_LABEL,
  OBJECT_TARGETS,
  SOURCE_FIELDS,
  TARGET_FIELDS,
  TARGET_SECTIONS,
  TRANSFORMS,
  type SourceObject,
  type TargetSection,
  type TransformId,
} from '@/data/integration-seed'
import { cn } from '@/lib/utils'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { AppIcon } from './app-icon'
import { SectionTitle } from './section-title'

export interface FieldAssignment {
  sourceId: string
  transform: TransformId
}

const UNMAPPED = '__unmapped__'
const TRANSFORM_IDS = Object.keys(TRANSFORMS) as TransformId[]
// Shared 3-column grid: Source → Transformation → Maps-to.
const MAPPING_GRID = 'grid grid-cols-[1.3fr_1fr_1.2fr] items-center gap-4'

type MappingState = Record<string, Record<string, FieldAssignment>>

export function FieldMapping({
  selectedObjects,
  objects,
  mapping,
  onAssign,
}: {
  selectedObjects: string[]
  objects: SourceObject[]
  mapping: MappingState
  onAssign: (objectId: string, targetId: string, next: FieldAssignment) => void
}) {
  if (selectedObjects.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border py-16 text-center" data-test-id="mapping-empty">
        <Waypoints className="mx-auto size-6 text-muted-foreground" />
        <p className="mt-2 text-sm text-muted-foreground">Select at least one object to map its fields.</p>
      </div>
    )
  }

  return (
    <div>
      <SectionTitle
        title="Map source fields into Topcon calculation fields"
        hint="Each object shows only the fields it exposes and the Topcon fields it can feed. Add a transformation to reshape a value before it lands."
      />
      <div className="grid gap-6" data-test-id="mapping-groups">
        {selectedObjects.map((objectId) => {
          const obj = objects.find((o) => o.id === objectId)
          if (!obj) return null
          return (
            <ObjectMappingGroup
              key={objectId}
              object={obj}
              assignments={mapping[objectId] ?? {}}
              onAssign={(targetId, next) => onAssign(objectId, targetId, next)}
            />
          )
        })}
      </div>
    </div>
  )
}

function ObjectMappingGroup({
  object,
  assignments,
  onAssign,
}: {
  object: SourceObject
  assignments: Record<string, FieldAssignment>
  onAssign: (targetId: string, next: FieldAssignment) => void
}) {
  const sourceFields = useMemo(
    () => SOURCE_FIELDS.filter((f) => f.objectId === object.id),
    [object.id],
  )
  // Group the object's target fields by the Topcon section they import into.
  const sections = useMemo(() => {
    const allowed = OBJECT_TARGETS[object.id] ?? []
    const targets = TARGET_FIELDS.filter((t) => allowed.includes(t.id))
    const order = Object.keys(TARGET_SECTIONS) as TargetSection[]
    return order
      .map((section) => ({ section, fields: targets.filter((t) => t.section === section) }))
      .filter((g) => g.fields.length > 0)
  }, [object.id])

  return (
    <div className="overflow-hidden rounded-lg border border-border" data-test-id={`mapping-group-${object.id}`}>
      <div className="flex items-center justify-between border-b border-border bg-muted/50 px-4 py-2.5">
        <div className="flex items-center gap-2.5">
          <AppIcon appId={object.appId} size="sm" />
          <span className="text-sm font-medium text-foreground">{object.name}</span>
        </div>
        <span className="font-mono text-[11px] text-muted-foreground">{sourceFields.length} source fields</span>
      </div>
      <div className={cn(MAPPING_GRID, 'border-b border-border px-4 py-2')}>
        <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground">Source field</span>
        <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground">Transformation</span>
        <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground">Maps to Topcon field</span>
      </div>

      {sections.map(({ section, fields }) => (
        <div key={section} data-test-id={`mapping-section-${object.id}-${section}`}>
          <div className="flex items-center gap-2 border-b border-border bg-accent/40 px-4 py-1.5">
            <span className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-foreground">
              {TARGET_SECTIONS[section]}
            </span>
            <span className="text-xs text-muted-foreground">· {fields.length} fields</span>
          </div>
          {fields.map((target) => (
            <MappingRow
              key={target.id}
              objectId={object.id}
              target={target}
              sourceFields={sourceFields}
              assignment={assignments[target.id]}
              onAssign={onAssign}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

function MappingRow({
  objectId,
  target,
  sourceFields,
  assignment,
  onAssign,
}: {
  objectId: string
  target: (typeof TARGET_FIELDS)[number]
  sourceFields: typeof SOURCE_FIELDS
  assignment: FieldAssignment | undefined
  onAssign: (targetId: string, next: FieldAssignment) => void
}) {
  const sourceValue = assignment?.sourceId || UNMAPPED
  const transformValue: TransformId = assignment?.transform ?? 'none'
  const compatible = sourceFields.filter((f) => f.type === target.type)
  const others = sourceFields.filter((f) => f.type !== target.type)

  return (
    <div
      className={cn(MAPPING_GRID, 'border-b border-border px-4 py-3 last:border-0')}
      data-test-id={`mapping-row-${objectId}-${target.id}`}
    >
      {/* Source field */}
      <Select
        value={sourceValue}
        onValueChange={(v) => onAssign(target.id, { sourceId: v === UNMAPPED ? '' : v, transform: transformValue })}
      >
        <SelectTrigger data-test-id={`mapping-source-${objectId}-${target.id}`} className="w-full">
          <SelectValue placeholder="Choose source field" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={UNMAPPED}>Not mapped</SelectItem>
          {[...compatible, ...others].map((f) => (
            <SelectItem key={f.id} value={f.id}>
              <span className="font-mono text-[13px]">{f.name}</span>
              <span className="ml-2 text-muted-foreground">· {FIELD_TYPE_LABEL[f.type]}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Transformation */}
      <div className="flex items-center gap-2">
        <Wand2 className="size-4 shrink-0 text-muted-foreground" />
        <Select
          value={transformValue}
          disabled={!assignment?.sourceId}
          onValueChange={(v) => onAssign(target.id, { sourceId: assignment?.sourceId ?? '', transform: v as TransformId })}
        >
          <SelectTrigger data-test-id={`mapping-transform-${objectId}-${target.id}`} className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TRANSFORM_IDS.map((t) => (
              <SelectItem key={t} value={t}>
                {TRANSFORMS[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Maps to Topcon field */}
      <div className="flex min-w-0 items-center gap-2">
        <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-medium text-foreground">{target.name}</span>
            {target.required ? (
              <span className="text-xs font-medium text-destructive" data-test-id={`required-${objectId}-${target.id}`}>
                Required
              </span>
            ) : null}
          </div>
          <p className="truncate text-xs text-muted-foreground">{FIELD_TYPE_LABEL[target.type]} · {target.description}</p>
        </div>
      </div>
    </div>
  )
}
