// Seed data for the Plan Design section, modeled on the "Six-Object Model":
// Quotas, Formulas, Reference Tables, Measures, Rules, Plans.
// Ordered the way data flows: measured-against → math → reference data →
// aggregation → logic → packaging.

export type UnitType = 'currency' | 'quantity'
export type AssignmentLevel = 'plan' | 'position' | 'title'
export type AssignmentType = 'Plan' | 'Position' | 'Title'

/** A single row of the annual → semiannual → quarter → month allocation grid. */
export interface QuotaBreakdown {
  year: { label: string; value: number }
  semiannual: Array<{ label: string; value: number }>
  quarters: Array<{ label: string; value: number }>
  months: Array<{ label: string; value: number }>
}

export interface Quota {
  id: string
  name: string
  period: string
  type: AssignmentType
  assignmentName: string | null
  personName: string | null
  yearValue: number
  unitType: string
  businessGroup: string | null
  classification: string
  description: string | null
  effectiveStart: string
  effectiveEnd: string
  breakdown: QuotaBreakdown
}

export type FormulaType = 'Numeric' | 'Relational'
export interface Formula {
  id: string
  name: string
  type: FormulaType
  expression: string
  description: string
}

export type ReferenceKind = 'tiered' | 'curve'
export interface ReferenceTable {
  id: string
  name: string
  kind: ReferenceKind
  unitType: string
  type: AssignmentType
  assignmentName: string | null
  personName: string | null
  businessGroup: string | null
  rows: number
  version: string
  effectiveStart: string
}

export type PeriodType = 'Monthly' | 'Year-to-Date (YTD)' | 'Half-to-Date (HTD)' | 'Quarterly'
export interface Measure {
  id: string
  name: string
  periodType: PeriodType
  description: string
  creditTypes: string[]
  products: string[]
  customers: string[]
  geographies: string[]
}

export type RuleStage = 'credit' | 'payout'
export type RuleType = 'Direct Credit' | 'Commission' | 'Bonus'
export interface RuleCondition {
  connector: string
  object: string
  field: string
  operator: string
  value: string
}
export interface RuleResult {
  name: string
  creditType: string
  value: string
  holdPeriod: string
}
export interface Rule {
  id: string
  name: string
  stage: RuleStage
  ruleType: RuleType
  description: string
  activeStart: string | null
  activeEnd: string | null
  rollableOnReporting: boolean
  conditions: RuleCondition[]
  results: RuleResult[]
}

export interface PlanRuleRef {
  name: string
  description: string
}
export interface Plan {
  id: string
  name: string
  period: string
  description: string
  creditRules: PlanRuleRef[]
  commissionRules: PlanRuleRef[]
  bonusRules: PlanRuleRef[]
  titleAssignments: number
  positionAssignments: number
  tags: string[]
}

export function makeBreakdown(period: string, annual: number): QuotaBreakdown {
  const year = period.replace('YEAR-', '')
  const half = Math.round(annual / 2)
  const qtr = Math.round(annual / 4)
  const mon = Math.round(annual / 12)
  return {
    year: { label: period, value: annual },
    semiannual: [
      { label: `H1-${year}`, value: half },
      { label: `H2-${year}`, value: annual - half },
    ],
    quarters: [
      { label: `QTR-1-${year}`, value: qtr },
      { label: `QTR-2-${year}`, value: qtr },
      { label: `QTR-3-${year}`, value: qtr },
      { label: `QTR-4-${year}`, value: annual - qtr * 3 },
    ],
    months: [
      { label: `FEB-${year}`, value: mon },
      { label: `MAR-${year}`, value: mon },
      { label: `APR-${year}`, value: mon },
      { label: `MAY-${year}`, value: mon },
      { label: `JUN-${year}`, value: mon },
      { label: `JUL-${year}`, value: mon },
    ],
  }
}

interface QuotaSeed {
  id: string
  period: string
  type: AssignmentType
  assignmentName: string | null
  personName: string | null
  yearValue: number
  businessGroup: string | null
}

