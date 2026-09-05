import { useState } from 'react'
import { toast } from 'sonner'
import { CircleDot, Clock } from 'lucide-react'
import { useDisputeStore, DISPUTE_STATUSES, type Dispute, type DisputeStatus } from '@/lib/store'
import { formatMoney, formatDate } from '@/lib/format'
import { DetailField, DetailSection } from '@/components/org/panel'
import { DisputeStatusChip, DisputePriorityChip } from '@/components/org/dispute-chips'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export function DisputeDetailSheet({ dispute, onClose }: { dispute: Dispute | null; onClose: () => void }) {
  const advanceStatus = useDisputeStore((s) => s.advanceStatus)
  const [nextStatus, setNextStatus] = useState<DisputeStatus>('In Review')
  const [note, setNote] = useState('')

  function handleAdvance() {
    if (!dispute) return
    advanceStatus(dispute.id, nextStatus, note.trim() || `Status set to ${nextStatus}.`)
    toast.success('Status updated', { description: `${dispute.reference} → ${nextStatus}` })
    setNote('')
  }

  return (
    <Sheet open={dispute != null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full gap-0 overflow-auto p-0 sm:!max-w-2xl" data-test-id="dispute-detail-sheet">
        {dispute ? (
          <>
            <SheetHeader className="border-b border-border px-6 py-4">
              <span className="font-mono text-sm text-muted-foreground">{dispute.reference}</span>
              <SheetTitle className="flex flex-wrap items-center gap-3 font-heading text-2xl font-normal">
                {dispute.title}
                <DisputeStatusChip status={dispute.status} />
              </SheetTitle>
            </SheetHeader>

            <div className="space-y-8 px-6 py-6">
              <DetailSection title="Details">
                <DetailField label="Type" value={dispute.type} />
                <DetailField label="Priority" value={<DisputePriorityChip priority={dispute.priority} />} />
                <DetailField label="Period" value={<span className="font-mono">{dispute.period}</span>} />
                <DetailField label="Raised By" value={dispute.raisedBy} />
                <DetailField label="Owner" value={dispute.owner} />
                <DetailField label="Flagged Value" value={<span className="font-mono text-[13px]">{dispute.flaggedValue || '—'}</span>} />
                <DetailField label="Disputed Amount" value={dispute.disputedAmount > 0 ? <span className="font-mono tabular-nums">{formatMoney(dispute.disputedAmount, dispute.currency)}</span> : '—'} />
                <DetailField label="Raised On" value={formatDate(dispute.createdAt)} />
              </DetailSection>

              <section className="space-y-2">
                <span className="font-mono text-[11px] uppercase tracking-[0.09em] text-primary">Reason</span>
                <p className="text-sm text-foreground text-pretty">{dispute.reason}</p>
              </section>

              <section data-test-id="dispute-timeline">
                <div className="mb-4 flex items-center gap-2 text-primary">
                  <Clock className="size-4" />
                  <span className="font-mono text-[11px] uppercase tracking-[0.09em]">Resolution Timeline</span>
                </div>
                <ol className="relative space-y-4 border-l border-border pl-6">
                  {dispute.timeline.map((ev, i) => (
                    <li key={i} className="relative" data-test-id={`timeline-${i}`}>
                      <CircleDot className="absolute -left-[27px] top-0.5 size-3.5 bg-card text-primary" />
                      <div className="flex flex-wrap items-baseline gap-x-2">
                        <span className="text-sm font-medium text-foreground">{ev.status}</span>
                        <span className="font-mono text-[11px] text-muted-foreground">{formatDate(ev.at)} · {ev.by}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{ev.note}</p>
                    </li>
                  ))}
                </ol>
              </section>

              {dispute.status !== 'Resolved' && dispute.status !== 'Rejected' ? (
                <section className="space-y-3 rounded-lg border border-border bg-muted/30 p-4" data-test-id="dispute-advance">
                  <span className="font-mono text-[11px] uppercase tracking-[0.09em] text-muted-foreground">Update Status</span>
                  <div className="flex flex-wrap items-end gap-3">
                    <div className="space-y-1.5">
                      <Label>New status</Label>
                      <Select value={nextStatus} onValueChange={(v) => setNextStatus(v as DisputeStatus)}>
                        <SelectTrigger className="w-40" data-test-id="advance-status"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {DISPUTE_STATUSES.filter((s) => s !== dispute.status).map((s) => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="min-w-[180px] flex-1 space-y-1.5">
                      <Label htmlFor="advance-note">Note</Label>
                      <Input id="advance-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Resolution note…" data-test-id="advance-note" />
                    </div>
                    <Button onClick={handleAdvance} data-test-id="advance-submit">Update</Button>
                  </div>
                </section>
              ) : null}
            </div>

            <div className="sticky bottom-0 flex justify-end border-t border-border bg-card px-6 py-3">
              <Button onClick={onClose} data-test-id="dispute-close">Close</Button>
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
