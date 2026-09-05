import { useState } from 'react'
import { GitFork, History, Pencil, TriangleAlert } from 'lucide-react'
import { useHierarchy } from '@/data/hierarchy'
import { HIERARCHY_VERSION, HIERARCHY_VERSIONS, type HierarchyRow } from '@/data/org-seed'
import { formatDate } from '@/lib/format'
import { PageHeader } from '@/components/org/page-header'
import { ListToolbar } from '@/components/org/list-toolbar'
import { Panel, RecordName } from '@/components/org/panel'
import { DataTable, type Column } from '@/components/org/data-table'
import { OrgChart, type OrgNode } from '@/components/org/org-chart'
import { EmptyState } from '@/components/org/empty-state'
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

function buildTree(rows: HierarchyRow[]): OrgNode[] {
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
  // Siblings arrive in whatever order the backend returned them, which is stable
  // per call but arbitrary to read. Sorting by position name keeps the chart the
  // same shape between refreshes and puts each manager's reports in one order.
  const sortSiblings = (nodes: OrgNode[]) => {
    nodes.sort((a, b) => a.row.positionName.localeCompare(b.row.positionName))
    nodes.forEach((node) => sortSiblings(node.children))
  }
  sortSiblings(roots)
  return roots
}

export default function Hierarchy() {
  const [search, setSearch] = useState('')
  const [version, setVersion] = useState(HIERARCHY_VERSION)
  const [view, setView] = useState('table')
  const [selected, setSelected] = useState<HierarchyRow | null>(null)

  // The version drives an as-of date, so changing it re-reads the structure as it
  // stood that day rather than filtering one fixed snapshot.
  const { rows, loading, failed, message } = useHierarchy(version)
  const filtered = rows.filter((r) =>
    `${r.positionName} ${r.person ?? ''} ${r.parentPosition ?? ''}`.toLowerCase().includes(search.toLowerCase()),
  )
  const tree = buildTree(rows)

  // A read that failed and a version that genuinely has no relationships are
  // different facts, and this page must not show the second when it means the first.
  const loadFailed = (
    <EmptyState
      icon={TriangleAlert}
      title="Couldn't load the hierarchy"
      description={message ?? 'The reporting structure could not be read. Check you are signed in, then try again.'}
    />
  )

  const columns: Column<HierarchyRow>[] = [
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
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search position, person…"
        showUpload
        extra={
          <>
            <Select value={version} onValueChange={setVersion}>
              <SelectTrigger className="h-9 w-[240px]" data-test-id="hierarchy-version">
                <History className="size-4 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {HIERARCHY_VERSIONS.map((v) => (
                  <SelectItem key={v.name} value={v.name}>{v.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Tabs value={view} onValueChange={setView}>
              <TabsList className="h-9" data-test-id="hierarchy-view-toggle">
                <TabsTrigger value="table">Table</TabsTrigger>
                <TabsTrigger value="tree">Tree</TabsTrigger>
              </TabsList>
            </Tabs>
          </>
        }
      />

      {failed ? (
        // One failure state for both views. Rendering it inside each view let the tree
        // keep its "N relationships" caption, which reads as "this version has none"
        // when the truth is that nothing was read at all.
        <Panel>
          <DataTable
            testId="hierarchy-table"
            columns={columns}
            rows={[]}
            rowId={(r) => r.id}
            loading={false}
            empty={loadFailed}
          />
        </Panel>
      ) : view === 'table' ? (
        <Panel>
          <DataTable
            testId="hierarchy-table"
            columns={columns}
            rows={filtered}
            rowId={(r) => r.id}
            loading={loading}
            onRowClick={(r) => setSelected(r)}
            empty={<EmptyState icon={GitFork} title="No relationships" description="This version has no reporting relationships yet." />}
          />
        </Panel>
      ) : (
        <Panel padded>
          <div className="mb-3 font-mono text-[11px] uppercase tracking-[0.09em] text-muted-foreground">
            {version} · {rows.length} relationships
          </div>
          <div data-test-id="hierarchy-tree">
            <OrgChart roots={tree} />
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
                  <span className="font-mono text-[11px] uppercase tracking-[0.09em] text-muted-foreground">Version Name</span>
                  <div className="text-sm text-foreground">{selected.versionName}</div>
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
