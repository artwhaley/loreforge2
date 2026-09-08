import type { Domain, Tenant } from '@/payload-types'

import type { InvitationsManagementPageModel } from '@/lib/page-models/management/invitations'
import type { ManagementStatusDescriptor } from '@/lib/page-models/management/common'
import { canManageDomainInvitations } from '@/lib/invitations/workflows'
import { invitationPurposeLabel } from '@/lib/invitations/types'
import { listInvitations } from '@/lib/invitations/service'

/**
 * Pure status mapping for the invitations surface (OBSIDIAN-T07). Query
 * params come from the POST redirects; only these four keys are recognized.
 */
export function invitationStatusDescriptor(query: { created?: string; error?: string; revoked?: string; decided?: string }): ManagementStatusDescriptor {
  if (query.created) return { level: 'info', message: 'Invitation created.' }
  if (query.error) return { level: 'error', message: 'That invitation action could not be completed.' }
  if (query.decided) return { level: 'info', message: 'Request decided.' }
  if (query.revoked) return { level: 'info', message: 'Invitation revoked.' }
  return null
}

/**
 * Invitations management Page Model builder (OBSIDIAN-T07). Authority comes
 * from `canManageDomainInvitations`; rows are the authorized
 * `listInvitations` views plus pending join/claim requests. Claim targets are
 * claimable Characters already computed by the route previously — the same
 * active, un-controlled Characters with an active membership here.
 */
export async function buildInvitationsManagementPageModel(input: {
  tenant: Domain | Tenant
  user: { id: number | string }
  activeCharacterId?: number | string | null
  statusQuery?: { created?: string; error?: string; revoked?: string; decided?: string }
}): Promise<InvitationsManagementPageModel> {
  const { tenant, user, activeCharacterId, statusQuery = {} } = input
  const query = statusQuery
  const baseUrl = `/domain/${tenant.slug}`
  const { getLorePayload } = await import('@/lib/payload')
  const payload = await getLorePayload()
  const actor = { userId: user.id, activeCharacterId: activeCharacterId ?? null }
  const canManage = await canManageDomainInvitations(payload, actor, tenant.id)
  const [invitations, joinRequests, claimRequests, characters] = await Promise.all([
    listInvitations(payload, { domainId: tenant.id }),
    payload.find({ collection: 'domain-join-requests', where: { and: [{ domain: { equals: tenant.id } }, { status: { equals: 'pending' } }] }, depth: 1, limit: 500, sort: '-requestedAt', overrideAccess: true }),
    payload.find({ collection: 'character-claim-requests', where: { and: [{ domain: { equals: tenant.id } }, { status: { equals: 'pending' } }] }, depth: 1, limit: 500, sort: '-requestedAt', overrideAccess: true }),
    payload.find({ collection: 'characters', where: { and: [{ status: { equals: 'active' } }, { kind: { in: ['player', 'npc'] } }] }, depth: 0, limit: 0, pagination: false, sort: 'name', overrideAccess: true }),
  ])
  const claimTargets = []
  for (const character of characters.docs) {
    if (character.controlledBy != null) continue
    const membership = await payload.find({ collection: 'domain-memberships', where: { and: [{ domain: { equals: tenant.id } }, { character: { equals: character.id } }, { status: { equals: 'active' } }] }, depth: 0, limit: 1, overrideAccess: true })
    if (membership.docs[0]) claimTargets.push(character)
  }
  return {
    baseUrl,
    domainSlug: tenant.slug,
    domainId: Number(tenant.id),
    domainName: tenant.name,
    canManage,
    invitations: invitations.map((invitation) => ({
      id: Number(invitation.id),
      purpose: invitationPurposeLabel(invitation.purpose),
      targetLabel: invitation.character?.name ?? invitation.domain?.name ?? '—',
      issuedByLabel: invitation.issuedByCharacter?.name ?? invitation.issuedByUser?.name ?? null,
      expiresLabel: invitation.expiresAt ? new Date(invitation.expiresAt).toLocaleString() : 'Never',
      useLabel: invitation.useCount + (invitation.maxUses == null ? '' : ` / ${invitation.maxUses}`),
      statusLabel: invitation.status === 'revoked' ? 'Revoked' : invitation.status === 'expired' ? 'Expired' : invitation.status === 'exhausted' ? 'Exhausted' : invitation.status === 'invalid' ? 'Unavailable' : 'Active',
      canRevoke: invitation.status === 'valid',
    })),
    pendingJoins: joinRequests.docs.map((request) => {
      const applicant = typeof request.user === 'object' ? request.user.name ?? request.user.email : String(request.user)
      const rawCharacter = request.character
      const character = rawCharacter && typeof rawCharacter === 'object' ? rawCharacter.name : rawCharacter != null ? `Character ${rawCharacter}` : `New Character: ${request.requestedName}`
      return { id: Number(request.id), applicantLabel: applicant, characterLabel: character, requestedAt: String(request.requestedAt ?? '') }
    }),
    pendingClaims: claimRequests.docs.map((request) => {
      const rawCharacter = request.character
      const character = rawCharacter && typeof rawCharacter === 'object' ? rawCharacter.name : `Character ${rawCharacter ?? '—'}`
      const claimant = typeof request.claimant === 'object' ? request.claimant.name ?? request.claimant.email : String(request.claimant ?? '—')
      return { id: Number(request.id), characterLabel: character, claimantLabel: claimant, requestedAt: String(request.requestedAt ?? '') }
    }),
    claimTargets: claimTargets.map((c) => ({ id: Number(c.id), name: c.name })),
    status: invitationStatusDescriptor(query),
  }
}