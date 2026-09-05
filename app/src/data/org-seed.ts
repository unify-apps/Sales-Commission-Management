// Seed data for the Organization module (first cut, local persistence).
// Mirrors the Topcon Organization data model: people, positions, titles,
// hierarchy, named relationships, and unified profiles.

export type EmployeeStatus = 'Active' | 'Terminated' | 'On Leave'
export type RoleType = 'Individual Payee' | 'Manager'

export interface Profile {
  id: string
  employeeId: string
  personName: string
  email: string
  businessGroup: string
  title: string
  region: string
  status: EmployeeStatus
  roleType: RoleType
  manager: string | null
  position: string
  planName: string
  personalTarget: number
  salary: number
  paymentCurrency: string
  personalCurrency: string
  hireDate: string
  terminationDate: string | null
  team: string
  officeLocation: string
  commissionEligible: boolean
  company: string
}

export interface Title {
  id: string
  title: string
  description: string
  category: string
  level: string
  market: string
  function: string
  payPeriodType: string
}

export interface Person {
  id: string
  firstName: string
  lastName: string
  personalTarget: number
  employeeId: string
  salary: number
  region: string
  userEmail: string
  currency: string
}

export interface Position {
  id: string
  positionName: string
  title: string
  personName: string | null
  businessGroup: string
  incentiveStart: string
  incentiveEnd: string | null
}

export interface HierarchyRow {
  id: string
  versionName: string
  effectiveStart: string
  positionName: string
  person: string | null
  parentPosition: string | null
  parentPerson: string | null
}

export interface NamedRelationship {
  id: string
  name: string
  relationshipType: string
  fromPosition: string
  toPosition: string
  version: string
}

const REGIONS = ['NA-West', 'NA-East', 'EMEA', 'APAC', 'UK/BEN/Nord']
const GROUPS = ['ChargePoint NA', 'ChargePoint EU', 'ChargePoint APAC']

