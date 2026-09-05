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
