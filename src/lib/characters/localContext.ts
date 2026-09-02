import type { BasePayload } from 'payload'

import type { DomainCharacterContext } from '@/payload-types'

/**
 * Create the Domain-local identity record when a Character is mentioned or
 * linked. It is deliberately idempotent and never creates membership.
 */
export async function ensureDomainCharacterContext(
  payload: BasePayload,
  tenantId: number | string,
  characterId: number | string,
  globalName: string,
): Promise<DomainCharacterContext> {
  const existing = await payload.find({
    collection: 'domain-character-contexts',
    where: {
      and: [{ tenant: { equals: tenantId } }, { character: { equals: characterId } }],
    },
    depth: 0,
    limit: 1,
  })
  if (existing.docs[0]) return existing.docs[0]

  return payload.create({
    collection: 'domain-character-contexts',
    data: {
      tenant: Number(tenantId),
      character: Number(characterId),
      localDisplayName: globalName,
    },
  })
}
