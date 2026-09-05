// Seed data for the Integration / Sync Wizard (Data Mapping) screen.
// Local-only app: this is the single source of truth for the wizard.

export type FieldType = 'string' | 'number' | 'currency' | 'date' | 'boolean'

/** A connectable source app the wizard can authenticate against. */
export interface SourceApp {
  id: string
  name: string
  category: string
  description: string
}

export interface SourceObject {
  id: string
  appId: string
  name: string
  description: string
  recordCount: number
  recommended?: boolean
}

export interface SourceField {
  id: string
  objectId: string
  name: string
  type: FieldType
  sample: string
}

/** Topcon destination sections — which area a mapped field imports into. */
export const TARGET_SECTIONS = {
  profile: 'Profiles',
  deals: 'Deals',
  positions: 'Positions',
} as const

export type TargetSection = keyof typeof TARGET_SECTIONS

/** A Topcon internal calculation field a source field maps onto. */
export interface TargetField {
  id: string
  name: string
  section: TargetSection
  type: FieldType
  required: boolean
  description: string
}

/** Transformations that can be applied to a source value before mapping. */
export const TRANSFORMS = {
  none: 'No transformation',
  uppercase: 'Uppercase',
  lowercase: 'Lowercase',
  trim: 'Trim whitespace',
  to_number: 'Parse as number',
  round: 'Round to whole number',
  abs: 'Absolute value',
  usd_to_cents: 'Multiply by 100 (to cents)',
  iso_date: 'Normalize to ISO date',
} as const

export type TransformId = keyof typeof TRANSFORMS

export const SOURCE_APPS: SourceApp[] = [
  { id: 'salesforce', name: 'Salesforce', category: 'CRM', description: 'Opportunities, deals and accounts from your Salesforce org.' },
  { id: 'monday', name: 'Monday.com', category: 'Work OS', description: 'Boards, items and deal pipelines tracked in Monday.' },
  { id: 'hubspot', name: 'HubSpot', category: 'CRM', description: 'Deals, companies and line items from HubSpot CRM.' },
  { id: 'netsuite', name: 'NetSuite', category: 'ERP', description: 'Invoices and recognized revenue from NetSuite.' },
]

export const SOURCE_OBJECTS: SourceObject[] = [
  // Salesforce
  { id: 'sf_opportunity', appId: 'salesforce', name: 'Opportunities', description: 'Sales opportunities and their stages — the primary revenue signal.', recordCount: 18420, recommended: true },
  { id: 'sf_invoice', appId: 'salesforce', name: 'Invoices', description: 'Billed amounts recognized against closed deals.', recordCount: 9310 },
  { id: 'sf_account', appId: 'salesforce', name: 'Accounts', description: 'Customer accounts and ownership.', recordCount: 6205 },
  { id: 'sf_renewal', appId: 'salesforce', name: 'Renewals (Custom)', description: 'Custom object tracking renewal contracts and ARR.', recordCount: 2140 },
  // Monday
  { id: 'mon_deals', appId: 'monday', name: 'Deals Board', description: 'Items on the deals pipeline board.', recordCount: 3120, recommended: true },
  { id: 'mon_accounts', appId: 'monday', name: 'Accounts Board', description: 'Customer accounts tracked as board items.', recordCount: 1980 },
  // HubSpot
  { id: 'hs_deals', appId: 'hubspot', name: 'Deals', description: 'HubSpot deals across every pipeline.', recordCount: 8740, recommended: true },
  { id: 'hs_line_items', appId: 'hubspot', name: 'Line Items', description: 'Product line items attached to deals.', recordCount: 15600 },
  // NetSuite
  { id: 'ns_invoice', appId: 'netsuite', name: 'Invoices', description: 'Issued invoices and recognized revenue.', recordCount: 22300, recommended: true },
]

