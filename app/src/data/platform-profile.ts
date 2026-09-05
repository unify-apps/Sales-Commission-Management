import type { EmployeeStatus, Profile, RoleType } from './org-seed'
import type { ProfileRow } from './use-profiles'

/**
 * Turns a platform row into the `Profile` shape the detail screen renders.
 *
 * The screen shows more than `ICM | List Profiles` returns — plan, quota, salary,
 * currency, team, company and office have no ICM callable behind them, because
 * the org callables carry no money by design. Rather than drop those panels, the
 * gaps are FILLED from the placeholders below, so the page keeps every section it
 * has always had.
 *
 * Everything in PLACEHOLDER is invented. Nothing else here is: every other field
 * comes off the row. Keeping the two apart in one place is what stops a made-up
 * salary being mistaken for a real one — when a callable starts returning any of
 * these, delete the line and read the row instead.
 */
const PLACEHOLDER = {
  businessGroup: 'Global Sales',
  planName: 'FY27 Standard Sales Plan',
  personalTarget: 120000,
  salary: 150000,
  paymentCurrency: 'USD',
  personalCurrency: 'USD',
  team: 'Field Sales',
  officeLocation: 'Remote',
  commissionEligible: true,
  company: 'Topcon',
} as const

const STATUS: Record<string, EmployeeStatus> = {
  ACTIVE: 'Active',
  TERMINATED: 'Terminated',
  'ON LEAVE': 'On Leave',
}

/** Manager vs individual is read off the title — the callable has no role field. */
function roleTypeFor(titleName: string): RoleType {
  return /manager|vp|director|head/i.test(titleName) ? 'Manager' : 'Individual Payee'
}

/** Epoch millis (the store's own type) to the ISO string `Profile` holds. */
const isoOrNull = (epoch: number | null) =>
  epoch == null ? null : new Date(epoch).toISOString()

export function platformRowToProfile(row: ProfileRow): Profile {
  return {
    ...PLACEHOLDER,
    // ——— real, from the platform ———
    id: row.employeeId,
    employeeId: row.employeeId,
    personName: row.name,
    email: row.email,
    title: row.titleName,
    region: row.territoryName,
    status: STATUS[row.status] ?? (row.status as EmployeeStatus),
    roleType: roleTypeFor(row.titleName),
    manager: row.managerName || null,
    position: row.positionName || row.positionCode,
    hireDate: isoOrNull(row.hireDate) ?? '',
    terminationDate: isoOrNull(row.terminationDate),
  }
}
