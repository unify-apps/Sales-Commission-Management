import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, GitFork, TriangleAlert, Users } from 'lucide-react'
import type { ChainNode } from '@/data/use-hierarchy'
import { initials } from '@/lib/format'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/org/empty-state'
import { cn } from '@/lib/utils'

interface HierarchyChainProps {
  chain: ChainNode[]
  reportsTo: string
  childrenOf: Map<string, ChainNode[]>
  loading: boolean
  broken: boolean
  asOfDate: string
}

/**
 * The reporting line around one person, drawn root-first, with their reports
 * below and every node expandable.
 *
 * Real data, resolved as of a date: the line itself from `PositionHierarchy`,
 * who held each seat that day from `PayeePositionAssignment`, each card's title
 * from `PositionAttribute`. A seat nobody held shows as vacant rather than being
 * skipped — an empty rung is a fact about the org, and hiding it would make the
 * chain look shorter than it is.
 *
 * Two gestures, because they are two different intents and one control cannot
 * serve both: the CARD opens that person's profile, the `+N more` chip expands
 * their reports here. Expanding is ADD-ONLY, so the view only ever grows as you
 * explore it and a click can never take something off screen.
 */
export function HierarchyChain({
  chain,
  reportsTo,
  childrenOf,
  loading,
  broken,
  asOfDate,
}: HierarchyChainProps) {
  const navigate = useNavigate()
  const self = chain[chain.length - 1]
  // The focused person's reports are open from the start; everything else opens
  // on click.
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  function expand(positionId: string) {
    setExpanded((previous) => {
      if (previous.has(positionId)) return previous
      const next = new Set(previous)
      next.add(positionId)
      return next
    })
  }

  if (loading) {
    return (
      <div className="space-y-4" data-test-id="hierarchy-chain-loading">
        <Skeleton className="h-11 w-full" />
        <div className="flex flex-col items-center gap-3 rounded-lg border border-border bg-muted/20 p-6">
          <Skeleton className="h-[86px] w-[240px]" />
          <Skeleton className="h-[86px] w-[240px]" />
        </div>
      </div>
    )
  }

  if (chain.length === 0) {
    return (
      <EmptyState
        icon={GitFork}
        title="Not in the hierarchy"
        description={`This position has no reporting line in force on ${asOfDate}. Add one so crediting and rollups resolve correctly.`}
      />
    )
  }

  // The path root -> person. Every node on it always shows the next node down, so
  // the line to the focused person is never hidden behind a collapsed branch.
  const spine = new Set(chain.map((n) => n.positionId))
  const spineChildOf = new Map<string, string>()
  for (let i = 0; i < chain.length - 1; i += 1) {
    spineChildOf.set(chain[i].positionId, chain[i + 1].positionId)
  }

  return (
    <div className="space-y-4" data-test-id="hierarchy-chain">
      <div className="flex items-center gap-3 rounded-md bg-muted/50 px-4 py-3">
        <span className="text-sm text-muted-foreground">Reports to</span>
        <span className="text-sm font-medium text-foreground" data-test-id="hierarchy-reports-to">
          {reportsTo || '— top of the hierarchy'}
        </span>
      </div>

      {broken ? (
        <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-destructive" />
          <span className="text-sm text-foreground">
            This line stops before any root — a position reports to a seat that has no
            reporting row on this date, so the chain above is incomplete.
          </span>
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-lg border border-border bg-muted/20 p-6">
        <div className="flex min-w-max flex-col items-center">
          <Subtree
            node={chain[0]}
            selfId={self?.positionId ?? ''}
            spine={spine}
            spineChildOf={spineChildOf}
            childrenOf={childrenOf}
            expanded={expanded}
            onExpand={expand}
            onOpen={(employeeId) => navigate(`/organization/profiles/${employeeId}`)}
          />
        </div>
      </div>
    </div>
  )
}

/**
 * One node and the reports shown beneath it.
 *
 * A node on the spine always renders the next spine node, so the line down to the
 * focused person is never hidden. Expanding it ADDS its remaining reports beside
 * that one — nothing already on screen is taken away.
 */
function Subtree({
  node,
  selfId,
  spine,
  spineChildOf,
  childrenOf,
  expanded,
  onExpand,
  onOpen,
}: {
  node: ChainNode
  selfId: string
  spine: Set<string>
  spineChildOf: Map<string, string>
  childrenOf: Map<string, ChainNode[]>
  expanded: Set<string>
  onExpand: (positionId: string) => void
  onOpen: (employeeId: string) => void
}) {
  const reports = childrenOf.get(node.positionId) ?? []
  const isSelf = node.positionId === selfId
  const isExpanded = expanded.has(node.positionId)

  // The focused person shows every report by default — that is the question the
  // panel is answering. An ancestor shows only its spine child until asked.
  let visible: ChainNode[]
  if (isSelf || isExpanded) {
    visible = reports
  } else if (spine.has(node.positionId)) {
    const next = spineChildOf.get(node.positionId)
    visible = reports.filter((r) => r.positionId === next)
  } else {
    visible = []
  }

  const hidden = reports.length - visible.length

  return (
    <div className="flex flex-col items-center">
      <Node
        node={node}
        reportCount={reports.length}
        hiddenCount={hidden}
        onExpand={() => onExpand(node.positionId)}
        onOpen={onOpen}
      />
      {visible.length > 0 ? (
        <>
          <Connector />
          <div className="relative flex items-start gap-6">
            {visible.length > 1 ? (
              <span
                className="absolute top-0 h-px bg-border"
                style={{ left: '7.5rem', right: '7.5rem' }}
                aria-hidden="true"
              />
            ) : null}
            {visible.map((child) => (
              <div key={child.positionId} className="flex flex-col items-center">
                <span className="h-6 w-px bg-border" aria-hidden="true" />
                <Subtree
                  node={child}
                  selfId={selfId}
                  spine={spine}
                  spineChildOf={spineChildOf}
                  childrenOf={childrenOf}
                  expanded={expanded}
                  onExpand={onExpand}
                  onOpen={onOpen}
                />
              </div>
            ))}
          </div>
        </>
      ) : null}
    </div>
  )
}

function Connector() {
  return <span className="h-6 w-px bg-border" aria-hidden="true" />
}

function Node({
  node,
  reportCount,
  hiddenCount,
  onExpand,
  onOpen,
}: {
  node: ChainNode
  reportCount: number
  hiddenCount: number
  onExpand: () => void
  onOpen: (employeeId: string) => void
}) {
  const vacant = !node.person
  // Only a node still holding reports back is an expander; one already showing
  // everything stays inert rather than offering a click that would do nothing.
  const canExpand = hiddenCount > 0
  // A vacant seat, or an occupant absent from the profile list, has no employee
  // id — so it is not navigable rather than navigating to a dead end.
  const canOpen = Boolean(node.employeeId) && !node.isSelf

  return (
    <div className="flex w-[240px] flex-col items-center">
      {/*
        The card and the chip are SIBLINGS, not nested. A button inside a button
        is invalid, and the browser's own hit-testing for it is undefined — so the
        two intents get two elements rather than one with a stopPropagation.
      */}
      <button
        type="button"
        disabled={!canOpen}
        onClick={() => canOpen && onOpen(node.employeeId)}
        aria-label={canOpen ? `Open ${node.person}'s profile` : undefined}
        className={cn(
          'flex w-full flex-col items-center gap-2 rounded-lg border bg-card px-4 py-4 text-center transition-colors',
          node.isSelf ? 'border-primary shadow-sm' : 'border-border',
          canOpen ? 'cursor-pointer hover:bg-black/[0.03]' : 'cursor-default',
        )}
        data-test-id={`hierarchy-node-${node.positionCode}`}
      >
        <span
          className={cn(
            'flex size-9 items-center justify-center rounded-full font-mono text-[11px] font-medium',
            node.isSelf ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
          )}
        >
          {vacant ? '—' : initials(node.person)}
        </span>
        <div className="min-w-0">
          <div className="truncate text-sm font-medium text-foreground">
            {vacant ? 'Vacant' : node.person}
          </div>
          {/* Title where the seat has one; the seat's own name is the fallback, so
              a card is never blank. */}
          <div className="truncate text-xs text-muted-foreground">
            {node.title || node.positionName}
          </div>
        </div>
      </button>

      {reportCount > 0 ? (
        <button
          type="button"
          disabled={!canExpand}
          onClick={onExpand}
          aria-expanded={hiddenCount === 0}
          aria-label={
            canExpand
              ? `Show the ${hiddenCount} other ${hiddenCount === 1 ? 'person' : 'people'} reporting to ${node.person || node.positionCode}`
              : undefined
          }
          className={cn(
            '-mt-px flex items-center gap-1 rounded-b-lg border border-t-0 border-border bg-card px-3 py-1 text-[11px] text-muted-foreground',
            canExpand ? 'cursor-pointer hover:bg-black/[0.03]' : 'cursor-default',
          )}
          data-test-id={`hierarchy-reports-${node.positionCode}`}
        >
          {canExpand ? <ChevronDown className="size-3" /> : <Users className="size-3" />}
          {canExpand ? `+${hiddenCount} more` : `${reportCount} ${reportCount === 1 ? 'report' : 'reports'}`}
        </button>
      ) : null}
    </div>
  )
}
