// Orders module data — two merged screens:
//  • Orders  = Staging + Processed (order lifecycle) + Rules (validation rules)
//  • Runs    = Queue + Batches + History as one chronological job log

// Shared 4-state legend used across both screens.
export type RunState = 'succeeded' | 'in_progress' | 'waiting' | 'failed'

export type OrderStatus = 'Validated' | 'New' | 'Blocked' | 'Needs Review' | 'Incentives Calculated'

export interface Order {
  id: string
  status: OrderStatus
  statusDate: string
  orderCode: string
  itemCode: string
  amount: number
  currency: string
  assignedTo: string
  batch: string
  incentiveDate: string
  blockingRule?: string
  lifecycle: 'staging' | 'processed'
}

export type ValidationAction = 'Block' | 'Flag for review'
export interface ValidationRule {
  id: string
  name: string
  errorId: string
  checks: string
  action: ValidationAction
  activeStart: string
  activeEnd: string | null
}

export type RunType = 'Batch' | 'Release' | 'Notification' | 'Pause'
export interface Run {
  id: string
  state: RunState
  stateLabel: string
  type: RunType
  name: string
  startedBy: string
  started: string
  processed: number | null
  failed: number | null
}

const STAGING_SEED: Array<Omit<Order, 'lifecycle'>> = [
  { id: 'o-1', status: 'Validated', statusDate: '03/13/2026 09:39 PM', orderCode: '0068Z00001fl8KjQAI', itemCode: 'CTI821238_FEB-2026', amount: 42000, currency: 'USD', assignedTo: 'Marcus Lin', batch: 'Opportunity_Monthly', incentiveDate: '02/28/2026' },
  { id: 'o-2', status: 'Validated', statusDate: '03/13/2026 09:39 PM', orderCode: '0068Z00001fl8KjQAI', itemCode: 'CTI821238_FEB-2026', amount: 42000, currency: 'USD', assignedTo: 'Marcus Lin', batch: 'Opportunity_North Am', incentiveDate: '02/28/2026' },
  { id: 'o-3', status: 'Blocked', statusDate: '03/13/2026 09:39 PM', orderCode: '0068Z00001fl8KjQAI', itemCode: '00353426_FEB-2026', amount: 0, currency: 'USD', assignedTo: 'Unassigned', batch: '—', incentiveDate: '02/28/2026', blockingRule: 'Amount must be greater than 0' },
  { id: 'o-4', status: 'Validated', statusDate: '03/13/2026 09:39 PM', orderCode: '0068Z00001gD493QAA', itemCode: '00349200_FEB-2026', amount: 18500, currency: 'USD', assignedTo: 'Hannah Brooks', batch: 'Opportunity_Quarter', incentiveDate: '02/28/2026' },
  { id: 'o-5', status: 'Needs Review', statusDate: '03/13/2026 09:39 PM', orderCode: '0068Z00001gWp1hQAA', itemCode: 'CTI852980_FEB-2026', amount: 96000, currency: 'USD', assignedTo: 'Anita Serrano', batch: 'Opportunity_Quarter', incentiveDate: '02/28/2026', blockingRule: 'Deal above $75k — manager review' },
  { id: 'o-6', status: 'New', statusDate: '03/13/2026 09:39 PM', orderCode: '0068Z00001i0rhqQAA', itemCode: 'CTI877449_FEB-2026', amount: 31000, currency: 'USD', assignedTo: 'Joe Gorman', batch: 'Opportunity_North Am', incentiveDate: '02/28/2026' },
  { id: 'o-7', status: 'Validated', statusDate: '03/13/2026 09:39 PM', orderCode: '0068Z00001i0rhqQAA', itemCode: 'CTI877449_FEB-2026', amount: 31000, currency: 'USD', assignedTo: 'Joe Gorman', batch: 'Opportunity_Monthly', incentiveDate: '02/28/2026' },
  { id: 'o-8', status: 'Validated', statusDate: '03/13/2026 09:39 PM', orderCode: '0068Z00001i0rhqQAA', itemCode: '00353445_FEB-2026', amount: 12750, currency: 'USD', assignedTo: 'Priya Nair', batch: 'Opportunity_North Am', incentiveDate: '02/28/2026' },
  { id: 'o-9', status: 'Blocked', statusDate: '03/13/2026 09:39 PM', orderCode: '0068Z00001k2LmnQAA', itemCode: '00361002_FEB-2026', amount: 8200, currency: 'USD', assignedTo: 'Unassigned', batch: '—', incentiveDate: '02/28/2026', blockingRule: 'Assignment required before processing' },
  { id: 'o-10', status: 'Validated', statusDate: '03/13/2026 09:39 PM', orderCode: '0068Z00001k2LmnQAA', itemCode: '00361002_FEB-2026', amount: 8200, currency: 'USD', assignedTo: 'Sofia Almeida', batch: 'Opportunity_Monthly', incentiveDate: '02/28/2026' },
]

