import { ChevronLeft, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

export const PAGE_SIZES = [10, 25, 50, 100] as const

interface ListPaginationProps {
  showingFrom: number
  showingTo: number
  total: number
  /** How many page buttons to draw. Ignored once `onPageChange` is supplied. */
  pages?: number
  testId?: string
  /**
   * Supply these three and the control becomes live: the buttons page a real
   * result set instead of toasting. Omitted, it behaves exactly as before, which
   * is why the pages already using it are unaffected.
   */
  page?: number
  pageCount?: number
  onPageChange?: (page: number) => void
  /** Supply both to offer a rows-per-page control. Omitted, none is drawn. */
  pageSize?: number
  onPageSizeChange?: (size: number) => void
}

/** At most `max` page numbers, always including the current one. */
function pageWindow(page: number, pageCount: number, max = 5) {
  if (pageCount <= max) return Array.from({ length: pageCount }, (_, i) => i + 1)
  const half = Math.floor(max / 2)
  const start = Math.min(Math.max(1, page - half), pageCount - max + 1)
  return Array.from({ length: max }, (_, i) => start + i)
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
  pageSize,
  onPageSizeChange,
}: ListPaginationProps) {
  const live = typeof page === 'number' && typeof pageCount === 'number' && Boolean(onPageChange)
  const current = live ? (page as number) : 1
  const count = live ? (pageCount as number) : pages
  const pageNumbers = live ? pageWindow(current, count) : Array.from({ length: pages }, (_, i) => i + 1)

  const go = (target: number) => {
    if (!live) {
      toast('Page', { description: `Loading page ${target}.` })
      return
    }
    if (target < 1 || target > count || target === current) return
    onPageChange?.(target)
  }

  const showSize = typeof pageSize === 'number' && Boolean(onPageSizeChange)

  return (
    <div className="flex items-center justify-between border-t border-border px-5 py-3" data-test-id={testId}>
      <div className="flex items-center gap-4">
        <span className="text-sm text-muted-foreground">
          Showing {showingFrom} – {showingTo} of {total.toLocaleString()}
        </span>
        {showSize ? (
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] uppercase tracking-[0.09em] text-muted-foreground">
              Rows
            </span>
            <Select
              value={String(pageSize)}
              onValueChange={(v) => onPageSizeChange?.(Number(v))}
            >
              <SelectTrigger className="h-8 w-[72px] text-[13px]" data-test-id={`${testId}-size`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZES.map((size) => (
                  <SelectItem key={size} value={String(size)}>{size}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
      </div>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          disabled={live ? current <= 1 : true}
          onClick={() => go(current - 1)}
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
            className={cn('size-8 font-mono text-[13px]')}
            onClick={() => go(p)}
            aria-current={live && p === current ? 'page' : undefined}
            data-test-id={`${testId}-page-${p}`}
          >
            {p}
          </Button>
        ))}
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          disabled={live ? current >= count : false}
          onClick={() => go(current + 1)}
          aria-label="Next page"
          data-test-id={`${testId}-next`}
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  )
}
