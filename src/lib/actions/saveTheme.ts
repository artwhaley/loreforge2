'use server'

import { headers } from 'next/headers.js'
import { getPayload } from 'payload'

import config from '@/payload.config'

import type { Domain } from '@/payload-types'
import { isAllowed } from '@/lib/authz/evaluate'
import { isValidThemeInput, type ThemeInput } from '@/lib/theme/input'

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
  if (!isValidThemeInput(theme)) return { ok: false }
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
  if (!await isAllowed({ payload, actor: { userId: user.id }, domainId: tenant.id, capability: 'manage_domain_appearance', resource: { type: 'Domain', id: tenant.id } })) return { ok: false }

  await payload.update({
    collection: 'domains',
    id: tenant.id,
    data: {
      preset: theme.preset,
      primaryColor: theme.primaryColor,
      secondaryColor: theme.secondaryColor,
      accentColor: theme.accentColor,
      backgroundColor: theme.backgroundColor,
      headingFontKey: theme.headingFontKey as Domain['headingFontKey'],
      bodyFontKey: theme.bodyFontKey as Domain['bodyFontKey'],
    },
    depth: 0,
  })

  payload.logger.info(`Saved theme for ${tenantSlug}`)
  return { ok: true }
}