export const PROFILES: Profile[] = [
  { id: 'pr-1', employeeId: 'E-10041', personName: 'Marcus Lin', email: 'marcus.lin@chargepoint.com', businessGroup: 'ChargePoint NA', title: 'Account Executive', region: 'NA-West', status: 'Active', roleType: 'Individual Payee', manager: 'Anita Serrano', position: 'AE — West 04', planName: 'FY27 AE Standard', personalTarget: 220000, salary: 135000, paymentCurrency: 'USD', personalCurrency: 'USD', hireDate: '2022-03-14', terminationDate: null, team: 'West Enterprise', officeLocation: 'San Francisco', commissionEligible: true, company: 'ChargePoint Inc.' },
  { id: 'pr-2', employeeId: 'E-10042', personName: 'Anita Serrano', email: 'anita.serrano@chargepoint.com', businessGroup: 'ChargePoint NA', title: 'Regional Sales Manager', region: 'NA-West', status: 'Active', roleType: 'Manager', manager: 'Diane Whitlock', position: 'RSM — West', planName: 'FY27 Manager Override', personalTarget: 1400000, salary: 190000, paymentCurrency: 'USD', personalCurrency: 'USD', hireDate: '2019-06-01', terminationDate: null, team: 'West Enterprise', officeLocation: 'San Francisco', commissionEligible: true, company: 'ChargePoint Inc.' },
  { id: 'pr-3', employeeId: 'E-10043', personName: 'Joe Gorman', email: 'joe.gorman@chargepoint.com', businessGroup: 'ChargePoint EU', title: 'Account Executive EU', region: 'UK/BEN/Nord', status: 'Active', roleType: 'Individual Payee', manager: 'Michael Maas', position: 'AE — UK 02', planName: 'FY27 AE EU', personalTarget: 180000, salary: 98000, paymentCurrency: 'EUR', personalCurrency: 'EUR', hireDate: '2021-01-11', terminationDate: null, team: 'UK Field', officeLocation: 'London', commissionEligible: true, company: 'ChargePoint EU GmbH' },
  { id: 'pr-4', employeeId: 'E-10044', personName: 'Michael Maas', email: 'michael.maas@chargepoint.com', businessGroup: 'ChargePoint EU', title: 'Regional Sales Manager', region: 'EMEA', status: 'Active', roleType: 'Manager', manager: 'Diane Whitlock', position: 'RSM — EU', planName: 'FY27 Manager Override', personalTarget: 2100000, salary: 175000, paymentCurrency: 'EUR', personalCurrency: 'EUR', hireDate: '2020-09-20', terminationDate: null, team: 'EU Field', officeLocation: 'Amsterdam', commissionEligible: true, company: 'ChargePoint EU GmbH' },
  { id: 'pr-5', employeeId: 'E-10045', personName: 'Priya Nair', email: 'priya.nair@chargepoint.com', businessGroup: 'ChargePoint APAC', title: 'Account Executive', region: 'APAC', status: 'Active', roleType: 'Individual Payee', manager: 'Kenji Watanabe', position: 'AE — APAC 01', planName: 'FY27 AE APAC', personalTarget: 160000, salary: 88000, paymentCurrency: 'SGD', personalCurrency: 'SGD', hireDate: '2023-02-06', terminationDate: null, team: 'APAC Field', officeLocation: 'Singapore', commissionEligible: true, company: 'ChargePoint APAC Pte' },
  { id: 'pr-6', employeeId: 'E-10046', personName: 'Kenji Watanabe', email: 'kenji.watanabe@chargepoint.com', businessGroup: 'ChargePoint APAC', title: 'Regional Sales Manager', region: 'APAC', status: 'Active', roleType: 'Manager', manager: 'Diane Whitlock', position: 'RSM — APAC', planName: 'FY27 Manager Override', personalTarget: 1650000, salary: 168000, paymentCurrency: 'SGD', personalCurrency: 'SGD', hireDate: '2018-11-02', terminationDate: null, team: 'APAC Field', officeLocation: 'Tokyo', commissionEligible: true, company: 'ChargePoint APAC Pte' },
  { id: 'pr-7', employeeId: 'E-10047', personName: 'Sofia Almeida', email: 'sofia.almeida@chargepoint.com', businessGroup: 'ChargePoint EU', title: 'Sales Development Rep', region: 'EMEA', status: 'Active', roleType: 'Individual Payee', manager: 'Michael Maas', position: 'SDR — EU 03', planName: 'FY27 SDR', personalTarget: 60000, salary: 52000, paymentCurrency: 'EUR', personalCurrency: 'EUR', hireDate: '2024-04-15', terminationDate: null, team: 'EU Pipeline', officeLocation: 'Lisbon', commissionEligible: true, company: 'ChargePoint EU GmbH' },
  { id: 'pr-8', employeeId: 'E-10048', personName: 'David Okoye', email: 'david.okoye@chargepoint.com', businessGroup: 'ChargePoint NA', title: 'Account Executive', region: 'NA-East', status: 'Terminated', roleType: 'Individual Payee', manager: 'Anita Serrano', position: 'AE — East 07', planName: 'FY27 AE Standard', personalTarget: 200000, salary: 128000, paymentCurrency: 'USD', personalCurrency: 'USD', hireDate: '2020-07-19', terminationDate: '2026-05-30', team: 'East Enterprise', officeLocation: 'New York', commissionEligible: false, company: 'ChargePoint Inc.' },
  { id: 'pr-9', employeeId: 'E-10049', personName: 'Hannah Brooks', email: 'hannah.brooks@chargepoint.com', businessGroup: 'ChargePoint NA', title: 'Solutions Engineer', region: 'NA-West', status: 'Active', roleType: 'Individual Payee', manager: 'Anita Serrano', position: 'SE — West 02', planName: 'FY27 SE Overlay', personalTarget: 90000, salary: 145000, paymentCurrency: 'USD', personalCurrency: 'USD', hireDate: '2021-10-04', terminationDate: null, team: 'West Enterprise', officeLocation: 'Seattle', commissionEligible: true, company: 'ChargePoint Inc.' },
  { id: 'pr-10', employeeId: 'E-10050', personName: 'Diane Whitlock', email: 'diane.whitlock@chargepoint.com', businessGroup: 'ChargePoint NA', title: 'VP Sales', region: 'NA-West', status: 'Active', roleType: 'Manager', manager: null, position: 'VP — Global Sales', planName: 'FY27 Exec Plan', personalTarget: 8000000, salary: 320000, paymentCurrency: 'USD', personalCurrency: 'USD', hireDate: '2016-02-01', terminationDate: null, team: 'Executive', officeLocation: 'San Francisco', commissionEligible: true, company: 'ChargePoint Inc.' },
  { id: 'pr-11', employeeId: 'E-10051', personName: 'Liam Patel', email: 'liam.patel@chargepoint.com', businessGroup: 'ChargePoint EU', title: 'Account Executive EU', region: 'EMEA', status: 'On Leave', roleType: 'Individual Payee', manager: 'Michael Maas', position: 'AE — EU 05', planName: 'FY27 AE EU', personalTarget: 175000, salary: 96000, paymentCurrency: 'EUR', personalCurrency: 'EUR', hireDate: '2022-08-22', terminationDate: null, team: 'EU Field', officeLocation: 'Berlin', commissionEligible: true, company: 'ChargePoint EU GmbH' },
  { id: 'pr-12', employeeId: 'E-10052', personName: 'Grace Kim', email: 'grace.kim@chargepoint.com', businessGroup: 'ChargePoint APAC', title: 'Sales Development Rep', region: 'APAC', status: 'Active', roleType: 'Individual Payee', manager: 'Kenji Watanabe', position: 'SDR — APAC 01', planName: 'FY27 SDR', personalTarget: 55000, salary: 48000, paymentCurrency: 'SGD', personalCurrency: 'SGD', hireDate: '2024-01-08', terminationDate: null, team: 'APAC Pipeline', officeLocation: 'Seoul', commissionEligible: true, company: 'ChargePoint APAC Pte' },
]

