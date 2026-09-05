import { useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ChevronDown,
  GitFork,
  History,
  Link2,
  Pencil,
  UserCog,
  UserRound,
  Briefcase,
  Sparkles,
  LineChart,
} from 'lucide-react'
import { useData } from '@/lib/data'
import { PROFILES, type Profile } from '@/data/org-seed'
import { formatDate, formatMoney, initials } from '@/lib/format'
import { Panel } from '@/components/org/panel'
import { ProfilePerformance } from '@/components/org/profile-performance'
import { OrgTree } from '@/components/org/org-tree'
import { StatusBadge } from '@/components/org/status-badge'
import { EmptyState } from '@/components/org/empty-state'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

function KeyValue({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5" data-test-id={`kv-${label.toLowerCase().replace(/\s+/g, '-')}`}>
      <span className="font-mono text-[11px] uppercase tracking-[0.09em] text-muted-foreground">{label}</span>
      <span className="text-sm text-foreground">{value}</span>
    </div>
  )
}

function Section({
  icon: Icon,
  title,
  defaultOpen = true,
  warn,
  children,
  id,
}: {
  icon: typeof UserCog
  title: string
  defaultOpen?: boolean
  warn?: boolean
  children: ReactNode
  id: string
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <Panel data-test-id={`section-${id}`}>
      <div className="flex items-center gap-3 border-b border-border px-5 py-3.5">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex flex-1 items-center gap-3 text-left"
          data-test-id={`section-toggle-${id}`}
        >
          <Icon className="size-4 text-muted-foreground" />
          <h2 className="flex-1 font-heading text-xl font-normal text-foreground">{title}</h2>
          {warn ? (
            <Badge variant="outline" className="border-[#e8c894] bg-[#fdf6ec] font-normal text-[#a8681a]">
              Attention
            </Badge>
          ) : null}
          <ChevronDown className={cn('size-4 text-muted-foreground transition-transform', open ? '' : '-rotate-90')} />
        </button>
        <button type="button" className="text-muted-foreground hover:text-foreground" data-test-id={`section-history-${id}`}
          onClick={() => toast('Version history', { description: 'View prior effective-dated versions.' })}>
          <History className="size-4" />
        </button>
        <button type="button" className="text-muted-foreground hover:text-foreground" data-test-id={`section-edit-${id}`}
          onClick={() => toast('Edit', { description: `Editing the ${title} section.` })}>
          <Pencil className="size-4" />
        </button>
      </div>
      {open ? <div className="p-5">{children}</div> : null}
    </Panel>
  )
}

