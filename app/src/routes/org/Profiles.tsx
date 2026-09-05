import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { IdCard } from 'lucide-react'
import { useData } from '@/lib/data'
import { PROFILES, type Profile } from '@/data/org-seed'
import { initials } from '@/lib/format'
import { PageHeader } from '@/components/org/page-header'
import { ListToolbar } from '@/components/org/list-toolbar'
import { Panel } from '@/components/org/panel'
import { DataTable, type Column } from '@/components/org/data-table'
import { EmptyState } from '@/components/org/empty-state'
import { StatusBadge } from '@/components/org/status-badge'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export default function Profiles() {
  const { data, loading } = useData<Profile[]>('org-profiles', 'seed', PROFILES)
  const [search, setSearch] = useState('')
  const [period, setPeriod] = useState('FEB-2026')
  const navigate = useNavigate()

  const profiles = data ?? []
  const filtered = profiles.filter((p) =>
    `${p.personName} ${p.employeeId} ${p.title} ${p.region}`.toLowerCase().includes(search.toLowerCase()),
  )

  const columns: Column<Profile>[] = [
    {
      key: 'person',
      header: 'Person',
      width: '24%',
      cell: (p) => (
        <div className="flex items-center gap-3">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 font-mono text-[11px] font-medium text-primary">
            {initials(p.personName)}
          </div>
          <div className="min-w-0">
            <div className="font-heading text-[15px] leading-snug text-foreground">{p.personName}</div>
            <div className="font-mono text-[11px] text-muted-foreground">{p.employeeId}</div>
          </div>
        </div>
      ),
    },
    { key: 'title', header: 'Title', cell: (p) => <span className="text-sm text-foreground">{p.title}</span> },
    { key: 'group', header: 'Business Group', cell: (p) => <span className="text-sm text-muted-foreground">{p.businessGroup}</span> },
    { key: 'region', header: 'Region', cell: (p) => <span className="text-sm text-muted-foreground">{p.region}</span> },
    {
      key: 'role',
      header: 'Role',
      cell: (p) => (
        <Badge variant="outline" className="font-normal text-muted-foreground">{p.roleType}</Badge>
      ),
    },
    { key: 'status', header: 'Status', align: 'right', cell: (p) => <StatusBadge status={p.status} /> },
  ]

  return (
    <div data-test-id="profiles-page">
      <PageHeader
        eyebrow="Organization"
        title="Profiles"
        subtitle="A period-aware view of every payee — person, position, user account, and hierarchy combined in one record."
        meta={`${filtered.length} profiles`}
      />
      <ListToolbar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search name or Employee ID…"
        showUpload={false}
        extra={
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="h-9 w-[160px]" data-test-id="profiles-period">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="FEB-2026">Period · FEB-2026</SelectItem>
              <SelectItem value="JAN-2026">Period · JAN-2026</SelectItem>
              <SelectItem value="DEC-2025">Period · DEC-2025</SelectItem>
            </SelectContent>
          </Select>
        }
      />
      <Panel>
        <DataTable
          testId="profiles-table"
          columns={columns}
          rows={filtered}
          rowId={(p) => p.id}
          loading={loading}
          onRowClick={(p) => navigate(`/organization/profiles/${p.id}`)}
          empty={<EmptyState icon={IdCard} title="No profiles match" description="Try a different search or select another period." />}
        />
      </Panel>
    </div>
  )
}
