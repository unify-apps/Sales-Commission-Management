// Positions, read live from the ICM automation suite.
//
// The page never reads the Position object directly. Authorization lives in the
// callable, so a screen that reached around it could show org structure it is not
// entitled to — `ICM | List Positions` is the only way in, and it resolves occupancy
// in bulk so a list of N positions is still one call.

import { useMemo } from 'react'
import { useExecuteWorkflowNodeMutation } from '@unifyapps/app-builder-sdk/hooks/workflow'
import { useData, type UseDataResult } from '@/lib/data'
import { CREATE_POSITION, LIST_PAYEES, LIST_TITLES, LIST_POSITIONS, internals } from './callables'

/**
 * What `ICM | List Positions` returns per row. Verified against the deployed
 * automation on tool: all nine keys are ALWAYS present, and the payee fields come
 * back as EMPTY STRINGS rather than absent when there is nobody to name. Typing them
 * optional would invite `?? fallback`, which never fires on `''`.
 */
export interface LivePosition {
  positionId: string
  positionCode: string
  /** the position's display name — the automation calls this `name`, not `positionName` */
  name: string
  active: boolean
  occupancy: 'OCCUPIED' | 'VACANT' | 'CONFLICT'
  /** '' unless exactly one assignment covered the date */
  payeeId: string
  employeeId: string
  payeeName: string
  /** assignments covering the date: 0 VACANT, 1 OCCUPIED, 2+ CONFLICT */
  matchCount: number

  // The POSITION's own effective-dated attributes, independent of who holds it — a
  // vacant seat still has a title. From the PositionAttribute row in force on the
  // as-of date, so a re-titled position does not show a stale one.
  //
  // '' when no attribute row applies, or when its titleId points at a Title that no
  // longer exists: a dangling reference degrades to an empty title rather than
  // crashing the page.
  titleName: string
  /** absent when no attribute row applies */
  attributeEffectiveStart?: number

  // The window and split of the ONE assignment that resolved this row.
  //
  // OPTIONAL, not nullable: the runtime DROPS null properties from a response rather
  // than serialising them, so "no answer" arrives as an ABSENT key. Measured against
  // the deployed automation, not assumed — a suite case asserting `null` here failed
  // with `missing`.
  //
  // Absent unless `occupancy` is 'OCCUPIED': a VACANT row has no assignment and a
  // CONFLICT row has several, and naming one would be the guess the automation
  // refuses to make. On an OCCUPIED row an absent `effectiveEnd` separately means
  // OPEN-ENDED, still held — so absence reads two ways and `occupancy` is what
  // separates them. Never render these without checking occupancy first, or a vacant
  // position gets a confident "End of Time".
  effectiveStart?: number
  effectiveEnd?: number
  allocationPct?: number
}

export interface LivePositionsQuery {
  /** matches a position code or a name, case-insensitively; '' means everything */
  search?: string
  /** stored on the row, so these two narrow SERVER-side and paging stays exact */
  positionCode?: string
  name?: string
  /**
   * Neither of these exists until the automation has resolved assignments as of
   * the date, so supplying one makes it fold every match before paging. The
   * callable bounds that scan and sets `truncated` when it bites.
   */
  personName?: string
  occupancy?: string
  /** the date occupancy is resolved as of — 'YYYY-MM-DD' or epoch millis */
  asOfDate: string
  limit?: number
  offset?: number
  /** false skips the occupancy fold entirely, for a plain list */
  includeOccupancy?: boolean
}

/**
 * `CONFLICT` is not an error: two assignments cover that date, so the automation
 * refuses to name an occupant rather than picking one. Render it as its own state —
 * collapsing it into VACANT hides a real data problem until it becomes a wrong payout.
 */