const QUOTA_SEEDS: QuotaSeed[] = [
  { id: 'q-1', period: 'YEAR-2023', type: 'Plan', assignmentName: null, personName: null, yearValue: 0, businessGroup: null },
  { id: 'q-2', period: 'YEAR-2024', type: 'Plan', assignmentName: null, personName: null, yearValue: 0, businessGroup: null },
  { id: 'q-3', period: 'YEAR-2024', type: 'Position', assignmentName: 'Boudewijn_Schrijver_ChargePoint', personName: 'Boudewijn Schrijver (103391)', yearValue: 950000, businessGroup: 'Quarter Billings - EU' },
  { id: 'q-4', period: 'YEAR-2024', type: 'Position', assignmentName: 'Haakon_Olsen_ChargePoint', personName: 'Haakon Olsen (103932)', yearValue: 950000, businessGroup: 'Quarter Billings - EU' },
  { id: 'q-5', period: 'YEAR-2024', type: 'Position', assignmentName: 'Jurriaan_van_Straaten_ChargePoint', personName: 'Jurriaan van Straaten (104021)', yearValue: 2800000, businessGroup: 'Quarter Billings - EU' },
  { id: 'q-6', period: 'YEAR-2024', type: 'Position', assignmentName: 'Simonetta_Camilloni_ChargePoint', personName: 'Simonetta Camilloni (103774)', yearValue: 1150000, businessGroup: 'Quarter Billings - EU' },
  { id: 'q-7', period: 'YEAR-2024', type: 'Position', assignmentName: 'Steffen_Bittler_ChargePoint', personName: 'Steffen Bittler (102733)', yearValue: 850000, businessGroup: 'Quarter Billings - EU' },
  { id: 'q-8', period: 'YEAR-2024', type: 'Position', assignmentName: 'Uwe_Munch_ChargePoint', personName: 'Uwe Munch (104114)', yearValue: 6700000, businessGroup: 'Quarter Billings - EU' },
  { id: 'q-9', period: 'YEAR-2025', type: 'Plan', assignmentName: null, personName: null, yearValue: 0, businessGroup: null },
  { id: 'q-10', period: 'YEAR-2025', type: 'Position', assignmentName: 'Boudewijn_Schrijver_ChargePoint', personName: 'Boudewijn Schrijver (103391)', yearValue: 2135000, businessGroup: 'Quarter Billings - EU' },
  { id: 'q-11', period: 'YEAR-2025', type: 'Position', assignmentName: 'Hanae_Tligui_ChargePoint', personName: 'Hanae Tligui (103471)', yearValue: 1490000, businessGroup: 'Quarter Billings - EU' },
  { id: 'q-12', period: 'YEAR-2025', type: 'Position', assignmentName: 'Jurriaan_van_Straaten_ChargePoint', personName: 'Jurriaan van Straaten (104021)', yearValue: 2090000, businessGroup: 'Quarter Billings - EU' },
  { id: 'q-13', period: 'YEAR-2025', type: 'Position', assignmentName: 'Simonetta_Camilloni_ChargePoint', personName: 'Simonetta Camilloni (103774)', yearValue: 2270000, businessGroup: 'Quarter Billings - EU' },
  { id: 'q-14', period: 'YEAR-2025', type: 'Position', assignmentName: 'Steffen_Bittler_ChargePoint', personName: 'Steffen Bittler (102733)', yearValue: 1815000, businessGroup: 'Quarter Billings - EU' },
  { id: 'q-15', period: 'YEAR-2025', type: 'Position', assignmentName: 'Uwe_Munch_ChargePoint', personName: 'Uwe Munch (104114)', yearValue: 10040000, businessGroup: 'Quarter Billings - EU' },
  { id: 'q-16', period: 'YEAR-2026', type: 'Plan', assignmentName: null, personName: null, yearValue: 0, businessGroup: null },
  { id: 'q-17', period: 'YEAR-2026', type: 'Position', assignmentName: 'Boudewijn_Schrijver_ChargePoint', personName: 'Boudewijn Schrijver (103391)', yearValue: 2450000, businessGroup: 'Quarter Billings - EU' },
  { id: 'q-18', period: 'YEAR-2026', type: 'Position', assignmentName: 'Hanae_Tligui_ChargePoint', personName: 'Hanae Tligui (103471)', yearValue: 1620000, businessGroup: 'Quarter Billings - EU' },
]

