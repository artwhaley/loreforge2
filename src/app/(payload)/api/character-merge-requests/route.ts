import { createHash } from 'node:crypto'
import { NextResponse } from 'next/server'
import { getPayload } from 'payload'

import config from '@payload-config'

import { getActiveTenant } from '@/lib/tenant/activeTenant'

export async function POST(request: Request) {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: request.headers })
  const formData = await request.formData()
  const sourceId = Number(formData.get('sourceId') ?? '')
  const tenantSlug = String(formData.get('tenantSlug') ?? '')
  const evidence = String(formData.get('evidence') ?? '').trim()
  const note = String(formData.get('note') ?? '').trim()
  const rawTarget = String(formData.get('targetId') ?? '').trim()
  const targetId = rawTarget ? Number(rawTarget) : null
  const redirectTo = `/characters/${Number.isFinite(sourceId) ? sourceId : ''}`
  if (!user || !Number.isFinite(sourceId) || !evidence || !note) {
    return NextResponse.redirect(new URL(redirectTo, request.url), 303)
  }
  const context = await getActiveTenant()
  if (!context.tenant || context.tenant.slug !== tenantSlug) {
    return NextResponse.redirect(new URL(redirectTo, request.url), 303)
  }
  if (targetId !== null && (!Number.isFinite(targetId) || targetId === sourceId)) {
    return NextResponse.redirect(new URL(redirectTo, request.url), 303)
  }
  const source = await payload.findByID({ collection: 'characters', id: sourceId, depth: 0 })
  if (!source) return NextResponse.redirect(new URL(redirectTo, request.url), 303)
  const snapshot = JSON.stringify({ sourceId, targetId, tenantId: context.tenant.id, at: new Date().toISOString() })
  const impactPreviewHash = createHash('sha256').update(snapshot).digest('hex')
  await payload.create({
    collection: 'character-merge-requests',
    data: {
      source: sourceId,
      target: targetId,
      tenant: context.tenant.id,
      requestingUser: user.id,
      requestingCharacter: context.activeCharacter?.id,
      evidence,
      note,
      status: 'pending',
      requestedAt: new Date().toISOString(),
      impactPreviewHash,
    },
  })
  return NextResponse.redirect(new URL(redirectTo, request.url), 303)
}
