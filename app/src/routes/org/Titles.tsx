import { useState } from 'react'
import { Tags } from 'lucide-react'
import { toast } from 'sonner'
import {
  EMPTY_DRAFT,
  useTitleWrites,
  useTitles,
  type TitleDraft,
  type TitleRecord,
  type TitleWriteResult,
} from '@/data/titles'
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

/** The one place a record becomes an editable draft. */
function toDraft(t: TitleRecord): TitleDraft {
  const { titleId: _titleId, ...draft } = t
  return draft
}

export default function Titles() {
  const [search, setSearch] = useState('')
  const { data, loading, error, refetch, total } = useTitles(search)
  const { createTitle, updateTitle, pending } = useTitleWrites()

  const [createOpen, setCreateOpen] = useState(false)
  const [selected, setSelected] = useState<TitleRecord | null>(null)
  const [draft, setDraft] = useState<TitleDraft>(EMPTY_DRAFT)

  const titles = data ?? []
  const set = (k: keyof TitleDraft) => (v: string) => setDraft((d) => ({ ...d, [k]: v }))

  // A refused write is a healthy 200 carrying a status — never an exception.
  function handled(result: TitleWriteResult, onOk: () => void) {
    if (result.success) {
      toast.success(result.status === 'CREATED' ? 'Title created' : 'Title saved', {
        description: result.message,
      })
      refetch()
      onOk()
      return
    }
    toast.error(
      result.status === 'DUPLICATE_TITLE_CODE'
        ? 'That title code is already taken'
        : result.status === 'NOT_FOUND'
          ? 'That title no longer exists'
          : 'Could not save this title',
      { description: result.message },
    )
  }

  const columns: Column<TitleRecord>[] = [
    { key: 'title', header: 'Title', width: '28%', cell: (t) => <RecordName name={t.name} sub={t.description} /> },
    { key: 'category', header: 'Category', cell: (t) => (t.category ? <Badge variant="secondary" className="font-normal">{t.category}</Badge> : null) },
    { key: 'level', header: 'Level', cell: (t) => <span className="font-mono text-[13px] text-foreground">{t.level}</span> },
    { key: 'market', header: 'Market', cell: (t) => <span className="text-sm text-muted-foreground">{t.market}</span> },
    { key: 'function', header: 'Function', cell: (t) => <span className="text-sm text-muted-foreground">{t.function}</span> },
    { key: 'pay', header: 'Pay Period', align: 'right', cell: (t) => <span className="text-sm text-muted-foreground">{t.payPeriod}</span> },
  ]

  const fields = (prefix: string) => (
    <>
      <div className="space-y-1.5">
        <Label htmlFor={`${prefix}-code`}>Title Code *</Label>
        <Input
          id={`${prefix}-code`}
          required
          placeholder="e.g. T-ENT-AE"
          value={draft.titleCode}
          onChange={(e) => set('titleCode')(e.target.value)}
          data-test-id={`${prefix}-title-code`}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${prefix}-name`}>Title *</Label>
        <Input
          id={`${prefix}-name`}
          required
          placeholder="e.g. Enterprise AE"
          value={draft.name}
          onChange={(e) => set('name')(e.target.value)}
          data-test-id={`${prefix}-title-name`}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${prefix}-desc`}>
          Description <span className="text-muted-foreground/70">(optional)</span>
        </Label>
        <Textarea
          id={`${prefix}-desc`}
          placeholder="Short description"
          value={draft.description}
          onChange={(e) => set('description')(e.target.value)}
          data-test-id={`${prefix}-title-desc`}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${prefix}-pay`}>Pay Period Type</Label>
        <Input
          id={`${prefix}-pay`}
          placeholder="Monthly"
          value={draft.payPeriod}
          onChange={(e) => set('payPeriod')(e.target.value)}
          data-test-id={`${prefix}-title-pay`}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor={`${prefix}-cat`}>Title Category</Label>
          <Input id={`${prefix}-cat`} placeholder="Sales" value={draft.category} onChange={(e) => set('category')(e.target.value)} data-test-id={`${prefix}-title-category`} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${prefix}-func`}>Function <span className="text-muted-foreground/70">(optional)</span></Label>
          <Input id={`${prefix}-func`} placeholder="Field Sales" value={draft.function} onChange={(e) => set('function')(e.target.value)} data-test-id={`${prefix}-title-function`} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${prefix}-level`}>Level <span className="text-muted-foreground/70">(optional)</span></Label>
          <Input id={`${prefix}-level`} placeholder="IC-3" value={draft.level} onChange={(e) => set('level')(e.target.value)} data-test-id={`${prefix}-title-level`} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${prefix}-market`}>Market <span className="text-muted-foreground/70">(optional)</span></Label>
          <Input id={`${prefix}-market`} placeholder="Global" value={draft.market} onChange={(e) => set('market')(e.target.value)} data-test-id={`${prefix}-title-market`} />
        </div>
      </div>
    </>
  )

  return (
    <div data-test-id="titles-page">
      <PageHeader
        eyebrow="Organization"
        title="Titles"
        subtitle="The catalog of job titles that classify positions and drive plan, rate-table, and pay-curve assignment."
        meta={`${total ?? titles.length} titles`}
      />
      <ListToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search title, description…"
        onCreate={() => {
          setDraft(EMPTY_DRAFT)
          setCreateOpen(true)
        }}
        createLabel="Create"
      />
      <Panel>
        <DataTable
          testId="titles-table"
          columns={columns}
          rows={titles}
          rowId={(t) => t.titleId}
          loading={loading}
          // The sheet is a controlled form. The draft is seeded by the event that opens
          // it, not by an effect on `selected` — deriving it in an effect re-renders for
          // nothing and defaultValue would keep showing the first row ever opened.
          onRowClick={(t) => {
            setSelected(t)
            setDraft(toDraft(t))
          }}
          empty={
            <EmptyState
              icon={Tags}
              title={error ? 'Could not load titles' : 'No titles match'}
              description={
                error
                  ? 'The titles service did not answer. Retry, or check the automation is deployed.'
                  : 'Try a different search, or create a new title to classify your positions.'
              }
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
                onSubmit={async (e) => {
                  e.preventDefault()
                  handled(await updateTitle(selected.titleId, draft), () => setSelected(null))
                }}
              >
                {fields('et')}
                <SheetFooter className="px-0">
                  <Button type="submit" disabled={pending} data-test-id="edit-title-save">
                    {pending ? 'Saving…' : 'Save'}
                  </Button>
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
            onSubmit={async (e) => {
              e.preventDefault()
              handled(await createTitle(draft), () => setCreateOpen(false))
            }}
          >
            {fields('t')}
            <SheetFooter className="px-0">
              <Button type="submit" disabled={pending} data-test-id="create-title-submit">
                {pending ? 'Saving…' : 'Save'}
              </Button>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  )
}
