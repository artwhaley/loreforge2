import { NextResponse } from 'next/server'
import { getPayload } from 'payload'

import config from '@payload-config'

import { isAllowed } from '@/lib/authz/evaluate'
import { resolveActingIdentity } from '@/lib/tenant/actingIdentity'

const idOf = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null
  return typeof value === 'object' && value !== null && 'id' in value ? Number((value as { id: number | string }).id) : Number(value)
}

const FILING_POLICIES = ['direct-file', 'review-required'] as const
const TEMPLATE_POLICIES = ['inherit', 'direct-file', 'review-required'] as const

export async function POST(request: Request) {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: request.headers })
  const form = await request.formData()
  const domainSlug = String(form.get('domainSlug') ?? '')
  const action = String(form.get('action') ?? 'create')
  const destination = `/domain/${domainSlug}/document-types`
  if (!user || !domainSlug) return NextResponse.redirect(new URL('/', request.url), 303)
  const domains = await payload.find({ collection: 'domains', where: { slug: { equals: domainSlug } }, depth: 0, limit: 1 })
  const domain = domains.docs[0]
  if (!domain) return NextResponse.redirect(new URL('/', request.url), 303)
  const acting = await resolveActingIdentity(payload, request, user.id)
  const actor = { userId: user.id, activeCharacterId: acting.tenantSlug === domainSlug ? acting.characterId : null }
  const domainAllowed = await isAllowed({ payload, actor, domainId: domain.id, capability: 'manage_types_tags', resource: { type: 'Domain', id: domain.id } })
  if (!domainAllowed) return NextResponse.redirect(new URL(destination, request.url), 303)

  const typeId = action === 'update' ? Number(form.get('typeId') ?? '') : NaN
  if (action === 'update' && !Number.isInteger(typeId)) return NextResponse.redirect(new URL(`${destination}?error=invalid`, request.url), 303)

  const name = String(form.get('name') ?? '').trim()
  const description = String(form.get('description') ?? '').trim()
  const defaultFilingPolicy = String(form.get('defaultFilingPolicy') ?? '')
  const templateFilingPolicy = String(form.get('templateFilingPolicy') ?? '')
  const policiesValid = (FILING_POLICIES as readonly string[]).includes(defaultFilingPolicy) && (TEMPLATE_POLICIES as readonly string[]).includes(templateFilingPolicy)
  if (!name || !policiesValid) return NextResponse.redirect(new URL(`${destination}?error=invalid`, request.url), 303)

  const checked = (key: string) => form.get(key) === 'on'
  const data = {
    domain: domain.id,
    name,
    description,
    active: checked('active'),
    allowBlank: checked('allowBlank'),
    allowTemplate: checked('allowTemplate'),
    allowForm: checked('allowForm'),
    defaultFilingPolicy,
    templateFilingPolicy,
    defaultFolder: idOf(form.get('defaultFolder')),
    draftFolder: idOf(form.get('draftFolder')),
    pendingReviewFolder: idOf(form.get('pendingReviewFolder')),
    filedFolder: idOf(form.get('filedFolder')),
    lockedFolder: idOf(form.get('lockedFolder')),
  }

  if (action === 'update') {
    const type = await payload.findByID({ collection: 'document-types', id: typeId, depth: 0 }).catch(() => null)
    if (!type || idOf(type.domain) !== Number(domain.id)) return NextResponse.redirect(new URL(`${destination}?error=invalid`, request.url), 303)
  }
  try {
    if (action === 'update') await payload.update({ collection: 'document-types', id: typeId, overrideAccess: true, data: data as never })
    else await payload.create({ collection: 'document-types', overrideAccess: true, data: data as never })
    return NextResponse.redirect(new URL(destination, request.url), 303)
  } catch (error) {
    payload.logger.error(error)
    const failed = new URL(destination, request.url)
    failed.searchParams.set('error', 'mutation')
    return NextResponse.redirect(failed, 303)
  }
}