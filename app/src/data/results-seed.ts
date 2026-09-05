// Results module — two screens:
//  • Results  = Credits + Commissions + Bonuses + Draws (components), one table + Type filter
//  • Payments = the combined terminal record (Payments / Balances / Manual tabs)

export type ResultType = 'Credit' | 'Commission' | 'Bonus' | 'Draw'
export type ResultStatus = 'Released' | 'Held' | 'Balance'

export interface ResultRow {
  id: string
  status: ResultStatus
  type: ResultType
  resultName: string
  person: string
  amount: number
  currency: string
  orderCode: string
  businessGroup: string
}

export type PaymentStatus = 'Released' | 'Failed'
export type PaymentTab = 'payments' | 'balances' | 'manual'

export interface PaymentRow {
  id: string
  tab: PaymentTab
  status: PaymentStatus
  paymentType: string
  person: string
  orderCode: string
  amount: number
  currency: string
  tracedResultId: string | null
  tracedResultName: string | null
}

export const RESULTS: ResultRow[] = [
  { id: 'res-1', status: 'Released', type: 'Credit', resultName: 'DC - Shipped', person: 'Marcus Lin', amount: 42000, currency: 'USD', orderCode: '0068Z00001fl8KjQAI', businessGroup: 'ChargePoint NA' },
  { id: 'res-2', status: 'Released', type: 'Credit', resultName: 'DC - Booked', person: 'Anita Serrano', amount: 54000, currency: 'USD', orderCode: '0068Z00001aB2ccQAC', businessGroup: 'ChargePoint NA' },
  { id: 'res-3', status: 'Held', type: 'Credit', resultName: 'DC - Monthly Shipped', person: 'Joe Gorman', amount: 22300, currency: 'EUR', orderCode: '0068Z00001cX4ppQAD', businessGroup: 'ChargePoint EU' },
  { id: 'res-4', status: 'Released', type: 'Credit', resultName: 'DC - Shipped - Multiplier', person: 'Hannah Brooks', amount: 18500, currency: 'USD', orderCode: '0068Z00001gD493QAA', businessGroup: 'ChargePoint NA' },
  { id: 'res-5', status: 'Released', type: 'Commission', resultName: 'C - YTD Shipped - EU', person: 'Joe Gorman', amount: 6100, currency: 'EUR', orderCode: '0068Z00001cX4ppQAD', businessGroup: 'ChargePoint EU' },
  { id: 'res-6', status: 'Released', type: 'Commission', resultName: 'C - Booked Commission', person: 'Marcus Lin', amount: 14250, currency: 'USD', orderCode: '0068Z00001fl8KjQAI', businessGroup: 'ChargePoint NA' },
  { id: 'res-7', status: 'Held', type: 'Commission', resultName: 'C - Exception Bonus', person: 'Priya Nair', amount: 3200, currency: 'SGD', orderCode: '0068Z00001dY9zzQAB', businessGroup: 'ChargePoint APAC' },
  { id: 'res-8', status: 'Released', type: 'Commission', resultName: 'C - Manager Override', person: 'Anita Serrano', amount: 9800, currency: 'USD', orderCode: '0068Z00001aB2ccQAC', businessGroup: 'ChargePoint NA' },
  { id: 'res-9', status: 'Held', type: 'Bonus', resultName: 'B - New Logo Kicker', person: 'David Okoye', amount: 5000, currency: 'USD', orderCode: '0068Z00001i0rhqQAA', businessGroup: 'ChargePoint NA' },
  { id: 'res-10', status: 'Balance', type: 'Draw', resultName: 'Guaranteed Draw — Ramp', person: 'Priya Nair', amount: 12000, currency: 'SGD', orderCode: '—', businessGroup: 'ChargePoint APAC' },
  { id: 'res-11', status: 'Balance', type: 'Draw', resultName: 'Recoverable Draw', person: 'Grace Kim', amount: 8000, currency: 'SGD', orderCode: '—', businessGroup: 'ChargePoint APAC' },
]

