import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { StickyNote, Table2, Save, X } from 'lucide-react'
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
import { ExpressionBuilder } from './ExpressionBuilder'

const FORMULA_TYPES = ['Numeric', 'Relational', 'String'] as const

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

export default function CreateFormula() {
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [formulaType, setFormulaType] = useState<(typeof FORMULA_TYPES)[number]>('Numeric')
  const [description, setDescription] = useState('')
  const [tokens, setTokens] = useState<string[]>([])

  function handleSave() {
    if (!name.trim()) {
      toast.error('Name is required')
      return
    }
    toast.success('Formula saved', { description: name })
    navigate('/plan/formulas')
  }

  return (
    <div data-test-id="create-formula-page">
      {/* Full-width action bar */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-heading text-3xl font-normal text-foreground">Create Formula</h1>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={() => navigate('/plan/formulas')} data-test-id="formula-cancel">
            <X className="size-4" />
            Cancel
          </Button>
          <Button onClick={handleSave} data-test-id="formula-save">
            <Save className="size-4" />
            Save
          </Button>
        </div>
      </div>

      {/* General Details */}
      <section className="mb-6 rounded-lg border border-border bg-card p-6" data-test-id="general-details">
        <SectionHeader icon={StickyNote}>General Details</SectionHeader>
        <div className="grid gap-6 lg:grid-cols-4">
          <Field label="Name">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Formula name" data-test-id="formula-name" />
          </Field>
          <Field label="Formula Type">
            <Select value={formulaType} onValueChange={(v) => setFormulaType(v as (typeof FORMULA_TYPES)[number])}>
              <SelectTrigger data-test-id="formula-type"><SelectValue /></SelectTrigger>
              <SelectContent>
                {FORMULA_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Description" optional>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="min-h-[76px]" data-test-id="formula-description" />
          </Field>
          <Field label="Tags" optional>
            <Input placeholder="Select Tags" data-test-id="formula-tags" />
          </Field>
        </div>
      </section>

      {/* Formula Expression */}
      <section className="mb-6 rounded-lg border border-border bg-card p-6" data-test-id="formula-expression">
        <SectionHeader icon={Table2}>Formula Expression</SectionHeader>
        <ExpressionBuilder
          tokens={tokens}
          onAppend={(t) => setTokens((prev) => [...prev, t])}
          onClear={() => setTokens([])}
        />
      </section>
    </div>
  )
}
