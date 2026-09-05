import type { Payload } from 'payload'

import { authorizePlatformOperation, type PlatformActor } from '@/lib/authz/platform'
import { runInTransaction } from '@/lib/db/transactions'
import { ensureDomainAdminIdentity } from '@/lib/characters/provisioning'

import { consumeInvitation, issueInvitation, resolveInvitation, revokeInvitation, type InvitationConsumeResult, type InvitationResolution, type SafeInvitationView } from './service'
import { idOf, isInvitationPurpose, type InvitationPurpose } from './types'

export type ActingIdentity = { userId: number | string; activeCharacterId: number | string | null | undefined }
export type WorkflowFailure = { ok: false; reason: string }
export type SetupDomainResult = { ok: true; domain: DomainRow } | WorkflowFailure

type DomainRow = { id: number | string; name?: string; slug?: string; kind?: unknown; lifecycle?: unknown; ownerUser?: unknown }
type CharacterRow = { id: number | string; name?: string; kind?: unknown; status?: unknown; controlledBy?: unknown; administrativeDomain?: unknown }
type RequestRow = Record<string, unknown> & { id: number | string; status?: unknown }

const fail = (reason: string): WorkflowFailure => ({ ok: false, reason })
const txReq = (transactionID: number | string) => ({ transactionID })
const ordinaryKind = (kind: unknown): boolean => String(kind ?? 'player') === 'player' || String(kind ?? '') === 'npc'

async function domainAdminFor(payload: Payload, actor: ActingIdentity, domainId: number | string, options: { requireActiveDomain?: boolean; transactionID?: number | string | null } = {}): Promise<{ domain: DomainRow; character: CharacterRow } | null> {
  const userId = idOf(actor.userId)
  const characterId = idOf(actor.activeCharacterId)
  const targetDomainId = idOf(domainId)
  if (userId == null || characterId == null || targetDomainId == null) return null
  const req = options.transactionID == null ? undefined : txReq(options.transactionID)
  const [domain, character, user] = await Promise.all([
    payload.findByID({ collection: 'domains', id: targetDomainId, depth: 0, overrideAccess: true, req }).catch(() => null) as Promise<DomainRow | null>,
    payload.findByID({ collection: 'characters', id: characterId, depth: 0, overrideAccess: true, req }).catch(() => null) as Promise<CharacterRow | null>,
    payload.findByID({ collection: 'users', id: userId, depth: 0, overrideAccess: true, req }).catch(() => null),
  ])
  if (!domain || !character || !user) return null
  if (String(domain.kind ?? 'community') !== 'community') return null
  if (options.requireActiveDomain !== false && String(domain.lifecycle ?? 'active') !== 'active') return null
  if (String(character.kind ?? '') !== 'domain_admin' || String(character.status ?? '') !== 'active') return null
  if (idOf(character.controlledBy) !== userId || idOf(character.administrativeDomain) !== targetDomainId || idOf(domain.ownerUser) !== userId) return null
  return { domain, character }
}

export async function canManageDomainInvitations(payload: Payload, actor: ActingIdentity, domainId: number | string): Promise<boolean> {
  return Boolean(await domainAdminFor(payload, actor, domainId))
}

async function userExists(payload: Payload, userId: number | string): Promise<number | null> {
  const id = idOf(userId)
  if (id == null) return null
  const user = await payload.findByID({ collection: 'users', id, depth: 0, overrideAccess: true }).catch(() => null)
  return user ? id : null
}

function consumeFailure(result: InvitationConsumeResult): WorkflowFailure {
  const labels: Record<string, string> = {
    invalid: 'This invitation is invalid or no longer matches its target.',
    expired: 'This invitation has expired.',
    revoked: 'This invitation has been revoked.',
    exhausted: 'This invitation has reached its use limit.',
  }
  return fail(labels[result.status] ?? 'This invitation is no longer available.')
}

function resolutionFailure(result: InvitationResolution): WorkflowFailure {
  return consumeFailure({ ...result, consumed: false })
}

async function invitationRowFor(payload: Payload, token: string, purpose: InvitationPurpose): Promise<InvitationResolution> {
  return resolveInvitation(payload, token, { expectedPurpose: purpose })
}

