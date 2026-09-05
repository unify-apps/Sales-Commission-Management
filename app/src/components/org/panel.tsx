import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function Panel({
  children,
  className,
  padded = false,
  ...rest
}: { children: ReactNode; className?: string; padded?: boolean } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <section
      className={cn(
        'overflow-hidden rounded-lg border border-border bg-card',
        padded && 'p-5',
        className,
      )}
      {...rest}
    >
      {children}
    </section>
  )
}

export function RecordName({ name, sub }: { name: string; sub?: string }) {
  return (
    <div className="min-w-0">
      <div className="font-heading text-[15px] leading-snug text-foreground">{name}</div>
      {sub ? <div className="truncate text-[13px] text-muted-foreground">{sub}</div> : null}
    </div>
  )
}

export function Mono({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn('font-mono text-[13px] tabular-nums text-foreground', className)}>{children}</span>
}

export function DetailField({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5" data-test-id={`field-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}>
      <span className="font-mono text-[11px] uppercase tracking-[0.09em] text-muted-foreground">{label}</span>
      <span className="text-sm text-foreground">{value}</span>
    </div>
  )
}

export function DetailSection({ title, icon, children }: { title: string; icon?: ReactNode; children: ReactNode }) {
  return (
    <section
      className="overflow-hidden rounded-lg border border-border bg-card shadow-sm"
      data-test-id={`detail-section-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
    >
      <div className="flex items-center gap-2 border-b border-border bg-muted/50 px-5 py-3 text-primary">
        {icon}
        <span className="font-mono text-[11px] uppercase tracking-[0.09em]">{title}</span>
      </div>
      <div className="grid grid-cols-2 gap-x-8 gap-y-5 p-5 sm:grid-cols-3 lg:grid-cols-4">{children}</div>
    </section>
  )
}
