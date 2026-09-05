import { useEffect, useState } from 'react'
import { GitFork, History, Pencil, TriangleAlert } from 'lucide-react'
import {
  DEFAULT_PAGE_SIZE,
  emptyQuery,
  useHierarchy,
  versionLabel,
  type HierarchyQuery,
  type HierarchyTableRow,
} from '@/data/hierarchy'
import type { FilterRow } from '@/data/hierarchy-filter'
import { formatDate } from '@/lib/format'
import { PageHeader } from '@/components/org/page-header'
import { ListToolbar } from '@/components/org/list-toolbar'
import { Panel, RecordName } from '@/components/org/panel'
import { DataTable, type Column } from '@/components/org/data-table'
import { OrgChart, type OrgNode } from '@/components/org/org-chart'
import { ListPagination } from '@/components/org/pagination'
import { HierarchyFilters } from '@/components/org/hierarchy-filters'
import { EmptyState } from '@/components/org/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { toast } from 'sonner'

function buildTree(rows: HierarchyTableRow[]): OrgNode[] {
  const byPos = new Map<string, OrgNode>()
  rows.forEach((r) => byPos.set(r.positionName, { row: r, children: [] }))
  const roots: OrgNode[] = []
  rows.forEach((r) => {
    const node = byPos.get(r.positionName)!
    if (r.parentPosition && byPos.has(r.parentPosition)) {
      byPos.get(r.parentPosition)!.children.push(node)
    } else {
      roots.push(node)
    }
  })
  // Siblings arrive in whatever order the backend returned them, which is stable per
  // call but arbitrary to read. Sorting keeps the chart the same shape between
  // refreshes and puts each manager's reports in one order.
  const sortSiblings = (nodes: OrgNode[]) => {
    nodes.sort((a, b) => a.row.positionName.localeCompare(b.row.positionName))
    nodes.forEach((node) => sortSiblings(node.children))
  }
  sortSiblings(roots)
  return roots
}

