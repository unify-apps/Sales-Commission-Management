import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Layers, Pencil, FileText, ClipboardList, ClipboardCheck, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { useData } from '@/lib/data'
import { RULES, RULES_TOTAL, type Rule, type RuleStage, type RuleType } from '@/data/plan-seed'
import { usePlanRecordsStore } from '@/lib/store'
import { PageHeader } from '@/components/org/page-header'
import { ListToolbar } from '@/components/org/list-toolbar'
import { Panel, DetailSection } from '@/components/org/panel'
import { CreateRecordDialog, type CreateField, type CreateValues } from '@/components/org/create-record-dialog'
import { DataTable, type Column } from '@/components/org/data-table'
import { EmptyState } from '@/components/org/empty-state'
import { ListPagination } from '@/components/org/pagination'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'

const RULE_TYPES: RuleType[] = ['Direct Credit', 'Commission', 'Bonus']

const RULE_FIELDS: CreateField[] = [
  { name: 'name', label: 'Rule Name', required: true, placeholder: 'DC — HTD Booked', full: true },
  { name: 'ruleType', label: 'Rule Type', kind: 'select', required: true, options: RULE_TYPES },
  { name: 'creditType', label: 'Credit Type', placeholder: 'e.g. Booked - Rolled' },
  { name: 'value', label: 'Result Value', placeholder: 'Credit.Amount' },
  { name: 'description', label: 'Description', placeholder: 'Optional', full: true },
]

function RuleEditSheet({ rule, onClose }: { rule: Rule; onClose: () => void }) {
  const condition = rule.conditions[0]
  const result = rule.results[0]
  return (
    <SheetContent className="w-full gap-0 overflow-auto p-0 sm:!max-w-4xl" data-test-id="rule-edit-sheet">
      <SheetHeader className="border-b border-border px-6 py-4">
        <span className="text-sm text-muted-foreground">Rules Library</span>
        <SheetTitle className="font-heading text-2xl font-normal">{rule.name}</SheetTitle>
      </SheetHeader>

      <div className="space-y-5 bg-muted/50 px-6 py-6">
        <DetailSection title="Rule Details" icon={<FileText className="size-4" />}>
            <div className="space-y-1.5">
              <Label htmlFor="r-name">Rule Name</Label>
              <Input id="r-name" defaultValue={rule.name} disabled data-test-id="rule-name-input" />
            </div>
            <div className="space-y-1.5">
              <Label>Rule Type</Label>
              <div className="flex h-9 items-center text-sm text-foreground">{rule.ruleType}</div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="r-start">Active Start Date <span className="text-muted-foreground/70">(Optional)</span></Label>
              <Input id="r-start" type="date" data-test-id="rule-start-input" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="r-end">Active End Date <span className="text-muted-foreground/70">(Optional)</span></Label>
              <Input id="r-end" type="date" data-test-id="rule-end-input" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="r-desc">Description <span className="text-muted-foreground/70">(Optional)</span></Label>
              <Textarea id="r-desc" defaultValue={rule.description} data-test-id="rule-desc-input" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Reporting Settings</Label>
              <label className="flex items-center gap-2 text-sm text-foreground">
                <Checkbox defaultChecked={rule.rollableOnReporting} data-test-id="rule-rollable-input" />
                Rollable On Reporting <span className="text-muted-foreground/70">(Optional)</span>
              </label>
            </div>
        </DetailSection>

        <DetailSection title="Rule Conditions (Optional)" icon={<ClipboardList className="size-4" />}>
          <div className="overflow-hidden rounded-md border border-border bg-background sm:col-span-4" data-test-id="rule-condition-row">
            <div className="grid grid-cols-[80px_1fr_1fr_1fr_1fr_40px] items-center">
              {[condition.connector, condition.object, condition.field, condition.operator, condition.value].map((v, i) => (
                <div key={i} className="border-r border-border px-4 py-3 text-center text-sm text-foreground">{v}</div>
              ))}
              <div className="px-3 text-center text-muted-foreground">×</div>
            </div>
          </div>
          <div className="sm:col-span-4">
            <Button variant="ghost" size="sm" className="text-primary" onClick={() => toast('Add Condition')} data-test-id="rule-add-condition">
              <Plus className="size-4" />
              Add Condition
            </Button>
          </div>
        </DetailSection>

        <DetailSection title="Results Created" icon={<ClipboardCheck className="size-4" />}>
          <div className="rounded-md border border-border bg-background p-5 sm:col-span-4">
            <div className="mb-4 inline-flex rounded-md bg-muted px-3 py-1.5 text-sm font-medium text-foreground">{result.name}</div>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="res-name">Result Name</Label>
                <Input id="res-name" defaultValue={result.name} data-test-id="rule-result-name" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="res-credit">Credit Type <span className="text-muted-foreground/70">(Optional)</span></Label>
                <Input id="res-credit" defaultValue={result.creditType} data-test-id="rule-result-credit" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="res-value">Value</Label>
                <Input id="res-value" defaultValue={result.value} className="font-mono text-[13px]" data-test-id="rule-result-value" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="res-hold">Hold Period <span className="text-muted-foreground/70">(Optional)</span></Label>
                <Input id="res-hold" defaultValue={result.holdPeriod} data-test-id="rule-result-hold" />
              </div>
            </div>
          </div>
        </DetailSection>
      </div>

      <div className="sticky bottom-0 flex justify-end gap-2 border-t border-border bg-card px-6 py-3">
        <Button variant="ghost" onClick={onClose} data-test-id="rule-cancel">Cancel</Button>
        <Button
          onClick={() => {
            toast.success('Rule saved')
            onClose()
          }}
          data-test-id="rule-save"
        >
          Save
        </Button>
      </div>
    </SheetContent>
  )
}

