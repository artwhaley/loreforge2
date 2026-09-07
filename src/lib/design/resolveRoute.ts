import type { Character, Domain, Tenant, User } from '@/payload-types'

import type { DesignDefinition } from './types'
import { resolveDesign } from './registry'
import { pickDesignKey, resolveDocumentStyle, resolveHeaderLayout } from './config'
import { buildDomainShellModel } from '@/lib/shell/buildDomainShellModel'
import { resolveThemeTokens, themeTokensToCssVars } from '@/lib/theme/fonts'

export type DomainRouteShell = {
  design: DesignDefinition
  shell: Awaited<ReturnType<typeof buildDomainShellModel>>
  headerLayout: string
  documentStyle: string
  cssVars: Record<string, string>
}

/**
 * Shared route resolution: authorized shell model + selected Design + variant
 * axes + theme CSS vars. Every designable domain route funnels through this so
 * the route/data layer never assumes a specific records table/card DOM.
 */
export async function resolveDomainRouteShell(input: {
  tenant: Domain | Tenant
  role: 'admin' | 'member' | null
  user: Pick<User, 'id'> | null
  activeCharacter: Character | null
}): Promise<DomainRouteShell> {
  const { tenant, role, user, activeCharacter } = input
  const design = resolveDesign(pickDesignKey((tenant as unknown as { designTemplate?: unknown }).designTemplate))
  const shell = await buildDomainShellModel({ tenant, role, userId: user ? Number(user.id) : null, activeCharacter })
  const headerLayout = resolveHeaderLayout(design, tenant as unknown as Record<string, unknown>)
  const documentStyle = resolveDocumentStyle(design, tenant as unknown as Record<string, unknown>)
  const cssVars = themeTokensToCssVars(resolveThemeTokens(tenant as unknown as Parameters<typeof resolveThemeTokens>[0]))
  return { design, shell, headerLayout, documentStyle, cssVars }
}
