import { useData } from '@/lib/data'
import { STATEMENTS, type Statement } from '@/data/statement-seed'
import { repStatement } from '@/data/rep'
import { PageHeader } from '@/components/org/page-header'
import { ProfilePerformance } from '@/components/org/profile-performance'

// A realistic base commission rate; the bookings quota is derived so that hitting
// it exactly pays the statement's variable target (quota = targetPay / rate).
const BASE_RATE = 0.08

export default function RepPerformance() {
  const { data: statements } = useData<Statement[]>('rep-statements', 'seed', STATEMENTS)

  const fallback = repStatement()
  const statement = (statements ?? []).find((s) => s.profileId === fallback.profileId) ?? fallback

  // The target commission at 100% comes from the statement's variable target;
  // the bookings quota is what you must book to earn it at the base rate.
  const targetPay = statement.targetVariable
  const annualQuota = Math.round(targetPay / BASE_RATE / 1000) * 1000

  return (
    <div data-test-id="rep-performance-page">
      <PageHeader
        eyebrow="My Incentives"
        title="Performance"
        subtitle={`How you're tracking against plan for ${statement.year}.`}
      />
      <ProfilePerformance annualQuota={annualQuota} targetPay={targetPay} currency={statement.currency} />
    </div>
  )
}