export default function Hierarchy() {
  const [query, setQuery] = useState<HierarchyQuery>(() => emptyQuery())
  const [searchText, setSearchText] = useState('')
  const [view, setView] = useState('table')

  // The table is a flat list, so it wants only what matched; the tree needs each
  // match's ancestors or it breaks into orphans. Switching views re-asks with the
  // right shape rather than filtering client-side, which would break the paging
  // counts the server computed.
  useEffect(() => {
    const wantAncestors = view === 'tree'
    setQuery((current) =>
      current.includeAncestors === wantAncestors
        ? current
        : { ...current, includeAncestors: wantAncestors, offset: 0 },
    )
  }, [view])
  const [selected, setSelected] = useState<HierarchyTableRow | null>(null)

  // Search runs in the callable, so every keystroke would be a request. Debounced —
  // and the offset resets, because staying on page 3 of the previous result while the
  // new one has two rows shows an empty table for a search that did match.
  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery((current) =>
        current.search === searchText ? current : { ...current, search: searchText, offset: 0 },
      )
    }, 300)
    return () => clearTimeout(timer)
  }, [searchText])

  const { rows, versions, loading, failed, refused, total, matched, message } = useHierarchy(query)

  // The version list comes from the data — the dates the structure actually changed.
  // Until the first answer lands there is nothing to pick, and the callable's own
  // default (today) stands.
  const selectedVersion = query.asOfDate || versions[versions.length - 1]?.asOfDate || ''


  // Any change to the query resets paging: page 3 of the old result is meaningless
  // against the new one.
  const patch = (next: Partial<HierarchyQuery>) =>
    setQuery((current) => ({ ...current, ...next, offset: 0 }))

  const tree = buildTree(rows)
  const pageSize = query.limit || DEFAULT_PAGE_SIZE
  const page = Math.floor(query.offset / pageSize) + 1
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const showingFrom = total === 0 ? 0 : query.offset + 1
  const showingTo = Math.min(query.offset + rows.length, total)
  const filtering = Boolean(query.search) || query.filters.length > 0

  // A read that failed and a version that genuinely has no relationships are
  // different facts, and this page must not show the second when it means the first.
  const loadFailed = (
    <EmptyState
      icon={TriangleAlert}
      title={refused ? 'That filter was refused' : "Couldn't load the hierarchy"}
      description={
        message ??
        (refused
          ? 'The automation would not accept this filter.'
          : 'The reporting structure could not be read. Check you are signed in, then try again.')
      }
    />
  )

  const columns: Column<HierarchyTableRow>[] = [
    { key: 'pos', header: 'Position', width: '24%', cell: (r) => <RecordName name={r.positionName} sub={r.person ?? 'Open seat'} /> },
    { key: 'parentPos', header: 'Parent Position', cell: (r) => <span className="text-sm text-foreground">{r.parentPosition ?? '—'}</span> },
    { key: 'parentPerson', header: 'Parent Person', cell: (r) => <span className="text-sm text-muted-foreground">{r.parentPerson ?? '—'}</span> },
    { key: 'start', header: 'Effective Start', align: 'right', cell: (r) => <span className="font-mono text-[13px] text-muted-foreground">{formatDate(r.effectiveStart)}</span> },
  ]

  return (
    <div data-test-id="hierarchy-page">
      <PageHeader
        eyebrow="Organization"
        title="Hierarchy"
        subtitle="The version-controlled reporting structure powering manager rankings, team reports, and hierarchical crediting."
        actions={
          <Button size="sm" className="h-9" onClick={() => toast('Edit Hierarchy', { description: 'Opens the drag-and-drop org-chart editor.' })} data-test-id="edit-hierarchy">
            <Pencil className="size-4" />
            Edit Hierarchy
          </Button>
        }
      />
      <ListToolbar
        searchValue={searchText}
        onSearchChange={setSearchText}
        searchPlaceholder="Search position, person…"
        showUpload
        showFilter={false}
        extra={
          <>
            <Select
              value={selectedVersion}
              onValueChange={(value) => patch({ asOfDate: value })}
            >
              <SelectTrigger className="h-9 w-[240px]" data-test-id="hierarchy-version">
                <History className="size-4 text-muted-foreground" />
                <SelectValue placeholder="Latest" />
              </SelectTrigger>
              <SelectContent>
                {versions.map((v) => (
                  <SelectItem key={v.asOfDate} value={v.asOfDate}>{versionLabel(v.asOfDate)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <HierarchyFilters
              rows={query.filters}
              rootOperator={query.rootOperator}
              onChange={(filters: FilterRow[]) => patch({ filters })}
              onRootOperatorChange={(rootOperator) => patch({ rootOperator })}
            />
            <Tabs value={view} onValueChange={setView}>
              <TabsList className="h-9" data-test-id="hierarchy-view-toggle">
                <TabsTrigger value="table">Table</TabsTrigger>
                <TabsTrigger value="tree">Tree</TabsTrigger>
              </TabsList>
            </Tabs>
          </>
        }
      />

      {failed || refused ? (
        // One failure state for both views. Rendering it inside each view let the tree
        // keep its "N relationships" caption, which reads as "this version has none"
        // when the truth is that nothing was read at all.
        <Panel>
          <DataTable testId="hierarchy-table" columns={columns} rows={[]} rowId={(r) => r.id} loading={false} empty={loadFailed} />
        </Panel>
      ) : view === 'table' ? (
        <Panel>
          <DataTable
            testId="hierarchy-table"
            columns={columns}
            rows={rows}
            rowId={(r) => r.id}
            loading={loading}
            onRowClick={(r) => setSelected(r)}
            empty={
              <EmptyState
                icon={GitFork}
                title={filtering ? 'No matches' : 'No relationships'}
                description={filtering ? 'No reporting relationship matches this search and filter.' : 'This version has no reporting relationships yet.'}
              />
            }
          />
          {total > 0 ? (
            // Shown even on a single page: the rows-per-page control lives here, and
            // hiding the bar would make it unreachable exactly when someone wants to
            // raise the size.
            <ListPagination
              showingFrom={showingFrom}
              showingTo={showingTo}
              total={total}
              page={page}
              pageCount={pageCount}
              onPageChange={(next) => setQuery((current) => ({ ...current, offset: (next - 1) * pageSize }))}
              pageSize={pageSize}
              onPageSizeChange={(size) => patch({ limit: size })}
              testId="hierarchy-pagination"
            />
          ) : null}
        </Panel>
      ) : (
        <Panel padded>
          <div className="mb-3 font-mono text-[11px] uppercase tracking-[0.09em] text-muted-foreground">
            {selectedVersion || 'latest'} · {total} relationship{total === 1 ? '' : 's'}
            {filtering ? ` · ${matched} matching` : ''}
          </div>
          <div data-test-id="hierarchy-tree">
            {loading ? (
              <div className="space-y-2 py-4" data-test-id="hierarchy-tree-loading">
                <Skeleton className="mx-auto h-[76px] w-[168px]" />
                <div className="flex justify-center gap-6 pt-6">
                  <Skeleton className="h-[76px] w-[168px]" />
                  <Skeleton className="h-[76px] w-[168px]" />
                  <Skeleton className="h-[76px] w-[168px]" />
                </div>
              </div>
            ) : (
              <OrgChart roots={tree} />
            )}
          </div>
        </Panel>
      )}

      <Sheet open={selected != null} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent className="w-full gap-0 sm:!max-w-md" data-test-id="edit-relationship-sheet">
          {selected ? (
            <>
              <SheetHeader>
                <SheetTitle className="font-heading text-2xl font-normal">Edit Relationship</SheetTitle>
              </SheetHeader>
              <form
                className="flex-1 space-y-5 overflow-auto px-4"
                onSubmit={(e) => {
                  e.preventDefault()
                  toast.success('Relationship saved', { description: `${selected.positionName} updated.` })
                  setSelected(null)
                }}
              >
                <div className="space-y-1">
                  <span className="font-mono text-[11px] uppercase tracking-[0.09em] text-muted-foreground">Effective Start</span>
                  <div className="text-sm text-foreground">{formatDate(selected.effectiveStart)}</div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="er-parent">Parent Position</Label>
                  <Input id="er-parent" defaultValue={selected.parentPosition ?? ''} placeholder="Select a parent position…" data-test-id="edit-rel-parent" />
                </div>
                <div className="space-y-1">
                  <span className="font-mono text-[11px] uppercase tracking-[0.09em] text-muted-foreground">Position</span>
                  <div className="text-sm text-foreground">{selected.positionName}</div>
                </div>
                <SheetFooter className="px-0">
                  <Button type="submit" data-test-id="edit-rel-save">Save</Button>
                  <Button type="button" variant="outline" onClick={() => setSelected(null)}>Cancel</Button>
                </SheetFooter>
              </form>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  )
}
