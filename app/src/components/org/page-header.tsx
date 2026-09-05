import type { ReactNode } from 'react'

interface PageHeaderProps {
  eyebrow?: string
  title: string
  subtitle?: string
  meta?: string
  actions?: ReactNode
}

export function PageHeader({ eyebrow, title, subtitle, meta, actions }: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-col gap-1.5" data-test-id="page-header">
      {eyebrow ? (
        <div className="font-mono text-[11px] font-medium uppercase tracking-[0.09em] text-muted-foreground" data-test-id="page-header-eyebrow">
          {eyebrow}
        </div>
      ) : null}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-heading text-3xl font-normal tracking-tight text-foreground text-balance" data-test-id="page-header-title">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-1 max-w-[82ch] text-[15px] text-muted-foreground" data-test-id="page-header-subtitle">
              {subtitle}
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-2 pt-1" data-test-id="page-header-actions">
          {meta ? <span className="mr-1 text-sm text-muted-foreground">{meta}</span> : null}
          {actions}
        </div>
      </div>
    </div>
  )
}
