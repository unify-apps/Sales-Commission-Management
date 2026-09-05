import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { initials } from '@/lib/format'
import { cn } from '@/lib/utils'
/** Only what the chart draws. Kept minimal so the chart does not depend on the
 *  shape of whatever produced the rows. */
export interface OrgChartRow {
  id: string
  positionName: string
  person: string | null
}

export interface OrgNode {
  row: OrgChartRow
  children: OrgNode[]
}

/**
 * The card, the connector and the sibling bus are the ones `OrgTree` draws on a
 * profile page. Same classes on purpose: the two charts sit two clicks apart and a
 * second visual language for the same idea would read as a different feature.
 *
 * Nothing here navigates. A node with reports toggles its own subtree, and a leaf is
 * inert — so a click can never take somebody off the page they are reading.
 */
function NodeCard({
  row,
  isRoot,
  childCount,
  collapsed,
  onToggle,
}: {
  row: OrgChartRow
  isRoot: boolean
  childCount: number
  collapsed: boolean
  onToggle: () => void
}) {
  const person = row.person
  const vacant = !person
  const hasChildren = childCount > 0

  const content = (
    <>
      <div
        className={cn(
          'flex size-9 items-center justify-center rounded-full font-mono text-[13px] font-medium',
          isRoot && 'bg-primary text-primary-foreground',
          !isRoot && !vacant && 'bg-primary/10 text-primary',
          vacant && 'bg-muted text-muted-foreground',
        )}
      >
        {vacant ? '–' : initials(person as string)}
      </div>
      <div className="min-w-0">
        <div className="truncate text-[13px] font-medium text-foreground">
          {person ?? 'Open seat'}
        </div>
        <div className="truncate text-[11px] text-muted-foreground">{row.positionName}</div>
      </div>
      {hasChildren ? (
        <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
          {collapsed ? <ChevronRight className="size-3.5" /> : <ChevronDown className="size-3.5" />}
          <span className="font-mono">{childCount}</span>
        </div>
      ) : null}
    </>
  )

  const className = cn(
    'flex w-[168px] flex-col items-center gap-2 rounded-lg border bg-card px-3 py-3 text-center transition-colors',
    isRoot ? 'border-primary ring-1 ring-primary/40' : 'border-border',
    vacant && 'border-dashed',
    hasChildren && 'hover:border-primary/50 hover:bg-accent/40',
  )

  if (!hasChildren) {
    return (
      <div className={className} data-test-id={`org-node-${row.id}`}>
        {content}
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={!collapsed}
      aria-label={`${collapsed ? 'Expand' : 'Collapse'} ${childCount} report${childCount === 1 ? '' : 's'} under ${person ?? row.positionName}`}
      className={className}
      data-test-id={`org-node-${row.id}`}
    >
      {content}
    </button>
  )
}

/** A short vertical connector line between two stacked levels. */
function Connector() {
  return <div className="h-6 w-px bg-border" aria-hidden />
}

/**
 * One node and everything under it.
 *
 * Each child column draws its own half of the horizontal bus, and the outer half is
 * blank on the first and last child so the bar starts and ends centered under the
 * parent instead of overhanging into the gutter.
 */
function Subtree({
  node,
  isRoot,
  collapsedIds,
  onToggle,
}: {
  node: OrgNode
  isRoot: boolean
  collapsedIds: Set<string>
  onToggle: (id: string) => void
}) {
  const { children } = node
  const collapsed = collapsedIds.has(node.row.id)
  const showChildren = children.length > 0 && !collapsed

  return (
    <div className="flex flex-col items-center">
      <NodeCard
        row={node.row}
        isRoot={isRoot}
        childCount={children.length}
        collapsed={collapsed}
        onToggle={() => onToggle(node.row.id)}
      />
      {showChildren ? (
        <>
          <Connector />
          {children.length === 1 ? (
            <Subtree node={children[0]} isRoot={false} collapsedIds={collapsedIds} onToggle={onToggle} />
          ) : (
            <div className="flex items-start gap-6">
              {children.map((child, index) => {
                const isFirst = index === 0
                const isLast = index === children.length - 1
                return (
                  <div key={child.row.id} className="flex flex-col items-center">
                    <div className="-mx-3 flex h-px w-[calc(100%+1.5rem)] items-center" aria-hidden>
                      <div className={cn('h-px flex-1', isFirst ? 'bg-transparent' : 'bg-border')} />
                      <div className={cn('h-px flex-1', isLast ? 'bg-transparent' : 'bg-border')} />
                    </div>
                    <Connector />
                    <Subtree node={child} isRoot={false} collapsedIds={collapsedIds} onToggle={onToggle} />
                  </div>
                )
              })}
            </div>
          )}
        </>
      ) : null}
    </div>
  )
}

/**
 * The whole reporting structure, top down.
 *
 * Wide by nature — a manager with eight reports is wider than any viewport — so the
 * chart scrolls inside its own container and the page never scrolls sideways.
 */
export function OrgChart({ roots }: { roots: OrgNode[] }) {
  // Collapsed rather than expanded ids: everything starts open, and a structure that
  // grows a new manager shows it rather than hiding it behind a default.
  const [collapsedIds, setCollapsedIds] = useState<ReadonlySet<string>>(new Set())

  const toggle = (id: string) => {
    setCollapsedIds((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  if (roots.length === 0) return null

  return (
    <div className="overflow-x-auto" data-test-id="org-chart">
      <div className="flex min-w-fit items-start justify-center gap-10 px-2 py-4">
        {roots.map((root) => (
          <Subtree
            key={root.row.id}
            node={root}
            isRoot
            collapsedIds={collapsedIds as Set<string>}
            onToggle={toggle}
          />
        ))}
      </div>
    </div>
  )
}
