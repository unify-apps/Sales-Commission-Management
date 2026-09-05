import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Person, Position, NamedRelationship } from '@/data/org-seed'
import type { Quota, Measure, Rule, Plan } from '@/data/plan-seed'
import type { Order } from '@/data/orders-seed'

interface UiState {
  navCollapsed: boolean
  toggleNav: () => void
}

// Shared UI state (sidebar collapsed/expanded), persisted so the choice survives reloads.
export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      navCollapsed: false,
      toggleNav: () => set((s) => ({ navCollapsed: !s.navCollapsed })),
    }),
    { name: 'ledger-ui' },
  ),
)

// ---- Dispute Management ----------------------------------------------------

export const DISPUTE_STATUSES = ['Open', 'In Review', 'Resolved', 'Rejected'] as const
export type DisputeStatus = (typeof DISPUTE_STATUSES)[number]

export const DISPUTE_TYPES = ['Credit', 'Commission', 'Quota', 'Payment', 'Order'] as const
export type DisputeType = (typeof DISPUTE_TYPES)[number]

export const DISPUTE_PRIORITIES = ['Low', 'Medium', 'High'] as const
export type DisputePriority = (typeof DISPUTE_PRIORITIES)[number]

export interface DisputeEvent {
  at: string
  status: DisputeStatus | 'Raised'
  note: string
  by: string
}

export interface Dispute {
  id: string
  reference: string
  title: string
  type: DisputeType
  status: DisputeStatus
  priority: DisputePriority
  raisedBy: string
  owner: string
  period: string
  flaggedValue: string
  disputedAmount: number
  currency: string
  reason: string
  createdAt: string
  updatedAt: string
  timeline: DisputeEvent[]
}

export interface NewDisputeInput {
  title: string
  type: DisputeType
  priority: DisputePriority
  owner: string
  period: string
  flaggedValue: string
  disputedAmount: number
  currency: string
  reason: string
}

const RAISED_BY = 'Marcus Lin'

const SEED_DISPUTES: Dispute[] = [
  {
    id: 'd-1',
    reference: 'DSP-1042',
    title: 'Missing credit on ChargePoint EU renewal',
    type: 'Credit',
    status: 'In Review',
    priority: 'High',
    raisedBy: 'Joe Gorman',
    owner: 'Anita Serrano',
    period: 'FEB-2026',
    flaggedValue: 'CTI821238_FEB-2026',
    disputedAmount: 42000,
    currency: 'EUR',
    reason: 'Deal closed in Feb but no booking credit appears on my statement.',
    createdAt: '2026-03-02',
    updatedAt: '2026-03-05',
    timeline: [
      { at: '2026-03-02', status: 'Raised', note: 'Dispute raised by rep.', by: 'Joe Gorman' },
      { at: '2026-03-03', status: 'Open', note: 'Routed to comp owner.', by: 'System' },
      { at: '2026-03-05', status: 'In Review', note: 'Investigating order attribution.', by: 'Anita Serrano' },
    ],
  },
  {
    id: 'd-2',
    reference: 'DSP-1039',
    title: 'Commission rate applied at wrong tier',
    type: 'Commission',
    status: 'Open',
    priority: 'Medium',
    raisedBy: 'Priya Nair',
    owner: 'Kenji Watanabe',
    period: 'FEB-2026',
    flaggedValue: 'C - Booked Commission',
    disputedAmount: 3200,
    currency: 'SGD',
    reason: 'Attainment crossed 100% but base rate was still applied.',
    createdAt: '2026-03-04',
    updatedAt: '2026-03-04',
    timeline: [
      { at: '2026-03-04', status: 'Raised', note: 'Dispute raised by rep.', by: 'Priya Nair' },
      { at: '2026-03-04', status: 'Open', note: 'Routed to comp owner.', by: 'System' },
    ],
  },
  {
    id: 'd-3',
    reference: 'DSP-1021',
    title: 'Quota target higher than signed plan',
    type: 'Quota',
    status: 'Resolved',
    priority: 'Medium',
    raisedBy: 'Hannah Brooks',
    owner: 'Anita Serrano',
    period: 'JAN-2026',
    flaggedValue: 'AE Annual Bookings',
    disputedAmount: 0,
    currency: 'USD',
    reason: 'Quota shows 240k but my plan letter says 220k.',
    createdAt: '2026-02-10',
    updatedAt: '2026-02-18',
    timeline: [
      { at: '2026-02-10', status: 'Raised', note: 'Dispute raised by rep.', by: 'Hannah Brooks' },
      { at: '2026-02-11', status: 'Open', note: 'Routed to comp owner.', by: 'System' },
      { at: '2026-02-14', status: 'In Review', note: 'Compared against plan letter.', by: 'Anita Serrano' },
      { at: '2026-02-18', status: 'Resolved', note: 'Quota corrected to 220k, statement re-run.', by: 'Anita Serrano' },
    ],
  },
  {
    id: 'd-4',
    reference: 'DSP-1008',
    title: 'Payment shorted vs. released commission',
    type: 'Payment',
    status: 'Rejected',
    priority: 'Low',
    raisedBy: 'David Okoye',
    owner: 'Diane Whitlock',
    period: 'JAN-2026',
    flaggedValue: 'PAY-1042',
    disputedAmount: 1500,
    currency: 'USD',
    reason: 'Paid less than the released amount on my statement.',
    createdAt: '2026-02-02',
    updatedAt: '2026-02-06',
    timeline: [
      { at: '2026-02-02', status: 'Raised', note: 'Dispute raised by rep.', by: 'David Okoye' },
      { at: '2026-02-03', status: 'Open', note: 'Routed to comp owner.', by: 'System' },
      { at: '2026-02-06', status: 'Rejected', note: 'Difference is a prior-period clawback, correctly applied.', by: 'Diane Whitlock' },
    ],
  },
]

