import { useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, Check, CheckCircle2, Plug } from 'lucide-react'
import { toast } from 'sonner'
import { useData } from '@/lib/data'
import {
  SOURCE_APPS,
  SOURCE_OBJECTS,
  SUGGESTED_MAPPING,
  TARGET_FIELDS,
  type SourceApp,
  type SourceObject,
} from '@/data/integration-seed'
import { PageHeader } from '@/components/org/page-header'
import { Button } from '@/components/ui/button'
import { AppIcon } from '@/components/integration/app-icon'
import { AppSelection } from '@/components/integration/app-selection'
import { ObjectSelection } from '@/components/integration/object-selection'
import { FieldMapping, type FieldAssignment } from '@/components/integration/field-mapping'

type StepId = 'app' | 'objects' | 'mapping'

interface Step {
  id: StepId
  label: string
  hint: string
}

const STEPS: Step[] = [
  { id: 'app', label: 'Connect App', hint: 'Choose & authenticate a source' },
  { id: 'objects', label: 'Object Selection', hint: 'Pick the source of truth' },
  { id: 'mapping', label: 'Field Mapping', hint: 'Align & transform fields' },
]

// mapping[objectId][targetId] -> { sourceId, transform }
type MappingState = Record<string, Record<string, FieldAssignment>>

function buildSuggested(objectIds: string[]): MappingState {
  const next: MappingState = {}
  for (const objId of objectIds) {
    const suggestion = SUGGESTED_MAPPING[objId] ?? {}
    next[objId] = {}
    for (const [targetId, sourceId] of Object.entries(suggestion)) {
      next[objId][targetId] = { sourceId, transform: 'none' }
    }
  }
  return next
}

