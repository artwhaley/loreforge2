export type Lifecycle = 'draft' | 'pending_review' | 'filed' | 'locked'
export type FilingPolicy = 'inherit' | 'direct-file' | 'review-required'

export function resolveFilingPolicy(input: { template?: FilingPolicy | null; folder?: FilingPolicy | null; documentType?: FilingPolicy | null; domain?: Exclude<FilingPolicy, 'inherit'> | null }): Exclude<FilingPolicy, 'inherit'> {
  if (input.template && input.template !== 'inherit') return input.template
  if (input.folder && input.folder !== 'inherit') return input.folder
  if (input.documentType && input.documentType !== 'inherit') return input.documentType
  return input.domain === 'review-required' ? 'review-required' : 'direct-file'
}

const ALLOWED: Record<Lifecycle, Lifecycle[]> = {
  draft: ['filed', 'pending_review'],
  pending_review: ['filed', 'draft'],
  filed: ['locked'],
  locked: ['filed'],
}

export function canTransitionLifecycle(from: Lifecycle, to: Lifecycle): boolean { return from === to || ALLOWED[from].includes(to) }
export function assertLifecycleTransition(from: Lifecycle, to: Lifecycle): void { if (!canTransitionLifecycle(from, to)) throw new Error(`Invalid lifecycle transition: ${from} -> ${to}`) }
export function canEditDocumentBody(state: Lifecycle): boolean { return state === 'draft' || state === 'filed' }
