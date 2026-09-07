import type { Character, Tenant } from '@/payload-types'

import { getActiveContext } from '@/lib/tenant/activeTenant'
import { buildDomainShellModel } from '@/lib/shell/buildDomainShellModel'
import { resolveDomainDesign } from '@/lib/design/resolveDomainDesign'
import type { LegacyDomainAppearance } from '@/lib/design/contracts'

type Props = {
  tenant: Tenant
  cssVars?: Record<string, string>
  role: 'admin' | 'member' | null
  switcherTenants?: Tenant[]
  activeCharacter?: Character | null
  switcherCharacters?: Character[]
  children: React.ReactNode
}

/**
 * Compatibility shell for management/editor/workflow surfaces (spec §24).
 * These are not design surfaces; they render inside the selected Design's
 * Shell with pre-authorized navigation from `buildDomainShellModel`, so they
 * share the seam without owning a fixed site shell of their own.
 */
export async function TenantShell({ tenant, role, switcherTenants, activeCharacter, switcherCharacters, children }: Props) {
  const context = await getActiveContext()
  const userId = context.user ? Number(context.user.id) : null
  const shell = await buildDomainShellModel({
    tenant,
    role,
    userId,
    activeCharacter: activeCharacter === undefined ? context.activeCharacter : activeCharacter,
    switcherTenants: switcherTenants ?? null,
    switcherCharacters: switcherCharacters ?? null,
  })
  // P08D-T04-C: management/authoring surfaces resolve the SAME canonical
  // Design + config + theme as the public routes — one authority everywhere.
  const resolved = resolveDomainDesign(tenant as unknown as LegacyDomainAppearance)
  const Shell = resolved.design.Shell
  return (
    <Shell model={shell} theme={{ tokens: resolved.cssVars, headerLayout: resolved.variant.headerLayout, documentStyle: resolved.variant.documentStyle }}>
      {children}
    </Shell>
  )
}
