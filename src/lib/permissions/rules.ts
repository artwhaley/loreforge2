import type { Payload } from 'payload'

import { isCapability } from '@/lib/permissions/capabilities'
import { permissionRuleKey } from '@/collections/PermissionRules'

/**
 * PermissionRule writer seam (P05R-T04 E).
 *
 * Logical rule identity is Domain + principalType + principal + resourceType +
 * resource + capability. The collection hook (read-only) refuses duplicate
 * identities; this helper is the deterministic path for changing a rule:
 * - identity already exists -> update the surviving row (effect/active) in
 *   place, returning it;
 * - otherwise -> create the rule.
 * SQLite stores the polymorphic relations in the _rels join table, so no
 * column unique index can express the identity — this service is the
 * enforcement point, backed by the hook's duplicate rejection.
 */
export async function upsertPermissionRule(args: {
  payload: Payload
  domainId: number | string
  principalType: 'Character' | 'User' | 'Role' | 'DomainMembership'
  principal: { relationTo: 'characters' | 'users' | 'roles' | 'domain-memberships'; value: number | string }
  resourceType: 'Domain' | 'Subdomain' | 'Folder' | 'Document' | 'DocumentType'
  resource: { relationTo: 'domains' | 'subdomains' | 'folders' | 'documents' | 'document-types'; value: number | string }
  capability: string
  effect: 'grant' | 'deny'
  active?: boolean
  actorUser: number | string
  actorCharacter?: number | string | null
}) {
  const { payload, domainId, principalType, principal, resourceType, resource, capability, effect, active = true, actorUser, actorCharacter } = args
  if (!isCapability(capability)) throw new Error(`Unknown capability "${capability}".`)
  const relationId = (value: unknown): number | null => {
    if (value === null || value === undefined || value === '') return null
    if (typeof value === 'object' && value !== null && 'value' in value) return Number((value as { value: unknown }).value)
    return typeof value === 'object' && 'id' in value ? Number((value as { id: number | string }).id) : Number(value)
  }
  const ruleKey = permissionRuleKey({ domainId: Number(domainId), principalType, principalRelation: principal.relationTo, principalId: Number(relationId(principal.value)), resourceType, resourceRelation: resource.relationTo, resourceId: Number(relationId(resource.value)), capability })
  const existing = await payload.find({
    collection: 'permission-rules',
    where: { ruleKey: { equals: ruleKey } },
    depth: 0,
    limit: 100,
    overrideAccess: true,
  })
  const targetPrincipalId = Number(relationId(principal.value))
  const targetResourceId = Number(relationId(resource.value))
  for (const rule of existing.docs) {
    const rulePrincipal = (rule as { principal?: { relationTo?: unknown; value?: unknown } }).principal
    const ruleResource = (rule as { resource?: { relationTo?: unknown; value?: unknown } }).resource
    if (rulePrincipal?.relationTo === principal.relationTo && Number(relationId(rulePrincipal.value)) === targetPrincipalId
      && ruleResource?.relationTo === resource.relationTo && Number(relationId(ruleResource.value)) === targetResourceId) {
      return payload.update({
        collection: 'permission-rules',
        id: rule.id,
        overrideAccess: true,
        data: { effect, active, actorUser: Number(actorUser), actorCharacter: actorCharacter == null ? undefined : Number(actorCharacter), ruleKey },
      } as never)
    }
  }
  return payload.create({
    collection: 'permission-rules',
    overrideAccess: true,
    data: {
      domain: Number(domainId),
      principalType,
      principal,
      resourceType,
      resource,
      capability,
      effect,
      active,
      actorUser: Number(actorUser),
      actorCharacter: actorCharacter == null ? undefined : Number(actorCharacter),
      ruleKey,
    },
  } as never)
}