export const QUOTAS: Quota[] = QUOTA_SEEDS.map((s) => ({
  id: s.id,
  name: 'Booked Quota',
  period: s.period,
  type: s.type,
  assignmentName: s.assignmentName,
  personName: s.personName,
  yearValue: s.yearValue,
  unitType: 'USD',
  businessGroup: s.businessGroup,
  classification: 'BOOKINGS',
  description: null,
  effectiveStart: 'FEB-2024 (02/01/2024)',
  effectiveEnd: 'JAN-2025 (01/31/2025)',
  breakdown: makeBreakdown(s.period, s.yearValue),
}))

export const QUOTAS_TOTAL = 995

export const FORMULAS: Formula[] = [
  { id: 'f-1', name: 'Booked_EU_Rolled_TotalCommValue', type: 'Numeric', expression: "( TotalCommissionValue('','','','QUARTERLY','',-1,'YTD Booked - Rolled') )", description: '' },
  { id: 'f-2', name: 'Booked_EU_TotalCommValue', type: 'Numeric', expression: "( TotalCommissionValue('','','','QUARTERLY','',-1,'YTD Booked') )", description: '' },
  { id: 'f-3', name: 'Booked_Rolled_TotalCommValue', type: 'Numeric', expression: "( TotalCommissionValue('','','','MONTHLY','',-1,'YTD Booked - Rolled') )", description: '' },
  { id: 'f-4', name: 'Booked_Rolled_TotalCreditValue', type: 'Numeric', expression: "( TotalCreditValue('','','','YTD','Booked - Rolled','USD',0) )", description: '' },
  { id: 'f-5', name: 'Booked_Rolled_TotalCreditValue_HTD', type: 'Numeric', expression: "( TotalCreditValue('','','','HTD','Booked - Rolled','USD',0) )", description: '' },
  { id: 'f-6', name: 'Booked_TotalCommValue', type: 'Numeric', expression: "( TotalCommissionValue('','','','MONTHLY','',-1,'YTD Booked') )", description: '' },
  { id: 'f-7', name: 'Booked_TotalCreditValue', type: 'Numeric', expression: "( TotalCreditValue('','','','YTD','Booked','USD',0) )", description: '' },
  { id: 'f-8', name: 'Booked_TotalCreditValue_HTD', type: 'Numeric', expression: "( TotalCreditValue('','','','HTD','Booked','USD',0) )", description: '' },
  { id: 'f-9', name: 'Booked_TotalCreditValue_Neg', type: 'Numeric', expression: "( ( TotalCreditValue('','','','YTD','Booked','USD',0) ) * ( -1 ) )", description: 'RJ - Negative commission' },
  { id: 'f-10', name: 'Credit_Amount', type: 'Numeric', expression: '( Credit.Amount )', description: '' },
  { id: 'f-11', name: 'CT_Shipped', type: 'Relational', expression: "( Credit.CreditType == 'Shipped' OR Credit.CreditType == 'Shipped For Roll Up' )", description: 'FY27' },
  { id: 'f-12', name: 'F_Base_Commission_Booke_Tier_1', type: 'Numeric', expression: "( F_Base_Commission_Booked * LookupTable('Accelerator Tier 1',0) )", description: '' },
  { id: 'f-13', name: 'F_Base_Commission_Booke_Tier_2', type: 'Numeric', expression: "( F_Base_Commission_Booked * LookupTable('Accelerator Tier 2',0) )", description: '' },
  { id: 'f-14', name: 'F_Base_Commission_Booke_Tier_3', type: 'Numeric', expression: "( F_Base_Commission_Booked * LookupTable('Accelerator Tier 3',0) )", description: '' },
  { id: 'f-15', name: 'F_Base_Commission_Booke_Tier_4', type: 'Numeric', expression: "( F_Base_Commission_Booked * LookupTable('Accelerator Tier 4',0) )", description: '' },
  { id: 'f-16', name: 'F_Base_Commission_Booked', type: 'Numeric', expression: "( Person.PersonalTarget * GetRate('Shipped Comp Weight','') * GetRate('',Credit.Amount) )", description: '' },
  { id: 'f-17', name: 'Is_Commission_Eligible', type: 'Relational', expression: '( Person.Is_Commission_Eligible == true )', description: '' },
  { id: 'f-18', name: 'New_Logo_Flag', type: 'Relational', expression: "( Order.CustomerType == 'New' )", description: '' },
  { id: 'f-19', name: 'Renewal_Credit_Value', type: 'Numeric', expression: "( TotalCreditValue('','','','YTD','Renewal','USD',0) )", description: '' },
  { id: 'f-20', name: 'Split_Amount_Half', type: 'Numeric', expression: '( Order.ACV * 0.5 )', description: 'Shared-deal split' },
]

