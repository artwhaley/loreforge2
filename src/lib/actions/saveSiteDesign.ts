'use server'

import { headers } from 'next/headers.js'
import { getPayload } from 'payload'

import config from '@/payload.config'

import { resolveActingIdentity } from '@/lib/tenant/actingIdentity'
import { isAllowed } from '@/lib/authz/evaluate'
import { DESIGNS } from '@/lib/design/registry'
import type { DesignDefinition } from '@/lib/design/types'
import { pickDesignKey } from '@/lib/design/config'
import { mergeDesignBanks, parseV2Envelope, validateSubmittedBanks, type SubmittedDesignBank } from '@/lib/design/v2'
import { legacyVariantProjection } from '@/lib/design/resolveDomainDesign'

/**
 * Site Design save (P08D-T04-F). The V2 banked envelope is the ONLY authority
 * written here:
 *
 *   1. authenticate;                    2. check manage_domain_appearance;
 *   3. load current stored V2;          4. validate the active Design;
 *   5. validate every submitted known bank with that Design's validator;
 *   6. migrate banks in memory;         7. merge known banks;
 *   8. preserve unknown stored banks;   9. set active key;  10. persist V2.
 *
 * No arbitrary Design JSON is accepted without per-Design validation, and
 * unknown stored banks are preserved but never executed (G7).
 */
export async function saveSiteDesignAction(input: {
  tenantSlug: string
  activeDesign: string
  banks: Record<string, SubmittedDesignBank<unknown>>
}): Promise<{ ok: boolean; errors?: string[] }> {
  const { tenantSlug, activeDesign, banks } = input
  const payload = await getPayload({ config })
  const hdrs = await headers()
  const { user } = await payload.auth({ headers: hdrs })
  if (!user) return { ok: false, errors: ['Not authenticated.'] }

  const tenants = await payload.find({ collection: 'domains', where: { slug: { equals: tenantSlug } }, depth: 0, limit: 1 })
  const tenant = tenants.docs[0]
  if (!tenant) return { ok: false, errors: ['Domain not found.'] }
  const acting = await resolveActingIdentity(payload, { headers: hdrs } as unknown as Request, user.id)
  const actor = { userId: user.id, activeCharacterId: acting.tenantSlug === tenant.slug ? acting.characterId : null }
  if (!await isAllowed({ payload, actor, domainId: tenant.id, capability: 'manage_domain_appearance', resource: { type: 'Domain', id: tenant.id } })) {
    return { ok: false, errors: ['You do not manage this Domain appearance.'] }
  }

  // 4. The active key must resolve to a registered Design (unknown → Civic).
  const activeKey = pickDesignKey(activeDesign)

  // 5-6. Validate every submitted known bank with its own validator.
  const validated = validateSubmittedBanks(banks, DESIGNS)
  if (!validated.ok) return { ok: false, errors: validated.errors }

  // 3 + 7 + 8 + 9. Merge into the stored envelope, preserving unknown banks.
  const stored = parseV2Envelope(tenant.designConfig)
  const envelope = mergeDesignBanks(stored, validated.banks, activeKey)

  // 10. Persist V2. Legacy scalars are dual-written as an explicitly
  // historical projection so rollback/compatibility consumers see consistent
  // values — they are never read authority (G8/G).
  const activeBank = envelope.settingsByDesign[activeKey]
  const legacy = projectLegacyScalars(DESIGNS[activeKey], activeBank?.config)
  await payload.update({
    collection: 'domains',
    id: tenant.id,
    data: {
      designConfig: envelope,
      ...legacy,
    },
    depth: 0,
  })

  payload.logger.info(`Saved Site Design V2 for ${tenantSlug} (active: ${activeKey})`)
  return { ok: true }
}

/**
 * Explicitly historical dual-write projection (G): the resolved config →
 * legacy scalar fields, so pre-V2 consumers and rollback stay consistent.
 * Design-owned mapping, localized to the save boundary; removed with T08.
 */
function projectLegacyScalars(design: DesignDefinition, config: unknown): Record<string, unknown> {
  const shaped = config as {
    typography?: { headingFontKey?: string; bodyFontKey?: string; displayFontKey?: string }
    layout?: { width?: string }
    background?: { treatment?: string }
  } | null | undefined
  const theme = design.config.resolveTheme((config ?? design.config.defaults) as Parameters<typeof design.config.resolveTheme>[0])
  const variant = legacyVariantProjection(design, config ?? design.config.defaults)
  const headingFontKey = shaped?.typography?.headingFontKey ?? shaped?.typography?.displayFontKey
  const bodyFontKey = shaped?.typography?.bodyFontKey
  return {
    designTemplate: design.key,
    primaryColor: theme.base.primary,
    secondaryColor: theme.base.secondary,
    accentColor: theme.base.accent,
    backgroundColor: theme.base.pageBg,
    ...(headingFontKey ? { headingFontKey } : {}),
    ...(bodyFontKey ? { bodyFontKey } : {}),
    ...(shaped?.layout?.width ? { contentWidth: shaped.layout.width } : {}),
    headerLayout: variant.headerLayout,
    documentStyle: variant.documentStyle,
    ...(shaped?.background?.treatment ? { backgroundTreatment: shaped.background.treatment } : {}),
  }
}