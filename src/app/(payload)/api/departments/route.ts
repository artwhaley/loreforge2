import { NextResponse } from 'next/server'
import { getPayload } from 'payload'

import config from '@payload-config'
import { isAllowed } from '@/lib/authz/evaluate'
import { resolveActingIdentity } from '@/lib/tenant/actingIdentity'

const ERROR_CODES = new Set(['unauthorized', 'invalid', 'duplicate', 'failed'])

function deptDestination(domainSlug: string, error?: string) {
  const suffix = error && ERROR_CODES.has(error) ? `?error=${error}` : ''
  return `/domain/${domainSlug}/manage/departments${suffix}`
}

export async function POST(request: Request) {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: request.headers })
  const form = await request.formData()
  const domainSlug = String(form.get('domainSlug') ?? '')
  const domainResult = await payload.find({ collection: 'domains', where: { slug: { equals: domainSlug } }, depth: 0, limit: 1 })
  const domain = domainResult.docs[0]
  if (!user || !domain) return NextResponse.redirect(new URL(deptDestination(domainSlug, 'unauthorized'), request.url), 303)
  const acting = await resolveActingIdentity(payload, request, user.id)
  const actor = { userId: user.id, activeCharacterId: acting.tenantSlug === domainSlug ? acting.characterId : null }
  if (!await isAllowed({ payload, actor, domainId: domain.id, capability: 'manage_subdomain', resource: { type: 'Domain', id: domain.id } })) return NextResponse.redirect(new URL(deptDestination(domainSlug, 'unauthorized'), request.url), 303)
  const action = String(form.get('action') ?? 'create')
  try {
    if (action === 'archive') {
      const id = Number(form.get('departmentId'))
      const department = await payload.findByID({ collection: 'subdomains', id, depth: 0 })
      if (String(typeof department.domain === 'object' ? department.domain.id : department.domain) === String(domain.id)) await payload.update({ collection: 'subdomains', id, data: { publicListing: false } })
    } else {
      const name = String(form.get('name') ?? '').trim(); const slug = String(form.get('slug') ?? '').trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-')
      if (name && slug) await payload.create({ collection: 'subdomains', data: { domain: domain.id, name, slug, description: String(form.get('description') ?? '').trim() || undefined, sortOrder: Number(form.get('sortOrder') ?? 0), publicListing: true } })
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    if (/duplicate|unique|already exists/i.test(message)) return NextResponse.redirect(new URL(deptDestination(domainSlug, 'duplicate'), request.url), 303)
    if (/required|invalid|slug|name/i.test(message)) return NextResponse.redirect(new URL(deptDestination(domainSlug, 'invalid'), request.url), 303)
    return NextResponse.redirect(new URL(deptDestination(domainSlug, 'failed'), request.url), 303)
  }
  return NextResponse.redirect(new URL(deptDestination(domainSlug), request.url), 303)
}
