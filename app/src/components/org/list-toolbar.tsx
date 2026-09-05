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
   * Real filtering. Pass a node and it replaces the Filter button entirely, so a
   * page can own the control and its panel. Omit it and the button keeps its
   * original explain-only toast, leaving the pages still on seed data untouched.
   */
  filterSlot?: ReactNode
  /**
   * Hide the built-in search box. For a page whose filter panel already owns
   * free-text matching, two inputs writing one query parameter is a bug waiting
   * to happen — only one of them can win.
   */
  showSearch?: boolean
}

export function ListToolbar({
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search…',
  onCreate,
  createLabel = 'Create',
  extra,
  showUpload = true,
  filterSlot,
  showSearch = true,
}: ListToolbarProps) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2" data-test-id="list-toolbar">
      {showSearch ? (
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
      ) : (
        <div className="flex-1" />
      )}
      {extra}
      {filterSlot ?? (
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
      )}
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
