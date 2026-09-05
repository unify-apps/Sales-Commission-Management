import { PageHeader } from '@/components/org/page-header'

// Throwaway probe page. It exists only to check that a change committed in a
// clone and pushed to GitHub reaches the app in the builder. Carries no product
// meaning and is safe to delete once that round trip is proven.
export default function Mongoose() {
  return (
    <div data-test-id="mongoose-page">
      <PageHeader
        eyebrow="Test"
        title="MONGOOSE"
        subtitle="Round-trip probe — pushed from a local clone, not written in the builder."
      />

      <p className="text-4xl font-semibold tracking-tight text-foreground">MONGOOSE</p>
    </div>
  )
}