export const FORMULAS_TOTAL = 98

interface RateSeed {
  id: string
  name: string
  kind: ReferenceKind
  unitType: string
  type: AssignmentType
  assignmentName: string | null
  personName: string | null
  businessGroup: string | null
  rows: number
}

const RATE_SEEDS: RateSeed[] = [
  { id: 'rt-1', name: 'Accelerator Tier 2', kind: 'tiered', unitType: 'PERCENT', type: 'Plan', assignmentName: null, personName: null, businessGroup: null, rows: 4 },
  { id: 'rt-2', name: 'Accelerator Tier 1', kind: 'tiered', unitType: 'PERCENT', type: 'Plan', assignmentName: null, personName: null, businessGroup: null, rows: 4 },
  { id: 'rt-3', name: 'Accelerator Tier 3', kind: 'tiered', unitType: 'PERCENT', type: 'Plan', assignmentName: null, personName: null, businessGroup: null, rows: 4 },
  { id: 'rt-4', name: 'Accelerator Tier 4', kind: 'tiered', unitType: 'PERCENT', type: 'Plan', assignmentName: null, personName: null, businessGroup: null, rows: 4 },
  { id: 'rt-5', name: 'Booked Comp Weight', kind: 'curve', unitType: 'PERCENT', type: 'Plan', assignmentName: null, personName: null, businessGroup: null, rows: 6 },
  { id: 'rt-6', name: 'Booked Comp Weight', kind: 'curve', unitType: 'PERCENT', type: 'Position', assignmentName: 'Hanae_Tligui_ChargePoint', personName: 'Hanae Tligui (103471)', businessGroup: 'Quarter Billings - EU', rows: 6 },
  { id: 'rt-7', name: 'Booked Comp Weight', kind: 'curve', unitType: 'PERCENT', type: 'Position', assignmentName: 'Jurriaan_van_Straaten_ChargePoint', personName: 'Jurriaan van Straaten (104021)', businessGroup: 'Quarter Billings - EU', rows: 6 },
  { id: 'rt-8', name: 'Linearity Multiplier', kind: 'curve', unitType: 'PERCENT', type: 'Plan', assignmentName: null, personName: null, businessGroup: null, rows: 8 },
]

export const REFERENCE_TABLES: ReferenceTable[] = RATE_SEEDS.map((s) => ({
  ...s,
  version: 'FY27 v1',
  effectiveStart: '2026-02-01',
}))

export const REFERENCE_TABLES_TOTAL = REFERENCE_TABLES.length

