// UI-neutral Document presentation semantics (P08D-T02). One shared
// implementation owns the Document lifecycle/action surface — operation
// identity, default accessible label, and canonical route target — driven
// only by the authorized DocumentPageModel plus the presence of the route's
// server-action bridges. No placement, no styles, no lifecycle logic in any
// Design. Link actions carry their canonical href; workflow/delete actions are
// form-based and appear only when the matching bridge is supplied.
//
// Order is the canonical action order Designs compose (Civic splits
// supersede/delete into its bottom bar by filtering this list).
import type { DocumentPageModel } from '@/lib/page-models/document'

export type DocumentActionKey =
  | 'edit'
  | 'history'
  | 'submit'
  | 'file'
  | 'approve'
  | 'deprecate'
  | 'restore'
  | 'lock'
  | 'unlock'
  | 'supersede'
  | 'delete'

export type DocumentActionDescriptor = {
  operation: DocumentActionKey
  /** Default accessible label. A Design may restyle or re-label presentation. */
  label: string
  /** Canonical link target for link actions; null for form actions. */
  href: string | null
}

export const DOCUMENT_ACTION_LABELS: Record<DocumentActionKey, string> = {
  edit: 'Edit',
  history: 'History',
  submit: 'Submit for review',
  file: 'File now',
  approve: 'Approve',
  deprecate: 'Deprecate',
  restore: 'Restore',
  lock: 'Lock',
  unlock: 'Unlock',
  supersede: 'Supersede',
  delete: 'Delete',
}

export type DocumentActionBridges = {
  /** Route-provided server action for lifecycle transitions. */
  workflow?: boolean
  /** Route-provided server action for deletion. */
  delete?: boolean
}

export function getDocumentActions(model: DocumentPageModel, bridges: DocumentActionBridges = {}): DocumentActionDescriptor[] {
  const { capabilities: can, lifecycle, locked, isSuperseded, routes } = model
  const hasWorkflow = bridges.workflow === true
  const hasDelete = bridges.delete === true
  const out: DocumentActionDescriptor[] = []

  if (can.edit && !isSuperseded && routes.editUrl) out.push({ operation: 'edit', label: DOCUMENT_ACTION_LABELS.edit, href: routes.editUrl })
  if (routes.historyUrl) out.push({ operation: 'history', label: DOCUMENT_ACTION_LABELS.history, href: routes.historyUrl })
  if (can.supersede && !isSuperseded && routes.supersedeUrl) out.push({ operation: 'supersede', label: DOCUMENT_ACTION_LABELS.supersede, href: routes.supersedeUrl })
  if (lifecycle === 'draft' && can.submit && hasWorkflow) out.push({ operation: 'submit', label: DOCUMENT_ACTION_LABELS.submit, href: null })
  if (lifecycle === 'draft' && can.file && hasWorkflow) out.push({ operation: 'file', label: DOCUMENT_ACTION_LABELS.file, href: null })
  if (lifecycle === 'submitted' && can.approve && hasWorkflow) out.push({ operation: 'approve', label: DOCUMENT_ACTION_LABELS.approve, href: null })
  if (lifecycle === 'filed' && can.deprecate && hasWorkflow) out.push({ operation: 'deprecate', label: DOCUMENT_ACTION_LABELS.deprecate, href: null })
  if (lifecycle === 'deprecated' && can.restore && hasWorkflow) out.push({ operation: 'restore', label: DOCUMENT_ACTION_LABELS.restore, href: null })
  if (can.lock && !locked && !isSuperseded && hasWorkflow) out.push({ operation: 'lock', label: DOCUMENT_ACTION_LABELS.lock, href: null })
  if (can.unlock && locked && !isSuperseded && hasWorkflow) out.push({ operation: 'unlock', label: DOCUMENT_ACTION_LABELS.unlock, href: null })
  if (can.delete && hasDelete) out.push({ operation: 'delete', label: DOCUMENT_ACTION_LABELS.delete, href: null })

  return out
}