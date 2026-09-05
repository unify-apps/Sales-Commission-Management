import { useEffect, useMemo, useState } from 'react'
import { IdCard, TriangleAlert } from 'lucide-react'
import { useProfiles, type ProfileRow } from '@/data/use-profiles'
import type { EmployeeStatus } from '@/data/org-seed'
import { CURRENT_MONTH, MONTH_PERIODS, periodToAsOfDate } from '@/lib/period'
import { initials } from '@/lib/format'
import { PageHeader } from '@/components/org/page-header'
import { ListToolbar } from '@/components/org/list-toolbar'
import { Panel } from '@/components/org/panel'
import { DataTable, type Column } from '@/components/org/data-table'
import { EmptyState } from '@/components/org/empty-state'
import { ListPagination } from '@/components/org/pagination'
import { StatusBadge } from '@/components/org/status-badge'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const PAGE_SIZE = 25
const ANY_STATUS = 'ANY'
const STATUS_OPTIONS = [ANY_STATUS, 'ACTIVE', 'TERMINATED'] as const
/** Search runs server-side, so it is debounced rather than fired per keystroke. */
const SEARCH_DEBOUNCE_MS = 300

/**
 * `Payee.status` comes back UPPER CASE from the platform; the badge palette is
 * keyed on this app's Title Case vocabulary. Mapped explicitly rather than
 * re-cased, because the platform's set is not formally closed — it has no entry
 * in the ICM glossary, and ACTIVE / TERMINATED are simply what production holds
 * today. An unmapped value falls through to the badge's neutral tone.
 */
const STATUS_LABEL: Record<string, EmployeeStatus> = {
  ACTIVE: 'Active',
  TERMINATED: 'Terminated',
  'ON LEAVE': 'On Leave',
}