export default function ProfileDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data } = useData<Profile[]>('org-profiles', 'seed', PROFILES)
  const profile = (data ?? []).find((p) => p.id === id)

  if (!profile) {
    return (
      <div data-test-id="profile-detail-missing">
        <EmptyState
          icon={UserRound}
          title="Profile not found"
          description="This profile may have been removed or is unavailable for the selected period."
          action={<Button variant="outline" onClick={() => navigate('/organization/profiles')}>Back to Profiles</Button>}
        />
      </div>
    )
  }

  return (
    <div data-test-id="profile-detail-page">
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground" data-test-id="breadcrumb">
          <Link to="/organization/profiles" className="border-b border-transparent hover:border-current">Profiles</Link>
          <span>/</span>
          <span className="text-foreground">{profile.personName}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" className="h-9" data-test-id="view-statement"
            onClick={() => navigate(`/organization/profiles/${profile.id}/statement`)}>
            <LineChart className="size-4" />
            View Statement
          </Button>
          <Button variant="outline" size="sm" className="h-9" data-test-id="impersonate"
            onClick={() => toast('Impersonate', { description: `Now viewing as ${profile.personName}.` })}>
            <Sparkles className="size-4" />
            Impersonate
          </Button>
        </div>
      </div>

      {/* Header card */}
      <Panel padded className="mb-5" data-test-id="profile-header-card">
        <div className="flex flex-wrap items-start gap-5">
          <div className="flex size-16 shrink-0 items-center justify-center rounded-lg bg-primary font-heading text-2xl text-primary-foreground">
            {initials(profile.personName)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-heading text-3xl font-normal tracking-tight text-foreground">{profile.personName}</h1>
              <StatusBadge status={profile.status} />
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground">{profile.email} · {profile.employeeId}</p>
            <div className="mt-4 grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-3 lg:grid-cols-4">
              <KeyValue label="Title" value={profile.title} />
              <KeyValue label="Position" value={profile.position} />
              <KeyValue label="Plan Name" value={profile.planName} />
              <KeyValue label="Manager" value={profile.manager ?? '—'} />
              <KeyValue label="Business Group" value={profile.businessGroup} />
              <KeyValue label="Personal Target" value={<span className="font-mono tabular-nums">{formatMoney(profile.personalTarget, profile.paymentCurrency)}</span>} />
              <KeyValue label="Salary" value={<span className="font-mono tabular-nums">{formatMoney(profile.salary, profile.paymentCurrency)}</span>} />
              <KeyValue label="Payment Currency" value={profile.paymentCurrency} />
            </div>
          </div>
        </div>
      </Panel>

      <div className="space-y-5">
        <Section icon={LineChart} title="Performance" id="performance" defaultOpen={false}>
          <ProfilePerformance annualQuota={Math.round(profile.personalTarget / 0.08 / 1000) * 1000} targetPay={profile.personalTarget} currency={profile.paymentCurrency} />
        </Section>

        <Section icon={UserCog} title="User Account" id="user-account" defaultOpen={false}>
          <div className="grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-3 lg:grid-cols-4">
            <KeyValue label="Name" value={profile.personName} />
            <KeyValue label="Account Status" value={profile.status === 'Terminated' ? 'Disabled' : 'Active'} />
            <KeyValue label="Applications" value="Commissions, Analytics" />
            <KeyValue label="Lock Status" value="Unlocked" />
            <KeyValue label="Roles" value={profile.roleType} />
            <KeyValue label="Login Profile" value="SSO — Okta" />
            <KeyValue label="Language" value="English (US)" />
          </div>
        </Section>

        <Section icon={UserRound} title="Person" id="person" defaultOpen={false}>
          <div className="mb-4 grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-3 lg:grid-cols-4">
            <KeyValue label="Effective Start" value={formatDate(profile.hireDate)} />
            <KeyValue label="Effective End" value={profile.terminationDate ? formatDate(profile.terminationDate) : 'End of Time'} />
            <KeyValue label="Employee Status" value={profile.status} />
            <KeyValue label="Region" value={profile.region} />
          </div>
          <div className="mb-2 font-mono text-[11px] uppercase tracking-[0.09em] text-muted-foreground">Custom Fields</div>
          <div className="grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-3 lg:grid-cols-4">
            <KeyValue label="Company" value={profile.company} />
            <KeyValue label="Commission Eligible" value={profile.commissionEligible ? 'Yes' : 'No'} />
            <KeyValue label="Office Location" value={profile.officeLocation} />
            <KeyValue label="Team" value={profile.team} />
          </div>
        </Section>

        <Section icon={Briefcase} title="Position" id="position" defaultOpen={false}>
          <div className="grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-3 lg:grid-cols-4">
            <KeyValue label="Position Name" value={profile.position} />
            <KeyValue label="Title" value={profile.title} />
            <KeyValue label="Incentive Start" value={formatDate('2026-02-01')} />
            <KeyValue label="Business Group" value={profile.businessGroup} />
          </div>
        </Section>

        <Section icon={GitFork} title="Hierarchy" id="hierarchy" defaultOpen={false} warn={!profile.manager}>
          {profile.manager ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-md bg-muted/50 px-4 py-3">
                <span className="text-sm text-muted-foreground">Reports to</span>
                <span className="text-sm font-medium text-foreground">{profile.manager}</span>
              </div>
              <div className="rounded-lg border border-border bg-muted/20 p-2">
                <OrgTree person={profile.personName} />
              </div>
            </div>
          ) : (
            <EmptyState
              icon={GitFork}
              title="Not in Hierarchy"
              description="This payee has no reporting assignment yet. Add them to the hierarchy so crediting and rankings resolve correctly."
              action={<Button size="sm" data-test-id="add-to-hierarchy">Add to Hierarchy</Button>}
            />
          )}
        </Section>

        <Section icon={Link2} title="Named Relationships" id="named-relationships" defaultOpen={false} warn>
          <EmptyState
            icon={Link2}
            title="No Named Relationships"
            description="No overlay, mentor, or split-credit relationships are defined for this payee."
          />
        </Section>
      </div>
    </div>
  )
}
