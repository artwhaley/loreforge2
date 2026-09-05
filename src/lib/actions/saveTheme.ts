'use server'

import { headers } from 'next/headers.js'
import { getPayload } from 'payload'

import config from '@/payload.config'

import type { Domain } from '@/payload-types'
import { isAllowed } from '@/lib/authz/evaluate'
import { resolveActingIdentity } from '@/lib/tenant/actingIdentity'
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
  // P07X-T02: appearance authority is identity-driven — resolve the acting
  // Character from the selector cookies exactly like the guarded routes, so a
  // domain_admin identity (or platform/owner fallback) can exercise the save.
  const acting = await resolveActingIdentity(payload, { headers: hdrs } as unknown as Request, user.id)
  const actor = { userId: user.id, activeCharacterId: acting.tenantSlug === tenant.slug ? acting.characterId : null }
  if (!await isAllowed({ payload, actor, domainId: tenant.id, capability: 'manage_domain_appearance', resource: { type: 'Domain', id: tenant.id } })) return { ok: false }

  // Owner decision 2026-09-05: vocabulary customization is removed; platform
  // nouns are code constants (src/lib/theme/nouns.ts) and the vocabulary
  // column is dropped by the P08 corrective migration.
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
      designTemplate: theme.designTemplate as Domain['designTemplate'],
      contentWidth: theme.contentWidth as Domain['contentWidth'],
      headerLayout: theme.headerLayout as Domain['headerLayout'],
      documentStyle: theme.documentStyle as Domain['documentStyle'],
      backgroundTreatment: theme.backgroundTreatment as Domain['backgroundTreatment'],
      ...(theme.backgroundImageSet === false ? { backgroundImage: null } : {}),
    },
    depth: 0,
  })

  payload.logger.info(`Saved theme for ${tenantSlug}`)
  return { ok: true }
}