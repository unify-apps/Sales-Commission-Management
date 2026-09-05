import { NavLink, useLocation } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import {
  Activity,
  Building2,
  Calculator,
  ChevronDown,
  ChevronsUpDown,
  ClipboardList,
  Coins,
  GitFork,
  Home,
  IdCard,
  LayoutGrid,
  Link2,
  Layers,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  ShieldAlert,
  Waypoints,
  FlaskConical,
  Sigma,
  Table2,
  Tags,
  Target,
  Users,
  UsersRound,
  Wallet,
  LineChart,
  ReceiptText,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { initials } from '@/lib/format'
import { PERIOD_LABEL } from '@/lib/period'
import { useUiStore } from '@/lib/store'
import { usePersona, usePersonaStore, type Role } from '@/lib/persona'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  count?: number
}
interface NavGroup {
  label: string
  /** Icon shown for the whole group in the collapsed rail. */
  icon: LucideIcon
  items: NavItem[]
}

const ADMIN_NAV: NavGroup[] = [
  {
    label: 'Workspace',
    icon: Home,
    items: [{ to: '/home', label: 'Home', icon: Home }],
  },
  {
    label: 'Organization',
    icon: Building2,
    items: [
      { to: '/organization/profiles', label: 'Profiles', icon: IdCard, count: 12 },
      { to: '/organization/titles', label: 'Titles', icon: Tags, count: 8 },
      { to: '/organization/people', label: 'People', icon: Users, count: 12 },
      { to: '/organization/positions', label: 'Positions', icon: LayoutGrid, count: 14 },
      { to: '/organization/hierarchy', label: 'Hierarchy', icon: GitFork, count: 11 },
      { to: '/organization/named-relationships', label: 'Named Relationships', icon: Link2, count: 3 },
    ],
  },
  {
    label: 'Plan Design',
    icon: Package,
    items: [
      { to: '/plan/quotas', label: 'Quotas', icon: Target, count: 995 },
      { to: '/plan/formulas', label: 'Formulas', icon: Sigma, count: 98 },
      { to: '/plan/reference-tables', label: 'Reference Tables', icon: Table2, count: 29 },
      { to: '/plan/measures', label: 'Measures', icon: Calculator, count: 13 },
      { to: '/plan/rules', label: 'Rules', icon: Layers, count: 82 },
      { to: '/plan/plans', label: 'Plans', icon: Package, count: 87 },
    ],
  },
  {
    label: 'Orders',
    icon: ClipboardList,
    items: [
      { to: '/orders/orders', label: 'Orders', icon: ClipboardList },
      { to: '/orders/runs', label: 'Runs', icon: Activity },
    ],
  },
  {
    label: 'Results',
    icon: Coins,
    items: [
      { to: '/results/results', label: 'Results', icon: Coins },
      { to: '/results/payments', label: 'Payments', icon: Wallet },
    ],
  },
  {
    label: 'Modeling',
    icon: FlaskConical,
    items: [{ to: '/simulator', label: 'Simulator', icon: FlaskConical }],
  },
  {
    label: 'Disputes',
    icon: ShieldAlert,
    items: [{ to: '/disputes', label: 'Dispute Management', icon: ShieldAlert }],
  },
  {
    label: 'Data',
    icon: Waypoints,
    items: [{ to: '/integration', label: 'Integration', icon: Waypoints }],
  },
]

// The individual rep experience (Marcus Lin): a compact Home with two screens, plus a
// deal-prioritization Simulator.
const REP_NAV: NavGroup[] = [
  {
    label: 'Home',
    icon: Home,
    items: [
      { to: '/rep/performance', label: 'Performance', icon: LineChart },
      { to: '/rep/incentives', label: 'Statements', icon: ReceiptText },
    ],
  },
  {
    label: 'Modeling',
    icon: FlaskConical,
    items: [{ to: '/rep/simulator', label: 'Simulator', icon: FlaskConical }],
  },
]

const NAV_BY_ROLE: Record<Role, NavGroup[]> = {
  admin: ADMIN_NAV,
  rep: REP_NAV,
}

