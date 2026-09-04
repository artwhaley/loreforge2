import type { Payload } from 'payload'

const idOf = (value: unknown): number | null => value && typeof value === 'object' && 'id' in value ? Number((value as { id: number | string }).id) : value == null || value === '' ? null : Number(value)

/** Validate a Role default rule's scope without ever adding scope to a RoleAssignment. */
export async function assertRoleDefaultScope(payload: Payload, args: { domainId: number | string; roleId: number | string; folderId: number | string }) {
  const [role, folder] = await Promise.all([
    payload.findByID({ collection: 'roles', id: args.roleId, depth: 0, overrideAccess: true }).catch(() => null),
    payload.findByID({ collection: 'folders', id: args.folderId, depth: 0, overrideAccess: true }).catch(() => null),
  ])
  if (!role || !folder || idOf(role.domain) !== Number(args.domainId) || idOf(folder.domain) !== Number(args.domainId)) throw new Error('Role defaults must stay inside the selected Domain.')
  return true
}
