import { Plus, Info, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

const DATA_OBJECTS = ['Transaction', 'Order', 'Credit', 'Quota', 'Attainment'] as const
const SYSTEM_FUNCTIONS = ['SUM', 'IF', 'MIN', 'MAX', 'ROUND', 'LOOKUP'] as const
const OPERATORS = ['InputBox', '+', '-', '*', '/', '%', '^', '(', ')', 'Formula'] as const

function LabelWithInfo({ children, hint }: { children: string; hint: string }) {
  return (
    <div className="mb-1.5 flex items-center gap-1.5">
      <Label className="text-[13px] font-semibold">{children}</Label>
      <Tooltip>
        <TooltipTrigger asChild>
          <button type="button" className="text-muted-foreground hover:text-foreground" aria-label={`About ${children}`}>
            <Info className="size-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top">{hint}</TooltipContent>
      </Tooltip>
    </div>
  )
}

export function ExpressionBuilder({
  tokens,
  onAppend,
  onClear,
}: {
  tokens: string[]
  onAppend: (token: string) => void
  onClear: () => void
}) {
  return (
    <div data-test-id="expression-builder">
      <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
        <div className="min-w-[200px]">
          <LabelWithInfo hint="Pick a data object to insert one of its fields.">Data Objects</LabelWithInfo>
          <div className="flex items-center gap-2">
            <Select onValueChange={(v) => onAppend(v)}>
              <SelectTrigger className="w-[200px]" data-test-id="expr-data-object"><SelectValue placeholder="Select Data Object" /></SelectTrigger>
              <SelectContent>
                {DATA_OBJECTS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
              </SelectContent>
            </Select>
            <Plus className="size-5 text-primary" aria-hidden />
          </div>
        </div>

        <div className="min-w-[200px]">
          <LabelWithInfo hint="Insert a system function into the expression.">System Functions</LabelWithInfo>
          <div className="flex items-center gap-2">
            <Select onValueChange={(v) => onAppend(`${v}()`)}>
              <SelectTrigger className="w-[200px]" data-test-id="expr-system-function"><SelectValue placeholder="Select System Function" /></SelectTrigger>
              <SelectContent>
                {SYSTEM_FUNCTIONS.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
              </SelectContent>
            </Select>
            <Plus className="size-5 text-primary" aria-hidden />
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {OPERATORS.map((op) => (
            <Button
              key={op}
              type="button"
              variant="outline"
              size="sm"
              className="h-9 min-w-9 font-mono"
              onClick={() => onAppend(op)}
              data-test-id={`expr-op-${op.toLowerCase().replace(/[^a-z0-9]/g, '') || 'sym'}`}
            >
              {op}
            </Button>
          ))}
        </div>
      </div>

      <div
        className="mt-4 min-h-[140px] rounded-md border border-border bg-muted/30 p-4 font-mono text-[13px] text-foreground"
        data-test-id="expr-canvas"
      >
        {tokens.length === 0 ? (
          <span className="text-muted-foreground/60">Build your expression by choosing objects, functions and operators above…</span>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {tokens.map((t, i) => (
              <span key={`${t}-${i}`} className="rounded bg-card px-2 py-1 shadow-sm ring-1 ring-border" data-test-id={`expr-token-${i}`}>
                {t}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="mt-2 flex items-center justify-between">
        <Button type="button" variant="ghost" size="sm" className="text-primary" onClick={onClear} data-test-id="expr-clear">
          <X className="size-4" />
          Clear
        </Button>
        <p className="text-[12px] text-muted-foreground">Select an object, then click an element in the expression to build it.</p>
      </div>
    </div>
  )
}