export default function Profiles() {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [status, setStatus] = useState<string>(ANY_STATUS)
  const [period, setPeriod] = useState<string>(CURRENT_MONTH)
  const [page, setPage] = useState(1)

  // Debounce is an external system (a timer), which is what useEffect is for.
  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search), SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(id)
  }, [search])

  // Any change to what is being asked for resets to the first page — otherwise a
  // filter applied on page 4 asks for rows 75-100 of a set that may hold three.
  // Done in the handlers rather than an effect: the page reset is caused by the
  // interaction, so it belongs to the event, not to a re-render triggered by it.
  function handleSearchChange(value: string) {
    setSearch(value)
    setPage(1)
  }

  function handleStatusChange(value: string) {
    setStatus(value)
    setPage(1)
  }

  function handlePeriodChange(value: string) {
    setPeriod(value)
    setPage(1)
  }

  const asOfDate = useMemo(() => periodToAsOfDate(period), [period])

  const { rows, total, status: callStatus, message, loading, error } = useProfiles({
    search: debouncedSearch,
    status: status === ANY_STATUS ? '' : status,
    asOfDate,
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  })

  const isFiltered = debouncedSearch.trim().length > 0 || status !== ANY_STATUS
  const countLabel = isFiltered
    ? `${total} matching ${total === 1 ? 'profile' : 'profiles'}`
    : `${total} ${total === 1 ? 'profile' : 'profiles'}`

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const showingFrom = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const showingTo = Math.min(page * PAGE_SIZE, total)

  // A 200 means the automation ran, not that the request was usable — branch on
  // the callable's own status, never on the transport.
  const invalidInput = callStatus === 'INVALID_INPUT'
  const failed = Boolean(error) || (callStatus !== undefined && callStatus !== 'OK' && !invalidInput)

  const columns: Column<ProfileRow>[] = [
    {
      key: 'person',
      header: 'Person',
      width: '24%',
      cell: (p) => (
        <div className="flex items-center gap-3">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 font-mono text-[11px] font-medium text-primary">
            {initials(p.name)}
          </div>
          <div className="min-w-0">
            <div className="font-heading text-[15px] leading-snug text-foreground">{p.name}</div>
            <div className="font-mono text-[11px] text-muted-foreground">{p.employeeId}</div>
          </div>
        </div>
      ),
    },
    { key: 'title', header: 'Title', cell: (p) => <span className="text-sm text-foreground">{p.titleName || '—'}</span> },
    {
      key: 'position',
      header: 'Position',
      cell: (p) =>
        p.positionCode ? (
          <div className="min-w-0">
            <div className="text-sm text-foreground">{p.positionName}</div>
            <div className="font-mono text-[11px] text-muted-foreground">{p.positionCode}</div>
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        ),
    },
    { key: 'territory', header: 'Territory', cell: (p) => <span className="text-sm text-muted-foreground">{p.territoryName || '—'}</span> },
    { key: 'manager', header: 'Manager', cell: (p) => <span className="text-sm text-muted-foreground">{p.managerName || '—'}</span> },
    {
      key: 'assignment',
      header: 'Assignment',
      cell: (p) => <AssignmentTag assignment={p.assignment} matchCount={p.matchCount} />,
    },
    {
      key: 'status',
      header: 'Status',
      align: 'right',
      cell: (p) => <StatusBadge status={STATUS_LABEL[p.status] ?? (p.status as EmployeeStatus)} />,
    },
  ]

  return (
    <div data-test-id="profiles-page">
      <PageHeader
        eyebrow="Organization"
        title="Profiles"
        subtitle="A period-aware view of every payee — person, position, title, territory and manager, resolved as of the selected period."
        meta={countLabel}
      />
      <ListToolbar
        searchValue={search}
        onSearchChange={handleSearchChange}
        searchPlaceholder="Search name, email or Employee ID…"
        showUpload={false}
        extra={
          <>
            <Select value={status} onValueChange={handleStatusChange}>
              <SelectTrigger className="h-9 w-[150px]" data-test-id="profiles-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s === ANY_STATUS ? 'Any status' : s.charAt(0) + s.slice(1).toLowerCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={period} onValueChange={handlePeriodChange}>
              <SelectTrigger className="h-9 w-[160px]" data-test-id="profiles-period">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONTH_PERIODS.map((p) => (
                  <SelectItem key={p} value={p}>{`Period · ${p}`}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        }
      />

      {invalidInput ? (
        <div
          className="mb-4 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2"
          data-test-id="profiles-invalid-input"
        >
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-destructive" />
          {/* The callable's own message, verbatim — never a second copy of the rule. */}
          <span className="text-sm text-foreground">{message}</span>
        </div>
      ) : null}

      <Panel>
        <DataTable
          testId="profiles-table"
          columns={columns}
          rows={rows}
          rowId={(p) => p.payeeId}
          loading={loading}
          // Rows are deliberately NOT clickable yet. ProfileDetail resolves its
          // record out of the seed set by that set's own id, and these rows carry
          // a platform `payeeId` — navigating would land every row on "not
          // found". Re-enabling it needs a single-profile callable, which does
          // not exist: `ICM | List Profiles` is a list read and the detail screen
          // shows plan, quota and salary fields that no ICM callable returns yet.
          empty={
            failed ? (
              <EmptyState
                icon={TriangleAlert}
                title="Profiles could not be loaded"
                description={message ?? 'The profile service did not answer. Try again in a moment.'}
              />
            ) : isFiltered ? (
              <EmptyState
                icon={IdCard}
                title="No profiles match those filters"
                description="Clear the search or choose another status or period."
              />
            ) : (
              <EmptyState
                icon={IdCard}
                title="No profiles yet"
                description="Once payees are created they appear here with their position for the selected period."
              />
            )
          }
        />
        {total > 0 ? (
          <ListPagination
            testId="profiles-pagination"
            showingFrom={showingFrom}
            showingTo={showingTo}
            total={total}
            page={page}
            pageCount={pageCount}
            onPageChange={setPage}
            busy={loading}
          />
        ) : null}
      </Panel>
    </div>
  )
}

/**
 * CONFLICT is the state this table exists to surface: two assignments cover the
 * chosen date, so the callable refuses to pick one rather than naming a position
 * that might pay the wrong person. UNASSIGNED is information, not an error — a
 * new hire or a leaver is a normal fact about a period.
 */
function AssignmentTag({ assignment, matchCount }: { assignment: string; matchCount: number }) {
  if (assignment === 'CONFLICT') {
    return (
      <Badge variant="outline" className="border-destructive/40 bg-destructive/10 font-normal text-destructive">
        Conflict · {matchCount}
      </Badge>
    )
  }
  if (assignment === 'ASSIGNED') {
    return <Badge variant="outline" className="font-normal text-muted-foreground">Assigned</Badge>
  }
  if (assignment === 'UNASSIGNED') {
    return <Badge variant="outline" className="font-normal text-muted-foreground">No position</Badge>
  }
  return <span className="text-sm text-muted-foreground">—</span>
}
