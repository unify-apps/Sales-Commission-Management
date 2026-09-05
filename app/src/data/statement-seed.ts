// Rep-facing Incentive Statement data, keyed by profile id.
// Mirrors the Topcon commission statement: header meta, period payments, quota attainment,
// and a quarterly full-report drill-down.

export interface QuarterValues {
  q1: number
  q2: number
  q3: number
  q4: number
  year: number
}

export interface QuotaAttainment {
  name: string
  basis: string
  yearlyPct: number
  unit: 'Qty' | 'USD'
  quotaRows: Array<{ label: string; values: QuarterValues }>
}

export interface StatementLine {
  label: string
  values: QuarterValues
  emphasis?: boolean
}

export interface Statement {
  profileId: string
  name: string
  employeeId: string
  targetVariable: number
  manager: string
  region: string
  team: string
  currency: string
  parRate: string
  pcrRate: string
  ote: number
  currentPeriod: string
  previousPeriod: string
  year: string
  payments: { current: number; previous: number; ytd: number }
  attainment: QuotaAttainment[]
  commissions: StatementLine[]
  paymentLines: StatementLine[]
}

const q = (q1: number, q2: number, q3: number, q4: number): QuarterValues => ({
  q1,
  q2,
  q3,
  q4,
  year: q1 + q2 + q3 + q4,
})

