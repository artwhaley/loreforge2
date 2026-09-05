import type { Payload } from 'payload'

import { idOf, isInvitationPurpose, type InvitationPurpose } from './types'

export type InvitationPurposeData = {
  purpose?: unknown
  domain?: unknown
  character?: unknown
  maxUses?: unknown
  issuedByUser?: unknown
  issuedByCharacter?: unknown
}

type DomainRow = {
  id: number | string
  kind?: unknown
  lifecycle?: unknown
  ownerUser?: unknown
}

type CharacterRow = {
  id: number | string
  kind?: unknown
  status?: unknown
  controlledBy?: unknown
}

/**
 * Validate the discriminated Invitation shape without exposing any token
 * material. This pure portion is intentionally usable by collection hooks and
 * unit tests before a Payload instance is available.
 */
export function assertInvitationShape(data: InvitationPurposeData): InvitationPurpose {
  if (!isInvitationPurpose(data.purpose)) throw new Error('Invitation purpose must be domain_bootstrap, character_claim, or domain_join.')

  const domainId = idOf(data.domain)
  const characterId = idOf(data.character)
  if (domainId == null) throw new Error('Every Invitation must identify a Domain.')

  const maxUses = data.maxUses === null || data.maxUses === undefined || data.maxUses === '' ? null : Number(data.maxUses)
  if (maxUses !== null && (!Number.isInteger(maxUses) || maxUses < 1)) throw new Error('Invitation maxUses must be a positive integer or null.')

  if (data.purpose === 'domain_bootstrap') {
    if (characterId != null) throw new Error('A domain_bootstrap Invitation cannot target a Character.')
    if (maxUses !== 1) throw new Error('A domain_bootstrap Invitation must have maxUses=1.')
  } else if (data.purpose === 'character_claim') {
    if (characterId == null) throw new Error('A character_claim Invitation must target one Character.')
    if (maxUses !== 1) throw new Error('A character_claim Invitation must have maxUses=1.')
  } else {
    if (characterId != null) throw new Error('A domain_join Invitation cannot target a Character.')
    if (maxUses === 1) throw new Error('A domain_join Invitation must be multi-use (maxUses null or greater than one).')
  }

  if (idOf(data.issuedByUser) == null) throw new Error('Invitation issuedByUser is required.')
  if (idOf(data.issuedByCharacter) == null) throw new Error('Invitation issuedByCharacter is required.')
  return data.purpose
}

/**
 * Check the current Domain/Character state for issuance and acceptance. This
 * is deliberately separate from the pure shape check so consumption can
 * re-run it inside its transaction after taking the write lock.
 */
export async function assertInvitationPurposeState(
  payload: Payload,
  data: InvitationPurposeData,
  options: { transactionID?: number | string | null } = {},
): Promise<true> {
  const purpose = assertInvitationShape(data)
  const domainId = idOf(data.domain)
  if (domainId == null) throw new Error('Every Invitation must identify a Domain.')
  const req = options.transactionID == null ? undefined : { transactionID: options.transactionID }
  const domain = await payload.findByID({ collection: 'domains', id: domainId, depth: 0, overrideAccess: true, req }).catch(() => null) as DomainRow | null
  if (!domain) throw new Error('The Invitation Domain does not exist.')
  if (String(domain.kind ?? 'community') !== 'community') throw new Error('Invitations require a Community Domain.')

  if (purpose === 'domain_bootstrap') {
    if (String(domain.lifecycle ?? 'active') !== 'setup-pending') throw new Error('A domain_bootstrap Invitation requires a setup-pending Domain.')
    if (idOf(domain.ownerUser) != null) throw new Error('A domain_bootstrap Invitation requires an ownerless Domain.')
    return true
  }

  if (purpose === 'domain_join') {
    if (String(domain.lifecycle ?? 'active') !== 'active') throw new Error('A domain_join Invitation requires an active Domain.')
    return true
  }

  const characterId = idOf(data.character)
  if (characterId == null) throw new Error('A character_claim Invitation must target one Character.')
  const character = await payload.findByID({ collection: 'characters', id: characterId, depth: 0, overrideAccess: true, req }).catch(() => null) as CharacterRow | null
  if (!character) throw new Error('The Invitation Character does not exist.')
  if (String(character.kind ?? 'player') !== 'player') throw new Error('A character_claim Invitation may target only a player Character.')
  if (String(character.status ?? 'active') !== 'active') throw new Error('A character_claim Invitation may target only an active Character.')
  if (idOf(character.controlledBy) != null) throw new Error('A character_claim Invitation may target only an unclaimed Character.')
  const membership = await payload.find({
    collection: 'domain-memberships',
    where: { and: [{ domain: { equals: domainId } }, { character: { equals: characterId } }, { status: { equals: 'active' } }] },
    depth: 0,
    limit: 1,
    overrideAccess: true,
    req,
  })
  if (!membership.docs[0]) throw new Error('The character_claim Invitation Character must be an active member of its Domain.')
  return true
}
