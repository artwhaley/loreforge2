import type { ManagementRouteFacts, ManagementStatusDescriptor } from './common'

/** One issued invitation link row (already authorized by the service). */
export type InvitationRow = {
  id: number
  purpose: string
  targetLabel: string
  issuedByLabel: string | null
  expiresLabel: string
  useLabel: string
  statusLabel: string
  canRevoke: boolean
}

/** Pending Domain join request row. */
export type PendingJoinRequest = {
  id: number
  applicantLabel: string
  characterLabel: string
  requestedAt: string
}

/** Pending Character claim request row. */
export type PendingClaimRequest = {
  id: number
  characterLabel: string
  claimantLabel: string
  requestedAt: string
}

/**
 * Invitation management Page Model (OBSIDIAN-T01; builder lands in T07).
 * Contains only data already authorized by `canManageDomainInvitations` /
 * `listInvitations` / the pending-request services. Claim targets are
 * claimable Characters the actor may target; invitation authority never moves
 * into the browser.
 */
export type InvitationsManagementPageModel = ManagementRouteFacts & {
  canManage: boolean
  invitations: InvitationRow[]
  pendingJoins: PendingJoinRequest[]
  pendingClaims: PendingClaimRequest[]
  /** Claimable Character targets for the issue panels. */
  claimTargets: Array<{ id: number; name: string }>
  status: ManagementStatusDescriptor
}