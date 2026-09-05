import type { ReactNode } from 'react'
import { Download, Filter, Plus, Search, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'

interface ListToolbarProps {
  searchValue: string
  onSearchChange: (value: string) => void
  searchPlaceholder?: string
  onCreate?: () => void
  createLabel?: string
  extra?: ReactNode
  showUpload?: boolean
  /**
   * The built-in Filter button is a placeholder that only toasts. A page that
   * implements real filtering passes false and renders its own in `extra`, so the
   * two never sit side by side. Defaults true, so pages without filters are
   * unaffected.
   */
  showFilter?: boolean
}

export function ListToolbar({
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search…',
  onCreate,
  createLabel = 'Create',
  extra,
  showUpload = true,
  showFilter = true,
}: ListToolbarProps) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2" data-test-id="list-toolbar">
      <div className="relative min-w-[240px] flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          className="h-9 pl-9"
          data-test-id="list-toolbar-search"
        />
      </div>
      {extra}
      {showFilter ? (
        <Button
          variant="outline"
          size="sm"
          className="h-9"
          onClick={() => toast('Filters', { description: 'Column & attribute filters open here.' })}
          data-test-id="list-toolbar-filter"
        >
          <Filter className="size-4" />
          Filter
        </Button>
      ) : null}
      <Button
        variant="outline"
        size="sm"
        className="h-9"
        onClick={() => toast('Export started', { description: 'Your list is being prepared for download.' })}
        data-test-id="list-toolbar-download"
      >
        <Download className="size-4" />
        Download
      </Button>
      {showUpload ? (
        <Button
          variant="outline"
          size="sm"
          className="h-9"
          onClick={() => toast('Upload', { description: 'Bulk upload via CSV/HRIS template.' })}
          data-test-id="list-toolbar-upload"
        >
          <Upload className="size-4" />
          Upload
        </Button>
      ) : null}
      {onCreate ? (
        <Button size="sm" className="h-9" onClick={onCreate} data-test-id="list-toolbar-create">
          <Plus className="size-4" />
          {createLabel}
        </Button>
      ) : null}
    </div>
  )
}