export const PAYMENTS: PaymentRow[] = [
  { id: 'pay-1', tab: 'payments', status: 'Released', paymentType: 'Commission', person: 'Marcus Lin', orderCode: '0068Z00001fl8KjQAI', amount: 14250, currency: 'USD', tracedResultId: 'res-6', tracedResultName: 'C - Booked Commission' },
  { id: 'pay-2', tab: 'payments', status: 'Released', paymentType: 'Commission', person: 'Anita Serrano', orderCode: '0068Z00001aB2ccQAC', amount: 9800, currency: 'USD', tracedResultId: 'res-8', tracedResultName: 'C - Manager Override' },
  { id: 'pay-3', tab: 'payments', status: 'Released', paymentType: 'Commission', person: 'Joe Gorman', orderCode: '0068Z00001cX4ppQAD', amount: 6100, currency: 'EUR', tracedResultId: 'res-5', tracedResultName: 'C - YTD Shipped - EU' },
  { id: 'pay-4', tab: 'payments', status: 'Failed', paymentType: 'Bonus', person: 'David Okoye', orderCode: '0068Z00001i0rhqQAA', amount: 5000, currency: 'USD', tracedResultId: 'res-9', tracedResultName: 'B - New Logo Kicker' },
  { id: 'pay-5', tab: 'payments', status: 'Failed', paymentType: 'Commission', person: 'Priya Nair', orderCode: '0068Z00001dY9zzQAB', amount: 3200, currency: 'SGD', tracedResultId: 'res-7', tracedResultName: 'C - Exception Bonus' },
  { id: 'pay-6', tab: 'payments', status: 'Released', paymentType: 'Commission', person: 'Hannah Brooks', orderCode: '0068Z00001gD493QAA', amount: 18500, currency: 'USD', tracedResultId: 'res-4', tracedResultName: 'DC - Shipped - Multiplier' },
  { id: 'pay-7', tab: 'payments', status: 'Released', paymentType: 'Bonus', person: 'Grace Kim', orderCode: '0068Z00001kM72xQAC', amount: 4200, currency: 'SGD', tracedResultId: null, tracedResultName: 'B - Quarterly Kicker' },
  { id: 'pay-8', tab: 'payments', status: 'Failed', paymentType: 'Commission', person: 'Kenji Watanabe', orderCode: '0068Z00001nP04rQAD', amount: 7600, currency: 'SGD', tracedResultId: null, tracedResultName: 'C - APAC Shipped' },
  { id: 'pay-9', tab: 'payments', status: 'Released', paymentType: 'Commission', person: 'Sofia Almeida', orderCode: '0068Z00001pR56tQAE', amount: 11300, currency: 'EUR', tracedResultId: null, tracedResultName: 'C - EU Booked' },
  { id: 'bal-1', tab: 'balances', status: 'Released', paymentType: 'Draw Balance', person: 'Priya Nair', orderCode: '—', amount: 12000, currency: 'SGD', tracedResultId: 'res-10', tracedResultName: 'Guaranteed Draw — Ramp' },
  { id: 'bal-2', tab: 'balances', status: 'Released', paymentType: 'Draw Balance', person: 'Grace Kim', orderCode: '—', amount: 8000, currency: 'SGD', tracedResultId: 'res-11', tracedResultName: 'Recoverable Draw' },
  { id: 'man-1', tab: 'manual', status: 'Released', paymentType: 'Manual Adjustment', person: 'Kenji Watanabe', orderCode: '—', amount: 2500, currency: 'SGD', tracedResultId: null, tracedResultName: null },
  { id: 'man-2', tab: 'manual', status: 'Released', paymentType: 'SPIFF', person: 'Sofia Almeida', orderCode: '—', amount: 1500, currency: 'EUR', tracedResultId: null, tracedResultName: null },
]

export const SAVED_VIEWS = [
  'All Released — FEB-2026',
  'Held for review',
  'EU Commissions',
  'My team',
] as const