export default function Integration() {
  const { data: apps } = useData<SourceApp[]>('integration-apps', 'seed', SOURCE_APPS)
  const { data: objects } = useData<SourceObject[]>('integration-objects', 'seed', SOURCE_OBJECTS)

  const [step, setStep] = useState<StepId>('app')
  const [connectedApp, setConnectedApp] = useState<string | null>(null)
  const [selectedObjects, setSelectedObjects] = useState<string[]>([])
  const [mapping, setMapping] = useState<MappingState>({})

  const stepIndex = STEPS.findIndex((s) => s.id === step)
  const isFirst = stepIndex === 0
  const isLast = stepIndex === STEPS.length - 1

  const appObjects = useMemo(
    () => (objects ?? []).filter((o) => o.appId === connectedApp),
    [objects, connectedApp],
  )
  const activeApp = (apps ?? []).find((a) => a.id === connectedApp) ?? null

  const requiredMapped = useMemo(() => {
    const requiredTargets = TARGET_FIELDS.filter((t) => t.required).map((t) => t.id)
    return selectedObjects.every((objId) =>
      requiredTargets.every((tid) => {
        // Only enforce a required target if this object actually exposes it.
        const objTargets = mapping[objId] ?? {}
        return objTargets[tid]?.sourceId
      }),
    )
  }, [mapping, selectedObjects])

  function handleConnect(appId: string) {
    setConnectedApp(appId)
    setSelectedObjects([])
    setMapping({})
    const app = SOURCE_APPS.find((a) => a.id === appId)
    toast.success(`Connected to ${app?.name ?? 'source'} — authentication succeeded.`)
  }

  function toggleObject(id: string) {
    setSelectedObjects((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
      setMapping(buildSuggested(next))
      return next
    })
  }

  function assign(objectId: string, targetId: string, next: FieldAssignment) {
    setMapping((prev) => ({
      ...prev,
      [objectId]: { ...(prev[objectId] ?? {}), [targetId]: next },
    }))
  }

  function goNext() {
    if (step === 'app' && !connectedApp) {
      toast.error('Connect a source app to continue.')
      return
    }
    if (step === 'objects' && selectedObjects.length === 0) {
      toast.error('Select at least one object to continue.')
      return
    }
    if (step === 'mapping') {
      if (!requiredMapped) {
        toast.error('Map every required field before saving.')
        return
      }
      toast.success('Data mapping saved — sync configuration is ready.')
      return
    }
    setStep(STEPS[stepIndex + 1].id)
  }

  function goBack() {
    if (!isFirst) setStep(STEPS[stepIndex - 1].id)
  }

  return (
    <div data-test-id="integration-page">
      <PageHeader
        eyebrow="Sync Wizard"
        title="Integration Data Mapping"
        subtitle="Connect a source app, choose the objects that are your source of truth, then map and transform their fields into Topcon commission fields."
        actions={
          activeApp ? (
            <div
              className="flex items-center gap-2 rounded-md border border-[#b7d8c4] bg-[#e9f5ee] px-3 py-1.5"
              data-test-id="connection-status"
            >
              <AppIcon appId={activeApp.id} size="sm" />
              <span className="text-sm font-medium text-[#2f6b4a]">{activeApp.name} · Connected</span>
              <CheckCircle2 className="size-4 text-[#2f6b4a]" />
            </div>
          ) : (
            <div
              className="flex items-center gap-2 rounded-md border border-border bg-muted/50 px-3 py-1.5"
              data-test-id="connection-status"
            >
              <Plug className="size-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">No source connected</span>
            </div>
          )
        }
      />

      <Stepper current={step} onSelect={setStep} canReach={{ app: true, objects: !!connectedApp, mapping: selectedObjects.length > 0 }} />

      <div className="mt-6 min-h-[420px]" data-test-id="wizard-body">
        {step === 'app' ? (
          <AppSelection apps={apps ?? []} connectedApp={connectedApp} onConnect={handleConnect} />
        ) : null}
        {step === 'objects' ? (
          <ObjectSelection objects={appObjects} selected={selectedObjects} onToggle={toggleObject} />
        ) : null}
        {step === 'mapping' ? (
          <FieldMapping selectedObjects={selectedObjects} objects={objects ?? []} mapping={mapping} onAssign={assign} />
        ) : null}
      </div>

      <div className="mt-8 flex items-center justify-between border-t border-border pt-5" data-test-id="wizard-footer">
        <Button variant="ghost" onClick={goBack} disabled={isFirst} data-test-id="wizard-back">
          <ArrowLeft className="size-4" />
          Back
        </Button>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground" data-test-id="wizard-step-count">
            Step {stepIndex + 1} of {STEPS.length}
          </span>
          <Button onClick={goNext} data-test-id="wizard-next">
            {isLast ? 'Save mapping' : 'Continue'}
            {isLast ? <Check className="size-4" /> : <ArrowRight className="size-4" />}
          </Button>
        </div>
      </div>
    </div>
  )
}

function Stepper({
  current,
  onSelect,
  canReach,
}: {
  current: StepId
  onSelect: (id: StepId) => void
  canReach: Record<StepId, boolean>
}) {
  const currentIndex = STEPS.findIndex((s) => s.id === current)
  return (
    <ol className="grid gap-3 sm:grid-cols-3" data-test-id="wizard-stepper">
      {STEPS.map((s, i) => {
        const active = s.id === current
        const done = i < currentIndex
        const reachable = canReach[s.id]
        return (
          <li key={s.id}>
            <button
              type="button"
              disabled={!reachable}
              onClick={() => reachable && onSelect(s.id)}
              data-test-id={`stepper-${s.id}`}
              className={
                'flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left transition-colors ' +
                (active
                  ? 'border-primary bg-[color-mix(in_srgb,var(--color-primary),transparent_92%)]'
                  : reachable
                    ? 'border-border bg-card hover:bg-black/[0.03]'
                    : 'border-border bg-card opacity-55')
              }
            >
              <span
                className={
                  'flex size-9 shrink-0 items-center justify-center rounded-md font-mono text-sm ' +
                  (done
                    ? 'bg-[#e9f5ee] text-[#2f6b4a]'
                    : active
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground')
                }
              >
                {done ? <Check className="size-4" /> : i + 1}
              </span>
              <span className="min-w-0 flex-1 leading-tight">
                <span className="block text-[15px] font-medium text-foreground">{s.label}</span>
                <span className="block truncate text-xs text-muted-foreground">{s.hint}</span>
              </span>
            </button>
          </li>
        )
      })}
    </ol>
  )
}
