'use server'

import { headers } from 'next/headers.js'
import { getPayload } from 'payload'

import config from '@/payload.config'
import { validateThemeAsset } from '@/lib/media/validateThemeAsset'
import { isAllowed } from '@/lib/authz/evaluate'
import { resolveActingIdentity } from '@/lib/tenant/actingIdentity'
import type { DesignAssetRef } from '@/lib/design/contracts'

/**
 * Design-media upload (P08D-T05). Uploads an authorized image to the Media
 * collection and returns ONLY a local `/media/...` reference. It never
 * mutates the active Design: the selected Studio editor decides where the
 * returned ref lands in the draft config. Permission is checked per request
 * with the identity-driven authority, and the file passes the same JPEG/PNG/
 * WebP re-encode validation as the legacy theme uploads.
 */
export async function uploadDesignAssetAction(formData: FormData): Promise<{
  ok: boolean
  ref?: DesignAssetRef
  error?: string
}> {
  const tenantSlug = String(formData.get('tenantSlug') ?? '')
  const purpose = String(formData.get('purpose') ?? 'design-asset')
  const file = formData.get('file')
  if (!tenantSlug || !(file instanceof File)) {
    return { ok: false, error: 'Choose a supported image file.' }
  }

  const payload = await getPayload({ config })
  const hdrs = await headers()
  const { user } = await payload.auth({ headers: hdrs })
  if (!user) return { ok: false, error: 'Not authenticated.' }

  const tenants = await payload.find({
    collection: 'domains',
    where: { slug: { equals: tenantSlug } },
    depth: 0,
    limit: 1,
  })
  const tenant = tenants.docs[0]
  if (!tenant) return { ok: false, error: 'Domain not found.' }

  const acting = await resolveActingIdentity(payload, { headers: hdrs } as unknown as Request, user.id)
  const actor = { userId: user.id, activeCharacterId: acting.tenantSlug === tenant.slug ? acting.characterId : null }
  if (!await isAllowed({ payload, actor, domainId: tenant.id, capability: 'manage_domain_appearance', resource: { type: 'Domain', id: tenant.id } })) {
    return { ok: false, error: 'You do not manage this Domain appearance.' }
  }

  const validated = await validateThemeAsset(file)
  if (!validated) return { ok: false, error: 'Use a JPEG, PNG, or WebP image up to 4096×4096 and 5 MiB.' }

  const media = await payload.create({
    collection: 'media',
    data: { alt: `${purpose} for ${tenantSlug}` },
    file: {
      data: validated.buffer,
      mimetype: validated.mimeType,
      name: validated.filename,
      size: validated.buffer.length,
    },
  })

  payload.logger.info(`Uploaded Design asset (${purpose}) for ${tenantSlug}`)
  return { ok: true, ref: { url: `/media/${media.filename}` } }
}