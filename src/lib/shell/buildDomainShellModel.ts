import type { Character, Domain, Tenant } from '@/payload-types'

import type { DomainShellModel, DomainSwitcherOption, CharacterSwitcherOption } from '@/lib/page-models/shell'
import { PLATFORM_NOUNS as vocab } from '@/lib/theme/nouns'
import { mediaSrc } from '@/lib/theme/fonts'
import { getActiveContext } from '@/lib/tenant/activeTenant'
import { getCharactersForTenant, getTenantsForUser } from '@/lib/tenant/queries'
import { loadCachedAuthorizationSession } from '@/lib/authz/sessionCache'
import { decideOne, type AuthzSession } from '@/lib/authz/session'
import { canOpenPeopleSession } from '@/lib/authz/workspaces'
import { canManageDomainInvitations } from '@/lib/invitations/workflows'
import { getLorePayload } from '@/lib/payload'

type DomainRecord = Tenant

/**
 * Authorized Domain shell model assembly (Stage D). This owns every permission
 * decision that determines which management/navigation items exist. A Design
 * receives already-filtered navigation and never calls authorization services.
 */
export async function buildDomainShellModel(input: {
  tenant: Domain | Tenant
  role: 'admin' | 'member' | null
  userId?: number | null
  activeCharacter?: Character | null
  switcherTenants?: Array<Domain | Tenant> | null
  switcherCharacters?: Character[] | null
}): Promise<DomainShellModel> {
  const { tenant, userId, activeCharacter } = input
  const base = `/domain/${tenant.slug}`
  const context = await getActiveContext()

  const resolvedCharacters = input.switcherCharacters ?? (userId != null ? await getCharactersForTenant(tenant, userId) : context.characters)
  const resolvedTenants = input.switcherTenants ?? (userId != null ? await getTenantsForUser(userId) : [])
  const payload = userId != null ? await getLorePayload() : null
  const session = payload && userId != null ? await loadCachedAuthorizationSession(payload, userId, activeCharacter?.id ?? null, tenant.id) : null

  // People workspace (application seam, not a raw capability).
  const canMembers = session ? await canOpenPeopleSession(session) : false
  const canRoles = session ? decideDomainOrAny(session, 'manage_roles') || decideDomainOrAnySubdomain(session, 'manage_roles') : false
  const canFolders = session ? decideDomainOrAny(session, 'manage_folders') || decideDomainOrAnyFolder(session, 'manage_folders') : false
  const canDepartments = session ? decideDomainOrAny(session, 'manage_subdomain') : false
  const canDocumentTypes = session ? (decideDomainOrAny(session, 'manage_types_tags') || decideDomainOrAny(session, 'manage_templates')) : false
  const canCustomize = session ? decideDomainOrAny(session, 'manage_domain_appearance') : false
  const canInvitations = payload && userId != null ? await canManageDomainInvitations(payload, { userId, activeCharacterId: activeCharacter?.id ?? null }, tenant.id) : false

  const managementNavigation: DomainShellModel['managementNavigation'] = []
  if (canMembers) managementNavigation.push({ label: 'People', segment: 'manage/people', href: `${base}/manage/people` })
  if (input.role === 'admin') managementNavigation.push({ label: vocab.member.plural, segment: 'members', href: `${base}/members` })
  if (canRoles) managementNavigation.push({ label: vocab.role.plural, segment: 'roles', href: `${base}/roles` })
  if (canFolders) managementNavigation.push({ label: vocab.folder.plural, segment: 'manage/folders', href: `${base}/manage/folders` })
  if (canDepartments) managementNavigation.push({ label: vocab.subdomain.plural, segment: 'manage/departments', href: `${base}/manage/departments` })
  if (canDocumentTypes) managementNavigation.push({ label: 'Document Types', segment: 'document-types', href: `${base}/document-types`, })
  if (canInvitations) managementNavigation.push({ label: 'Invitations', segment: 'manage/invitations', href: `${base}/manage/invitations` })
  if (canCustomize) managementNavigation.push({ label: 'Customize', segment: 'customize', href: `${base}/customize` })

  const primaryNavigation: DomainShellModel['primaryNavigation'] = [
    { label: 'Home', segment: '', href: base },
    { label: 'About', segment: 'about', href: `${base}/about` },
    { label: 'Lore', segment: 'lore', href: `${base}/lore` },
    { label: 'Departments', segment: 'departments', href: `${base}/departments` },
    { label: 'Records', segment: 'records', href: `${base}/records` },
  ]

  const availableDomains: DomainSwitcherOption[] = resolvedTenants.map((item) => ({ id: Number(item.id), slug: item.slug, name: item.name }))
  const availableCharacters: CharacterSwitcherOption[] = resolvedCharacters.map((character) => ({ id: Number(character.id), name: character.name }))

  return {
    domain: {
      id: Number(tenant.id),
      slug: tenant.slug,
      name: tenant.name,
      motto: tenant.motto ?? '',
      logoUrl: mediaSrc((tenant as unknown as { logo?: { filename?: string | null } | number | null }).logo),
      bannerUrl: mediaSrc((tenant as unknown as { banner?: { filename?: string | null } | number | null }).banner),
      backgroundUrl: mediaSrc((tenant as unknown as { backgroundImage?: { filename?: string | null } | number | null }).backgroundImage),
    },
    primaryNavigation,
    managementNavigation,
    operatingContext: {
      platformLabel: 'Loreforge',
      availableDomains,
      activeDomainId: Number(tenant.id),
      availableCharacters,
      activeCharacterId: activeCharacter != null ? Number(activeCharacter.id) : null,
      account: context.user ? { name: context.user.name ?? context.user.email ?? 'Account', email: context.user.email ?? '' } : null,
    },
    routes: { baseUrl: base, workUrl: `${base}/work` },
  }
}

function decideDomainOrAny(session: AuthzSession, capability: string): boolean {
  if (session.authority) return true
  return decideOne(session, capability as never, { type: 'Domain', id: session.domainId }).allowed
}

function decideDomainOrAnySubdomain(session: AuthzSession, capability: string): boolean {
  if (session.authority) return true
  for (const subdomainId of session.subdomains.keys()) if (decideOne(session, capability as never, { type: 'Subdomain', id: subdomainId }).allowed) return true
  return false
}

function decideDomainOrAnyFolder(session: AuthzSession, capability: string): boolean {
  if (session.authority) return true
  for (const folderId of session.folders.keys()) if (decideOne(session, capability as never, { type: 'Folder', id: folderId }).allowed) return true
  return false
}