export const MEASURES: Measure[] = [
  { id: 'm-1', name: 'Booked Attainment Measure', periodType: 'Monthly', description: '', creditTypes: ['YTD Booked - Rolled', 'YTD Booked'], products: [], customers: [], geographies: [] },
  { id: 'm-2', name: 'Opps Accepted Attainment Measure', periodType: 'Monthly', description: '', creditTypes: ['Opps Accepted'], products: [], customers: [], geographies: [] },
  { id: 'm-3', name: 'Ramp Shipped', periodType: 'Monthly', description: '', creditTypes: ['Shipped'], products: [], customers: [], geographies: [] },
  { id: 'm-4', name: 'Shipped - Negative - Attainment Measure', periodType: 'Year-to-Date (YTD)', description: '', creditTypes: ['YTD Shipped'], products: [], customers: [], geographies: [] },
  { id: 'm-5', name: 'Shipped - Negative HTD - Attainment Measure', periodType: 'Half-to-Date (HTD)', description: '', creditTypes: ['HTD Shipped'], products: [], customers: [], geographies: [] },
  { id: 'm-6', name: 'Shipped - Partner Onboarding Attainment Measure', periodType: 'Monthly', description: '', creditTypes: ['Partner Onboarding'], products: [], customers: [], geographies: [] },
  { id: 'm-7', name: 'Shipped - Partner Onboarding Linear Attainment Measure', periodType: 'Monthly', description: '', creditTypes: ['Partner Onboarding'], products: [], customers: [], geographies: [] },
  { id: 'm-8', name: 'Shipped - Partner Onboarding Linear Negative Attainment Measure', periodType: 'Monthly', description: '', creditTypes: ['Partner Onboarding'], products: [], customers: [], geographies: [] },
  { id: 'm-9', name: 'Shipped Attainment Measure', periodType: 'Monthly', description: '', creditTypes: ['Shipped'], products: [], customers: [], geographies: [] },
  { id: 'm-10', name: 'Shipped Linear Attainment Measure', periodType: 'Monthly', description: '', creditTypes: ['Shipped'], products: [], customers: [], geographies: [] },
  { id: 'm-11', name: 'Shipped Linear Attainment Measure - EU', periodType: 'Monthly', description: '', creditTypes: ['Shipped'], products: [], customers: [], geographies: ['EU'] },
  { id: 'm-12', name: 'Shipped Linear Negative Attainment Measure', periodType: 'Monthly', description: '', creditTypes: ['Shipped'], products: [], customers: [], geographies: [] },
  { id: 'm-13', name: 'Shipped Linear Negative Attainment Measure - EU', periodType: 'Monthly', description: '', creditTypes: ['Shipped'], products: [], customers: [], geographies: ['EU'] },
]

export const MEASURES_TOTAL = 13

const BOOKED_CONDITION: RuleCondition = { connector: 'IF', object: 'OrderItem', field: 'OrderType', operator: 'Equals', value: 'Booked' }

interface RuleSeed {
  id: string
  name: string
  stage: RuleStage
  description: string
  rollable: boolean
  creditType: string
}

