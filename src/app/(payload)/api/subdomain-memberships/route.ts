import { NextResponse } from 'next/server'
import { getPayload } from 'payload'

import config from '@payload-config'

import { authorizeInterimOperation } from '@/lib/authorization/interim'

export async function POST(request: Request) {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: request.headers })
  const form = await request.formData()
  const domainSlug = String(form.get('domainSlug') ?? '')
  const subdomainId = Number(form.get('subdomainId') ?? '')
  const characterId = Number(form.get('characterId') ?? '')
  const action = String(form.get('action') ?? 'add')
  if (!user || !domainSlug || !Number.isFinite(subdomainId) || !Number.isFinite(characterId)) return NextResponse.redirect(new URL('/', request.url), 303)
  const domains = await payload.find({ collection: 'domains', where: { slug: { equals: domainSlug } }, depth: 0, limit: 1 })
  const domain = domains.docs[0]
  const subdomain = await payload.findByID({ collection: 'subdomains', id: subdomainId, depth: 0 })
  if (!domain || !subdomain || String(typeof subdomain.domain === 'object' ? subdomain.domain.id : subdomain.domain) !== String(domain.id)) return NextResponse.redirect(new URL(`/domain/${domainSlug}/members`, request.url), 303)
  const allowed = await authorizeInterimOperation(payload, { userId: user.id }, domain.id)
  if (allowed !== true) return NextResponse.redirect(new URL(`/domain/${domainSlug}/members`, request.url), 303)
  const existing = await payload.find({ collection: 'subdomain-memberships', where: { and: [{ subdomain: { equals: subdomain.id } }, { character: { equals: characterId } }] }, depth: 0, limit: 1 })
  if (existing.docs[0]) await payload.update({ collection: 'subdomain-memberships', id: existing.docs[0].id, data: { status: action === 'remove' ? 'inactive' : 'active', addedBy: user.id } })
  else if (action !== 'remove') await payload.create({ collection: 'subdomain-memberships', data: { subdomain: subdomain.id, character: characterId, status: 'active', addedBy: user.id } })
  return NextResponse.redirect(new URL(`/domain/${domainSlug}/members`, request.url), 303)
}