const PROCESSED_SEED: Array<Omit<Order, 'lifecycle'>> = [
  { id: 'op-1', status: 'Incentives Calculated', statusDate: '02/14/2026 06:02 AM', orderCode: '0068Z00001aB2ccQAC', itemCode: 'CTI802119_JAN-2026', amount: 54000, currency: 'USD', assignedTo: 'Marcus Lin', batch: 'Opportunity_Monthly', incentiveDate: '01/31/2026' },
  { id: 'op-2', status: 'Incentives Calculated', statusDate: '02/14/2026 06:02 AM', orderCode: '0068Z00001aB2ccQAC', itemCode: 'CTI802119_JAN-2026', amount: 54000, currency: 'USD', assignedTo: 'Anita Serrano', batch: 'Opportunity_North Am', incentiveDate: '01/31/2026' },
  { id: 'op-3', status: 'Incentives Calculated', statusDate: '02/14/2026 06:02 AM', orderCode: '0068Z00001cX4ppQAD', itemCode: '00340021_JAN-2026', amount: 22300, currency: 'USD', assignedTo: 'Joe Gorman', batch: 'Opportunity_Quarter', incentiveDate: '01/31/2026' },
  { id: 'op-4', status: 'Incentives Calculated', statusDate: '02/14/2026 06:02 AM', orderCode: '0068Z00001cX4ppQAD', itemCode: '00340021_JAN-2026', amount: 22300, currency: 'USD', assignedTo: 'Hannah Brooks', batch: 'Opportunity_Monthly', incentiveDate: '01/31/2026' },
  { id: 'op-5', status: 'Incentives Calculated', statusDate: '02/14/2026 06:02 AM', orderCode: '0068Z00001dY9zzQAB', itemCode: 'CTI811550_JAN-2026', amount: 41200, currency: 'USD', assignedTo: 'Priya Nair', batch: 'Opportunity_North Am', incentiveDate: '01/31/2026' },
  { id: 'op-6', status: 'Incentives Calculated', statusDate: '02/14/2026 06:02 AM', orderCode: '0068Z00001dY9zzQAB', itemCode: 'CTI811550_JAN-2026', amount: 41200, currency: 'USD', assignedTo: 'Kenji Watanabe', batch: 'Opportunity_Quarter', incentiveDate: '01/31/2026' },
]

export const ORDERS_STAGING: Order[] = STAGING_SEED.map((o) => ({ ...o, lifecycle: 'staging' }))
export const ORDERS_PROCESSED: Order[] = PROCESSED_SEED.map((o) => ({ ...o, lifecycle: 'processed' }))

export const ORDERS_STAGING_TOTAL = 4057
export const ORDERS_PROCESSED_TOTAL = 12840

export const VALIDATION_RULES: ValidationRule[] = [
  { id: 'v-1', name: 'Amount must be positive', errorId: 'ERR-1001', checks: 'Order.Amount is greater than 0', action: 'Block', activeStart: '01/01/2026', activeEnd: null },
  { id: 'v-2', name: 'Assignment required', errorId: 'ERR-1002', checks: 'Order.AssignedTo is not empty', action: 'Block', activeStart: '01/01/2026', activeEnd: null },
  { id: 'v-3', name: 'Large deal review', errorId: 'ERR-2001', checks: 'Order.Amount is greater than 75,000', action: 'Flag for review', activeStart: '02/01/2026', activeEnd: null },
  { id: 'v-4', name: 'Incentive date in period', errorId: 'ERR-1003', checks: 'Order.IncentiveDate is within the open period', action: 'Block', activeStart: '01/01/2026', activeEnd: null },
  { id: 'v-5', name: 'Duplicate item code', errorId: 'ERR-2002', checks: 'Order.ItemCode appears more than once per period', action: 'Flag for review', activeStart: '01/01/2025', activeEnd: '12/31/2025' },
]

export const RUNS: Run[] = [
  { id: 'run-1', state: 'in_progress', stateLabel: 'Releasing…', type: 'Release', name: 'ReleaseGroup-Feb-2026-1', startedBy: 'Annette Mejia', started: '03/14/2026 10:12 AM', processed: 320, failed: 0 },
  { id: 'run-2', state: 'in_progress', stateLabel: 'Running', type: 'Batch', name: 'Opportunity_Monthly FEB-2026', startedBy: 'System', started: '03/14/2026 10:05 AM', processed: 1840, failed: 2 },
  { id: 'run-3', state: 'waiting', stateLabel: 'Paused', type: 'Pause', name: 'Manual queue pause', startedBy: 'Dmytro Torianyk', started: '03/14/2026 09:58 AM', processed: null, failed: null },
  { id: 'run-4', state: 'succeeded', stateLabel: 'Succeeded', type: 'Batch', name: 'Opportunity_North Am FEB-2026', startedBy: 'System', started: '03/14/2026 08:30 AM', processed: 2103, failed: 0 },
  { id: 'run-5', state: 'succeeded', stateLabel: 'Sent', type: 'Notification', name: 'Statement ready — Feb-2026', startedBy: 'System', started: '03/14/2026 08:12 AM', processed: 143, failed: 0 },
  { id: 'run-6', state: 'failed', stateLabel: 'Failed', type: 'Batch', name: 'Opportunity_Quarter FEB-2026', startedBy: 'System', started: '03/13/2026 11:44 PM', processed: 410, failed: 37 },
  { id: 'run-7', state: 'succeeded', stateLabel: 'Succeeded', type: 'Batch', name: 'Calculate Balances — FEB-2026', startedBy: 'Annette Mejia', started: '03/13/2026 06:20 PM', processed: 4057, failed: 0 },
  { id: 'run-8', state: 'succeeded', stateLabel: 'Released', type: 'Release', name: 'ReleaseGroup-Jan-2026-1', startedBy: 'Annette Mejia', started: '02/14/2026 07:00 AM', processed: 298, failed: 0 },
  { id: 'run-9', state: 'succeeded', stateLabel: 'Succeeded', type: 'Batch', name: 'Opportunity_Monthly JAN-2026', startedBy: 'System', started: '02/13/2026 09:15 PM', processed: 1795, failed: 0 },
]

export const RUNS_TOTAL = 128
