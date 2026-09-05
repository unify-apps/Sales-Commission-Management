import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { PageHeader } from '@/components/org/page-header'
import { SimulateTab } from './Simulator'
import { usePayoutSimRules } from './use-payout-sim-rules'

export default function SimulatorHub() {
  const rules = usePayoutSimRules()
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()

  const [ruleId, setRuleId] = useState(params.get('rule') ?? rules[0]?.id ?? '')

  function handleSetRuleId(id: string) {
    setRuleId(id)
    setParams({ rule: id }, { replace: true })
  }

  return (
    <div data-test-id="simulator-hub-page">
      <PageHeader
        eyebrow="Simulator / Illustrator Modeling"
        title="Simulator"
        subtitle="Simulate plan changes before rollout — model a proposed rate against any payout rule."
      />

      <SimulateTab
        ruleId={ruleId}
        setRuleId={handleSetRuleId}
        onManageRules={() => navigate('/plan/rules?stage=payout')}
      />
    </div>
  )
}