function NavGroup({ group, collapsed }: { group: NavGroup; collapsed: boolean }) {
  const { pathname } = useLocation()
  // "Workspace" (a single item) always shows; the multi-item groups reveal on hover/focus.
  const collapsible = group.items.length > 1

  const hasActive = group.items.some((it) => pathname.startsWith(it.to))

  if (collapsed) {
    // Collapsed rail: ONE icon per major section, linking to its first page.
    const GroupIcon = group.icon
    const target = group.items[0].to
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <NavLink
            to={target}
            data-test-id={`nav-group-${group.label.toLowerCase().replace(/\s+/g, '-')}`}
            className={cn(
              'relative flex size-11 items-center justify-center rounded-lg transition-colors',
              hasActive
                ? 'bg-primary/12 text-primary'
                : 'text-muted-foreground hover:bg-black/5 hover:text-foreground',
            )}
          >
            {hasActive ? (
              <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-primary" />
            ) : null}
            <GroupIcon className="size-5" />
          </NavLink>
        </TooltipTrigger>
        <TooltipContent side="right">{group.label}</TooltipContent>
      </Tooltip>
    )
  }

  return (
    <div
      className="group/nav flex flex-col gap-0.5"
      data-test-id={`nav-group-${group.label.toLowerCase().replace(/\s+/g, '-')}`}
    >
      <div className="flex items-center gap-1.5 px-2.5 pb-1.5 pt-1">
        <span className="font-mono text-[11px] font-medium uppercase tracking-[0.09em] text-muted-foreground">
          {group.label}
        </span>
        {collapsible ? (
          <ChevronDown className="size-3 text-muted-foreground transition-transform duration-200 group-hover/nav:rotate-180 group-focus-within/nav:rotate-180" />
        ) : null}
      </div>
      <div
        className={cn(
          'flex flex-col gap-0.5',
          collapsible &&
            'grid grid-rows-[0fr] transition-[grid-template-rows] duration-200 ease-out group-hover/nav:grid-rows-[1fr] group-focus-within/nav:grid-rows-[1fr]',
          collapsible && hasActive && 'grid-rows-[1fr]',
        )}
      >
        <div className={cn(collapsible && 'min-h-0 overflow-hidden')}>
          {group.items.map((item) => {
            const active = pathname.startsWith(item.to)
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                data-test-id={`nav-item-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                className={cn(
                  'flex h-[42px] items-center gap-2.5 rounded-md px-2.5 text-[15px] font-medium transition-colors',
                  active
                    ? 'bg-[color-mix(in_srgb,var(--color-primary),transparent_92%)] text-foreground'
                    : 'text-foreground/85 hover:bg-black/5',
                )}
              >
                <Icon className={cn('size-[18px] shrink-0', active ? 'text-foreground' : 'text-muted-foreground')} />
                <span className="flex-1 truncate">{item.label}</span>
                {item.count != null ? (
                  <span className="font-mono text-xs tabular-nums text-muted-foreground">{item.count}</span>
                ) : null}
              </NavLink>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function SideNav({ collapsed }: { collapsed: boolean }) {
  const { role } = usePersona()
  const nav = NAV_BY_ROLE[role]
  const toggleNav = useUiStore((s) => s.toggleNav)
  return (
    <nav
      className={cn(
        'flex shrink-0 flex-col border-r border-border bg-[#ececE6] transition-[width] duration-200 ease-out',
        collapsed ? 'w-16 items-center gap-1 px-2 py-3' : 'w-[264px] gap-5 p-3',
      )}
      data-test-id="side-nav"
    >
      <div
        className={cn(
          'flex items-center',
          collapsed ? 'flex-col gap-2 border-b border-border/70 pb-2' : 'gap-2.5 px-2 py-1.5',
        )}
        data-test-id="side-nav-brand"
      >
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Building2 className="size-5" />
        </div>
        {collapsed ? null : (
          <div className="min-w-0 flex-1 leading-tight">
            <div className="font-heading text-lg text-foreground">Topcon</div>
          </div>
        )}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn('shrink-0 text-muted-foreground hover:text-foreground', collapsed ? 'size-9' : 'size-7')}
              onClick={toggleNav}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              data-test-id="nav-toggle"
            >
              {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">{collapsed ? 'Expand sidebar' : 'Collapse sidebar'}</TooltipContent>
        </Tooltip>
      </div>
      <div
        className={cn(
          'flex flex-1 flex-col overflow-y-auto overflow-x-hidden',
          collapsed ? 'items-center gap-1.5 pt-1' : 'gap-5',
        )}
      >
        {nav.map((group) => (
          <NavGroup key={group.label} group={group} collapsed={collapsed} />
        ))}
      </div>
      <SideNavFooter collapsed={collapsed} />
    </nav>
  )
}

// Landing route for each persona when you switch into it.
const ROLE_HOME: Record<Role, string> = {
  admin: '/home',
  rep: '/rep/performance',
}

function IdentityMenu({ children }: { children: React.ReactNode }) {
  const role = usePersonaStore((s) => s.role)
  const setRole = usePersonaStore((s) => s.setRole)
  const navigate = useNavigate()

  function switchTo(next: Role) {
    if (next !== role) {
      setRole(next)
      navigate(ROLE_HOME[next])
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="outline-none" data-test-id="side-nav-identity">
        {children}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" side="top" className="w-56">
        <DropdownMenuLabel>Switch identity</DropdownMenuLabel>
        <DropdownMenuItem onSelect={() => switchTo('admin')} data-test-id="identity-admin">
          Anita Serrano · Comp Admin
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => switchTo('rep')} data-test-id="identity-rep">
          Marcus Lin · Sales Rep
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => navigate('/login')} data-test-id="identity-signout">
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function SideNavFooter({ collapsed }: { collapsed: boolean }) {
  const persona = usePersona()
  if (collapsed) {
    return (
      <div className="flex w-full flex-col items-center gap-2 border-t border-border/70 pt-3" data-test-id="side-nav-footer">
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex size-9 items-center justify-center rounded-lg border border-border bg-muted/50 text-muted-foreground">
              <UsersRound className="size-4" />
            </div>
          </TooltipTrigger>
          <TooltipContent side="right">{PERIOD_LABEL}</TooltipContent>
        </Tooltip>
        <IdentityMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex size-9 items-center justify-center rounded-full bg-primary font-mono text-xs font-medium text-primary-foreground hover:opacity-90">
                {initials(persona.name)}
              </div>
            </TooltipTrigger>
            <TooltipContent side="right">{`${persona.name} · ${persona.subtitle}`}</TooltipContent>
          </Tooltip>
        </IdentityMenu>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2 border-t border-border/70 pt-3" data-test-id="side-nav-footer">
      <div className="flex items-center gap-2 rounded-md border border-border bg-muted/50 px-2.5 py-1.5" data-test-id="side-nav-period">
        <UsersRound className="size-3.5 shrink-0 text-muted-foreground" />
        <span className="truncate font-mono text-xs text-muted-foreground">{PERIOD_LABEL}</span>
      </div>
      <IdentityMenu>
        <div className="flex w-full items-center gap-2.5 rounded-md px-1.5 py-1.5 hover:bg-black/5">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary font-mono text-xs font-medium text-primary-foreground">
            {initials(persona.name)}
          </div>
          <div className="min-w-0 flex-1 text-left leading-tight">
            <div className="truncate text-sm font-medium text-foreground">{persona.name}</div>
            <div className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">{persona.subtitle}</div>
          </div>
          <ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground" />
        </div>
      </IdentityMenu>
    </div>
  )
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const collapsed = useUiStore((s) => s.navCollapsed)
  return (
    <div className="flex h-screen bg-background" data-test-id="app-shell">
      <SideNav collapsed={collapsed} />
      <main className="min-w-0 flex-1 overflow-auto" data-test-id="app-main">
        <div className="mx-auto max-w-[1600px] px-9 py-8">{children}</div>
      </main>
    </div>
  )
}