interface DisputeState {
  disputes: Dispute[]
  addDispute: (input: NewDisputeInput) => Dispute
  advanceStatus: (id: string, status: DisputeStatus, note: string) => void
}

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

let refCounter = 1043

export const useDisputeStore = create<DisputeState>()(
  persist(
    (set) => ({
      disputes: SEED_DISPUTES,
      addDispute: (input) => {
        const now = today()
        const dispute: Dispute = {
          id: `d-${crypto.randomUUID().slice(0, 8)}`,
          reference: `DSP-${refCounter++}`,
          status: 'Open',
          raisedBy: RAISED_BY,
          createdAt: now,
          updatedAt: now,
          timeline: [
            { at: now, status: 'Raised', note: 'Dispute raised by rep.', by: RAISED_BY },
            { at: now, status: 'Open', note: `Routed to ${input.owner}.`, by: 'System' },
          ],
          ...input,
        }
        set((s) => ({ disputes: [dispute, ...s.disputes] }))
        return dispute
      },
      advanceStatus: (id, status, note) =>
        set((s) => ({
          disputes: s.disputes.map((d) =>
            d.id === id
              ? {
                  ...d,
                  status,
                  updatedAt: today(),
                  timeline: [...d.timeline, { at: today(), status, note, by: d.owner }],
                }
              : d,
          ),
        })),
    }),
    { name: 'ledger-disputes' },
  ),
)

// ---- Org records created in the UI -----------------------------------------
// Locally-created People, Positions, and Named Relationships. Merged with the
// seed data on each page so a Create action produces a real, persistent row.

interface OrgRecordsState {
  people: Person[]
  positions: Position[]
  namedRelationships: NamedRelationship[]
  addPerson: (person: Person) => void
  addPosition: (position: Position) => void
  addNamedRelationship: (rel: NamedRelationship) => void
}

export const useOrgRecordsStore = create<OrgRecordsState>()(
  persist(
    (set) => ({
      people: [],
      positions: [],
      namedRelationships: [],
      addPerson: (person) => set((s) => ({ people: [person, ...s.people] })),
      addPosition: (position) => set((s) => ({ positions: [position, ...s.positions] })),
      addNamedRelationship: (rel) => set((s) => ({ namedRelationships: [rel, ...s.namedRelationships] })),
    }),
    { name: 'ledger-org-records' },
  ),
)

// ---- Plan records created in the UI ----------------------------------------
// Locally-created Quotas, merged with the seed list on the Quotas page.

interface PlanRecordsState {
  quotas: Quota[]
  measures: Measure[]
  rules: Rule[]
  plans: Plan[]
  orders: Order[]
  addQuota: (quota: Quota) => void
  addMeasure: (measure: Measure) => void
  addRule: (rule: Rule) => void
  addPlan: (plan: Plan) => void
  addOrder: (order: Order) => void
}

export const usePlanRecordsStore = create<PlanRecordsState>()(
  persist(
    (set) => ({
      quotas: [],
      measures: [],
      rules: [],
      plans: [],
      orders: [],
      addQuota: (quota) => set((s) => ({ quotas: [quota, ...s.quotas] })),
      addMeasure: (measure) => set((s) => ({ measures: [measure, ...s.measures] })),
      addRule: (rule) => set((s) => ({ rules: [rule, ...s.rules] })),
      addPlan: (plan) => set((s) => ({ plans: [plan, ...s.plans] })),
      addOrder: (order) => set((s) => ({ orders: [order, ...s.orders] })),
    }),
    { name: 'ledger-plan-records' },
  ),
)
