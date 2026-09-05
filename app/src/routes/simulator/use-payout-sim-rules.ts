import { useData } from '@/lib/data'
import { RULES, type Rule } from '@/data/plan-seed'
import { usePlanRecordsStore } from '@/lib/store'
import { toSimRule, type SimRule } from './simulate'

/**
 * The payout rules the Simulator can model — the live payout rules from the Rules
 * library (seed + any created in this session), adapted to the Simulator's shape.
 */
export function usePayoutSimRules(): SimRule[] {
  const { data } = useData<Rule[]>('plan-rules', 'seed', RULES)
  const createdRules = usePlanRecordsStore((s) => s.rules)
  const payoutRules = [...createdRules, ...(data ?? [])].filter((r) => r.stage === 'payout')
  return payoutRules.map(toSimRule)
}
