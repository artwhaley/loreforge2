import { NextResponse } from 'next/server'
import { getPayload } from 'payload'

import config from '@payload-config'

const idOf = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null
  return typeof value === 'object' && value !== null && 'id' in value
    ? Number((value as { id: number | string }).id)
    : Number(value)
}

/** Search the current Domain's tag vocabulary for document-entry autocomplete. */
export async function GET(request: Request) {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: request.headers })
  const url = new URL(request.url)
  const domainSlug = url.searchParams.get('domainSlug')?.trim() ?? ''
  const query = url.searchParams.get('q')?.trim().toLocaleLowerCase() ?? ''
  if (!user || !domainSlug || !query) return NextResponse.json({ results: [] })

  const domainResult = await payload.find({ collection: 'domains', where: { slug: { equals: domainSlug } }, depth: 0, limit: 1 })
  const domain = domainResult.docs[0]
  if (!domain) return NextResponse.json({ results: [] })
  const ownerId = idOf(domain.ownerUser)
  const adminRows = await payload.find({ collection: 'domain-admins', where: { and: [{ domain: { equals: domain.id } }, { user: { equals: user.id } }, { status: { equals: 'active' } }] }, depth: 0, limit: 1 })
  if (ownerId !== Number(user.id) && adminRows.docs.length === 0) {
    const controlled = await payload.find({ collection: 'characters', where: { and: [{ controlledBy: { equals: user.id } }, { status: { equals: 'active' } }] }, depth: 0, limit: 200, overrideAccess: true })
    const memberships = controlled.docs.length
      ? await payload.find({ collection: 'domain-memberships', where: { and: [{ domain: { equals: domain.id } }, { character: { in: controlled.docs.map((character) => character.id) } }, { status: { equals: 'active' } }] }, depth: 0, limit: 1, overrideAccess: true })
      : { docs: [] }
    if (memberships.docs.length === 0) return NextResponse.json({ results: [] }, { status: 403 })
  }

  const tags = await payload.find({ collection: 'tags', where: { and: [{ domain: { equals: domain.id } }, { normalizedName: { contains: query } }] }, depth: 0, limit: 25, sort: 'name', overrideAccess: true })
  return NextResponse.json({ results: tags.docs.map((tag) => ({ id: Number(tag.id), name: tag.name })) })
}
