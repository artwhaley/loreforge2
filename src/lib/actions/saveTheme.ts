'use server'

import { headers } from 'next/headers.js'
import { getPayload } from 'payload'

import config from '@/payload.config'

import type { Tenant } from '@/payload-types'

export type ThemeInput = {
  preset: 'heritage' | 'modern'
  primaryColor: string
  secondaryColor: string
  accentColor: string
  backgroundColor: string
  headingFontKey: string
  bodyFontKey: string
}

/**
 * Persist tenant theme settings. Verifies the session user is an admin of
 * the target tenant server-side before saving. Only semantic theme data is
 * stored — never CSS blobs (spec §6.2).
 */
export async function saveThemeAction(input: {
  tenantSlug: string
  theme: ThemeInput
}): Promise<{ ok: boolean }> {
  const { tenantSlug, theme } = input
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

  await payload.update({
    collection: 'tenants',
    id: tenant.id,
    data: {
      preset: theme.preset,
      primaryColor: theme.primaryColor,
      secondaryColor: theme.secondaryColor,
      accentColor: theme.accentColor,
      backgroundColor: theme.backgroundColor,
      headingFontKey: theme.headingFontKey as Tenant['headingFontKey'],
      bodyFontKey: theme.bodyFontKey as Tenant['bodyFontKey'],
    },
    depth: 0,
  })

  payload.logger.info(`Saved theme for ${tenantSlug}`)
  return { ok: true }
}
