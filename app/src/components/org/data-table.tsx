import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'

export interface Column<T> {
  key: string
  header: string
  align?: 'left' | 'right' | 'center'
  width?: string
  cell: (row: T) => ReactNode
}

interface DataTableProps<T> {
  columns: Column<T>[]
  rows: T[]
  rowId: (row: T) => string
  onRowClick?: (row: T) => void
  loading?: boolean
  empty?: ReactNode
  testId?: string
}

const HEAD_CLASS =
  'h-9 font-mono text-[11px] font-medium uppercase tracking-[0.09em] text-muted-foreground'

export function DataTable<T>({
  columns,
  rows,
  rowId,
  onRowClick,
  loading,
  empty,
  testId = 'data-table',
}: DataTableProps<T>) {
  if (loading) {
    return (
      <div className="space-y-2 p-5" data-test-id={`${testId}-loading`}>
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    )
  }

  if (rows.length === 0 && empty) {
    return <div data-test-id={`${testId}-empty`}>{empty}</div>
  }

  return (
    <Table data-test-id={testId}>
      <TableHeader>
        <TableRow className="border-border hover:bg-transparent">
          {columns.map((c) => (
            <TableHead
              key={c.key}
              className={cn(
                HEAD_CLASS,
                'first:pl-5 last:pr-5',
                c.align === 'right' && 'text-right',
                c.align === 'center' && 'text-center',
              )}
              style={c.width ? { width: c.width } : undefined}
            >
              {c.header}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow
            key={rowId(row)}
            data-test-id={`row-${rowId(row)}`}
            onClick={onRowClick ? () => onRowClick(row) : undefined}
            className={cn('border-border', onRowClick && 'cursor-pointer')}
          >
            {columns.map((c) => (
              <TableCell
                key={c.key}
                className={cn(
                  'py-3.5 align-middle first:pl-5 last:pr-5',
                  c.align === 'right' && 'text-right',
                  c.align === 'center' && 'text-center',
                )}
              >
                {c.cell(row)}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
