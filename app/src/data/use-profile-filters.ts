import { useMemo } from 'react'
import { useExecuteWorkflowNode } from '@unifyapps/app-builder-sdk/hooks/workflow'

import { LIST_TITLES, extractCallable, internals } from './callables'
import { useProfiles } from './use-profiles'

export interface FilterOption {
  id: string
  label: string
}

/**
 * How many profiles the option query reads to discover the territories and
 * managers actually in use. There is no territory or manager LOOKUP callable, so
 * the options are derived from real rows instead — and this cap is the honest
 * limit of that: past this many payees, a territory used only by later rows would
 * not be offered. A dedicated list callable for each is the real fix.
 */
const OPTION_SCAN_LIMIT = 200

interface TitleRow {
  titleId: string
  titleCode: string
  name: string
}

interface ListTitlesResult {
  status: string
  titles: TitleRow[]
}

export interface ProfileFilterOptions {
  titles: FilterOption[]
  territories: FilterOption[]
  managers: FilterOption[]
  loading: boolean
  /** True when the option scan hit its cap, so the lists may be incomplete. */
  truncated: boolean
}

const EMPTY: FilterOption[] = []

/** Sorted by label, so a picker is scannable rather than in store order. */
function byLabel(a: FilterOption, b: FilterOption) {
  return a.label.localeCompare(b.label)
}

/**
 * The option lists behind the Profiles filter panel.
 *
 * Titles come from a real reference callable. Territories and managers are
 * distinct values taken from the profiles themselves, because no lookup callable
 * exists for either — see OPTION_SCAN_LIMIT for what that costs.
 */
export function useProfileFilterOptions(asOfDate: string): ProfileFilterOptions {
  const titlesQuery = useExecuteWorkflowNode(
    {
      id: LIST_TITLES.id,
      context: LIST_TITLES.context,
      inputs: {
        ...LIST_TITLES.storedInputs,
        parameters: {
          ...LIST_TITLES.storedInputs.parameters,
          action: 'LIST',
          titleId: '',
          titleCode: '',
          name: '',
          description: '',
          category: '',
          level: '',
          market: '',
          function: '',
          payPeriod: '',
          search: '',
          limit: '200',
          offset: '0',
          __internals__: internals(),
        },
      },
    },
    { query: { enabled: Boolean(LIST_TITLES.id) } },
  )

  const titles = useMemo(() => {
    if (!titlesQuery.data) return EMPTY
    try {
      const result = extractCallable<ListTitlesResult>(titlesQuery.data)
      return (result.titles ?? [])
        .map((t) => ({ id: t.titleId, label: t.name || t.titleCode }))
        .filter((t) => t.id && t.label)
        .sort(byLabel)
    } catch {
      // A filter that cannot offer options is a smaller failure than a page that
      // will not render, so this degrades to "no options" rather than throwing.
      return EMPTY
    }
  }, [titlesQuery.data])

  // One unfiltered read at the same as-of date the table is showing — territory and
  // manager are effective-dated, so options taken from a different date would offer
  // choices that match nothing.
  const scan = useProfiles({ asOfDate, limit: OPTION_SCAN_LIMIT, offset: 0 })

  const { territories, managers } = useMemo(() => {
    const terr = new Map<string, string>()
    const mgr = new Map<string, string>()
    for (const row of scan.rows) {
      if (row.territoryId && row.territoryName) terr.set(row.territoryId, row.territoryName)
      // keyed by the POSITION, which is what the callable filters on — two people
      // can hold the manager seat over a year and it is still one filter choice
      if (row.managerPositionId && row.managerName) mgr.set(row.managerPositionId, row.managerName)
    }
    const toOptions = (m: Map<string, string>) =>
      [...m.entries()].map(([id, label]) => ({ id, label })).sort(byLabel)
    return { territories: toOptions(terr), managers: toOptions(mgr) }
  }, [scan.rows])

  return {
    titles,
    territories,
    managers,
    loading: (titlesQuery.isLoading ?? false) || scan.loading,
    truncated: scan.total > OPTION_SCAN_LIMIT,
  }
}
