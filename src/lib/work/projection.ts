import type { Payload } from 'payload'

import { authorizePlatformOperation } from '@/lib/authz/platform'
import { isAllowed } from '@/lib/authz/evaluate'
import { idOf } from '@/lib/invitations/types'

export type WorkEntry = {
  kind: 'bootstrap' | 'join' | 'claim' | 'document' | 'merge'
  id: number
  title: string
  summary: string
  href?: string
  requestedAt?: string
  domainId?: number
  folderName?: string
}

export type PlatformWork = { authorized: boolean; entries: WorkEntry[] }
export type DomainWork = { authorized: boolean; domainAdmin: boolean; entries: WorkEntry[] }

type Actor = { userId: number | string; activeCharacterId?: number | string | null }

const text = (value: unknown, fallback = ''): string => value == null ? fallback : String(value)
const relationName = (value: unknown, fallback: string): string => value && typeof value === 'object' ? text((value as { name?: unknown; email?: unknown }).name ?? (value as { email?: unknown }).email, fallback) : value == null ? fallback : String(value)

async function actingCharacter(payload: Payload, actor: Actor): Promise<{ kind: string; administrativeDomain: number | null } | null> {
  const id = idOf(actor.activeCharacterId)
  if (id == null) return null
  const row = await payload.findByID({ collection: 'characters', id, depth: 0, overrideAccess: true }).catch(() => null) as { kind?: unknown; administrativeDomain?: unknown; controlledBy?: unknown; status?: unknown } | null
  if (!row || String(row.status ?? '') !== 'active' || idOf(row.controlledBy) !== Number(actor.userId)) return null
  return { kind: String(row.kind ?? 'player'), administrativeDomain: idOf(row.administrativeDomain) }
}

export async function projectPlatformWork(payload: Payload, actor: Actor): Promise<PlatformWork> {
  const authorization = await authorizePlatformOperation(payload, actor)
  if (!authorization.allowed) return { authorized: false, entries: [] }
  const [bootstrap, merges] = await Promise.all([
    payload.find({ collection: 'domain-bootstrap-requests', where: { status: { equals: 'pending' } }, depth: 1, limit: 500, sort: '-requestedAt', overrideAccess: true }),
    payload.find({ collection: 'character-merge-requests', where: { status: { equals: 'pending' } }, depth: 1, limit: 500, sort: '-requestedAt', overrideAccess: true }),
  ])
  const entries: WorkEntry[] = []
  for (const request of bootstrap.docs) entries.push({ kind: 'bootstrap', id: Number(request.id), title: `Bootstrap ${relationName(request.domain, 'Domain')}`, summary: `Requested by ${relationName(request.user, 'User')}`, href: '/work', requestedAt: text(request.requestedAt), domainId: idOf(request.domain) ?? undefined })
  for (const request of merges.docs) entries.push({ kind: 'merge', id: Number(request.id), title: `Character merge ${relationName(request.source, 'Character')}`, summary: `Target ${relationName(request.target, 'not selected')}`, href: '/work', requestedAt: text(request.requestedAt) })
  return { authorized: true, entries }
}

export async function projectDomainWork(payload: Payload, actor: Actor, domainId: number | string, options: { domainSlug?: string } = {}): Promise<DomainWork> {
  const domainIdNumber = idOf(domainId)
  if (domainIdNumber == null) return { authorized: false, domainAdmin: false, entries: [] }
  const character = await actingCharacter(payload, actor)
  if (!character) return { authorized: false, domainAdmin: false, entries: [] }
  const domainAdmin = character.kind === 'domain_admin' && character.administrativeDomain === domainIdNumber
  const entries: WorkEntry[] = []
  if (domainAdmin) {
    const [joins, claims] = await Promise.all([
      payload.find({ collection: 'domain-join-requests', where: { and: [{ domain: { equals: domainIdNumber } }, { status: { equals: 'pending' } }] }, depth: 1, limit: 500, sort: '-requestedAt', overrideAccess: true }),
      payload.find({ collection: 'character-claim-requests', where: { and: [{ domain: { equals: domainIdNumber } }, { status: { equals: 'pending' } }] }, depth: 1, limit: 500, sort: '-requestedAt', overrideAccess: true }),
    ])
    const domainPath = options.domainSlug ? `/domain/${encodeURIComponent(options.domainSlug)}` : `/domain/${domainIdNumber}`
    for (const request of joins.docs) entries.push({ kind: 'join', id: Number(request.id), title: `Domain join · ${relationName(request.user, 'User')}`, summary: relationName(request.character, request.requestedName ? `New Character: ${request.requestedName}` : 'Character'), href: `${domainPath}/manage/invitations`, requestedAt: text(request.requestedAt), domainId: domainIdNumber })
    for (const request of claims.docs) entries.push({ kind: 'claim', id: Number(request.id), title: `Character claim · ${relationName(request.character, 'Character')}`, summary: `Requested by ${relationName(request.claimant, 'User')}`, href: `${domainPath}/manage/invitations`, requestedAt: text(request.requestedAt), domainId: domainIdNumber })
  }

  // Pending Work is a projection of canonical Documents. Every row is filtered
  // through the normal approve_document evaluator, so an ordinary Character
  // sees only Types it may approve; a domain_admin sees all of its Domain.
  const pending = await payload.find({ collection: 'documents', where: { and: [{ domain: { equals: domainIdNumber } }, { lifecycle: { equals: 'pending_review' } }, { or: [{ softDeletedAt: { equals: null } }, { softDeletedAt: { exists: false } }] }] }, depth: 1, limit: 500, sort: '-updatedAt', overrideAccess: true })
  for (const document of pending.docs) {
    const allowed = await isAllowed({ payload, actor, domainId: domainIdNumber, capability: 'approve_document', resource: { type: 'Document', id: document.id } })
    if (!allowed) continue
    const folderName = document.folder && typeof document.folder === 'object' ? text(document.folder.name) : ''
    const domainSlug = options.domainSlug ?? text((document.domain as { slug?: unknown })?.slug, '')
    entries.push({ kind: 'document', id: Number(document.id), title: document.title, summary: 'Pending review', href: `/domain/${domainSlug}/documents/${document.id}`, requestedAt: text(document.updatedAt), domainId: domainIdNumber, folderName })
  }
  entries.sort((left, right) => String(right.requestedAt ?? '').localeCompare(String(left.requestedAt ?? '')))
  return { authorized: true, domainAdmin, entries }
}
