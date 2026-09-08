import type { Character, Domain, Tenant, User } from '@/payload-types'

import type { PeopleManagementPageModel } from '@/lib/page-models/management/people'
import { isAllowed } from '@/lib/authz/evaluate'
import { canOpenPeople } from '@/lib/authz/workspaces'
import { getLorePayload } from '@/lib/payload'

/**
 * People search Page Model builder (OBSIDIAN-T06). Admission mirrors the
 * current route: any of manage_members / manage_roles / manage_access at
 * Domain scope, or the delegated people-session opener. Returns null → the
 * route maps to notFound(). Search results stay server-filtered through the
 * people-search machinery — never part of this initial model.
 */
export async function buildPeopleManagementPageModel(input: {
  tenant: Domain | Tenant
  user: Pick<User, 'id'>
  activeCharacter: Character | null
}): Promise<PeopleManagementPageModel | null> {
  const { tenant, user, activeCharacter } = input
  const payload = await getLorePayload()
  const allowed = await Promise.all(['manage_members', 'manage_roles', 'manage_access'].map((capability) =>
    isAllowed({ payload, actor: { userId: user.id, activeCharacterId: activeCharacter?.id ?? null }, domainId: tenant.id, capability, resource: { type: 'Domain', id: tenant.id } })))
  if (!allowed.some(Boolean) && !await canOpenPeople(payload, { userId: user.id, activeCharacterId: activeCharacter?.id }, tenant.id)) return null
  return {
    baseUrl: `/domain/${tenant.slug}`,
    domainSlug: tenant.slug,
    domainName: tenant.name,
    canOpenPeople: true,
    status: null,
  }
}