// Rep-facing derived data: resolve the signed-in rep persona to their statement,
// and shape the quarterly numbers into the summaries the Incentives and Graphs
// screens render.
import { STATEMENTS, makeEmptyStatement, type Statement, type QuarterValues } from '@/data/statement-seed'
import { REP_PERSONA } from '@/lib/persona'

const QK = ['q1', 'q2', 'q3', 'q4'] as const

export function repStatement(): Statement {
  const found = STATEMENTS.find((s) => s.profileId === REP_PERSONA.profileId)
  return found ?? makeEmptyStatement(REP_PERSONA.profileId ?? 'rep', REP_PERSONA.name, REP_PERSONA.employeeId ?? '—', 'USD')
}

export const sumQuarters = (v: QuarterValues): number => v.q1 + v.q2 + v.q3 + v.q4

export interface PeriodPoint {
  period: string
  value: number
}

/** Map a quarterly row onto the four fiscal quarters for a bar/line chart. */
export function toQuarterSeries(values: QuarterValues, year: string): PeriodPoint[] {
  const yr = year.replace('YEAR-', '')
  return QK.map((k, i) => ({ period: `Q${i + 1}-${yr}`, value: values[k] }))
}
