import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  action?: ReactNode
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-card px-6 py-16 text-center"
      data-test-id="empty-state"
    >
      <div className="flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icon className="size-5" />
      </div>
      <h3 className="font-heading text-xl font-normal text-foreground">{title}</h3>
      <p className="max-w-[46ch] text-sm text-muted-foreground text-pretty">{description}</p>
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  )
}
