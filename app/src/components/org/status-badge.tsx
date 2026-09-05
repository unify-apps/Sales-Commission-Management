import { cn } from '@/lib/utils'
import type { EmployeeStatus } from '@/data/org-seed'

const TONE: Record<string, string> = {
  Active: 'bg-[color-mix(in_srgb,var(--color-primary),transparent_90%)] text-primary',
  Terminated: 'bg-destructive/10 text-destructive',
  'On Leave': 'bg-[#fdf6ec] text-[#a8681a]',
}

export function StatusBadge({ status }: { status: EmployeeStatus }) {
  return (
    <span
      data-test-id={`status-badge-${status.toLowerCase().replace(/\s+/g, '-')}`}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-sm border border-transparent px-2 py-0.5 font-mono text-[11px] font-medium uppercase tracking-wide',
        TONE[status] ?? 'bg-muted text-muted-foreground',
      )}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {status}
    </span>
  )
}
