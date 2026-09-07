import type { Character, Domain, Tenant, User } from '@/payload-types'

import type { DesignDefinition } from './types'
import type { LegacyDomainAppearance } from './contracts'
import { resolveDomainDesign } from './resolveDomainDesign'
import { buildDomainShellModel } from '@/lib/shell/buildDomainShellModel'

export type DomainRouteShell = {
  design: DesignDefinition
  shell: Awaited<ReturnType<typeof buildDomainShellModel>>
  headerLayout: string
  documentStyle: string
  cssVars: Record<string, string>
}

/**
 * Shared route resolution (P08D-T04-C): the CANONICAL resolveDomainDesign is
 * the single source of the active Design + config + theme. The legacy
 * headerLayout/documentStyle props are DERIVED projections of the resolved
 * config (G8) — no live path reads the scalar fields as authority anymore.
 */
export async function resolveDomainRouteShell(input: {
  tenant: Domain | Tenant
  role: 'admin' | 'member' | null
  user: Pick<User, 'id'> | null
  activeCharacter: Character | null
}): Promise<DomainRouteShell> {
  const { tenant, role, user, activeCharacter } = input
  const resolved = resolveDomainDesign(tenant as unknown as LegacyDomainAppearance)
  const shell = await buildDomainShellModel({ tenant, role, userId: user ? Number(user.id) : null, activeCharacter })
  return {
    design: resolved.design,
    shell,
    headerLayout: resolved.variant.headerLayout,
    documentStyle: resolved.variant.documentStyle,
    cssVars: resolved.cssVars,
  }
}