import { cn } from '@/lib/utils'
import type { DisputeStatus, DisputePriority } from '@/lib/store'

const STATUS_TONE: Record<DisputeStatus, string> = {
  Open: 'bg-[#e6eef9] text-[#2f5fa8]',
  'In Review': 'bg-[#fdf6ec] text-[#a8681a]',
  Resolved: 'bg-[color-mix(in_srgb,var(--color-primary),transparent_90%)] text-primary',
  Rejected: 'bg-muted text-muted-foreground',
}

export function DisputeStatusChip({ status }: { status: DisputeStatus }) {
  return (
    <span
      data-test-id={`dispute-status-${status.toLowerCase().replace(/\s+/g, '-')}`}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-sm px-2 py-0.5 font-mono text-[11px] font-medium uppercase tracking-wide',
        STATUS_TONE[status],
      )}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {status}
    </span>
  )
}

const PRIORITY_TONE: Record<DisputePriority, string> = {
  High: 'border-destructive/30 bg-destructive/10 text-destructive',
  Medium: 'border-[#e8c894] bg-[#fdf6ec] text-[#a8681a]',
  Low: 'border-border bg-muted text-muted-foreground',
}

export function DisputePriorityChip({ priority }: { priority: DisputePriority }) {
  return (
    <span
      data-test-id={`dispute-priority-${priority.toLowerCase()}`}
      className={cn('inline-flex items-center rounded-sm border px-2 py-0.5 text-[11px] font-medium', PRIORITY_TONE[priority])}
    >
      {priority}
    </span>
  )
}
