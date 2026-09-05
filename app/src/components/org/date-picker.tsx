import { useState } from 'react'
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

const ISO = 'yyyy-MM-dd'
const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

/**
 * Parsed as a LOCAL date, deliberately. `new Date('2026-09-05')` is parsed as
 * UTC midnight and renders as the 4th anywhere west of Greenwich, which is how a
 * date picker ends up one day off for half the world.
 */
function fromISO(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim())
  if (!m) return null
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  return Number.isNaN(d.getTime()) ? null : d
}

/**
 * A themed replacement for `<input type="date">`, whose picker is the browser's
 * own — system blue, system font, and no relationship to this app's palette.
 * Built rather than installed: the platform owns the build and this project does
 * not add dependencies, so it composes Popover and Button over date-fns, which
 * is already here.
 */
export function DatePicker({
  value,
  onChange,
  id,
  className,
  placeholder = 'Pick a date',
  allowClear = false,
  testId,
}: {
  value: string
  onChange: (value: string) => void
  id?: string
  className?: string
  placeholder?: string
  allowClear?: boolean
  testId?: string
}) {
  const selected = fromISO(value)
  const [open, setOpen] = useState(false)
  const [month, setMonth] = useState(() => startOfMonth(selected ?? new Date()))

  // reopening on a different value should land on that value's month, not
  // wherever the user browsed to last time
  function openChange(next: boolean) {
    if (next) setMonth(startOfMonth(selected ?? new Date()))
    setOpen(next)
  }

  function pick(day: Date) {
    onChange(format(day, ISO))
    setOpen(false)
  }

  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(month)),
    end: endOfWeek(endOfMonth(month)),
  })

  return (
    <Popover open={open} onOpenChange={openChange}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          className={cn(
            'h-8 w-full justify-between px-2.5 font-normal',
            !selected && 'text-muted-foreground',
            className,
          )}
          data-test-id={testId}
        >
          <span className={cn(selected && 'font-mono text-[13px]')}>
            {selected ? format(selected, 'dd MMM yyyy') : placeholder}
          </span>
          <CalendarDays className="size-4 shrink-0 text-muted-foreground" />
        </Button>
      </PopoverTrigger>

      <PopoverContent align="start" className="w-auto p-3" data-test-id={testId ? `${testId}-panel` : undefined}>
        <div className="flex items-center justify-between pb-2">
          <span className="font-heading text-sm">{format(month, 'MMMM yyyy')}</span>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="size-7" aria-label="Previous month"
              onClick={() => setMonth(addMonths(month, -1))}>
              <ChevronLeft className="size-4" />
            </Button>
            <Button variant="ghost" size="icon" className="size-7" aria-label="Next month"
              onClick={() => setMonth(addMonths(month, 1))}>
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-0.5">
          {WEEKDAYS.map((d, i) => (
            <div key={`${d}-${i}`} className="pb-1 text-center font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              {d}
            </div>
          ))}
          {days.map((day) => {
            const outside = !isSameMonth(day, month)
            const isSelected = selected != null && isSameDay(day, selected)
            return (
              <button
                key={day.toISOString()}
                type="button"
                onClick={() => pick(day)}
                data-test-id={testId ? `${testId}-day-${format(day, ISO)}` : undefined}
                aria-current={isSelected ? 'date' : undefined}
                className={cn(
                  'size-8 rounded-md font-mono text-[13px] transition-colors',
                  'hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  outside && 'text-muted-foreground/50',
                  !outside && !isSelected && 'text-foreground',
                  // today reads as an outline so it never competes with the selection
                  isToday(day) && !isSelected && 'ring-1 ring-border font-medium',
                  isSelected && 'bg-primary text-primary-foreground hover:bg-primary',
                )}
              >
                {format(day, 'd')}
              </button>
            )
          })}
        </div>

        <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
          {allowClear ? (
            <Button variant="ghost" size="sm" onClick={() => { onChange(''); setOpen(false) }}>
              Clear
            </Button>
          ) : <span />}
          <Button variant="ghost" size="sm" onClick={() => pick(new Date())}>
            Today
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
