import { useState } from 'react'
import { cn } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export type FieldKind = 'text' | 'number' | 'select' | 'checkbox'

export interface CreateField {
  name: string
  label: string
  kind?: FieldKind
  placeholder?: string
  required?: boolean
  options?: string[]
  full?: boolean
  // For checkbox fields: extra help text under the label.
  hint?: string
}

export type CreateValues = Record<string, string>

function buildInitial(fields: CreateField[]): CreateValues {
  return fields.reduce<CreateValues>((acc, f) => {
    acc[f.name] = ''
    return acc
  }, {})
}

export function CreateRecordDialog({
  open,
  onOpenChange,
  title,
  description,
  fields,
  submitLabel = 'Create',
  onSubmit,
  testId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  fields: CreateField[]
  submitLabel?: string
  onSubmit: (values: CreateValues) => void
  testId?: string
}) {
  const [values, setValues] = useState<CreateValues>(() => buildInitial(fields))
  const [touched, setTouched] = useState(false)

  const missing = fields.filter((f) => f.required && !values[f.name]?.trim()).map((f) => f.name)
  const isValid = missing.length === 0

  function setField(name: string, value: string) {
    setValues((prev) => ({ ...prev, [name]: value }))
  }

  function handleOpenChange(next: boolean) {
    if (!next) {
      setValues(buildInitial(fields))
      setTouched(false)
    }
    onOpenChange(next)
  }

  function handleSubmit() {
    setTouched(true)
    if (!isValid) return
    onSubmit(values)
    handleOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg" data-test-id={testId ?? 'create-record-dialog'}>
        <DialogHeader>
          <DialogTitle className="font-heading text-xl font-normal">{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>

        <form
          className="grid grid-cols-1 gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault()
            handleSubmit()
          }}
        >
          {fields.map((field) => {
            const fieldId = `create-field-${field.name}`
            const showError = touched && field.required && !values[field.name]?.trim()

            if (field.kind === 'checkbox') {
              const checked = values[field.name] === 'true'
              return (
                <label
                  key={field.name}
                  htmlFor={fieldId}
                  className={cn('flex items-start gap-3 rounded-md border border-border bg-muted/50 px-3 py-2.5', field.full && 'sm:col-span-2')}
                >
                  <Checkbox
                    id={fieldId}
                    checked={checked}
                    onCheckedChange={(v) => setField(field.name, v === true ? 'true' : '')}
                    className="mt-0.5"
                    data-test-id={fieldId}
                  />
                  <span className="text-sm">
                    <span className="font-medium text-foreground">{field.label}</span>
                    {field.hint ? <span className="block text-[13px] text-muted-foreground">{field.hint}</span> : null}
                  </span>
                </label>
              )
            }

            return (
              <div key={field.name} className={cn('flex flex-col gap-1.5', field.full && 'sm:col-span-2')}>
                <Label htmlFor={fieldId} className="text-[13px] text-muted-foreground">
                  {field.label}
                  {field.required ? <span className="ml-0.5 text-destructive">*</span> : null}
                </Label>

                {field.kind === 'select' ? (
                  <Select value={values[field.name]} onValueChange={(v) => setField(field.name, v)}>
                    <SelectTrigger
                      id={fieldId}
                      className={cn(showError && 'border-destructive')}
                      data-test-id={`${fieldId}-trigger`}
                    >
                      <SelectValue placeholder={field.placeholder ?? 'Select…'} />
                    </SelectTrigger>
                    <SelectContent>
                      {(field.options ?? []).map((opt) => (
                        <SelectItem key={opt} value={opt} data-test-id={`${fieldId}-option-${opt.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}>
                          {opt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    id={fieldId}
                    type={field.kind === 'number' ? 'number' : 'text'}
                    value={values[field.name]}
                    placeholder={field.placeholder}
                    onChange={(e) => setField(field.name, e.target.value)}
                    className={cn(showError && 'border-destructive')}
                    data-test-id={fieldId}
                  />
                )}

                {showError ? (
                  <span className="text-xs text-destructive" data-test-id={`${fieldId}-error`}>
                    {field.label} is required.
                  </span>
                ) : null}
              </div>
            )
          })}
        </form>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} data-test-id="create-dialog-cancel">
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={touched && !isValid} data-test-id="create-dialog-submit">
            {submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
