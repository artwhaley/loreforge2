'use server'

import { headers } from 'next/headers.js'
import { getPayload } from 'payload'

import config from '@/payload.config'
import { validateThemeAsset } from '@/lib/media/validateThemeAsset'
import { isAllowed } from '@/lib/authz/evaluate'
import { resolveActingIdentity } from '@/lib/tenant/actingIdentity'

const KIND_TO_FIELD = { logo: 'logo', banner: 'banner', background: 'backgroundImage' } as const

/**
 * Upload a logo/seal, header banner, or page background image to the Media
 * collection and attach it to the Domain. `kind: 'background-clear'` removes
 * the stored background image without uploading. Verifies the session user is
 * an admin of the Domain. Uses local filesystem storage (public/media) via
 * Payload's upload handling.
 */
export async function uploadThemeAssetAction(formData: FormData): Promise<{
  ok: boolean
  url?: string
  error?: string
}> {
  const tenantSlug = String(formData.get('tenantSlug') ?? '')
  const kind = String(formData.get('kind') ?? '')
  const file = formData.get('file')

  const isClear = kind === 'background-clear'
  const isUpload = kind === 'logo' || kind === 'banner' || kind === 'background'
  if (!tenantSlug || (!isClear && !isUpload)) {
    return { ok: false, error: 'Choose a supported image file.' }
  }
  const uploadFile = file instanceof File ? file : null
  if (isUpload && !uploadFile) {
    return { ok: false, error: 'Choose a supported image file.' }
  }

  const payload = await getPayload({ config })
  const hdrs = await headers()
  const { user } = await payload.auth({ headers: hdrs })
  if (!user) return { ok: false }

  const tenants = await payload.find({
    collection: 'domains',
    where: { slug: { equals: tenantSlug } },
    depth: 0,
    limit: 1,
  })
  const tenant = tenants.docs[0]
  if (!tenant) return { ok: false }

  // P07X-T02: appearance authority is identity-driven, matching saveTheme.
  const acting = await resolveActingIdentity(payload, { headers: hdrs } as unknown as Request, user.id)
  const actor = { userId: user.id, activeCharacterId: acting.tenantSlug === tenant.slug ? acting.characterId : null }
  if (!await isAllowed({ payload, actor, domainId: tenant.id, capability: 'manage_domain_appearance', resource: { type: 'Domain', id: tenant.id } })) return { ok: false }

  if (isClear) {
    await payload.update({
      collection: 'domains',
      id: tenant.id,
      data: { backgroundImage: null },
      depth: 0,
    })
    payload.logger.info(`Cleared background image for ${tenantSlug}`)
    return { ok: true }
  }

  const validated = uploadFile ? await validateThemeAsset(uploadFile) : null
  if (!validated) return { ok: false, error: 'Use a JPEG, PNG, or WebP image up to 4096×4096 and 5 MiB.' }

  const media = await payload.create({
    collection: 'media',
    data: { alt: `${kind} for ${tenantSlug}` },
    file: {
      data: validated.buffer,
      mimetype: validated.mimeType,
      name: validated.filename,
      size: validated.buffer.length,
    },
  })

  await payload.update({
    collection: 'domains',
    id: tenant.id,
    data: { [KIND_TO_FIELD[kind as keyof typeof KIND_TO_FIELD]]: media.id },
    depth: 0,
  })

  payload.logger.info(`Uploaded ${kind} for ${tenantSlug}`)
  return { ok: true, url: `/media/${media.filename}` }
}