export function useLivePositions(
  query: LivePositionsQuery,
): UseDataResult<LivePosition[]> {
  // every input is sent as a string; the automation parses and validates them
  const parameters = useMemo(
    () => ({
      search: query.search ?? '',
      asOfDate: query.asOfDate,
      limit: String(query.limit ?? 50),
      offset: String(query.offset ?? 0),
      includeOccupancy: String(query.includeOccupancy ?? true),
      positionCode: query.positionCode ?? '',
      name: query.name ?? '',
      personName: query.personName ?? '',
      occupancy: query.occupancy ?? '',
    }),
    [
      query.search,
      query.asOfDate,
      query.limit,
      query.offset,
      query.includeOccupancy,
      query.positionCode,
      query.name,
      query.personName,
      query.occupancy,
    ],
  )

  return useData<LivePosition[]>('icm-live-positions', 'callable', {
    binding: LIST_POSITIONS,
    parameters,
    recordsPath: 'positions',
    enabled: Boolean(query.asOfDate),
  })
}

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

/** A pickable title, from `ICM | Manage Titles` in its LIST action. */
export interface TitleOption {
  titleId: string
  titleCode: string
  name: string
}

/** A pickable person, from `ICM | List Payees`. */
export interface PayeeOption {
  payeeId: string
  employeeId: string
  name: string
  status: string
}

/** Titles for the Create dialog's select. */
export function useTitleOptions(): UseDataResult<TitleOption[]> {
  const parameters = useMemo(
    // Manage Titles takes thirteen inputs and the stored row templates all of
    // them, so all thirteen are sent: a subset is refused outright.
    () => ({
      ...Object.fromEntries(LIST_TITLES.overridable.map((k) => [k, ''])),
      action: 'LIST',
      limit: '200',
    }),
    [],
  )
  return useData<TitleOption[]>('icm-title-options', 'callable', {
    binding: LIST_TITLES,
    parameters,
    recordsPath: 'titles',
  })
}

/**
 * People for the Create dialog's select. `activeOnly` is TRUE here on purpose —
 * a leaver must stay findable elsewhere (a position they held historically still
 * shows them), but offering one a brand-new seat is the mistake worth preventing.
 */
export function usePayeeOptions(search = ''): UseDataResult<PayeeOption[]> {
  const parameters = useMemo(
    () => ({ search, limit: '200', offset: '0', activeOnly: 'true' }),
    [search],
  )
  return useData<PayeeOption[]>('icm-payee-options', 'callable', {
    binding: LIST_PAYEES,
    parameters,
    recordsPath: 'payees',
  })
}

export interface CreatePositionInput {
  positionCode: string
  name: string
  titleId: string
  /** '' means an open seat — no assignment is written */
  payeeId?: string
  /** 'YYYY-MM-DD'; '' means today, UTC */
  effectiveStart?: string
}

export interface CreatePositionResult {
  status: 'OK' | 'INVALID_INPUT' | 'DUPLICATE_CODE' | 'TITLE_NOT_FOUND' | 'PAYEE_NOT_FOUND'
  success: boolean
  message: string
  positionId?: string
  positionCode?: string
  attributeId?: string
  assignmentId?: string
}

/**
 * Creating a position writes up to three objects — the seat, the title it
 * carries, and who holds it — so it is ONE callable rather than three writes
 * from here. Every check runs before the first write, which is why a refusal
 * comes back as a status and never as a half-made position.
 *
 * A mutation, not a query: it has side effects and must fire on submit, not as
 * soon as its inputs are non-empty.
 */
export function useCreatePosition() {
  const { mutateAsync, isPending, error, reset } = useExecuteWorkflowNodeMutation()

  const create = async (input: CreatePositionInput): Promise<CreatePositionResult> => {
    const data = await mutateAsync({
      data: {
        id: CREATE_POSITION.id,
        context: CREATE_POSITION.context,
        inputs: {
          ...CREATE_POSITION.storedInputs,
          parameters: {
            __internals__: internals(),
            positionCode: input.positionCode,
            name: input.name,
            titleId: input.titleId,
            payeeId: input.payeeId ?? '',
            effectiveStart: input.effectiveStart ?? '',
          },
        },
        options: {},
      },
    })
    // the automation's own answer IS data.response — a non-OK status is a
    // REFUSAL the dialog must show, not a thrown error
    return (data as { response?: CreatePositionResult })?.response ?? {
      status: 'INVALID_INPUT',
      success: false,
      message: 'The create automation returned nothing.',
    }
  }

  return { create, isPending, error, reset }
}
