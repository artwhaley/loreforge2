'use client'

import { createContext, useContext, type ReactNode } from 'react'

/**
 * Server-action bridge for record/document views (spec §14.4/§19.4).
 *
 * Design views are data-pure: they must not import server-only modules (the
 * import chain would pull `@/payload.config`, which throws outside a request
 * scope and breaks the client preview/test bundles). Server routes — which
 * are never imported into client graphs — provide the real actions here;
 * Theme Studio and tests provide inert stubs. Views render only the actions
 * the model capabilities allow AND a bridge exists for.
 */
export type RecordActionFn = (formData: FormData) => void | Promise<void>

const RecordActionsContext = createContext<{
  workflowAction: RecordActionFn | null
  deleteAction: RecordActionFn | null
}>({ workflowAction: null, deleteAction: null })

export function RecordActionsProvider({ workflowAction, deleteAction, children }: {
  workflowAction?: RecordActionFn | null
  deleteAction?: RecordActionFn | null
  children: ReactNode
}) {
  return (
    <RecordActionsContext.Provider value={{ workflowAction: workflowAction ?? null, deleteAction: deleteAction ?? null }}>
      {children}
    </RecordActionsContext.Provider>
  )
}

export function useRecordActions() {
  return useContext(RecordActionsContext)
}
