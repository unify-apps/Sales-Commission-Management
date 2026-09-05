import type { Rule } from '@/data/plan-seed'

/** The minimal shape the Simulator models against — derived from a payout Rule. */
export interface SimRule {
  id: string
  name: string
  resultName: string
  creditFormula: string
  rateType: string
  rate: number
  minimum: number | null
  maximum: number | null
}

// A payout Rule carries no explicit rate, so give the Simulator a sensible default per rule type.
const DEFAULT_RATE_BY_TYPE: Record<string, number> = {
  Commission: 8,
  Bonus: 5,
  'Direct Credit': 10,
}
const FALLBACK_RATE = 8

/** Adapt a payout Rule into the shape the Simulator can model. */
export function toSimRule(rule: Rule): SimRule {
  const result = rule.results[0]
  return {
    id: rule.id,
    name: rule.name,
    resultName: result?.name ?? rule.name,
    creditFormula: result?.value ?? 'Credit.Amount',
    rateType: rule.ruleType,
    rate: DEFAULT_RATE_BY_TYPE[rule.ruleType] ?? FALLBACK_RATE,
    minimum: null,
    maximum: null,
  }
}

/** Apply a rule's min/max caps to a raw payout. */
export function applyCaps(value: number, rule: SimRule): number {
  let v = value
  if (rule.minimum != null) v = Math.max(v, rule.minimum)
  if (rule.maximum != null) v = Math.min(v, rule.maximum)
  return v
}

/**
 * Model a payout for a credit amount at a given rate (%), then cap it.
 * A Bonus rule gets a light kicker so rule types differ visibly.
 */
export function modelPayout(credit: number, ratePct: number, rule: SimRule): number {
  const base = credit * (ratePct / 100)
  const factor = rule.rateType === 'Bonus' ? 1.15 : rule.rateType === 'Commission' ? 1.08 : 1
  return applyCaps(base * factor, rule)
}

export interface CurvePoint {
  credit: number
  current: number
  proposed: number
}

/** Build a payout curve across a range of credit values for current vs proposed rate. */
export function buildCurve(rule: SimRule, proposedRate: number, maxCredit: number): CurvePoint[] {
  const STEPS = 8
  const step = maxCredit / STEPS
  return Array.from({ length: STEPS + 1 }, (_, i) => {
    const credit = Math.round(step * i)
    return {
      credit,
      current: Math.round(modelPayout(credit, rule.rate, rule)),
      proposed: Math.round(modelPayout(credit, proposedRate, rule)),
    }
  })
}
