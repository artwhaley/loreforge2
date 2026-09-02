'use server'

import { headers } from 'next/headers.js'
import { getPayload } from 'payload'

import config from '@/payload.config'
import { validateThemeAsset } from '@/lib/media/validateThemeAsset'

const KIND_TO_FIELD = { logo: 'logo', banner: 'banner' } as const

/**
 * Upload a logo/seal or banner image to the Media collection and attach it to
 * the tenant. Verifies the session user is an admin of the tenant. Uses local
 * filesystem storage (public/media) via Payload's upload handling.
 */
export async function uploadThemeAssetAction(formData: FormData): Promise<{
  ok: boolean
  url?: string
  error?: string
}> {
  const tenantSlug = String(formData.get('tenantSlug') ?? '')
  const kind = String(formData.get('kind') ?? '') as 'logo' | 'banner'
  const file = formData.get('file')

  if (!tenantSlug || !KIND_TO_FIELD[kind] || !(file instanceof File)) {
    return { ok: false, error: 'Choose a supported image file.' }
  }

  const payload = await getPayload({ config })
  const hdrs = await headers()
  const { user } = await payload.auth({ headers: hdrs })
  if (!user) return { ok: false }

  const tenants = await payload.find({
    collection: 'tenants',
    where: { slug: { equals: tenantSlug } },
    depth: 0,
    limit: 1,
  })
  const tenant = tenants.docs[0]
  if (!tenant) return { ok: false }

  const memberships = await payload.find({
    collection: 'memberships',
    where: {
      and: [{ user: { equals: user.id } }, { tenant: { equals: tenant.id } }],
    },
    depth: 0,
    limit: 1,
  })
  const membership = memberships.docs[0]
  if (!membership || membership.role !== 'admin') return { ok: false }

  const validated = await validateThemeAsset(file)
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
    collection: 'tenants',
    id: tenant.id,
    data: { [KIND_TO_FIELD[kind]]: media.id },
    depth: 0,
  })

  payload.logger.info(`Uploaded ${kind} for ${tenantSlug}`)
  return { ok: true, url: `/media/${media.filename}` }
}