export async function createSetupPendingDomain(payload: Payload, args: { actor: PlatformActor; name: string; slug: string }): Promise<SetupDomainResult> {
  const authorized = await authorizePlatformOperation(payload, args.actor)
  if (!authorized.allowed) return fail(authorized.reason)
  const name = args.name.trim()
  const slug = args.slug.trim().toLowerCase()
  if (!name || name.length > 160 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return fail('Domain name and slug are required.')
  const existing = await payload.find({ collection: 'domains', where: { slug: { equals: slug } }, depth: 0, limit: 1, overrideAccess: true })
  if (existing.docs[0]) return fail('That Domain slug is already in use.')
  try {
    const domain = await payload.create({ collection: 'domains', overrideAccess: true, data: { name, slug, kind: 'community', lifecycle: 'setup-pending', ownerUser: null, ownerCharacter: null, defaultFilingPolicy: 'direct-file', publicEnabled: false } as never })
    return { ok: true, domain: domain as unknown as DomainRow }
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'The setup-pending Domain could not be created.')
  }
}

export async function issueDomainBootstrapInvitation(payload: Payload, args: { actor: PlatformActor; domainId: number | string; expiresAt?: Date | string | null }): Promise<{ ok: true; token: string; invitation: SafeInvitationView } | WorkflowFailure> {
  const authorized = await authorizePlatformOperation(payload, args.actor)
  if (!authorized.allowed) return fail(authorized.reason)
  const domainId = idOf(args.domainId)
  if (domainId == null) return fail('A valid Domain is required.')
  const domain = await payload.findByID({ collection: 'domains', id: domainId, depth: 0, overrideAccess: true }).catch(() => null) as DomainRow | null
  if (!domain || String(domain.kind ?? 'community') !== 'community' || String(domain.lifecycle ?? '') !== 'setup-pending' || idOf(domain.ownerUser) != null) return fail('Bootstrap invites require an ownerless setup-pending Community Domain.')
  try {
    const issued = await issueInvitation(payload, { purpose: 'domain_bootstrap', domainId, issuedByUserId: args.actor.userId, issuedByCharacterId: args.actor.activeCharacterId as number | string, expiresAt: args.expiresAt, maxUses: 1 })
    return { ok: true, ...issued }
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'The bootstrap invitation could not be issued.')
  }
}

export async function issueCharacterInvitation(payload: Payload, args: { actor: ActingIdentity; domainId: number | string; characterId: number | string; expiresAt?: Date | string | null }): Promise<{ ok: true; token: string; invitation: SafeInvitationView } | WorkflowFailure> {
  const authorized = await domainAdminFor(payload, args.actor, args.domainId)
  if (!authorized) return fail('The matching Domain Administrator identity is required.')
  try {
    const issued = await issueInvitation(payload, { purpose: 'character_claim', domainId: authorized.domain.id, characterId: args.characterId, issuedByUserId: args.actor.userId, issuedByCharacterId: authorized.character.id, expiresAt: args.expiresAt, maxUses: 1 })
    return { ok: true, ...issued }
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'The Character invitation could not be issued.')
  }
}

export async function issueDomainJoinInvitation(payload: Payload, args: { actor: ActingIdentity; domainId: number | string; expiresAt?: Date | string | null; maxUses?: number | null }): Promise<{ ok: true; token: string; invitation: SafeInvitationView } | WorkflowFailure> {
  const authorized = await domainAdminFor(payload, args.actor, args.domainId)
  if (!authorized) return fail('The matching Domain Administrator identity is required.')
  try {
    const issued = await issueInvitation(payload, { purpose: 'domain_join', domainId: authorized.domain.id, issuedByUserId: args.actor.userId, issuedByCharacterId: authorized.character.id, expiresAt: args.expiresAt, maxUses: args.maxUses })
    return { ok: true, ...issued }
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'The Domain invitation could not be issued.')
  }
}

export async function revokeDomainInvitation(payload: Payload, args: { actor: ActingIdentity | PlatformActor; invitationId: number | string }): Promise<{ ok: true; invitation: SafeInvitationView } | WorkflowFailure> {
  const invitationId = idOf(args.invitationId)
  if (invitationId == null) return fail('A valid Invitation is required.')
  const invitation = await payload.findByID({ collection: 'invitations', id: invitationId, depth: 0, overrideAccess: true }).catch(() => null) as { purpose?: unknown; domain?: unknown } | null
  if (!invitation || !isInvitationPurpose(invitation.purpose)) return fail('Invitation not found.')
  const domainId = idOf(invitation.domain)
  if (domainId == null) return fail('Invitation has no valid Domain target.')
  if (invitation.purpose === 'domain_bootstrap') {
    const authorized = await authorizePlatformOperation(payload, args.actor as PlatformActor)
    if (!authorized.allowed) return fail(authorized.reason)
  } else {
    const authorized = await domainAdminFor(payload, args.actor as ActingIdentity, domainId)
    if (!authorized) return fail('The matching Domain Administrator identity is required.')
  }
  const revoked = await revokeInvitation(payload, invitationId)
  return revoked ? { ok: true, invitation: revoked } : fail('Invitation not found.')
}

