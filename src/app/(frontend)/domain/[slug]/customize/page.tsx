import { redirect } from 'next/navigation'
import { notFound } from 'next/navigation'

import { TenantShell } from '@/components/theme/TenantShell'
import { SiteStudio } from '@/components/site-studio/SiteStudio'
import { getActiveTenant } from '@/lib/tenant/activeTenant'
import { getTenantsForUser } from '@/lib/tenant/queries'
import { mediaSrc } from '@/lib/theme/fonts'
import { getLorePayload } from '@/lib/payload'
import { isAllowed } from '@/lib/authz/evaluate'
import { resolveDomainDesign } from '@/lib/design/resolveDomainDesign'
import { DESIGNS, DESIGN_KEYS } from '@/lib/design/registry'
import { parseV2Envelope, resolveBankConfig, type StoredDesignBank } from '@/lib/design/v2'
import type { LegacyDomainAppearance } from '@/lib/design/contracts'

type Props = {
  params: Promise<{ slug: string }>
}

export const dynamic = 'force-dynamic'

export default async function CustomizePage({ params }: Props) {
  const { slug } = await params
  const { tenant, role, user, activeCharacter } = await getActiveTenant()

  if (!tenant || tenant.slug !== slug) {
    notFound()
  }
  if (!user) {
    redirect('/admin/login')
  }
  const payload = await getLorePayload()
  if (!await isAllowed({ payload, actor: { userId: user.id, activeCharacterId: activeCharacter?.id ?? null }, domainId: tenant.id, capability: 'manage_domain_appearance', resource: { type: 'Domain', id: tenant.id } })) notFound()

  const myTenants = await getTenantsForUser(user.id)

  // P08D-T05: the Studio bootstraps from the SAME canonical resolver as the
  // live routes. The active Design/config come from resolveDomainDesign; the
  // saved banks for every Design come from the stored V2 envelope through
  // each Design's own validator — never from raw scalar fields.
  const appearance = tenant as unknown as LegacyDomainAppearance
  const resolved = resolveDomainDesign(appearance)
  const envelope = parseV2Envelope(appearance.designConfig)
  const initialBanks: Record<string, StoredDesignBank> = {}
  for (const key of DESIGN_KEYS) {
    const design = DESIGNS[key]
    const bank = envelope?.settingsByDesign[key]
    const bankResolved = resolveBankConfig(design, bank)
    initialBanks[key] = { version: bankResolved.version, config: bankResolved.config }
  }

  return (
    <TenantShell
      tenant={tenant}
      role={role}
      switcherTenants={myTenants}
    >
      <SiteStudio
        tenantSlug={tenant.slug}
        domainIdentity={{
          name: tenant.name,
          motto: tenant.motto ?? '',
          logoUrl: mediaSrc(tenant.logo),
        }}
        initialBanks={initialBanks}
        initialActiveDesign={resolved.design.key}
      />
    </TenantShell>
  )
}