export default function Rules() {
  const { data, loading } = useData<Rule[]>('plan-rules', 'seed', RULES)
  const [search, setSearch] = useState('')
  const [searchParams] = useSearchParams()
  const [stage, setStage] = useState<RuleStage>(searchParams.get('stage') === 'payout' ? 'payout' : 'credit')
  const [selected, setSelected] = useState<Rule | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const createdRules = usePlanRecordsStore((s) => s.rules)
  const addRule = usePlanRecordsStore((s) => s.addRule)

  function handleCreate(values: CreateValues) {
    const name = values.name.trim()
    const rule: Rule = {
      id: `rule-${Date.now()}`,
      name,
      stage,
      ruleType: values.ruleType as RuleType,
      description: values.description.trim(),
      activeStart: null,
      activeEnd: null,
      rollableOnReporting: false,
      conditions: [{ connector: 'IF', object: 'OrderItem', field: 'OrderType', operator: 'Equals', value: 'Booked' }],
      results: [
        {
          name,
          creditType: values.creditType.trim(),
          value: values.value.trim() || 'Credit.Amount',
          holdPeriod: '—',
        },
      ],
    }
    addRule(rule)
    toast('Rule created', { description: `${name} added to ${stage} rules.` })
  }

  const rows = [...createdRules, ...(data ?? [])]
    .filter((r) => r.stage === stage)
    .filter((r) => `${r.name} ${r.description}`.toLowerCase().includes(search.toLowerCase()))

  const columns: Column<Rule>[] = [
    { key: 'name', header: 'Rule Name', width: '30%', cell: (r) => <span className="text-sm font-medium text-foreground">{r.name}</span> },
    { key: 'type', header: 'Rule Type', cell: (r) => <Badge variant="secondary" className="font-normal">{r.ruleType}</Badge> },
    {
      key: 'desc',
      header: 'Description',
      cell: (r) =>
        r.description ? <span className="text-sm text-muted-foreground">{r.description}</span> : <span className="text-muted-foreground/50">—</span>,
    },
    { key: 'start', header: 'Active Start Date', cell: (r) => <span className="text-sm text-muted-foreground">{r.activeStart ?? '—'}</span> },
    { key: 'end', header: 'Active End Date', cell: (r) => <span className="text-sm text-muted-foreground">{r.activeEnd ?? '—'}</span> },
    {
      key: 'actions',
      header: '',
      align: 'right',
      width: '60px',
      cell: (r) => (
        <button
          type="button"
          className="text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
          onClick={(e) => {
            e.stopPropagation()
            setSelected(r)
          }}
          data-test-id={`rule-edit-${r.id}`}
          aria-label={`Edit ${r.name}`}
        >
          <Pencil className="size-4" />
        </button>
      ),
    },
  ]

  return (
    <div data-test-id="rules-page">
      <PageHeader
        eyebrow="Plan Design"
        title="Rules Library"
        subtitle="One list, two stages. All credit rules run, then all payout rules run — every matching rule fires, there is no first-match-wins."
        meta={`${RULES_TOTAL} rules`}
      />
      <ListToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search Rule Name"
        showUpload={false}
        onCreate={() => setCreateOpen(true)}
        extra={
          <Tabs value={stage} onValueChange={(v) => setStage(v as RuleStage)}>
            <TabsList className="h-9" data-test-id="rules-stage-tabs">
              <TabsTrigger value="credit">Credit</TabsTrigger>
              <TabsTrigger value="payout">Payout</TabsTrigger>
            </TabsList>
          </Tabs>
        }
      />
      <Panel>
        <DataTable
          testId="rules-table"
          columns={columns}
          rows={rows}
          rowId={(r) => r.id}
          loading={loading}
          onRowClick={(r) => setSelected(r)}
          empty={<EmptyState icon={Layers} title={`No ${stage} rules match`} description="Adjust your search or author a new rule for this stage." />}
        />
        {!loading && rows.length > 0 ? (
          <ListPagination showingFrom={1} showingTo={rows.length} total={RULES_TOTAL} testId="rules-pagination" />
        ) : null}
      </Panel>

      <CreateRecordDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title={`Create ${stage === 'credit' ? 'Credit' : 'Payout'} Rule`}
        description="Name the rule and its result. A default condition is added — refine it after saving."
        fields={RULE_FIELDS}
        submitLabel="Create"
        onSubmit={handleCreate}
        testId="create-rule-dialog"
      />

      <Sheet open={selected != null} onOpenChange={(open) => !open && setSelected(null)}>
        {selected ? <RuleEditSheet rule={selected} onClose={() => setSelected(null)} /> : null}
      </Sheet>
    </div>
  )
}
