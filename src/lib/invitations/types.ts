export const INVITATION_PURPOSES = ['domain_bootstrap', 'character_claim', 'domain_join'] as const

export type InvitationPurpose = (typeof INVITATION_PURPOSES)[number]

export type InvitationStatus = 'valid' | 'invalid' | 'expired' | 'revoked' | 'exhausted'

export type InvitationRelation = number | string | { id: number | string } | null | undefined

export const idOf = (value: InvitationRelation | unknown): number | null => {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'object' && value !== null && 'id' in value) return Number((value as { id: number | string }).id)
  const id = Number(value)
  return Number.isFinite(id) ? id : null
}

export function isInvitationPurpose(value: unknown): value is InvitationPurpose {
  return typeof value === 'string' && (INVITATION_PURPOSES as readonly string[]).includes(value)
}

/**
 * Invite tokens are opaque URL-safe values. The lower bound is the encoded
 * length of a 32-byte base64url token; the upper bound prevents accidental
 * unbounded work on a public resolver route.
 */
export function isInvitationToken(value: unknown): value is string {
  return typeof value === 'string' && value.length >= 43 && value.length <= 512 && /^[A-Za-z0-9_-]+$/.test(value)
}

export function invitationPurposeLabel(purpose: InvitationPurpose): string {
  if (purpose === 'domain_bootstrap') return 'Domain bootstrap'
  if (purpose === 'character_claim') return 'Character invitation'
  return 'Domain invitation'
}