export const TITLES: Title[] = [
  { id: 't-1', title: 'Account Executive', description: 'Quota-carrying field sales rep', category: 'Sales', level: 'IC-3', market: 'Global', function: 'Field Sales', payPeriodType: 'Monthly' },
  { id: 't-2', title: 'Account Executive EU', description: 'EU-market quota-carrying rep', category: 'Sales', level: 'IC-3', market: 'EMEA', function: 'Field Sales', payPeriodType: 'Monthly' },
  { id: 't-3', title: 'Regional Sales Manager', description: 'Manages a regional field team', category: 'Management', level: 'M-2', market: 'Global', function: 'Sales Management', payPeriodType: 'Monthly' },
  { id: 't-4', title: 'Sales Development Rep', description: 'Outbound pipeline generation', category: 'Sales', level: 'IC-1', market: 'Global', function: 'Pipeline', payPeriodType: 'Monthly' },
  { id: 't-5', title: 'Solutions Engineer', description: 'Technical pre-sales overlay', category: 'Overlay', level: 'IC-4', market: 'Global', function: 'Pre-Sales', payPeriodType: 'Quarterly' },
  { id: 't-6', title: 'VP Sales', description: 'Global sales leadership', category: 'Executive', level: 'E-1', market: 'Global', function: 'Leadership', payPeriodType: 'Annual' },
  { id: 't-7', title: 'Enterprise AE', description: 'Named-account enterprise seller', category: 'Sales', level: 'IC-5', market: 'NA', function: 'Field Sales', payPeriodType: 'Monthly' },
  { id: 't-8', title: 'Channel Manager', description: 'Partner & reseller channel', category: 'Sales', level: 'M-1', market: 'Global', function: 'Channel', payPeriodType: 'Quarterly' },
]

export const PEOPLE: Person[] = PROFILES.map((p, i) => ({
  id: `pe-${i + 1}`,
  firstName: p.personName.split(' ')[0],
  lastName: p.personName.split(' ').slice(1).join(' '),
  personalTarget: p.personalTarget,
  employeeId: p.employeeId,
  salary: p.salary,
  region: p.region,
  userEmail: p.email,
  currency: p.paymentCurrency,
}))

export const POSITIONS: Position[] = PROFILES.map((p, i) => ({
  id: `po-${i + 1}`,
  positionName: p.position,
  title: p.title,
  personName: p.status === 'Terminated' ? null : p.personName,
  businessGroup: p.businessGroup,
  incentiveStart: '2026-02-01',
  incentiveEnd: null,
})).concat([
  { id: 'po-open-1', positionName: 'AE — East 09', title: 'Account Executive', personName: null, businessGroup: 'ChargePoint NA', incentiveStart: '2026-02-01', incentiveEnd: null },
  { id: 'po-open-2', positionName: 'AE — EU 06', title: 'Account Executive EU', personName: null, businessGroup: 'ChargePoint EU', incentiveStart: '2026-02-01', incentiveEnd: null },
])

export const HIERARCHY_VERSION = 'FY27-ChargePoint FEB-2026'

