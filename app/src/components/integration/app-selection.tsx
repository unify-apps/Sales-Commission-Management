import { Check, Plug } from 'lucide-react'
import type { SourceApp } from '@/data/integration-seed'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { AppIcon } from './app-icon'
import { SectionTitle } from './section-title'

export function AppSelection({
  apps,
  connectedApp,
  onConnect,
}: {
  apps: SourceApp[]
  connectedApp: string | null
  onConnect: (appId: string) => void
}) {
  if (apps.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border py-16 text-center" data-test-id="apps-empty">
        <Plug className="mx-auto size-6 text-muted-foreground" />
        <p className="mt-2 text-sm text-muted-foreground">No source apps are available to connect.</p>
      </div>
    )
  }
  return (
    <div>
      <SectionTitle
        title="Choose a source app and connect it"
        hint="Authenticate the app that holds your deal data. Only one source is synced at a time."
      />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" data-test-id="apps-grid">
        {apps.map((app) => {
          const connected = connectedApp === app.id
          return (
            <div
              key={app.id}
              className={cn(
                'flex flex-col gap-3 rounded-lg border p-4',
                connected ? 'border-primary bg-[color-mix(in_srgb,var(--color-primary),transparent_94%)]' : 'border-border bg-card',
              )}
              data-test-id={`app-card-${app.id}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <AppIcon appId={app.id} />
                  <div className="leading-tight">
                    <div className="text-[15px] font-medium text-foreground">{app.name}</div>
                    <div className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">{app.category}</div>
                  </div>
                </div>
                {connected ? (
                  <Badge variant="outline" className="border-[#b7d8c4] bg-[#e9f5ee] font-normal text-[#2f6b4a]">
                    <Check className="size-3" />
                    Connected
                  </Badge>
                ) : null}
              </div>
              <p className="text-sm text-muted-foreground">{app.description}</p>
              <Button
                variant={connected ? 'outline' : 'default'}
                onClick={() => onConnect(app.id)}
                className="mt-auto"
                data-test-id={`app-connect-${app.id}`}
              >
                <Plug className="size-4" />
                {connected ? 'Reconnect' : 'Connect'}
              </Button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