const RULE_SEEDS: RuleSeed[] = [
  { id: 'r-1', name: 'DC - Booked', stage: 'credit', description: '2 component', rollable: true, creditType: 'Booked' },
  { id: 'r-2', name: 'DC - Exception Bonus', stage: 'credit', description: '', rollable: false, creditType: 'Bonus' },
  { id: 'r-3', name: 'DC - HTD Booked', stage: 'credit', description: '', rollable: false, creditType: 'Booked' },
  { id: 'r-4', name: 'DC - HTD Booked - Rolled', stage: 'credit', description: '', rollable: true, creditType: 'Booked - Rolled' },
  { id: 'r-5', name: 'DC - HTD Booked - Rolled Monthly', stage: 'credit', description: '', rollable: true, creditType: 'Booked - Rolled' },
  { id: 'r-6', name: 'DC - HTD Booked Monthly', stage: 'credit', description: '', rollable: false, creditType: 'Booked' },
  { id: 'r-7', name: 'DC - HTD Shipped', stage: 'credit', description: 'FY27', rollable: false, creditType: 'Shipped' },
  { id: 'r-8', name: 'DC - HTD Shipped - Rolled', stage: 'credit', description: '1 component', rollable: true, creditType: 'Shipped - Rolled' },
  { id: 'r-9', name: 'DC - Linearity Bonus', stage: 'credit', description: '', rollable: false, creditType: 'Bonus' },
  { id: 'r-10', name: 'DC - Linearity Multiplier', stage: 'credit', description: '', rollable: false, creditType: 'Shipped' },
  { id: 'r-11', name: 'DC - Manual Adjustment', stage: 'credit', description: '', rollable: false, creditType: 'Adjustment' },
  { id: 'r-12', name: 'DC - Monthly Opps Accepted', stage: 'credit', description: 'component 5', rollable: false, creditType: 'Opps Accepted' },
  { id: 'r-13', name: 'DC - Monthly Shipped', stage: 'credit', description: '1 component For reporting purposes', rollable: false, creditType: 'Shipped' },
  { id: 'r-14', name: 'DC - Monthly Shipped For Linearity Multiplier', stage: 'credit', description: '', rollable: false, creditType: 'Shipped' },
  { id: 'r-15', name: 'DC - Monthly Shipped For Roll Up', stage: 'credit', description: 'FY27', rollable: true, creditType: 'Shipped - Rolled' },
  { id: 'r-16', name: 'DC - Previously Paid Shipped - EU', stage: 'credit', description: '1 component', rollable: false, creditType: 'Shipped' },
  { id: 'r-17', name: 'DC - Shipped', stage: 'credit', description: '1 component', rollable: false, creditType: 'Shipped' },
  { id: 'r-18', name: 'DC - Shipped - Multiplier', stage: 'credit', description: '', rollable: false, creditType: 'Shipped' },
  { id: 'r-19', name: 'C - Exception Bonus', stage: 'payout', description: '', rollable: false, creditType: 'Bonus' },
  { id: 'r-20', name: 'C - Manual Adjustment', stage: 'payout', description: '', rollable: false, creditType: 'Adjustment' },
  { id: 'r-21', name: 'C - Previously Paid Shipped - EU', stage: 'payout', description: 'FY27', rollable: false, creditType: 'Shipped' },
  { id: 'r-22', name: 'C - SPIFF', stage: 'payout', description: '', rollable: false, creditType: 'SPIFF' },
  { id: 'r-23', name: 'C - YTD Shipped - EU', stage: 'payout', description: 'for 1 component EU', rollable: false, creditType: 'YTD Shipped' },
  { id: 'r-24', name: 'C - YTD Shipped_Neg - EU', stage: 'payout', description: 'for 1 component for EU', rollable: false, creditType: 'YTD Shipped' },
]

export const RULES: Rule[] = RULE_SEEDS.map((s) => ({
  id: s.id,
  name: s.name,
  stage: s.stage,
  ruleType: 'Direct Credit',
  description: s.description,
  activeStart: null,
  activeEnd: null,
  rollableOnReporting: s.rollable,
  conditions: [BOOKED_CONDITION],
  results: [{ name: s.name, creditType: s.creditType, value: 'Credit.Amount', holdPeriod: '—' }],
}))

export const RULES_TOTAL = 82

interface PlanSeed {
  id: string
  name: string
  period: string
  description: string
  titleAssignments: number
  positionAssignments: number
}