export type BootstrapAcceptance = { ok: true; request: RequestRow; alreadyPending?: boolean } | WorkflowFailure

export async function acceptDomainBootstrapInvitation(payload: Payload, args: { userId: number | string; token: string }): Promise<BootstrapAcceptance> {
  const userId = await userExists(payload, args.userId)
  if (userId == null) return fail('Sign in before accepting this invitation.')
  const preview = await invitationRowFor(payload, args.token, 'domain_bootstrap')
  if (preview.status !== 'valid' || !preview.invitation) return resolutionFailure(preview)
  try {
    return await runInTransaction(payload, async (transactionID) => {
      const req = txReq(transactionID)
      const existing = await payload.find({ collection: 'domain-bootstrap-requests', where: { and: [{ domain: { equals: preview.invitation?.domain?.id } }, { user: { equals: userId } }, { invitation: { equals: preview.invitation?.id } }, { status: { equals: 'pending' } }] }, depth: 0, limit: 1, overrideAccess: true, req })
      if (existing.docs[0]) return { ok: true, request: existing.docs[0] as unknown as RequestRow, alreadyPending: true }
      const consumed = await consumeInvitation(payload, args.token, { expectedPurpose: 'domain_bootstrap', transactionID })
      if (!consumed.consumed || !consumed.invitation) return consumeFailure(consumed)
      const request = await payload.create({ collection: 'domain-bootstrap-requests', overrideAccess: true, req, data: { domain: consumed.invitation.domain?.id, user: userId, invitation: consumed.invitation.id, status: 'pending', requestedAt: new Date().toISOString() } as never })
      return { ok: true, request: request as unknown as RequestRow }
    })
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'The bootstrap request could not be created.')
  }
}

export async function decideDomainBootstrapRequest(payload: Payload, args: { actor: PlatformActor; requestId: number | string; decision: 'approved' | 'rejected'; note?: string }): Promise<{ ok: true; request: RequestRow; domainId: number } | WorkflowFailure> {
  const authorized = await authorizePlatformOperation(payload, args.actor)
  if (!authorized.allowed) return fail(authorized.reason)
  const requestId = idOf(args.requestId)
  if (requestId == null) return fail('A valid bootstrap request is required.')
  try {
    return await runInTransaction(payload, async (transactionID) => {
      const req = txReq(transactionID)
      const currentAuthorized = await authorizePlatformOperation(payload, args.actor, { transactionID })
      if (!currentAuthorized.allowed) return fail(currentAuthorized.reason)
      const request = await payload.findByID({ collection: 'domain-bootstrap-requests', id: requestId, depth: 0, overrideAccess: true, req }) as unknown as RequestRow | null
      if (!request || request.status !== 'pending') return fail('Only a pending bootstrap request may be decided.')
      const domainId = idOf(request.domain)
      const userId = idOf(request.user)
      if (domainId == null || userId == null) return fail('The bootstrap request is incomplete.')
      const domain = await payload.findByID({ collection: 'domains', id: domainId, depth: 0, overrideAccess: true, req }) as unknown as DomainRow | null
      if (!domain || String(domain.kind ?? 'community') !== 'community' || String(domain.lifecycle ?? '') !== 'setup-pending' || idOf(domain.ownerUser) != null) return fail('The Domain is no longer available for bootstrap approval.')
      const decidedAt = new Date().toISOString()
      if (args.decision === 'rejected') {
        const rejected = await payload.update({ collection: 'domain-bootstrap-requests', id: requestId, overrideAccess: true, req, data: { status: 'rejected', decidedAt, decidedBy: args.actor.userId, decidingCharacter: args.actor.activeCharacterId, decisionNote: args.note?.trim() || undefined } as never })
        return { ok: true, request: rejected as unknown as RequestRow, domainId }
      }
      await payload.update({ collection: 'domains', id: domainId, overrideAccess: true, req, data: { ownerUser: userId, ownerCharacter: null, lifecycle: 'active' } as never })
      await ensureDomainAdminIdentity(payload, domainId, { transactionID })
      const approved = await payload.update({ collection: 'domain-bootstrap-requests', id: requestId, overrideAccess: true, req, data: { status: 'approved', decidedAt, decidedBy: args.actor.userId, decidingCharacter: args.actor.activeCharacterId, decisionNote: args.note?.trim() || undefined } as never })
      return { ok: true, request: approved as unknown as RequestRow, domainId }
    })
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'The bootstrap decision could not be saved.')
  }
}

