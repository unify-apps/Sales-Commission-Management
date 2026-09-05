export function SectionTitle({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="mb-4" data-test-id="section-title">
      <h2 className="font-heading text-xl font-normal text-foreground">{title}</h2>
      <p className="mt-0.5 text-sm text-muted-foreground">{hint}</p>
    </div>
  )
}
