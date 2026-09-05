import { cn } from '@/lib/utils'
import type { RunState, OrderStatus } from '@/data/orders-seed'

// The shared 4-state legend, used on both Orders and Runs.
const STATE_TONE: Record<RunState, string> = {
  succeeded: 'bg-[color-mix(in_srgb,var(--color-primary),transparent_90%)] text-primary',
  in_progress: 'bg-[#e6eef9] text-[#2f5fa8]',
  waiting: 'bg-[#fdf6ec] text-[#a8681a]',
  failed: 'bg-destructive/10 text-destructive',
}

export function StateChip({ state, label }: { state: RunState; label: string }) {
  return (
    <span
      data-test-id={`state-chip-${state}`}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-sm px-2 py-0.5 font-mono text-[11px] font-medium uppercase tracking-wide',
        STATE_TONE[state],
      )}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {label}
    </span>
  )
}

const ORDER_STATE: Record<OrderStatus, RunState> = {
  Validated: 'succeeded',
  'Incentives Calculated': 'succeeded',
  New: 'in_progress',
  'Needs Review': 'waiting',
  Blocked: 'failed',
}

export function OrderStatusChip({ status }: { status: OrderStatus }) {
  return <StateChip state={ORDER_STATE[status]} label={status} />
}

// Results & Payments statuses map onto the same 4-state legend.
const RESULT_STATE: Record<string, RunState> = {
  Released: 'succeeded',
  Held: 'waiting',
  Balance: 'in_progress',
  Pending: 'in_progress',
  Failed: 'failed',
}

export function ResultStatusChip({ status }: { status: string }) {
  return <StateChip state={RESULT_STATE[status] ?? 'in_progress'} label={status} />
}
