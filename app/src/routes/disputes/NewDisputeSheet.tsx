import { useState } from 'react'
import { toast } from 'sonner'
import {
  useDisputeStore,
  DISPUTE_TYPES,
  DISPUTE_PRIORITIES,
  type DisputeType,
  type DisputePriority,
} from '@/lib/store'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
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

const OWNERS = ['Anita Serrano', 'Michael Maas', 'Kenji Watanabe', 'Diane Whitlock'] as const
const PERIODS = ['FEB-2026', 'JAN-2026', 'DEC-2025'] as const
const CURRENCIES = ['USD', 'EUR', 'SGD', 'GBP'] as const

export function NewDisputeSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const addDispute = useDisputeStore((s) => s.addDispute)

  const [title, setTitle] = useState('')
  const [type, setType] = useState<DisputeType>('Credit')
  const [priority, setPriority] = useState<DisputePriority>('Medium')
  const [owner, setOwner] = useState<string>(OWNERS[0])
  const [period, setPeriod] = useState<string>(PERIODS[0])
  const [flaggedValue, setFlaggedValue] = useState('')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState<string>('USD')
  const [reason, setReason] = useState('')

  function reset() {
    setTitle('')
    setType('Credit')
    setPriority('Medium')
    setOwner(OWNERS[0])
    setPeriod(PERIODS[0])
    setFlaggedValue('')
    setAmount('')
    setCurrency('USD')
    setReason('')
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const created = addDispute({
      title: title.trim(),
      type,
      priority,
      owner,
      period,
      flaggedValue: flaggedValue.trim(),
      disputedAmount: Number(amount) || 0,
      currency,
      reason: reason.trim(),
    })
    toast.success('Dispute raised', { description: `${created.reference} routed to ${owner}.` })
    reset()
    onOpenChange(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 overflow-auto p-0 sm:!max-w-xl" data-test-id="new-dispute-sheet">
        <SheetHeader className="border-b border-border px-6 py-4">
          <SheetTitle className="font-heading text-2xl font-normal">Raise a Dispute</SheetTitle>
          <SheetDescription>Flag a number for review. It routes to the owner and is tracked to resolution.</SheetDescription>
        </SheetHeader>
        <form className="space-y-5 px-6 py-6" onSubmit={handleSubmit} data-test-id="new-dispute-form">
          <div className="space-y-1.5">
            <Label htmlFor="nd-title">Summary *</Label>
            <Input id="nd-title" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Missing credit on Feb renewal" data-test-id="nd-title" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Dispute Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as DisputeType)}>
                <SelectTrigger data-test-id="nd-type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DISPUTE_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as DisputePriority)}>
                <SelectTrigger data-test-id="nd-priority"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DISPUTE_PRIORITIES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Route to Owner</Label>
              <Select value={owner} onValueChange={setOwner}>
                <SelectTrigger data-test-id="nd-owner"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {OWNERS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Period</Label>
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger data-test-id="nd-period"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PERIODS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="nd-flagged">Flagged Value <span className="text-muted-foreground/70">(order, result or item code)</span></Label>
            <Input id="nd-flagged" value={flaggedValue} onChange={(e) => setFlaggedValue(e.target.value)} placeholder="e.g. CTI821238_FEB-2026" className="font-mono text-[13px]" data-test-id="nd-flagged" />
          </div>

          <div className="grid grid-cols-[1fr_120px] gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="nd-amount">Disputed Amount</Label>
              <Input id="nd-amount" type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" data-test-id="nd-amount" />
            </div>
            <div className="space-y-1.5">
              <Label>Currency</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger data-test-id="nd-currency"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="nd-reason">Reason *</Label>
            <Textarea id="nd-reason" required value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Describe why this number is wrong…" className="min-h-24" data-test-id="nd-reason" />
          </div>

          <SheetFooter className="px-0">
            <Button type="submit" data-test-id="nd-submit">Raise Dispute</Button>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}
