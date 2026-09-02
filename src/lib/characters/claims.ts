export type ClaimStatus = 'pending' | 'approved' | 'rejected' | 'cancelled'

export type ClaimState = {
  status: ClaimStatus
  characterControlledBy?: number | string | null
}

export function canApproveClaim(
  claim: ClaimState,
  actor: { userId: number | string; isLegacyDomainAdmin: boolean },
): string | true {
  if (!actor.isLegacyDomainAdmin) return 'Only the authorized Domain admin may decide this claim during Phase 2.'
  if (claim.status !== 'pending') return 'Only pending claims may be decided.'
  if (claim.characterControlledBy !== null && claim.characterControlledBy !== undefined) {
    return 'A claim cannot be approved after the Character is controlled.'
  }
  return true
}

export function applyClaimDecision(
  claim: ClaimState,
  decision: 'approved' | 'rejected',
  claimantUserId: number | string,
  actor: { userId: number | string; isLegacyDomainAdmin: boolean },
): { status: ClaimStatus; characterControlledBy: number | string | null } | string {
  const allowed = canApproveClaim(claim, actor)
  if (allowed !== true) return allowed
  return {
    status: decision,
    characterControlledBy: decision === 'approved' ? claimantUserId : null,
  }
}
