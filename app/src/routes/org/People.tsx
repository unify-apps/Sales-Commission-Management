import { useState } from 'react'
import { Users, Clock, UserRound, Wallet } from 'lucide-react'
import { useData } from '@/lib/data'
import { PEOPLE, PROFILES, type Person, type Profile } from '@/data/org-seed'
import { formatMoney, formatDate } from '@/lib/format'
import { PageHeader } from '@/components/org/page-header'
import { ListToolbar } from '@/components/org/list-toolbar'
import { Panel, RecordName, DetailField, DetailSection } from '@/components/org/panel'
import { DataTable, type Column } from '@/components/org/data-table'
import { EmptyState } from '@/components/org/empty-state'
import { StatusBadge } from '@/components/org/status-badge'
import { CreateRecordDialog, type CreateField, type CreateValues } from '@/components/org/create-record-dialog'
import { useOrgRecordsStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { toast } from 'sonner'

const REGIONS = ['NA-West', 'NA-East', 'EMEA', 'APAC', 'UK/BEN/Nord']
const CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY']

const PERSON_FIELDS: CreateField[] = [
  { name: 'firstName', label: 'First Name', required: true, placeholder: 'Jordan' },
  { name: 'lastName', label: 'Last Name', required: true, placeholder: 'Reyes' },
  { name: 'userEmail', label: 'User (email)', required: true, placeholder: 'jordan.reyes@chargepoint.com', full: true },
  { name: 'employeeId', label: 'Employee ID', required: true, placeholder: 'E-10099' },
  { name: 'region', label: 'Region', kind: 'select', required: true, options: REGIONS },
  { name: 'personalTarget', label: 'Personal Target', kind: 'number', placeholder: '200000' },
  { name: 'salary', label: 'Salary', kind: 'number', placeholder: '130000' },
  { name: 'currency', label: 'Currency', kind: 'select', options: CURRENCIES, placeholder: 'USD' },
]

export default function People() {
  const { data, loading } = useData<Person[]>('org-people', 'seed', PEOPLE)
  const { data: profiles } = useData<Profile[]>('org-profiles', 'seed', PROFILES)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Person | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const created = useOrgRecordsStore((s) => s.people)
  const addPerson = useOrgRecordsStore((s) => s.addPerson)

  const people = [...created, ...(data ?? [])]
  const selectedProfile = selected ? (profiles ?? []).find((p) => p.employeeId === selected.employeeId) : undefined
  const filtered = people.filter((p) =>
    `${p.firstName} ${p.lastName} ${p.employeeId} ${p.region}`.toLowerCase().includes(search.toLowerCase()),
  )

  function handleCreate(values: CreateValues) {
    const person: Person = {
      id: `person-${Date.now()}`,
      firstName: values.firstName.trim(),
      lastName: values.lastName.trim(),
      userEmail: values.userEmail.trim(),
      employeeId: values.employeeId.trim(),
      region: values.region,
      currency: values.currency || 'USD',
      personalTarget: Number(values.personalTarget) || 0,
      salary: Number(values.salary) || 0,
    }
    addPerson(person)
    toast('Person created', { description: `${person.firstName} ${person.lastName} added to the roster.` })
  }

  const columns: Column<Person>[] = [
    {
      key: 'name',
      header: 'Person',
      width: '26%',
      cell: (p) => <RecordName name={`${p.firstName} ${p.lastName}`} sub={p.userEmail} />,
    },
    { key: 'eid', header: 'Employee ID', cell: (p) => <span className="font-mono text-[13px] text-foreground">{p.employeeId}</span> },
    { key: 'region', header: 'Region', cell: (p) => <span className="text-sm text-muted-foreground">{p.region}</span> },
    { key: 'target', header: 'Personal Target', align: 'right', cell: (p) => <span className="font-mono text-[13px] tabular-nums text-foreground">{formatMoney(p.personalTarget, p.currency)}</span> },
    { key: 'salary', header: 'Salary', align: 'right', cell: (p) => <span className="font-mono text-[13px] tabular-nums text-muted-foreground">{formatMoney(p.salary, p.currency)}</span> },
  ]

  return (
    <div data-test-id="people-page">
      <PageHeader
        eyebrow="Organization"
        title="People"
        subtitle="The roster of employees and their personal compensation attributes, independent of the position they currently hold."
        meta={`${filtered.length} people`}
      />
      <ListToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search first name, last name, ID…"
        onCreate={() => setCreateOpen(true)}
        createLabel="Create"
      />
      <CreateRecordDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Create Person"
        description="Add a new employee to the roster."
        fields={PERSON_FIELDS}
        onSubmit={handleCreate}
        testId="create-person-dialog"
      />
      <Panel>
        <DataTable
          testId="people-table"
          columns={columns}
          rows={filtered}
          rowId={(p) => p.id}
          loading={loading}
          onRowClick={(p) => setSelected(p)}
          empty={<EmptyState icon={Users} title="No people match" description="Adjust your search or add a person to the roster." />}
        />
      </Panel>

      <Sheet open={selected != null} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent className="w-full gap-0 overflow-auto p-0 sm:!max-w-4xl" data-test-id="person-detail-sheet">
          {selected ? (
            <>
              <SheetHeader className="border-b border-border px-6 py-4">
                <SheetTitle className="font-heading text-2xl font-normal">
                  {selected.firstName} {selected.lastName}
                </SheetTitle>
              </SheetHeader>
              <div className="space-y-5 bg-muted/50 px-6 py-6">
                <DetailSection title="Version Info" icon={<Clock className="size-4" />}>
                  <DetailField label="Effective Start Date" value={selectedProfile ? formatDate(selectedProfile.hireDate) : 'Start of Time'} />
                  <DetailField label="Effective End Date" value={selectedProfile?.terminationDate ? formatDate(selectedProfile.terminationDate) : 'End of Time'} />
                  <DetailField label="Version Reason" value="—" />
                  <DetailField label="Version Subreason" value="—" />
                </DetailSection>

                <DetailSection title="Person Info" icon={<UserRound className="size-4" />}>
                  <DetailField label="User" value={selected.userEmail} />
                  <DetailField label="First Name" value={selected.firstName} />
                  <DetailField label="Last Name" value={selected.lastName} />
                  <DetailField label="Employee ID" value={<span className="font-mono">{selected.employeeId}</span>} />
                  <DetailField
                    label="Employee Status"
                    value={selectedProfile ? <StatusBadge status={selectedProfile.status} /> : 'Active'}
                  />
                  <DetailField label="Region" value={selected.region} />
                  <DetailField label="Hire Date" value={selectedProfile ? formatDate(selectedProfile.hireDate) : '—'} />
                  <DetailField label="Termination Date" value={selectedProfile?.terminationDate ? formatDate(selectedProfile.terminationDate) : '—'} />
                </DetailSection>

                <DetailSection title="Compensation Info" icon={<Wallet className="size-4" />}>
                  <DetailField label="Personal Target" value={<span className="font-mono tabular-nums">{formatMoney(selected.personalTarget, selected.currency)}</span>} />
                  <DetailField label="Personal Currency" value={selectedProfile?.personalCurrency ?? selected.currency} />
                  <DetailField label="Payment Currency" value={selected.currency} />
                  <DetailField label="Salary" value={<span className="font-mono tabular-nums">{formatMoney(selected.salary, selected.currency)}</span>} />
                  <DetailField label="Business Group" value={selectedProfile?.businessGroup ?? '—'} />
                  <DetailField label="Team" value={selectedProfile?.team ?? '—'} />
                </DetailSection>
              </div>
              <div className="sticky bottom-0 flex justify-end gap-2 border-t border-border bg-card px-6 py-3">
                <Button variant="outline" onClick={() => toast('Edit Person')} data-test-id="person-edit">Edit</Button>
                <Button onClick={() => setSelected(null)} data-test-id="person-close">Close</Button>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  )
}
