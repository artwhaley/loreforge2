import type { Character, Tenant } from '@/payload-types'

import { getActiveContext } from '@/lib/tenant/activeTenant'
import { buildDomainShellModel } from '@/lib/shell/buildDomainShellModel'
import { resolveDesign } from '@/lib/design/registry'
import { pickDesignKey, resolveDocumentStyle, resolveHeaderLayout } from '@/lib/design/config'
import { resolveThemeTokens, themeTokensToCssVars } from '@/lib/theme/fonts'

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
  const design = resolveDesign(pickDesignKey((tenant as unknown as { designTemplate?: unknown }).designTemplate))
  const headerLayout = resolveHeaderLayout(design, tenant as unknown as Record<string, unknown>)
  const documentStyle = resolveDocumentStyle(design, tenant as unknown as Record<string, unknown>)
  const tokens = themeTokensToCssVars(resolveThemeTokens(tenant))
  const Shell = design.Shell
  return (
    <Shell model={shell} theme={{ tokens, headerLayout, documentStyle }}>
      {children}
    </Shell>
  )
}
