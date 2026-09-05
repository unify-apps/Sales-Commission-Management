import { useState } from 'react'
import { Tags } from 'lucide-react'
import { toast } from 'sonner'
import { useData } from '@/lib/data'
import { TITLES, type Title } from '@/data/org-seed'
import { PageHeader } from '@/components/org/page-header'
import { ListToolbar } from '@/components/org/list-toolbar'
import { Panel, RecordName } from '@/components/org/panel'
import { DataTable, type Column } from '@/components/org/data-table'
import { EmptyState } from '@/components/org/empty-state'
import { Badge } from '@/components/ui/badge'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

export default function Titles() {
  const { data, loading } = useData<Title[]>('org-titles', 'seed', TITLES)
  const [search, setSearch] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [selected, setSelected] = useState<Title | null>(null)

  const titles = data ?? []
  const filtered = titles.filter((t) =>
    `${t.title} ${t.description} ${t.category} ${t.function}`.toLowerCase().includes(search.toLowerCase()),
  )

  const columns: Column<Title>[] = [
    { key: 'title', header: 'Title', width: '28%', cell: (t) => <RecordName name={t.title} sub={t.description} /> },
    { key: 'category', header: 'Category', cell: (t) => <Badge variant="secondary" className="font-normal">{t.category}</Badge> },
    { key: 'level', header: 'Level', cell: (t) => <span className="font-mono text-[13px] text-foreground">{t.level}</span> },
    { key: 'market', header: 'Market', cell: (t) => <span className="text-sm text-muted-foreground">{t.market}</span> },
    { key: 'function', header: 'Function', cell: (t) => <span className="text-sm text-muted-foreground">{t.function}</span> },
    { key: 'pay', header: 'Pay Period', align: 'right', cell: (t) => <span className="text-sm text-muted-foreground">{t.payPeriodType}</span> },
  ]

  return (
    <div data-test-id="titles-page">
      <PageHeader
        eyebrow="Organization"
        title="Titles"
        subtitle="The catalog of job titles that classify positions and drive plan, rate-table, and pay-curve assignment."
        meta={`${filtered.length} titles`}
      />
      <ListToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search title, description…"
        onCreate={() => setCreateOpen(true)}
        createLabel="Create"
      />
      <Panel>
        <DataTable
          testId="titles-table"
          columns={columns}
          rows={filtered}
          rowId={(t) => t.id}
          loading={loading}
          onRowClick={(t) => setSelected(t)}
          empty={
            <EmptyState
              icon={Tags}
              title="No titles match"
              description="Try a different search, or create a new title to classify your positions."
            />
          }
        />
      </Panel>

      <Sheet open={selected != null} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent className="w-full gap-0 sm:!max-w-md" data-test-id="edit-title-sheet">
          {selected ? (
            <>
              <SheetHeader>
                <SheetTitle className="font-heading text-2xl font-normal">Edit Title</SheetTitle>
                <SheetDescription>Update how this title classifies positions.</SheetDescription>
              </SheetHeader>
              <form
                className="flex-1 space-y-4 overflow-auto px-4"
                onSubmit={(e) => {
                  e.preventDefault()
                  toast.success('Title saved', { description: `${selected.title} updated.` })
                  setSelected(null)
                }}
              >
                <div className="space-y-1.5">
                  <Label htmlFor="et-title">Title</Label>
                  <Input id="et-title" defaultValue={selected.title} data-test-id="edit-title-name" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="et-desc">Description <span className="text-muted-foreground/70">(optional)</span></Label>
                  <Textarea id="et-desc" defaultValue={selected.description} data-test-id="edit-title-desc" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="et-pay">Pay Period Type</Label>
                  <Input id="et-pay" defaultValue={selected.payPeriodType} data-test-id="edit-title-pay" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="et-cat">Title Category</Label>
                    <Input id="et-cat" defaultValue={selected.category} data-test-id="edit-title-category" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="et-func">Function <span className="text-muted-foreground/70">(optional)</span></Label>
                    <Input id="et-func" defaultValue={selected.function} data-test-id="edit-title-function" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="et-level">Level <span className="text-muted-foreground/70">(optional)</span></Label>
                    <Input id="et-level" defaultValue={selected.level} data-test-id="edit-title-level" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="et-market">Market <span className="text-muted-foreground/70">(optional)</span></Label>
                    <Input id="et-market" defaultValue={selected.market} data-test-id="edit-title-market" />
                  </div>
                </div>
                <SheetFooter className="px-0">
                  <Button type="submit" data-test-id="edit-title-save">Save</Button>
                  <Button type="button" variant="outline" onClick={() => setSelected(null)}>Cancel</Button>
                </SheetFooter>
              </form>
            </>
          ) : null}
        </SheetContent>
      </Sheet>

      <Sheet open={createOpen} onOpenChange={setCreateOpen}>
        <SheetContent className="w-full gap-0 sm:max-w-md" data-test-id="create-title-sheet">
          <SheetHeader>
            <SheetTitle className="font-heading text-2xl font-normal">Create Title</SheetTitle>
            <SheetDescription>Define a reusable title for positions and plan assignment.</SheetDescription>
          </SheetHeader>
          <form
            className="flex-1 space-y-4 overflow-auto px-4"
            onSubmit={(e) => {
              e.preventDefault()
              toast.success('Title created', { description: 'The new title is available for assignment.' })
              setCreateOpen(false)
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="t-title">Title *</Label>
              <Input id="t-title" required placeholder="e.g. Enterprise AE" data-test-id="field-title" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="t-desc">Description</Label>
              <Textarea id="t-desc" placeholder="Short description" data-test-id="field-description" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="t-cat">Category</Label>
                <Input id="t-cat" placeholder="Sales" data-test-id="field-category" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="t-level">Level</Label>
                <Input id="t-level" placeholder="IC-3" data-test-id="field-level" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="t-market">Market</Label>
                <Input id="t-market" placeholder="Global" data-test-id="field-market" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="t-func">Function</Label>
                <Input id="t-func" placeholder="Field Sales" data-test-id="field-function" />
              </div>
            </div>
            <SheetFooter className="px-0">
              <Button type="submit" data-test-id="create-title-submit">Save</Button>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  )
}