const PLAN_SEEDS: PlanSeed[] = [
  { id: 'pl-1', name: '2023 - Account Executive EU Plan', period: 'YEAR-2023', description: '', titleAssignments: 2, positionAssignments: 14 },
  { id: 'pl-2', name: '2023 - Account Executive Exception Plan', period: 'YEAR-2023', description: '', titleAssignments: 1, positionAssignments: 3 },
  { id: 'pl-3', name: '2023 - Account Executive Plan', period: 'YEAR-2023', description: '', titleAssignments: 3, positionAssignments: 22 },
  { id: 'pl-4', name: '2023 - AM Plan from 08/01/23', period: 'YEAR-2023', description: '', titleAssignments: 1, positionAssignments: 6 },
  { id: 'pl-5', name: '2023 - District Manager EU Plan', period: 'YEAR-2023', description: '', titleAssignments: 1, positionAssignments: 4 },
  { id: 'pl-6', name: '2023 - District Manager Plan', period: 'YEAR-2023', description: '', titleAssignments: 1, positionAssignments: 8 },
  { id: 'pl-7', name: "2023 - Lauren Holicky's Plan from 08/01/23", period: 'YEAR-2023', description: '', titleAssignments: 0, positionAssignments: 1 },
  { id: 'pl-8', name: '2023 - Linear Account Executive Plan', period: 'YEAR-2023', description: '', titleAssignments: 2, positionAssignments: 11 },
  { id: 'pl-9', name: '2023 - MBO EU Plan', period: 'YEAR-2023', description: '', titleAssignments: 1, positionAssignments: 5 },
  { id: 'pl-10', name: '2023 - MBO Plan', period: 'YEAR-2023', description: '', titleAssignments: 2, positionAssignments: 9 },
  { id: 'pl-11', name: '2023 - Partner Account Manager EU Plan', period: 'YEAR-2023', description: '', titleAssignments: 1, positionAssignments: 4 },
  { id: 'pl-12', name: '2023 - Partner Account Manager Plan', period: 'YEAR-2023', description: '', titleAssignments: 1, positionAssignments: 7 },
  { id: 'pl-13', name: '2023 - Partner Account Manager Plan (Chris Beebe)', period: 'YEAR-2023', description: 'DT 01/06/24 - separate plan for Chris Beebe only till the end of 2023', titleAssignments: 0, positionAssignments: 1 },
  { id: 'pl-14', name: '2023 - Renewals Account Executive EU Plan', period: 'YEAR-2023', description: '', titleAssignments: 1, positionAssignments: 6 },
  { id: 'pl-15', name: '2023 - Renewals Account Executive Plan', period: 'YEAR-2023', description: '', titleAssignments: 2, positionAssignments: 10 },
  { id: 'pl-16', name: '2024 - Account Executive EU Plan', period: 'YEAR-2024', description: '', titleAssignments: 2, positionAssignments: 15 },
  { id: 'pl-17', name: '2024 - Account Executive Plan', period: 'YEAR-2024', description: '', titleAssignments: 3, positionAssignments: 24 },
  { id: 'pl-18', name: '2024 - District Manager Plan', period: 'YEAR-2024', description: '', titleAssignments: 1, positionAssignments: 9 },
]

const SAMPLE_CREDIT_RULES: PlanRuleRef[] = [
  { name: 'DC - Exception Bonus', description: '' },
  { name: 'DC - HTD Shipped', description: 'FY27' },
  { name: 'DC - Manual Adjustment', description: '' },
  { name: 'DC - Monthly Shipped', description: '1 component For reporting purposes' },
  { name: 'DC - Previously Paid Shipped - EU', description: '1 component' },
  { name: 'DC - Shipped', description: '1 component' },
  { name: 'DC - Shipped - Multiplier', description: '' },
  { name: 'DC - Shipped - Multiplier 4', description: '' },
  { name: 'DC - Shipped - Multiplier 4 For Roll Up', description: '' },
  { name: 'DC - Shipped - Multiplier For Roll Up', description: '' },
  { name: 'DC - YTD Shipped - EU', description: '' },
  { name: 'DC - YTD Shipped_Neg - EU', description: '' },
]

const SAMPLE_COMMISSION_RULES: PlanRuleRef[] = [
  { name: 'C - Exception Bonus', description: '' },
  { name: 'C - Manual Adjustment', description: '' },
  { name: 'C - Previously Paid Shipped - EU', description: 'FY27' },
  { name: 'C - SPIFF', description: '' },
  { name: 'C - YTD Shipped - EU', description: 'for 1 component EU' },
  { name: 'C - YTD Shipped_Neg - EU', description: 'for 1 component for EU' },
]

export const PLANS: Plan[] = PLAN_SEEDS.map((s) => ({
  id: s.id,
  name: s.name,
  period: s.period,
  description: s.description,
  creditRules: SAMPLE_CREDIT_RULES,
  commissionRules: SAMPLE_COMMISSION_RULES,
  bonusRules: [],
  titleAssignments: s.titleAssignments,
  positionAssignments: s.positionAssignments,
  tags: [],
}))

export const PLANS_TOTAL = 87