export const HIERARCHY: HierarchyRow[] = [
  { id: 'h-1', versionName: HIERARCHY_VERSION, effectiveStart: '2026-02-01', positionName: 'VP — Global Sales', person: 'Diane Whitlock', parentPosition: null, parentPerson: null },
  { id: 'h-2', versionName: HIERARCHY_VERSION, effectiveStart: '2026-02-01', positionName: 'RSM — West', person: 'Anita Serrano', parentPosition: 'VP — Global Sales', parentPerson: 'Diane Whitlock' },
  { id: 'h-3', versionName: HIERARCHY_VERSION, effectiveStart: '2026-02-01', positionName: 'RSM — EU', person: 'Michael Maas', parentPosition: 'VP — Global Sales', parentPerson: 'Diane Whitlock' },
  { id: 'h-4', versionName: HIERARCHY_VERSION, effectiveStart: '2026-02-01', positionName: 'RSM — APAC', person: 'Kenji Watanabe', parentPosition: 'VP — Global Sales', parentPerson: 'Diane Whitlock' },
  { id: 'h-5', versionName: HIERARCHY_VERSION, effectiveStart: '2026-02-01', positionName: 'AE — West 04', person: 'Marcus Lin', parentPosition: 'RSM — West', parentPerson: 'Anita Serrano' },
  { id: 'h-6', versionName: HIERARCHY_VERSION, effectiveStart: '2026-02-01', positionName: 'SE — West 02', person: 'Hannah Brooks', parentPosition: 'RSM — West', parentPerson: 'Anita Serrano' },
  { id: 'h-7', versionName: HIERARCHY_VERSION, effectiveStart: '2026-02-01', positionName: 'AE — UK 02', person: 'Joe Gorman', parentPosition: 'RSM — EU', parentPerson: 'Michael Maas' },
  { id: 'h-8', versionName: HIERARCHY_VERSION, effectiveStart: '2026-02-01', positionName: 'SDR — EU 03', person: 'Sofia Almeida', parentPosition: 'RSM — EU', parentPerson: 'Michael Maas' },
  { id: 'h-9', versionName: HIERARCHY_VERSION, effectiveStart: '2026-02-01', positionName: 'AE — EU 05', person: 'Liam Patel', parentPosition: 'RSM — EU', parentPerson: 'Michael Maas' },
  { id: 'h-10', versionName: HIERARCHY_VERSION, effectiveStart: '2026-02-01', positionName: 'AE — APAC 01', person: 'Priya Nair', parentPosition: 'RSM — APAC', parentPerson: 'Kenji Watanabe' },
  { id: 'h-11', versionName: HIERARCHY_VERSION, effectiveStart: '2026-02-01', positionName: 'SDR — APAC 01', person: 'Grace Kim', parentPosition: 'RSM — APAC', parentPerson: 'Kenji Watanabe' },
]

export const HIERARCHY_VERSIONS = [
  { name: 'FY27-ChargePoint FEB-2026', range: 'Feb 1 – Feb 28, 2026', description: 'Addition of Michael Maas to head up EU. Joe Gorman to only head up UK/BEN/Nord.' },
  { name: 'FY26-ChargePoint JAN-2026', range: 'Jan 1 – Jan 31, 2026', description: 'Standard monthly roll of the FY26 structure.' },
  { name: 'FY26-ChargePoint DEC-2025', range: 'Dec 1 – Dec 31, 2025', description: 'APAC team consolidated under Kenji Watanabe.' },
  { name: 'FY26-ChargePoint NOV-2025', range: 'Nov 1 – Nov 30, 2025', description: 'No structural change from October.' },
]

export const NAMED_RELATIONSHIPS: NamedRelationship[] = [
  { id: 'nr-1', name: 'West SE Overlay', relationshipType: 'Overlay', fromPosition: 'SE — West 02', toPosition: 'AE — West 04', version: 'Latest' },
  { id: 'nr-2', name: 'EU Split Credit', relationshipType: 'Split Credit', fromPosition: 'AE — UK 02', toPosition: 'AE — EU 05', version: 'Latest' },
  { id: 'nr-3', name: 'APAC Mentor', relationshipType: 'Mentor', fromPosition: 'AE — APAC 01', toPosition: 'SDR — APAC 01', version: 'Latest' },
]

export { REGIONS, GROUPS }
