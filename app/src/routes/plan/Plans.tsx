import { useState } from 'react'
import { Package, Pencil, FileText, Boxes, X, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { useData } from '@/lib/data'
import { PLANS, PLANS_TOTAL, type Plan, type PlanRuleRef } from '@/data/plan-seed'
import { usePlanRecordsStore } from '@/lib/store'
import { PageHeader } from '@/components/org/page-header'
import { ListToolbar } from '@/components/org/list-toolbar'
import { Panel, DetailSection } from '@/components/org/panel'
import { CreateRecordDialog, type CreateField, type CreateValues } from '@/components/org/create-record-dialog'
import { DataTable, type Column } from '@/components/org/data-table'
import { EmptyState } from '@/components/org/empty-state'
import { ListPagination } from '@/components/org/pagination'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { CURRENT_YEAR_PERIOD } from '@/lib/period'

const PERIODS = ['All', 'YEAR-2026', 'YEAR-2025', 'YEAR-2024', 'YEAR-2023'] as const
const PAGE_SIZE = 50

const PLAN_FIELDS: CreateField[] = [
  { name: 'name', label: 'Plan Name', required: true, placeholder: 'Enterprise AE — FY26', full: true },
  { name: 'period', label: 'Period', kind: 'select', required: true, options: ['YEAR-2026', 'YEAR-2025', 'YEAR-2024', 'YEAR-2023'] },
  { name: 'description', label: 'Description', placeholder: 'Optional', full: true },
]

const STEPS = [
  { id: 'components', label: 'Step 1: Add Plan Components' },
  { id: 'assignments', label: 'Step 2: Add Assignments' },
  { id: 'illustrator', label: 'Step 3: Illustrator Setup' },
] as const

function RuleSection({
  title,
  addLabel,
  rules,
}: {
  title: string
  addLabel: string
  rules: PlanRuleRef[]
}) {
  return (
    <section className="space-y-3" data-test-id={`plan-rule-section-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      <div>
        <h4 className="text-sm font-semibold text-foreground">
          {title} <span className="text-muted-foreground">({rules.length})</span>
        </h4>
        <p className="text-sm text-muted-foreground">Select the {title.toLowerCase()} to include on this plan.</p>
      </div>
      {rules.length > 0 ? (
        <div className="overflow-hidden rounded-md border border-border">
          <div className="grid grid-cols-[1fr_1fr_40px] border-b border-border bg-muted/50 px-4 py-2">
            <span className="font-mono text-[11px] uppercase tracking-[0.09em] text-muted-foreground">{title.replace(/s$/, '')}</span>
            <span className="font-mono text-[11px] uppercase tracking-[0.09em] text-muted-foreground">Description</span>
            <span />
          </div>
          {rules.map((r) => (
            <div key={r.name} className="grid grid-cols-[1fr_1fr_40px] items-center border-b border-border px-4 py-2.5 last:border-b-0">
              <span className="text-sm text-foreground">{r.name}</span>
              <span className="text-sm text-muted-foreground">{r.description || '—'}</span>
              <button type="button" className="text-muted-foreground hover:text-destructive" aria-label={`Remove ${r.name}`}>
                <X className="size-4" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-md border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
          No {title.toLowerCase()} added yet.
        </div>
      )}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" className="text-primary" onClick={() => toast(addLabel)}>
          <Plus className="size-4" />
          {addLabel}
        </Button>
        {rules.length > 0 ? (
          <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => toast('Remove All')}>
            Remove All
          </Button>
        ) : null}
      </div>
    </section>
  )
}

function PlanDetailSheet({ plan, onClose }: { plan: Plan; onClose: () => void }) {
  const [step, setStep] = useState<string>('components')
  return (
    <SheetContent className="w-full gap-0 overflow-auto p-0 sm:!max-w-5xl" data-test-id="plan-detail-sheet">
      <SheetHeader className="border-b border-border px-6 py-4">
        <span className="text-sm text-muted-foreground">Plans</span>
        <SheetTitle className="font-heading text-2xl font-normal">{plan.name}</SheetTitle>
      </SheetHeader>

      <div className="space-y-5 bg-muted/50 px-6 py-6">
        <DetailSection title="General Details" icon={<FileText className="size-4" />}>
            <div className="space-y-1.5">
              <Label>Name</Label>
              <div className="text-sm text-foreground">{plan.name}</div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-desc">Description <span className="text-muted-foreground/70">(optional)</span></Label>
              <Textarea id="p-desc" defaultValue={plan.description} data-test-id="plan-desc-input" />
            </div>
            <div className="space-y-1.5">
              <Label>Period</Label>
              <div className="font-mono text-sm text-foreground">{plan.period}</div>
            </div>
            <div className="space-y-1.5">
              <Label>Tags</Label>
              <div className="flex h-9 items-center rounded-md border border-border bg-background px-3 text-sm text-muted-foreground/60">Select Items</div>
            </div>
        </DetailSection>

        <DetailSection title="Plan Components and Assignments" icon={<Boxes className="size-4" />}>
          <p className="-mt-1 text-sm text-muted-foreground sm:col-span-4">
            Select the plan design components to include, then assign by titles or positions.
          </p>
          <div className="grid grid-cols-1 gap-6 sm:col-span-4 lg:grid-cols-[220px_1fr]">
            <div className="flex flex-col gap-1" data-test-id="plan-steps">
              {STEPS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setStep(s.id)}
                  className={cn(
                    'rounded-md px-3 py-2.5 text-left text-sm transition-colors',
                    step === s.id ? 'bg-muted font-medium text-foreground' : 'text-muted-foreground hover:bg-muted/60',
                  )}
                  data-test-id={`plan-step-${s.id}`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            <div className="space-y-8">
              {step === 'components' ? (
                <>
                  <RuleSection title="Credit Rules" addLabel="Add Credit Rules" rules={plan.creditRules} />
                  <RuleSection title="Commission Rules" addLabel="Add Commission Rules" rules={plan.commissionRules} />
                  <RuleSection title="Bonus Rules" addLabel="Add Bonus Rules" rules={plan.bonusRules} />
                </>
              ) : step === 'assignments' ? (
                <div className="space-y-4" data-test-id="plan-assignments">
                  <div className="rounded-md border border-border p-4">
                    <div className="font-mono text-[11px] uppercase tracking-[0.09em] text-muted-foreground">Title Assignments</div>
                    <div className="mt-1 font-heading text-2xl text-foreground">{plan.titleAssignments}</div>
                    <p className="text-sm text-muted-foreground">Titles assigned to this plan, effective-dated.</p>
                  </div>
                  <div className="rounded-md border border-border p-4">
                    <div className="font-mono text-[11px] uppercase tracking-[0.09em] text-muted-foreground">Position Assignments</div>
                    <div className="mt-1 font-heading text-2xl text-foreground">{plan.positionAssignments}</div>
                    <p className="text-sm text-muted-foreground">Position-level assignment beats title-level.</p>
                  </div>
                </div>
              ) : (
                <div className="rounded-md border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground" data-test-id="plan-illustrator">
                  Configure the rep-facing Illustrator estimate for this plan.
                </div>
              )}
            </div>
          </div>
        </DetailSection>
      </div>

      <div className="sticky bottom-0 flex justify-end gap-2 border-t border-border bg-card px-6 py-3">
        <Button variant="ghost" onClick={onClose} data-test-id="plan-cancel">Cancel</Button>
        <Button variant="outline" onClick={() => toast('Plan copied')} data-test-id="plan-save-copy">Save &amp; Copy Plan</Button>
        <Button
          onClick={() => {
            toast.success('Plan saved')
            onClose()
          }}
          data-test-id="plan-save-close"
        >
          Save &amp; Close
        </Button>
      </div>
    </SheetContent>
  )
}

export default function Plans() {
  const { data, loading } = useData<Plan[]>('plan-plans', 'seed', PLANS)
  const [search, setSearch] = useState('')
  const [period, setPeriod] = useState<string>('All')
  const [selected, setSelected] = useState<Plan | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const createdPlans = usePlanRecordsStore((s) => s.plans)
  const addPlan = usePlanRecordsStore((s) => s.addPlan)

  function handleCreate(values: CreateValues) {
    const plan: Plan = {
      id: `plan-${Date.now()}`,
      name: values.name.trim(),
      period: values.period,
      description: values.description.trim(),
      creditRules: [],
      commissionRules: [],
      bonusRules: [],
      titleAssignments: 0,
      positionAssignments: 0,
      tags: [],
    }
    addPlan(plan)
    toast('Plan created', { description: `${plan.name} (${plan.period}) added.` })
  }

  const rows = [...createdPlans, ...(data ?? [])]
    .filter((p) => (period === 'All' ? true : p.period === period))
    .filter((p) => `${p.name} ${p.description}`.toLowerCase().includes(search.toLowerCase()))
    // Newest → oldest, current fiscal period first, so no view opens on stale years.
    .sort((a, b) => {
      if (a.period === CURRENT_YEAR_PERIOD && b.period !== CURRENT_YEAR_PERIOD) return -1
      if (b.period === CURRENT_YEAR_PERIOD && a.period !== CURRENT_YEAR_PERIOD) return 1
      return b.period.localeCompare(a.period)
    })

  const columns: Column<Plan>[] = [
    { key: 'name', header: 'Name', width: '38%', cell: (p) => <span className="text-sm font-medium text-foreground">{p.name}</span> },
    {
      key: 'desc',
      header: 'Description',
      cell: (p) =>
        p.description ? <span className="text-sm text-muted-foreground">{p.description}</span> : <span className="text-muted-foreground/50">—</span>,
    },
    { key: 'period', header: 'Period', cell: (p) => <span className="font-mono text-[13px] text-foreground">{p.period}</span> },
    {
      key: 'actions',
      header: '',
      align: 'right',
      width: '60px',
      cell: (p) => (
        <button
          type="button"
          className="text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
          onClick={(e) => {
            e.stopPropagation()
            setSelected(p)
          }}
          data-test-id={`plan-edit-${p.id}`}
          aria-label={`Edit ${p.name}`}
        >
          <Pencil className="size-4" />
        </button>
      ),
    },
  ]

  const showingTo = Math.min(PAGE_SIZE, rows.length)

  return (
    <div data-test-id="plans-page">
      <PageHeader
        eyebrow="Plan Design"
        title="Plans"
        subtitle="A container, not math. A plan selects which rules apply and to whom, for a period. Position-level assignment beats title-level."
        meta={`${PLANS_TOTAL} plans`}
      />
      <ListToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search"
        showUpload={false}
        onCreate={() => setCreateOpen(true)}
        createLabel="Create"
        extra={
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="h-9 w-[160px]" data-test-id="plan-period-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERIODS.map((p) => (
                <SelectItem key={p} value={p}>{p === 'All' ? 'Period: All' : p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />
      <Panel>
        <DataTable
          testId="plans-table"
          columns={columns}
          rows={rows}
          rowId={(p) => p.id}
          loading={loading}
          onRowClick={(p) => setSelected(p)}
          empty={<EmptyState icon={Package} title="No plans match" description="Adjust your search or period filter." />}
        />
        {!loading && rows.length > 0 ? (
          <ListPagination showingFrom={1} showingTo={showingTo} total={PLANS_TOTAL} pages={2} testId="plans-pagination" />
        ) : null}
      </Panel>

      <CreateRecordDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Create Plan"
        description="Name the plan and its period. Add rules, quotas and assignments after saving."
        fields={PLAN_FIELDS}
        submitLabel="Create"
        onSubmit={handleCreate}
        testId="create-plan-dialog"
      />

      <Sheet open={selected != null} onOpenChange={(open) => !open && setSelected(null)}>
        {selected ? <PlanDetailSheet plan={selected} onClose={() => setSelected(null)} /> : null}
      </Sheet>
    </div>
  )
}
