import { PageHeader } from '@/components/org/page-header'
import { WorkforceDashboard } from '@/components/org/workforce-dashboard'

export default function Home() {
  return (
    <div data-test-id="home-page">
      <PageHeader
        eyebrow="myHome"
        title="Welcome back, Anita"
        subtitle="Your workforce at a glance — headcount, coverage, and target across every payee."
        meta="FY27 · FEB-2026"
      />
      <WorkforceDashboard />
    </div>
  )
}
