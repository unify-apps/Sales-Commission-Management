import type { ReactElement } from 'react'
import { Boxes } from 'lucide-react'
import { cn } from '@/lib/utils'

// Brand marks for each connectable source app. lucide-react has no brand logos, so
// these are small inline SVGs with each brand's own accent color, rendered on a tinted
// tile. Colors are intentional brand values (not theme tokens) so the logos stay true.
type BrandIcon = {
  tile: string
  glyph: (props: { className?: string }) => ReactElement
}

const BRANDS: Record<string, BrandIcon> = {
  salesforce: {
    tile: 'bg-[#e8f2fb] text-[#00a1e0]',
    glyph: ({ className }) => (
      <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
        <path d="M10 6.4a3.4 3.4 0 0 1 5.9 1 2.9 2.9 0 0 1 3.6 2.8 2.9 2.9 0 0 1-1 2.2 2.6 2.6 0 0 1-2.4 3.9 2.6 2.6 0 0 1-1.3-.4 2.9 2.9 0 0 1-2.6 1.6 2.9 2.9 0 0 1-1.6-.5 3.3 3.3 0 0 1-2.4 1 3.3 3.3 0 0 1-3-1.9 2.7 2.7 0 0 1-.6.1A2.6 2.6 0 0 1 2 13.1a2.6 2.6 0 0 1 1.4-2.3 3 3 0 0 1 2.9-3.7 3 3 0 0 1 1.6.5A3.4 3.4 0 0 1 10 6.4Z" />
      </svg>
    ),
  },
  monday: {
    tile: 'bg-[#fdeef1] text-[#ff3d57]',
    glyph: ({ className }) => (
      <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
        <circle cx="4.5" cy="15" r="2.3" />
        <ellipse cx="12" cy="12" rx="2.3" ry="7" transform="rotate(28 12 12)" />
        <ellipse cx="19.5" cy="12" rx="2.3" ry="7" transform="rotate(28 19.5 12)" />
      </svg>
    ),
  },
  hubspot: {
    tile: 'bg-[#fdefe9] text-[#ff7a59]',
    glyph: ({ className }) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden="true">
        <circle cx="7" cy="9" r="2.2" fill="currentColor" stroke="none" />
        <circle cx="17" cy="6" r="2.6" />
        <circle cx="15.5" cy="17.5" r="3.2" />
        <path d="M17 8.6v3.9M9 9.8l3.8 4.6" strokeLinecap="round" />
      </svg>
    ),
  },
  netsuite: {
    tile: 'bg-[#eaf3ec] text-[#2e6c3f]',
    glyph: ({ className }) => (
      <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
        <path d="M4 19V5h3.5l6 8V5H17v14h-3.5l-6-8v8H4Z" />
        <rect x="18.4" y="5" width="1.8" height="14" rx="0.9" />
      </svg>
    ),
  },
}

export function AppIcon({ appId, size = 'md' }: { appId: string; size?: 'sm' | 'md' }) {
  const brand = BRANDS[appId]
  const tileClass = size === 'sm' ? 'size-7 rounded-md' : 'size-10 rounded-md'
  const glyphClass = size === 'sm' ? 'size-4' : 'size-6'

  if (!brand) {
    return (
      <span
        className={cn('flex items-center justify-center bg-muted text-muted-foreground', tileClass)}
        data-test-id={`app-icon-${appId}`}
      >
        <Boxes className={glyphClass} />
      </span>
    )
  }

  const Glyph = brand.glyph
  return (
    <span className={cn('flex items-center justify-center', tileClass, brand.tile)} data-test-id={`app-icon-${appId}`}>
      <Glyph className={glyphClass} />
    </span>
  )
}
