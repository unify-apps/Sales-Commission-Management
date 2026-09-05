import { ChevronLeft, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

interface ListPaginationProps {
  showingFrom: number
  showingTo: number
  total: number
  pages?: number
  testId?: string
}

export function ListPagination({
  showingFrom,
  showingTo,
  total,
  pages = 5,
  testId = 'pagination',
}: ListPaginationProps) {
  const pageNumbers = Array.from({ length: pages }, (_, i) => i + 1)
  return (
    <div className="flex items-center justify-between border-t border-border px-5 py-3" data-test-id={testId}>
      <span className="text-sm text-muted-foreground">
        Showing {showingFrom} – {showingTo} of {total.toLocaleString()}
      </span>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" className="size-8" disabled aria-label="Previous page">
          <ChevronLeft className="size-4" />
        </Button>
        {pageNumbers.map((p) => (
          <Button
            key={p}
            variant={p === 1 ? 'secondary' : 'ghost'}
            size="icon"
            className="size-8 font-mono text-[13px]"
            onClick={() => toast('Page', { description: `Loading page ${p}.` })}
            data-test-id={`${testId}-page-${p}`}
          >
            {p}
          </Button>
        ))}
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={() => toast('Page', { description: 'Loading next page.' })}
          aria-label="Next page"
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  )
}
