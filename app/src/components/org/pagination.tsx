import { ChevronLeft, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

interface ListPaginationProps {
  showingFrom: number
  showingTo: number
  total: number
  /** How many page buttons to show at once. */
  pages?: number
  /**
   * 1-based current page. Supply it WITH `onPageChange` to get real pagination:
   * the buttons then move through `pageCount` pages and the arrows disable at
   * the ends. Without a handler the control stays the placeholder it has always
   * been, so the screens still on seed data are unchanged.
   */
  page?: number
  pageCount?: number
  onPageChange?: (page: number) => void
  testId?: string
}

export function ListPagination({
  showingFrom,
  showingTo,
  total,
  pages = 5,
  page,
  pageCount,
  onPageChange,
  testId = 'pagination',
}: ListPaginationProps) {
  const live = typeof onPageChange === 'function'
  const current = page ?? 1
  const last = Math.max(1, pageCount ?? pages)
  // Window the buttons around the current page so page 40 of 60 is reachable
  // without rendering sixty of them.
  const first = Math.max(1, Math.min(current - Math.floor(pages / 2), last - pages + 1))
  const pageNumbers = Array.from({ length: Math.min(pages, last) }, (_, i) => first + i)
  return (
    <div className="flex items-center justify-between border-t border-border px-5 py-3" data-test-id={testId}>
      <span className="text-sm text-muted-foreground">
        Showing {showingFrom} – {showingTo} of {total.toLocaleString()}
      </span>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          disabled={!live || current <= 1}
          onClick={live ? () => onPageChange(current - 1) : undefined}
          data-test-id={`${testId}-prev`}
          aria-label="Previous page"
        >
          <ChevronLeft className="size-4" />
        </Button>
        {pageNumbers.map((p) => (
          <Button
            key={p}
            variant={p === current ? 'secondary' : 'ghost'}
            size="icon"
            className="size-8 font-mono text-[13px]"
            aria-current={p === current ? 'page' : undefined}
            onClick={
              live ? () => onPageChange(p) : () => toast('Page', { description: `Loading page ${p}.` })
            }
            data-test-id={`${testId}-page-${p}`}
          >
            {p}
          </Button>
        ))}
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          disabled={live && current >= last}
          onClick={
            live ? () => onPageChange(current + 1) : () => toast('Page', { description: 'Loading next page.' })
          }
          data-test-id={`${testId}-next`}
          aria-label="Next page"
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  )
}
