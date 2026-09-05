import { Link } from 'react-router-dom'
import { HIERARCHY, PROFILES } from '@/data/org-seed'
import { initials } from '@/lib/format'
import { cn } from '@/lib/utils'

type OrgNode = {
  person: string
  title: string
  positionName: string
  profileId: string | null
}

/** Resolve a person's title + profile id from the profiles roster (fall back to the hierarchy row). */
function resolvePerson(person: string, positionName: string): OrgNode {
  const profile = PROFILES.find((p) => p.personName === person)
  return {
    person,
    title: profile?.title ?? positionName,
    positionName,
    profileId: profile?.id ?? null,
  }
}

/** Walk from a person up to the root, returning [root, …, person]. */
function chainToRoot(person: string): OrgNode[] {
  const chain: OrgNode[] = []
  let current = HIERARCHY.find((h) => h.person === person)
  const seen = new Set<string>()
  while (current?.person && !seen.has(current.person)) {
    seen.add(current.person)
    chain.unshift(resolvePerson(current.person, current.positionName))
    const parent = current.parentPerson
    current = parent ? HIERARCHY.find((h) => h.person === parent) : undefined
  }
  return chain
}

function directReports(person: string): OrgNode[] {
  return HIERARCHY.filter((h) => h.parentPerson === person && h.person != null).map((h) =>
    resolvePerson(h.person as string, h.positionName),
  )
}

function NodeCard({ node, variant }: { node: OrgNode; variant: 'ancestor' | 'current' | 'report' }) {
  const isCurrent = variant === 'current'
  const content = (
    <div
      className={cn(
        'flex w-[168px] flex-col items-center gap-2 rounded-lg border bg-card px-3 py-3 text-center transition-colors',
        isCurrent ? 'border-primary ring-1 ring-primary/40' : 'border-border',
        !isCurrent && node.profileId && 'hover:border-primary/50 hover:bg-accent/40',
      )}
      data-test-id={`org-node-${node.profileId ?? node.person.toLowerCase().replace(/\s+/g, '-')}`}
    >
      <div
        className={cn(
          'flex size-9 items-center justify-center rounded-full font-mono text-[13px] font-medium',
          isCurrent ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary',
        )}
      >
        {initials(node.person)}
      </div>
      <div className="min-w-0">
        <div className="truncate text-[13px] font-medium text-foreground">{node.person}</div>
        <div className="truncate text-[11px] text-muted-foreground">{node.title}</div>
      </div>
    </div>
  )

  if (node.profileId && !isCurrent) {
    return (
      <Link to={`/organization/profiles/${node.profileId}`} className="block">
        {content}
      </Link>
    )
  }
  return content
}

/** A short vertical connector line between two stacked levels. */
function Connector() {
  return <div className="h-6 w-px bg-border" aria-hidden />
}

/** Sibling reports connected by a shared horizontal bus, each with a drop line. */
function ReportsRow({ reports }: { reports: OrgNode[] }) {
  return (
    <div className="flex items-start gap-6">
      {reports.map((node, i) => {
        const isFirst = i === 0
        const isLast = i === reports.length - 1
        return (
          <div key={node.person} className="flex flex-col items-center">
            {/* horizontal bus: extends into the gutters (-mx-3) so segments join;
                the outer half is blank on the first/last node so the bar starts/ends centered */}
            <div className="-mx-3 flex h-px w-[calc(100%+1.5rem)] items-center" aria-hidden>
              <div className={cn('h-px flex-1', isFirst ? 'bg-transparent' : 'bg-border')} />
              <div className={cn('h-px flex-1', isLast ? 'bg-transparent' : 'bg-border')} />
            </div>
            <Connector />
            <NodeCard node={node} variant="report" />
          </div>
        )
      })}
    </div>
  )
}

export function OrgTree({ person }: { person: string }) {
  const chain = chainToRoot(person)
  const reports = directReports(person)

  if (chain.length === 0) {
    return null
  }

  const ancestors = chain.slice(0, -1)
  const current = chain[chain.length - 1]

  return (
    <div className="overflow-x-auto" data-test-id="org-tree">
      <div className="flex min-w-fit flex-col items-center px-2 py-4">
        {/* Manager chain above the current person */}
        {ancestors.map((node) => (
          <div key={node.person} className="flex flex-col items-center">
            <NodeCard node={node} variant="ancestor" />
            <Connector />
          </div>
        ))}

        {/* Current person */}
        <NodeCard node={current} variant="current" />

        {/* Direct reports below */}
        {reports.length > 0 ? (
          <>
            <Connector />
            {reports.length > 1 ? (
              <ReportsRow reports={reports} />
            ) : (
              <NodeCard node={reports[0]} variant="report" />
            )}
          </>
        ) : null}
      </div>
    </div>
  )
}
