import { NextResponse } from 'next/server'
import { getPayload } from 'payload'

import config from '@payload-config'
import { authorizeInterimOperation } from '@/lib/authorization/interim'

export async function POST(request: Request) {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: request.headers })
  const form = await request.formData()
  const domainSlug = String(form.get('domainSlug') ?? '')
  const domainResult = await payload.find({ collection: 'domains', where: { slug: { equals: domainSlug } }, depth: 0, limit: 1 })
  const domain = domainResult.docs[0]
  if (!user || !domain || await authorizeInterimOperation(payload, { userId: user.id }, domain.id) !== true) return NextResponse.redirect(new URL(`/domain/${domainSlug}/departments`, request.url), 303)
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
  } catch { /* keep customer copy free of provider/schema errors */ }
  return NextResponse.redirect(new URL(`/domain/${domainSlug}/manage/departments`, request.url), 303)
}
