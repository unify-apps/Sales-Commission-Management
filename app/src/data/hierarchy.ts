import { useMemo } from 'react'
import { useData } from '@/lib/data'
import { LIST_POSITION_HIERARCHY, type PositionHierarchyRow } from './bindings'
import { HIERARCHY, type HierarchyRow } from './org-seed'

// The version picker is a label; the store has no version column. PositionHierarchy
// carries only effectiveStart/effectiveEnd, so a "version" is really a DATE and the
// callable is asked for the relationships in force on it. Each label from
// HIERARCHY_VERSIONS maps to the first day of the month it names.
//
// The 2025 versions predate every stored relationship (the earliest starts
// 2026-01-01), so they legitimately answer with nothing — that is history being
// empty, not a failed read, and the page's own empty state says so.
const VERSION_AS_OF: Record<string, string> = {
  'FY27-ChargePoint FEB-2026': '2026-02-01',
  'FY26-ChargePoint JAN-2026': '2026-01-01',
  'FY26-ChargePoint DEC-2025': '2025-12-01',
  'FY26-ChargePoint NOV-2025': '2025-11-01',
}

export function asOfDateFor(versionName: string): string {
  return VERSION_AS_OF[versionName] ?? new Date().toISOString().slice(0, 10)
}

// The callable answers with '' for anything it could not resolve — a vacant seat, a
// contested date, a payee record that no longer exists. The page renders null as
// "Open seat" and '—', so the empty strings become null exactly once, here, rather
// than every component having to know the convention.
const orNull = (value: string | undefined) => (value ? value : null)

function toHierarchyRow(row: PositionHierarchyRow): HierarchyRow {
  return {
    id: row.id,
    versionName: row.versionName,
    effectiveStart: row.effectiveStart,
    positionName: row.positionName,
    person: orNull(row.person),
    parentPosition: orNull(row.parentPosition),
    parentPerson: orNull(row.parentPerson),
  }
}

/**
 * The reporting structure for one version, from `ICM | List Position Hierarchy`.
 *
 * The callable returns the root as a row of its own even though the store cannot
 * hold one — PositionHierarchy requires a parent, so the top of the tree has no
 * record. Without it every second-level manager would come back as a separate root
 * and the tree would lose its head.
 */
export function useHierarchy(versionName: string) {
  const asOfDate = asOfDateFor(versionName)

  const parameters = useMemo(
    () => ({ asOfDate, versionName, search: '', limit: '', offset: '' }),
    [asOfDate, versionName],
  )

  const result = useData<PositionHierarchyRow[]>('org-hierarchy', 'callable', {
    binding: LIST_POSITION_HIERARCHY,
    parameters,
  })

  // Three outcomes, not two. A read that FAILED is not a read that came back empty,
  // and on a comp system the difference matters: this structure decides who is paid
  // on whose deals, so a page that quietly renders invented reporting lines is worse
  // than one that admits it could not load. No `status` once loading has finished
  // means the automation never answered at all.
  const failed = !result.isFallback && (Boolean(result.error) || (!result.loading && !result.status))

  const rows = useMemo<HierarchyRow[]>(() => {
    // The seed is for local development, where the binding has no dataSource id yet.
    // It is never a stand-in for a failed call against a real backend.
    if (result.isFallback) return HIERARCHY
    if (failed) return []
    return (result.data ?? []).map(toHierarchyRow)
  }, [result.isFallback, failed, result.data])

  return {
    rows,
    loading: result.loading,
    error: result.error,
    /** The read did not produce an answer. Distinct from an answer of zero rows. */
    failed,
    // A transport 200 means the automation ran, not that it worked. INVALID_INPUT
    // arrives as a healthy 200, so the caller branches on this and not on `error`.
    status: result.status,
    message: result.message,
    isFallback: result.isFallback,
    refetch: result.refetch,
  }
}