export type CharacterAcceptance = { ok: true; characterId: number; domainId: number; invitation: SafeInvitationView } | WorkflowFailure

export async function acceptCharacterInvitation(payload: Payload, args: { userId: number | string; token: string }): Promise<CharacterAcceptance> {
  const userId = await userExists(payload, args.userId)
  if (userId == null) return fail('Sign in before accepting this invitation.')
  try {
    return await runInTransaction(payload, async (transactionID) => {
      const consumed = await consumeInvitation(payload, args.token, { expectedPurpose: 'character_claim', transactionID })
      if (!consumed.consumed || !consumed.invitation?.character || !consumed.invitation.domain) return consumeFailure(consumed)
      const characterId = consumed.invitation.character.id
      const domainId = consumed.invitation.domain.id
      const character = await payload.findByID({ collection: 'characters', id: characterId, depth: 0, overrideAccess: true, req: txReq(transactionID) }) as unknown as CharacterRow | null
      if (!character || !ordinaryKind(character.kind) || String(character.status ?? '') !== 'active' || idOf(character.controlledBy) != null) return fail('The invited Character is no longer available.')
      await payload.update({ collection: 'characters', id: characterId, overrideAccess: true, req: txReq(transactionID), data: { controlledBy: userId } as never })
      const memberships = await payload.find({ collection: 'domain-memberships', where: { and: [{ domain: { equals: domainId } }, { character: { equals: characterId } }] }, depth: 0, limit: 1, overrideAccess: true, req: txReq(transactionID) })
      const membership = memberships.docs[0]
      if (membership) await payload.update({ collection: 'domain-memberships', id: membership.id, overrideAccess: true, req: txReq(transactionID), data: { status: 'active', addedBy: userId } as never })
      else await payload.create({ collection: 'domain-memberships', overrideAccess: true, req: txReq(transactionID), data: { domain: domainId, character: characterId, status: 'active', addedBy: userId } as never })
      return { ok: true, characterId, domainId, invitation: consumed.invitation }
    })
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'The Character invitation could not be accepted.')
  }
}

export type JoinAcceptance = { ok: true; request: RequestRow; domainId: number; invitation: SafeInvitationView } | WorkflowFailure

export async function acceptDomainJoinInvitation(payload: Payload, args: { userId: number | string; token: string; characterId?: number | string | null; requestedName?: string | null }): Promise<JoinAcceptance> {
  const userId = await userExists(payload, args.userId)
  if (userId == null) return fail('Sign in before accepting this invitation.')
  const preview = await invitationRowFor(payload, args.token, 'domain_join')
  if (preview.status !== 'valid' || !preview.invitation?.domain) return resolutionFailure(preview)
  const previewInvitation = preview.invitation
  const requestedName = String(args.requestedName ?? '').trim()
  const requestedCharacterId = idOf(args.characterId)
  if (requestedCharacterId == null && !requestedName) return fail('Choose an existing Character or enter a name for a new Character.')
  try {
    return await runInTransaction(payload, async (transactionID) => {
      const req = txReq(transactionID)
      const domainId = previewInvitation.domain!.id
      const existing = await payload.find({ collection: 'domain-join-requests', where: { and: [{ domain: { equals: domainId } }, { user: { equals: userId } }, { invitation: { equals: previewInvitation.id } }, { status: { equals: 'pending' } }] }, depth: 0, limit: 1, overrideAccess: true, req })
      if (existing.docs[0]) return { ok: true, request: existing.docs[0] as unknown as RequestRow, domainId, invitation: previewInvitation }
      const consumed = await consumeInvitation(payload, args.token, { expectedPurpose: 'domain_join', transactionID })
      if (!consumed.consumed || !consumed.invitation?.domain) return consumeFailure(consumed)
      const targetDomainId = consumed.invitation.domain.id
      if (requestedCharacterId != null) {
        const character = await payload.findByID({ collection: 'characters', id: requestedCharacterId, depth: 0, overrideAccess: true, req }) as unknown as CharacterRow | null
        if (!character || !ordinaryKind(character.kind) || String(character.status ?? '') !== 'active' || idOf(character.controlledBy) !== userId) return fail('The selected Character is not controlled by this User.')
        const alreadyMember = await payload.find({ collection: 'domain-memberships', where: { and: [{ domain: { equals: targetDomainId } }, { character: { equals: requestedCharacterId } }, { status: { equals: 'active' } }] }, depth: 0, limit: 1, overrideAccess: true, req })
        if (alreadyMember.docs[0]) return fail('That Character is already active in this Domain.')
      }
      const request = await payload.create({ collection: 'domain-join-requests', overrideAccess: true, req, data: { domain: targetDomainId, user: userId, invitation: consumed.invitation.id, character: requestedCharacterId, requestedName: requestedCharacterId == null ? requestedName : undefined, status: 'pending', requestedAt: new Date().toISOString() } as never })
      return { ok: true, request: request as unknown as RequestRow, domainId: targetDomainId, invitation: consumed.invitation }
    })
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'The Domain join request could not be created.')
  }
}

