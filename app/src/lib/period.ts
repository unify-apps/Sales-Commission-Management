// Single source of truth for the app's active fiscal period.
// Every screen reads from here so periods stay coherent across the product.
// The fiscal year starts in FEB; FY27 runs FEB-2026 → JAN-2027.

export const FISCAL_YEAR = 'FY27'

/** The processing month currently open. */
export const CURRENT_MONTH = 'FEB-2026'
export const PREVIOUS_MONTH = 'JAN-2026'

/** The fiscal year expressed as a YEAR-XXXX period key (matches seed period fields). */
export const CURRENT_YEAR_PERIOD = 'YEAR-2026'

/** Human-friendly label shown in chrome, e.g. the sidebar footer. */
export const PERIOD_LABEL = `${FISCAL_YEAR} · ${CURRENT_MONTH}`

/** Version stamp for plan artifacts created in the current fiscal year. */
export const CURRENT_VERSION = `${FISCAL_YEAR} v1`

/** Newest → oldest year periods offered in period pickers. */
export const YEAR_PERIODS = ['YEAR-2026', 'YEAR-2025', 'YEAR-2024', 'YEAR-2023'] as const
export type YearPeriod = (typeof YEAR_PERIODS)[number]

/** Newest → oldest month periods offered in period pickers. */
export const MONTH_PERIODS = ['FEB-2026', 'JAN-2026', 'DEC-2025'] as const
export type MonthPeriod = (typeof MONTH_PERIODS)[number]

const MONTH_INDEX: Record<string, number> = {
  JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5,
  JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11,
}

/**
 * A `MON-YYYY` period as the `YYYY-MM-DD` as-of date backend reads expect.
 *
 * Resolves to the period's LAST day, because these reads answer "who held this
 * seat for this period" and a comp period is judged at its close — an assignment
 * that began mid-month still owns the period. Using the first day instead would
 * report the outgoing holder for every mid-month move.
 *
 * Returns '' for anything unparseable, which every caller treats as "no date
 * given" rather than guessing a wrong one.
 */
export function periodToAsOfDate(period: string): string {
  const [mon, year] = period.split('-')
  const monthIndex = MONTH_INDEX[mon?.toUpperCase() ?? '']
  const y = Number(year)
  if (monthIndex === undefined || !Number.isInteger(y)) return ''
  // Day 0 of the NEXT month is the last day of this one, leap years included.
  const lastDay = new Date(Date.UTC(y, monthIndex + 1, 0)).getUTCDate()
  return `${y}-${String(monthIndex + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
}
