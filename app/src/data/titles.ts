// Titles — read and write through `ICM | Manage Titles`, one callable behind all three
// verbs. The page never touches the `Title` object directly: authorization lives in the
// automation, and a screen that reaches around it for the easy case will reach around
// it for the hard one.
//
// Contract: `ua-icm/docs/automations/manage-titles.md`.

import { useMemo } from 'react'
import { useData, useCallableMutation } from '@/lib/data'
import { MANAGE_TITLES, titleArgs } from './callables'

/** One row of the automation's `titles[]`. Field names are the automation's, not the UI's. */
export interface TitleRecord {
  titleId: string
  titleCode: string
  name: string
  description: string
  category: string
  level: string
  market: string
  function: string
  payPeriod: string
}

/**
 * Every status the automation can answer. A refused write arrives as a healthy HTTP
 * 200 carrying one of these, so callers branch on `status` and never on the transport.
 */
export type TitleStatus =
  | 'OK'
  | 'CREATED'
  | 'UPDATED'
  | 'DUPLICATE_TITLE_CODE'
  | 'NOT_FOUND'
  | 'INVALID_INPUT'

export interface TitleWriteResult {
  status: TitleStatus
  success: boolean
  message: string
  title?: TitleRecord
}

/** The editable half of a title — everything except its platform id. */
export type TitleDraft = Omit<TitleRecord, 'titleId'>

export const EMPTY_DRAFT: TitleDraft = {
  titleCode: '',
  name: '',
  description: '',
  category: '',
  level: '',
  market: '',
  function: '',
  payPeriod: '',
}

/**
 * The title list. `search` is passed to the automation, which matches titleCode OR name
 * OR description case-insensitively SERVER-SIDE — filtering here instead would break
 * `total` and paging.
 */
export function useTitles(search: string) {
  const parameters = useMemo(
    () => titleArgs({ action: 'LIST', search, limit: '200' }),
    [search],
  )
  return useData<TitleRecord[]>('org-titles', 'callable', {
    binding: MANAGE_TITLES,
    parameters,
    recordsPath: 'titles',
  })
}

/**
 * Create and update. Both return the automation's status rather than throwing — a
 * duplicate titleCode is a normal outcome the form has to show, not an exception.
 */
export function useTitleWrites() {
  const { run, pending } = useCallableMutation(MANAGE_TITLES)

  const asResult = (response: Record<string, unknown>): TitleWriteResult => ({
    status: (response.status as TitleStatus) ?? 'INVALID_INPUT',
    success: response.success === true,
    message: typeof response.message === 'string' ? response.message : '',
    title: (response.title as TitleRecord | undefined) ?? undefined,
  })

  return {
    pending,
    createTitle: async (draft: TitleDraft) =>
      asResult(await run(titleArgs({ action: 'CREATE', ...draft }))),
    // On UPDATE a blank optional field CLEARS it and a blank required field leaves it
    // alone — the form posts every field, so a blank Description is a user emptying
    // the box. See the automation's spec.
    updateTitle: async (titleId: string, draft: TitleDraft) =>
      asResult(await run(titleArgs({ action: 'UPDATE', titleId, ...draft }))),
  }
}
