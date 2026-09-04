/**
 * P05R-T06 E: stable user-facing failure codes for document link/tag/
 * relationship mutations. Errors are reduced to a small, stable vocabulary —
 * never stack traces, hidden identities, or security-rule details. The
 * destination page renders the corresponding message via the ?error= query
 * parameter.
 */

/** Map a thrown error to a stable public code. */
export function documentMutationErrorCode(error: unknown): string {
  const message = error instanceof Error ? error.message : ''
  if (message.includes('required Prepared by credit')) return 'credit_required'
  if (message.includes('Only active Characters may be linked')) return 'character_inactive'
  if (message.includes('active Domain member')) return 'not_domain_member'
  if (message.includes('superseded') || message.includes('supersession') || message.includes('Relationship not found') || message.includes('Both Documents')) return 'relationship_failed'
  return 'action_failed'
}

/** Public copy for each stable code. */
export const DOCUMENT_MUTATION_ERROR_MESSAGES: Record<string, string> = {
  credit_required: 'The required Prepared by credit cannot be removed.',
  character_inactive: 'Only active Characters may be linked to this record.',
  not_domain_member: 'The Prepared by Character must be an active Domain member.',
  relationship_failed: 'Invalid supersession relationship.',
  action_failed: 'Unable to modify this record.',
}