export async function decideDomainJoinRequest(payload: Payload, args: { actor: ActingIdentity; requestId: number | string; decision: 'approved' | 'rejected'; note?: string }): Promise<{ ok: true; request: RequestRow; characterId?: number; domainId: number } | WorkflowFailure> {
  const requestId = idOf(args.requestId)
  if (requestId == null) return fail('A valid Domain join request is required.')
  const requestPreview = await payload.findByID({ collection: 'domain-join-requests', id: requestId, depth: 0, overrideAccess: true }).catch(() => null) as unknown as RequestRow | null
  if (!requestPreview) return fail('Domain join request not found.')
  const domainId = idOf(requestPreview.domain)
  if (domainId == null) return fail('The Domain join request is incomplete.')
  const authorized = await domainAdminFor(payload, args.actor, domainId)
  if (!authorized) return fail('The matching Domain Administrator identity is required.')
  try {
    return await runInTransaction(payload, async (transactionID) => {
      const req = txReq(transactionID)
      const request = await payload.findByID({ collection: 'domain-join-requests', id: requestId, depth: 0, overrideAccess: true, req }) as unknown as RequestRow | null
      if (!request || request.status !== 'pending') return fail('Only a pending Domain join request may be decided.')
      const targetDomainId = idOf(request.domain)
      const userId = idOf(request.user)
      if (targetDomainId == null || userId == null || targetDomainId !== domainId) return fail('The Domain join request is incomplete.')
      const domain = await payload.findByID({ collection: 'domains', id: targetDomainId, depth: 0, overrideAccess: true, req }) as unknown as DomainRow | null
      if (!domain || String(domain.kind ?? 'community') !== 'community' || String(domain.lifecycle ?? '') !== 'active') return fail('The Domain is not active.')
      const currentAuthorized = await domainAdminFor(payload, args.actor, targetDomainId, { transactionID })
      if (!currentAuthorized) return fail('The matching Domain Administrator identity is required.')
      const decidedAt = new Date().toISOString()
      if (args.decision === 'rejected') {
        const rejected = await payload.update({ collection: 'domain-join-requests', id: requestId, overrideAccess: true, req, data: { status: 'rejected', decidedAt, decidedBy: args.actor.userId, decidingCharacter: currentAuthorized.character.id, decisionNote: args.note?.trim() || undefined } as never })
        return { ok: true, request: rejected as unknown as RequestRow, domainId: targetDomainId }
      }
      let characterId = idOf(request.character)
      if (characterId != null) {
        const character = await payload.findByID({ collection: 'characters', id: characterId, depth: 0, overrideAccess: true, req }) as unknown as CharacterRow | null
        if (!character || !ordinaryKind(character.kind) || String(character.status ?? '') !== 'active' || idOf(character.controlledBy) !== userId) return fail('The requested Character is no longer eligible.')
      } else {
        const name = String(request.requestedName ?? '').trim()
        if (!name) return fail('The requested new Character name is missing.')
        const created = await payload.create({ collection: 'characters', overrideAccess: true, req, data: { name, kind: 'player', status: 'active', controlledBy: userId, createdBy: userId } as never })
        characterId = Number(created.id)
      }
      const memberships = await payload.find({ collection: 'domain-memberships', where: { and: [{ domain: { equals: targetDomainId } }, { character: { equals: characterId } }] }, depth: 0, limit: 1, overrideAccess: true, req })
      const membership = memberships.docs[0]
      if (membership) await payload.update({ collection: 'domain-memberships', id: membership.id, overrideAccess: true, req, data: { status: 'active', addedBy: args.actor.userId } as never })
      else await payload.create({ collection: 'domain-memberships', overrideAccess: true, req, data: { domain: targetDomainId, character: characterId, status: 'active', addedBy: args.actor.userId } as never })
      const approved = await payload.update({ collection: 'domain-join-requests', id: requestId, overrideAccess: true, req, data: { status: 'approved', decidedAt, decidedBy: args.actor.userId, decidingCharacter: currentAuthorized.character.id, decisionNote: args.note?.trim() || undefined } as never })
      return { ok: true, request: approved as unknown as RequestRow, characterId: characterId as number, domainId: targetDomainId }
    })
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'The Domain join decision could not be saved.')
  }
}
