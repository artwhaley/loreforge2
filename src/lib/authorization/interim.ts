import type { Payload } from 'payload'

export type InterimActor = { userId: number | string; activeCharacterId?: number | string | null }

/** P03-P06 compatibility boundary. P07 replaces this with the authoritative evaluator. */
export async function authorizeInterimOperation(payload: Payload, actor: InterimActor, domainId: number | string): Promise<true | string> {
  const domain = await payload.findByID({ collection: 'domains', id: domainId, depth: 0 })
  if (!domain) return 'Domain not found.'
  const ownerId = typeof domain.ownerUser === 'object' ? domain.ownerUser?.id : domain.ownerUser
  if (String(ownerId) === String(actor.userId)) return true
  const admins = await payload.find({ collection: 'domain-admins', where: { and: [{ domain: { equals: domain.id } }, { user: { equals: actor.userId } }, { status: { equals: 'active' } }] }, depth: 0, limit: 1 })
  return admins.docs.length > 0 ? true : 'Only the Domain Owner or an operational Domain Admin may perform this action.'
}