export const STATEMENTS: Statement[] = [
  {
    profileId: 'pr-1',
    name: 'Marcus Lin',
    employeeId: 'E-10041',
    targetVariable: 88000,
    manager: 'Anita Serrano (E-10042)',
    region: 'NA-West',
    team: 'West Enterprise',
    currency: 'USD',
    parRate: '112.4%',
    pcrRate: '96.8%',
    ote: 223000,
    currentPeriod: 'FEB-2026',
    previousPeriod: 'JAN-2026',
    year: 'YEAR-2026',
    payments: { current: 14250.0, previous: 9800.5, ytd: 142640.22 },
    attainment: [
      {
        name: 'Booked - Bookings',
        basis: 'Yearly Attainment',
        yearlyPct: 118.4,
        unit: 'USD',
        quotaRows: [
          { label: 'Annual Bookings Quota (USD)', values: q(55000, 60000, 55000, 50000) },
          { label: 'Bookings Credit (USD)', values: q(72000, 61000, 68000, 59000) },
          { label: 'Yearly Attainment (%)', values: q(130.9, 101.7, 123.6, 118) },
          { label: 'YTD Attainment (%)', values: q(130.9, 116.3, 118.7, 118.4) },
        ],
      },
      {
        name: 'New Logo - ACV',
        basis: 'Yearly Attainment',
        yearlyPct: 84.2,
        unit: 'USD',
        quotaRows: [
          { label: 'New Logo Quota (USD)', values: q(20000, 20000, 20000, 20000) },
          { label: 'New Logo Credit (USD)', values: q(15000, 18000, 17400, 17000) },
          { label: 'Yearly Attainment (%)', values: q(75, 90, 87, 85) },
          { label: 'YTD Attainment (%)', values: q(75, 82.5, 84, 84.2) },
        ],
      },
    ],
    commissions: [
      { label: 'Total Commissions (USD)', values: q(38200, 41100, 36000, 27340), emphasis: true },
      { label: 'Booked Commission (USD)', values: q(30000, 33000, 29000, 22000) },
      { label: 'Booked Accelerated (USD)', values: q(8200, 8100, 7000, 5340) },
    ],
    paymentLines: [
      { label: 'Total Pending (USD)', values: q(38200, 41100, 36000, 27340), emphasis: true },
      { label: 'Held for Approval (USD)', values: q(0, 0, 0, 14250) },
    ],
  },
  {
    profileId: 'pr-3',
    name: 'Joe Gorman',
    employeeId: 'E-10043',
    targetVariable: 72000,
    manager: 'Michael Maas (E-10044)',
    region: 'UK/BEN/Nord',
    team: 'UK Field',
    currency: 'EUR',
    parRate: '92.1%',
    pcrRate: '88.5%',
    ote: 170000,
    currentPeriod: 'FEB-2026',
    previousPeriod: 'JAN-2026',
    year: 'YEAR-2026',
    payments: { current: 6100.0, previous: 7250.0, ytd: 61840.0 },
    attainment: [
      {
        name: 'Booked EU - Bookings',
        basis: 'Yearly Attainment',
        yearlyPct: 91.3,
        unit: 'USD',
        quotaRows: [
          { label: 'EU Bookings Quota (EUR)', values: q(43750, 43750, 43750, 43750) },
          { label: 'EU Bookings Credit (EUR)', values: q(41000, 39000, 40200, 39600) },
          { label: 'Yearly Attainment (%)', values: q(93.7, 89.1, 91.9, 90.5) },
          { label: 'YTD Attainment (%)', values: q(93.7, 91.4, 91.6, 91.3) },
        ],
      },
    ],
    commissions: [
      { label: 'Total Commissions (EUR)', values: q(16400, 15200, 15900, 14340), emphasis: true },
      { label: 'Booked EU Commission (EUR)', values: q(16400, 15200, 15900, 14340) },
    ],
    paymentLines: [
      { label: 'Total Pending (EUR)', values: q(16400, 15200, 15900, 14340), emphasis: true },
    ],
  },
  {
    profileId: 'pr-5',
    name: 'Priya Nair',
    employeeId: 'E-10045',
    targetVariable: 64000,
    manager: 'Kenji Watanabe (E-10046)',
    region: 'APAC',
    team: 'APAC Field',
    currency: 'SGD',
    parRate: '76.0%',
    pcrRate: '74.2%',
    ote: 152000,
    currentPeriod: 'FEB-2026',
    previousPeriod: 'JAN-2026',
    year: 'YEAR-2026',
    payments: { current: 0.0, previous: 5400.0, ytd: 38200.0 },
    attainment: [
      {
        name: 'Booked APAC - Bookings',
        basis: 'Yearly Attainment',
        yearlyPct: 62.5,
        unit: 'USD',
        quotaRows: [
          { label: 'APAC Bookings Quota (SGD)', values: q(40000, 40000, 40000, 40000) },
          { label: 'APAC Bookings Credit (SGD)', values: q(28000, 25000, 26000, 21000) },
          { label: 'Yearly Attainment (%)', values: q(70, 62.5, 65, 52.5) },
          { label: 'YTD Attainment (%)', values: q(70, 66.3, 65.8, 62.5) },
        ],
      },
    ],
    commissions: [
      { label: 'Total Commissions (SGD)', values: q(11200, 9800, 10100, 7100), emphasis: true },
      { label: 'Booked APAC Commission (SGD)', values: q(11200, 9800, 10100, 7100) },
    ],
    paymentLines: [
      { label: 'Total Pending (SGD)', values: q(11200, 9800, 10100, 7100), emphasis: true },
    ],
  },
]

/** Rep profiles without a bespoke statement fall back to a zeroed template. */
export function makeEmptyStatement(profileId: string, name: string, employeeId: string, currency: string): Statement {
  return {
    profileId,
    name,
    employeeId,
    targetVariable: 0,
    manager: '—',
    region: '—',
    team: '—',
    currency,
    parRate: '0.0%',
    pcrRate: '0.0%',
    ote: 0,
    currentPeriod: 'FEB-2026',
    previousPeriod: 'JAN-2026',
    year: 'YEAR-2026',
    payments: { current: 0, previous: 0, ytd: 0 },
    attainment: [
      {
        name: 'No quota assigned',
        basis: 'Yearly Attainment',
        yearlyPct: 0,
        unit: 'USD',
        quotaRows: [{ label: 'Quota (USD)', values: q(0, 0, 0, 0) }],
      },
    ],
    commissions: [{ label: 'Total Commissions (USD)', values: q(0, 0, 0, 0), emphasis: true }],
    paymentLines: [{ label: 'Total Pending (USD)', values: q(0, 0, 0, 0), emphasis: true }],
  }
}
