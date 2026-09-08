import type { Character, Domain, Tenant, User } from '@/payload-types'

import type { DocumentTypesManagementPageModel } from '@/lib/page-models/management/documentTypes'
import { isAllowed } from '@/lib/authz/evaluate'
import { resolveInspectorData, resolveTypeTree } from '@/lib/documents/typeTree'
import { getLorePayload } from '@/lib/payload'

/**
 * Document Types management Page Model builder (OBSIDIAN-T05). Wraps the
 * existing P08X resolvers (`resolveTypeTree`, `resolveInspectorData`) and the
 * `manage_types_tags` capability decision — no rematerialization of tree or
 * Unassigned semantics. Returns the model; admission is `user` presence (the
 * route's current rule), with `canManage` gating the create/edit affordances.
 */
export async function buildDocumentTypesManagementPageModel(input: {
  tenant: Domain | Tenant
  user: Pick<User, 'id'>
  activeCharacter: Character | null
}): Promise<DocumentTypesManagementPageModel> {
  const { tenant, user, activeCharacter } = input
  const payload = await getLorePayload()
  const tree = await resolveTypeTree(payload, tenant.id)
  const [inspector, canManage] = await Promise.all([
    resolveInspectorData(payload, tenant.id, tree.types.map((type) => type.id)),
    isAllowed({ payload, actor: { userId: user.id, activeCharacterId: activeCharacter?.id ?? null }, domainId: tenant.id, capability: 'manage_types_tags', resource: { type: 'Domain', id: tenant.id } }),
  ])
  return {
    baseUrl: `/domain/${tenant.slug}`,
    domainSlug: tenant.slug,
    domainName: tenant.name,
    tree,
    inspector,
    canManage,
    status: null,
  }
}