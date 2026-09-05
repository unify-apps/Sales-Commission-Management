import { ChevronLeft, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

interface ListPaginationProps {
  showingFrom: number
  showingTo: number
  total: number
  pages?: number
  testId?: string
  /**
   * Real paging. Pass `page` (1-based) together with `onPageChange` and the
   * control drives an actual query; omit them and it keeps its original
   * display-only behaviour, so the pages still on seed data are unaffected.
   */
  page?: number
  pageCount?: number
  onPageChange?: (page: number) => void
  /** Disables the controls while a page is in flight, so a fast click cannot double-fire. */
  busy?: boolean
}

export function ListPagination({
  showingFrom,
  showingTo,
  total,
  pages = 5,
  testId = 'pagination',
  page,
  pageCount,
  onPageChange,
  busy = false,
}: ListPaginationProps) {
  const isLive = typeof page === 'number' && typeof onPageChange === 'function'
  const lastPage = Math.max(1, pageCount ?? pages)
  // A live pager only offers pages that exist; the display-only one keeps its
  // fixed run of numbers.
  const pageNumbers = isLive
    ? Array.from({ length: Math.min(lastPage, pages) }, (_, i) => i + 1)
    : Array.from({ length: pages }, (_, i) => i + 1)

  const current = isLive ? (page as number) : 1
  const canPrev = isLive && current > 1 && !busy
  const canNext = isLive && current < lastPage && !busy

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
          disabled={!canPrev}
          onClick={() => canPrev && onPageChange?.(current - 1)}
          aria-label="Previous page"
          data-test-id={`${testId}-prev`}
        >
          <ChevronLeft className="size-4" />
        </Button>
        {pageNumbers.map((p) => (
          <Button
            key={p}
            variant={p === current ? 'secondary' : 'ghost'}
            size="icon"
            className="size-8 font-mono text-[13px]"
            disabled={busy}
            aria-current={isLive && p === current ? 'page' : undefined}
            onClick={() =>
              isLive
                ? onPageChange?.(p)
                : toast('Page', { description: `Loading page ${p}.` })
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
          disabled={isLive ? !canNext : false}
          onClick={() =>
            isLive
              ? canNext && onPageChange?.(current + 1)
              : toast('Page', { description: 'Loading next page.' })
          }
          aria-label="Next page"
          data-test-id={`${testId}-next`}
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  )
}
