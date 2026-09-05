import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { IdCard, TriangleAlert } from 'lucide-react'
import { useProfiles, type ProfileRow } from '@/data/use-profiles'
import { useProfileFilterOptions } from '@/data/use-profile-filters'
import type { EmployeeStatus } from '@/data/org-seed'
import { CURRENT_MONTH, MONTH_PERIODS, periodToAsOfDate } from '@/lib/period'
import { initials } from '@/lib/format'
import { PageHeader } from '@/components/org/page-header'
import { ListToolbar } from '@/components/org/list-toolbar'
import { Panel } from '@/components/org/panel'
import { DataTable, type Column } from '@/components/org/data-table'
import { EmptyState } from '@/components/org/empty-state'
import { ListPagination } from '@/components/org/pagination'
import {
  ProfileFilter,
  activeConditions,
  searchText,
  withSearch,
  type FilterCondition,
  type FilterField,
} from '@/components/org/profile-filter'
import { StatusBadge } from '@/components/org/status-badge'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

/** Rows per page. The callable clamps `limit` to 1..200, so every option is legal. */
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100]
const DEFAULT_PAGE_SIZE = 10
/** The box is live, so it waits for a pause rather than firing per keystroke. */
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
  // APPLIED conditions only. The panel edits its own draft, so nothing here
  // changes — and no fetch fires — until Apply is pressed.
  const [conditions, setConditions] = useState<FilterCondition[]>([])
  const [period, setPeriod] = useState<string>(CURRENT_MONTH)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const navigate = useNavigate()

  // The toolbar box writes straight into the conditions, so the panel always
  // opens showing what was typed. It applies LIVE — unlike the panel, which
  // waits for Apply — because a quick search that needed confirming would not be
  // quick.
  function handleSearchChange(value: string) {
    setConditions((rows) => withSearch(rows, value))
    setPage(1)
  }

  // Row 24 of a 10-row page is row 4 of a 25-row one; rather than work out where
  // the reader was, go back to the first page, which is always a defined place.
  function handlePageSizeChange(size: number) {
    setPageSize(size)
    setPage(1)
  }

  function handlePeriodChange(value: string) {
    setPeriod(value)
    setPage(1)
  }

  function handleApplyFilters(next: FilterCondition[]) {
    setConditions(next)
    // Filters applied while on page 4 would otherwise ask for rows 30-40 of a
    // set that may hold three.
    setPage(1)
  }

  const asOfDate = useMemo(() => periodToAsOfDate(period), [period])

  // Only the SEARCH value is debounced; every other filter arrives already
  // committed by Apply, so it queries immediately.
  const typedSearch = searchText(conditions)
  const [debouncedSearch, setDebouncedSearch] = useState(typedSearch)
  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(typedSearch), SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(id)
  }, [typedSearch])

  // One value per field, from complete rows only.
  const filterValues = useMemo(() => {
    const byField: Partial<Record<FilterField, string>> = {}
    for (const c of activeConditions(conditions)) byField[c.field] = c.value.trim()
    return byField
  }, [conditions])

  const { rows, total, status: callStatus, message, loading, error } = useProfiles({
    search: debouncedSearch,
    status: filterValues.status ?? '',
    titleId: filterValues.titleId ?? '',
    territoryId: filterValues.territoryId ?? '',
    managerPositionId: filterValues.managerPositionId ?? '',
    asOfDate,
    limit: pageSize,
    offset: (page - 1) * pageSize,
  })

  const filterOptions = useProfileFilterOptions(asOfDate)

  const isFiltered = activeConditions(conditions).length > 0
  const countLabel = isFiltered
    ? `${total} matching ${total === 1 ? 'profile' : 'profiles'}`
    : `${total} ${total === 1 ? 'profile' : 'profiles'}`

  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const showingFrom = total === 0 ? 0 : (page - 1) * pageSize + 1
  const showingTo = Math.min(page * pageSize, total)

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
        searchValue={typedSearch}
        onSearchChange={handleSearchChange}
        searchPlaceholder="Search name, email or Employee ID…"
        showUpload={false}
        filterSlot={
          <ProfileFilter
            conditions={conditions}
            onApply={handleApplyFilters}
            options={{
              titleId: filterOptions.titles,
              territoryId: filterOptions.territories,
              managerPositionId: filterOptions.managers,
            }}
            loading={filterOptions.loading}
            truncated={filterOptions.truncated}
          />
        }
        extra={
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
          // Navigates by EMPLOYEE id, not the platform payeeId: `employeeId` is
          // the only handle the callable can look a person up by (its `search`),
          // and it carries a real unique index, so the detail page can resolve
          // one person with one small query instead of scanning pages.
          onRowClick={(p) => navigate(`/organization/profiles/${p.employeeId}`)}
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
                description="Adjust or clear the filters, or choose another period."
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
            pageSize={pageSize}
            pageSizeOptions={PAGE_SIZE_OPTIONS}
            onPageSizeChange={handlePageSizeChange}
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