export const SOURCE_FIELDS: SourceField[] = [
  // Salesforce · Opportunities
  { id: 'sf_opp_close', objectId: 'sf_opportunity', name: 'CloseDate', type: 'date', sample: '2026-06-30' },
  { id: 'sf_opp_amount', objectId: 'sf_opportunity', name: 'Amount', type: 'currency', sample: '$84,000' },
  { id: 'sf_opp_arr', objectId: 'sf_opportunity', name: 'ARR__c', type: 'currency', sample: '$120,000' },
  { id: 'sf_opp_owner', objectId: 'sf_opportunity', name: 'OwnerId', type: 'string', sample: '005a0000...' },
  { id: 'sf_opp_stage', objectId: 'sf_opportunity', name: 'StageName', type: 'string', sample: 'Closed Won' },
  { id: 'sf_opp_type', objectId: 'sf_opportunity', name: 'Type', type: 'string', sample: 'New Business' },
  // Salesforce · Invoices
  { id: 'sf_inv_date', objectId: 'sf_invoice', name: 'InvoiceDate', type: 'date', sample: '2026-07-05' },
  { id: 'sf_inv_total', objectId: 'sf_invoice', name: 'TotalAmount', type: 'currency', sample: '$46,200' },
  { id: 'sf_inv_owner', objectId: 'sf_invoice', name: 'SalesRep__c', type: 'string', sample: 'rep_204' },
  // Salesforce · Accounts
  { id: 'sf_acc_name', objectId: 'sf_account', name: 'Name', type: 'string', sample: 'Northwind Ltd' },
  { id: 'sf_acc_owner', objectId: 'sf_account', name: 'OwnerId', type: 'string', sample: '005a0000...' },
  // Salesforce · Renewals
  { id: 'sf_ren_date', objectId: 'sf_renewal', name: 'RenewalDate__c', type: 'date', sample: '2027-01-01' },
  { id: 'sf_ren_arr', objectId: 'sf_renewal', name: 'RenewalARR__c', type: 'currency', sample: '$88,000' },
  { id: 'sf_ren_owner', objectId: 'sf_renewal', name: 'AccountOwner__c', type: 'string', sample: '005a0000...' },
  // Monday · Deals Board
  { id: 'mon_deal_close', objectId: 'mon_deals', name: 'close_date', type: 'date', sample: '2026-06-15' },
  { id: 'mon_deal_value', objectId: 'mon_deals', name: 'deal_value', type: 'currency', sample: '$52,000' },
  { id: 'mon_deal_owner', objectId: 'mon_deals', name: 'owner', type: 'string', sample: 'Marcus Lin' },
  { id: 'mon_deal_stage', objectId: 'mon_deals', name: 'status', type: 'string', sample: 'Won' },
  // Monday · Accounts Board
  { id: 'mon_acc_name', objectId: 'mon_accounts', name: 'account_name', type: 'string', sample: 'Acme Co' },
  { id: 'mon_acc_owner', objectId: 'mon_accounts', name: 'account_owner', type: 'string', sample: 'Anita Serrano' },
  // HubSpot · Deals
  { id: 'hs_deal_close', objectId: 'hs_deals', name: 'closedate', type: 'date', sample: '2026-05-28' },
  { id: 'hs_deal_amount', objectId: 'hs_deals', name: 'amount', type: 'currency', sample: '$61,500' },
  { id: 'hs_deal_owner', objectId: 'hs_deals', name: 'hubspot_owner_id', type: 'string', sample: '51299204' },
  { id: 'hs_deal_stage', objectId: 'hs_deals', name: 'dealstage', type: 'string', sample: 'closedwon' },
  // HubSpot · Line Items
  { id: 'hs_line_amount', objectId: 'hs_line_items', name: 'amount', type: 'currency', sample: '$12,000' },
  { id: 'hs_line_qty', objectId: 'hs_line_items', name: 'quantity', type: 'number', sample: '3' },
  // NetSuite · Invoices
  { id: 'ns_inv_date', objectId: 'ns_invoice', name: 'trandate', type: 'date', sample: '2026-07-01' },
  { id: 'ns_inv_total', objectId: 'ns_invoice', name: 'total', type: 'currency', sample: '$74,900' },
  { id: 'ns_inv_rep', objectId: 'ns_invoice', name: 'salesrep', type: 'string', sample: 'E-2049' },
]

// Which Topcon target fields are relevant per object, so mapping only shows what fits.
export const OBJECT_TARGETS: Record<string, string[]> = {
  sf_opportunity: ['t_close_date', 't_amount', 't_arr', 't_stage', 't_deal_type', 't_owner', 't_position'],
  sf_invoice: ['t_close_date', 't_amount', 't_owner'],
  sf_account: ['t_owner', 't_position'],
  sf_renewal: ['t_close_date', 't_arr', 't_owner'],
  mon_deals: ['t_close_date', 't_amount', 't_stage', 't_owner', 't_position'],
  mon_accounts: ['t_owner', 't_position'],
  hs_deals: ['t_close_date', 't_amount', 't_stage', 't_owner', 't_position'],
  hs_line_items: ['t_amount'],
  ns_invoice: ['t_close_date', 't_amount', 't_owner'],
}

export const TARGET_FIELDS: TargetField[] = [
  { id: 't_close_date', name: 'Deal Close Date', section: 'deals', type: 'date', required: true, description: 'Date the deal is recognized for commissions.' },
  { id: 't_amount', name: 'Booking Amount', section: 'deals', type: 'currency', required: true, description: 'Total booking value used as the base for payout.' },
  { id: 't_arr', name: 'Annual Recurring Revenue', section: 'deals', type: 'currency', required: false, description: 'ARR component for recurring-based plans.' },
  { id: 't_stage', name: 'Deal Stage', section: 'deals', type: 'string', required: false, description: 'Stage filter for eligibility rules.' },
  { id: 't_deal_type', name: 'Deal Type', section: 'deals', type: 'string', required: false, description: 'New vs. expansion classification.' },
  { id: 't_owner', name: 'Rep Owner', section: 'profile', type: 'string', required: true, description: 'The rep credited for the deal.' },
  { id: 't_position', name: 'Rep Position', section: 'positions', type: 'string', required: false, description: 'The position the credited rep holds.' },
]

/** Suggested source field per target, keyed by objectId then targetId. */
export const SUGGESTED_MAPPING: Record<string, Record<string, string>> = {
  sf_opportunity: {
    t_close_date: 'sf_opp_close',
    t_amount: 'sf_opp_amount',
    t_arr: 'sf_opp_arr',
    t_owner: 'sf_opp_owner',
    t_stage: 'sf_opp_stage',
    t_deal_type: 'sf_opp_type',
  },
  mon_deals: {
    t_close_date: 'mon_deal_close',
    t_amount: 'mon_deal_value',
    t_owner: 'mon_deal_owner',
    t_stage: 'mon_deal_stage',
  },
  hs_deals: {
    t_close_date: 'hs_deal_close',
    t_amount: 'hs_deal_amount',
    t_owner: 'hs_deal_owner',
    t_stage: 'hs_deal_stage',
  },
  ns_invoice: {
    t_close_date: 'ns_inv_date',
    t_amount: 'ns_inv_total',
    t_owner: 'ns_inv_rep',
  },
}

export const FIELD_TYPE_LABEL: Record<FieldType, string> = {
  string: 'Text',
  number: 'Number',
  currency: 'Currency',
  date: 'Date',
  boolean: 'Boolean',
}
