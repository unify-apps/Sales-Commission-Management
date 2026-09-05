import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { StickyNote, Table2, History, Save, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { REFERENCE_TABLES } from '@/data/plan-seed'
import { TieredTable, makeTierRow, type TierRow } from '@/routes/plan/formula/TieredTable'
import { CurveTable, makeCurveRow, type CurveRow } from '@/routes/plan/formula/CurveTable'

const ATTAINMENT_UNITS = ['Amount', 'Percent', 'Quantity'] as const
const PERSONAL_TARGETS = ['Full', 'Prorated', 'Formula'] as const

const TABLE_TYPES = { tiered: 'tiered', curve: 'curve' } as const
type TableType = (typeof TABLE_TYPES)[keyof typeof TABLE_TYPES]

function SectionHeader({ icon: Icon, children }: { icon: typeof StickyNote; children: string }) {
  return (
    <div className="mb-5 flex items-center gap-2">
      <Icon className="size-4 text-primary" />
      <h2 className="text-sm font-semibold text-foreground">{children}</h2>
    </div>
  )
}

function Field({ label, optional, children }: { label: string; optional?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[13px] font-semibold">
        {label}
        {optional ? <span className="ml-1 font-normal text-muted-foreground">(Optional)</span> : null}
      </Label>
      {children}
    </div>
  )
}

export default function CreateReferenceTable() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const editId = params.get('id')
  const editing = REFERENCE_TABLES.find((t) => t.id === editId) ?? null
  const tableType: TableType = (editing?.kind === TABLE_TYPES.curve || params.get('type') === TABLE_TYPES.curve)
    ? TABLE_TYPES.curve
    : TABLE_TYPES.tiered
  const isTiered = tableType === TABLE_TYPES.tiered

  const [name, setName] = useState(editing?.name ?? '')
  const [description, setDescription] = useState('')

  const [attainmentUnit, setAttainmentUnit] = useState('')
  const [tierRows, setTierRows] = useState<TierRow[]>([makeTierRow()])

  const [personalTarget, setPersonalTarget] = useState<(typeof PERSONAL_TARGETS)[number]>('Full')
  const [threshold, setThreshold] = useState('0')
  const [curveRows, setCurveRows] = useState<CurveRow[]>([makeCurveRow()])
  const [capAtTarget, setCapAtTarget] = useState(false)

  const verb = editing ? 'Edit' : 'Create'
  const title = `${verb} ${isTiered ? 'Tiered Table' : 'Curve Table'}`

  function handleSave() {
    if (!name.trim()) {
      toast.error('Name is required')
      return
    }
    const detail = isTiered ? `${tierRows.length} tier band(s)` : `${curveRows.length} curve tier(s)`
    toast.success('Reference table saved', { description: `${name} — ${detail}.` })
    navigate('/plan/reference-tables')
  }

  return (
    <div data-test-id="create-reference-table-page">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="font-mono text-[11px] uppercase tracking-[0.09em] text-muted-foreground">Reference Tables</div>
          <h1 className="mt-0.5 font-heading text-3xl font-normal text-foreground">{title}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={() => navigate('/plan/reference-tables')} data-test-id="ref-cancel">
            <X className="size-4" />
            Cancel
          </Button>
          <Button onClick={handleSave} data-test-id="ref-save">
            <Save className="size-4" />
            Save
          </Button>
        </div>
      </div>

      {/* General Details */}
      <section className="mb-6 rounded-lg border border-border bg-card p-6" data-test-id="ref-general-details">
        <SectionHeader icon={StickyNote}>General Details</SectionHeader>
        <div className="grid gap-6 lg:grid-cols-4">
          <Field label="Name">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Table name" data-test-id="ref-name" />
          </Field>
          {isTiered ? (
            <Field label="Attainment Unit Type">
              <Select value={attainmentUnit} onValueChange={setAttainmentUnit}>
                <SelectTrigger data-test-id="ref-attainment-unit"><SelectValue placeholder="Select Attainment Unit Type" /></SelectTrigger>
                <SelectContent>
                  {ATTAINMENT_UNITS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
          ) : (
            <Field label="Personal Target">
              <RadioGroup
                value={personalTarget}
                onValueChange={(v) => setPersonalTarget(v as (typeof PERSONAL_TARGETS)[number])}
                className="flex flex-wrap gap-x-5 gap-y-2 pt-1.5"
                data-test-id="ref-personal-target"
              >
                {PERSONAL_TARGETS.map((opt) => (
                  <div key={opt} className="flex items-center gap-2">
                    <RadioGroupItem value={opt} id={`pt-${opt}`} data-test-id={`ref-personal-target-${opt.toLowerCase()}`} />
                    <Label htmlFor={`pt-${opt}`} className="font-normal">{opt}</Label>
                  </div>
                ))}
              </RadioGroup>
            </Field>
          )}
          <Field label="Description" optional>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="min-h-[76px]" data-test-id="ref-description" />
          </Field>
          <Field label="Tags" optional>
            <Input placeholder="Select Tags" data-test-id="ref-tags" />
          </Field>
        </div>
      </section>

      {/* Version Info */}
      <section className="mb-6 rounded-lg border border-border bg-card p-6" data-test-id="ref-version-info">
        <SectionHeader icon={History}>Version Info</SectionHeader>
        <div className="grid gap-6 text-sm lg:grid-cols-3">
          <div>
            <div className="font-mono text-[11px] uppercase tracking-[0.09em] text-muted-foreground">Effective Start</div>
            <div className="mt-1 text-foreground">Start of Time</div>
          </div>
          <div>
            <div className="font-mono text-[11px] uppercase tracking-[0.09em] text-muted-foreground">Effective End</div>
            <div className="mt-1 text-foreground">End of Time</div>
          </div>
        </div>
      </section>

      {/* The chosen table */}
      <section className="rounded-lg border border-border bg-card p-6" data-test-id="ref-table">
        <SectionHeader icon={Table2}>{isTiered ? 'Rate Table' : 'Pay Curves'}</SectionHeader>
        {isTiered ? (
          <TieredTable rows={tierRows} onChange={setTierRows} />
        ) : (
          <CurveTable
            threshold={threshold}
            onThresholdChange={setThreshold}
            rows={curveRows}
            onChange={setCurveRows}
            capAtTarget={capAtTarget}
            onCapChange={setCapAtTarget}
          />
        )}
      </section>
    </div>
  )
}
