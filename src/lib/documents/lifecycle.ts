export type Lifecycle = 'draft' | 'submitted' | 'filed' | 'deprecated'
export type FilingPolicy = 'inherit' | 'direct-file' | 'review-required'

export function resolveFilingPolicy(input: { template?: FilingPolicy | null; folder?: FilingPolicy | null; documentType?: FilingPolicy | null; domain?: Exclude<FilingPolicy, 'inherit'> | null }): Exclude<FilingPolicy, 'inherit'> {
  if (input.template && input.template !== 'inherit') return input.template
  if (input.folder && input.folder !== 'inherit') return input.folder
  if (input.documentType && input.documentType !== 'inherit') return input.documentType
  return input.domain === 'review-required' ? 'review-required' : 'direct-file'
}

const ALLOWED: Record<Lifecycle, Lifecycle[]> = {
  draft: ['submitted', 'filed'],
  submitted: ['filed', 'draft'],
  filed: ['deprecated'],
  deprecated: ['filed'],
}

export function canTransitionLifecycle(from: Lifecycle, to: Lifecycle): boolean { return from === to || ALLOWED[from].includes(to) }
export function assertLifecycleTransition(from: Lifecycle, to: Lifecycle): void { if (!canTransitionLifecycle(from, to)) throw new Error(`Invalid lifecycle transition: ${from} -> ${to}`) }

/**
 * P08X-T02: `locked` is a separate boolean (default false) meaning exactly one
 * thing — not editable. A Document is body-editable if and only if it is
 * unlocked AND its stage is Draft or Filed. Submitted and Deprecated are never
 * directly editable, locked or not.
 */
export function canEditDocumentBody(state: Lifecycle | string, locked: boolean): boolean {
  return !locked && (state === 'draft' || state === 'filed')
}

/**
 * Which Documents may be superseded (P05R-T02 eligibility ruling, updated for
 * the P08X vocabulary): Filed and Deprecated records can gain a successor;
 * Draft and Submitted records are edited/reviewed, never superseded. Locking
 * is a boolean flag now, so "already-Locked" is not a stage.
 */
export function canSupersedeDocument(state: Lifecycle | string): boolean { return state === 'filed' || state === 'deprecated' }