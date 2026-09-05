import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sigma, Pencil, ChevronLeft, ChevronRight, FileText, Code2 } from 'lucide-react'
import { toast } from 'sonner'
import { useData } from '@/lib/data'
import { FORMULAS, FORMULAS_TOTAL, type Formula } from '@/data/plan-seed'
import { PageHeader } from '@/components/org/page-header'
import { ListToolbar } from '@/components/org/list-toolbar'
import { Panel, DetailField, DetailSection } from '@/components/org/panel'
import { DataTable, type Column } from '@/components/org/data-table'
import { EmptyState } from '@/components/org/empty-state'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { cn } from '@/lib/utils'

const PAGE_SIZE = 20

export default function Formulas() {
  const { data, loading } = useData<Formula[]>('plan-formulas', 'seed', FORMULAS)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Formula | null>(null)
  const navigate = useNavigate()

  const rows = (data ?? []).filter((f) =>
    `${f.name} ${f.expression} ${f.description}`.toLowerCase().includes(search.toLowerCase()),
  )

  const columns: Column<Formula>[] = [
    { key: 'name', header: 'Name', width: '22%', cell: (f) => <span className="font-mono text-[13px] text-foreground">{f.name}</span> },
    {
      key: 'expr',
      header: 'Formula Expression',
      width: '44%',
      cell: (f) => (
        <code className="block truncate font-mono text-[12.5px] text-primary" title={f.expression}>
          {f.expression}
        </code>
      ),
    },
    {
      key: 'type',
      header: 'Formula Type',
      cell: (f) => (
        <Badge
          variant="outline"
          className={cn(
            'font-normal',
            f.type === 'Relational'
              ? 'border-[#c7b8e0] bg-[#f0eaf9] text-[#6b4a9e]'
              : 'text-muted-foreground',
          )}
        >
          {f.type}
        </Badge>
      ),
    },
    {
      key: 'desc',
      header: 'Description',
      cell: (f) =>
        f.description ? (
          <span className="text-sm text-muted-foreground">{f.description}</span>
        ) : (
          <span className="text-muted-foreground/50">—</span>
        ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      width: '60px',
      cell: (f) => (
        <button
          type="button"
          className="text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
          onClick={(e) => {
            e.stopPropagation()
            toast('Edit Formula', { description: `Opening the expression builder for ${f.name}.` })
          }}
          data-test-id={`formula-edit-${f.id}`}
          aria-label={`Edit ${f.name}`}
        >
          <Pencil className="size-4" />
        </button>
      ),
    },
  ]

  const showingTo = Math.min(PAGE_SIZE, rows.length)

  return (
    <div data-test-id="formulas-page">
      <PageHeader
        eyebrow="Plan Design"
        title="Formulas"
        subtitle="Named, reusable expressions built over system functions and data objects. Numeric formulas return a value; relational formulas return true/false for a rule condition."
        meta={`${FORMULAS_TOTAL} formulas`}
      />
      <ListToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search"
        showUpload={false}
        onCreate={() => navigate('/plan/formulas/new')}
      />
      <Panel>
        <DataTable
          testId="formulas-table"
          columns={columns}
          rows={rows}
          rowId={(f) => f.id}
          loading={loading}
          onRowClick={(f) => setSelected(f)}
          empty={<EmptyState icon={Sigma} title="No formulas match" description="Adjust your search or author a new expression." />}
        />
        {!loading && rows.length > 0 ? (
          <div className="flex items-center justify-between border-t border-border px-5 py-3" data-test-id="formulas-pagination">
            <span className="text-sm text-muted-foreground">
              Showing 1 – {showingTo} of {FORMULAS_TOTAL}
            </span>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="size-8" disabled aria-label="Previous page">
                <ChevronLeft className="size-4" />
              </Button>
              {[1, 2, 3, 4, 5].map((p) => (
                <Button
                  key={p}
                  variant={p === 1 ? 'secondary' : 'ghost'}
                  size="icon"
                  className="size-8 font-mono text-[13px]"
                  onClick={() => toast('Page', { description: `Loading page ${p}.` })}
                  data-test-id={`formulas-page-${p}`}
                >
                  {p}
                </Button>
              ))}
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                onClick={() => toast('Page', { description: 'Loading next page.' })}
                aria-label="Next page"
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        ) : null}
      </Panel>

      <Sheet open={selected != null} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent className="w-full gap-0 overflow-auto p-0 sm:!max-w-3xl" data-test-id="formula-detail-sheet">
          {selected ? (
            <>
              <SheetHeader className="border-b border-border px-6 py-4">
                <SheetTitle className="font-heading text-2xl font-normal">{selected.name}</SheetTitle>
              </SheetHeader>
              <div className="space-y-5 bg-muted/50 px-6 py-6">
                <DetailSection title="General Details" icon={<FileText className="size-4" />}>
                  <DetailField label="Name" value={<span className="font-mono">{selected.name}</span>} />
                  <DetailField label="Formula Type" value={<Badge variant="secondary" className="font-normal">{selected.type}</Badge>} />
                  <DetailField label="Description" value={selected.description || '—'} />
                </DetailSection>
                <DetailSection title="Expression" icon={<Code2 className="size-4" />}>
                  <div className="sm:col-span-4">
                    <code className="block whitespace-pre-wrap break-words rounded-md border border-border bg-background px-4 py-3 font-mono text-[13px] text-primary">
                      {selected.expression}
                    </code>
                  </div>
                </DetailSection>
              </div>
              <div className="sticky bottom-0 flex justify-end gap-2 border-t border-border bg-card px-6 py-3">
                <Button variant="outline" onClick={() => toast('Edit Formula', { description: `Opening the expression builder for ${selected.name}.` })} data-test-id="formula-edit-detail">Edit</Button>
                <Button onClick={() => setSelected(null)} data-test-id="formula-detail-close">Close</Button>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  )
}
