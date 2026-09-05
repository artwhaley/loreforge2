import type { CollectionConfig } from 'payload'

import { CAPABILITIES, CAPABILITY_LABELS, isCapability, PRINCIPAL_TYPES, RESOURCE_TYPES } from '@/lib/permissions/capabilities'

const relationId = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'object' && value !== null && 'value' in value) return relationId((value as { value: unknown }).value)
  return typeof value === 'object' && 'id' in value ? Number((value as { id: number | string }).id) : Number(value)
}

const resolveRelation = (value: unknown): { relationTo: string | null; value: unknown } => {
  if (value && typeof value === 'object' && 'relationTo' in value && 'value' in value) {
    return { relationTo: String((value as { relationTo: unknown }).relationTo), value: (value as { value: unknown }).value }
  }
  return { relationTo: null, value }
}

const principalCollection = (type: string): string | null => ({ Character: 'characters', User: 'users', Role: 'roles', DomainMembership: 'domain-memberships' })[type] ?? null
const resourceCollection = (type: string): string | null => ({ Domain: 'domains', Subdomain: 'subdomains', Folder: 'folders', Document: 'documents', DocumentType: 'document-types' })[type] ?? null

/** Length-delimited JSON gives every logical identity one unambiguous key. */
export const permissionRuleKey = (parts: { domainId: number; principalType: string; principalRelation: string; principalId: number; resourceType: string; resourceRelation: string; resourceId: number; capability: string }) => JSON.stringify([
  parts.domainId, parts.principalType, parts.principalRelation, parts.principalId,
  parts.resourceType, parts.resourceRelation, parts.resourceId, parts.capability,
])

/** Central permission rows. P05 uses Character/Role + Folder Read/Write rows; P07 completes evaluation. */
export const PermissionRules: CollectionConfig = {
  slug: 'permission-rules',
  admin: { useAsTitle: 'capability', defaultColumns: ['domain', 'principalType', 'resourceType', 'capability', 'effect'] },
  timestamps: true,
  // Interim authority boundary (P05R-T01): PermissionRule rows are security
  // truth. They are written only by the sanctioned People-workspace route and
  // read only by internal services; direct REST/GraphQL/Admin access is
  // denied so no caller can self-grant or read another Domain's rules.
  access: {
    read: () => false,
    create: () => false,
    update: () => false,
    delete: () => false,
  },
  fields: [
    { name: 'domain', type: 'relationship', relationTo: 'domains', required: true, index: true },
    { name: 'principalType', type: 'select', required: true, options: PRINCIPAL_TYPES.map((value) => ({ label: value === 'DomainMembership' ? 'Domain membership' : value, value })) },
    { name: 'principal', type: 'relationship', relationTo: ['characters', 'users', 'roles', 'domain-memberships'], required: true, index: true },
    { name: 'resourceType', type: 'select', required: true, options: RESOURCE_TYPES.map((value) => ({ label: value, value })) },
    { name: 'resource', type: 'relationship', relationTo: ['domains', 'subdomains', 'folders', 'documents', 'document-types'], required: true, index: true },
    { name: 'capability', type: 'select', required: true, options: CAPABILITIES.map((value) => ({ label: CAPABILITY_LABELS[value], value })) },
    { name: 'effect', type: 'select', required: true, options: [{ label: 'Grant', value: 'grant' }, { label: 'Deny', value: 'deny' }] },
    { name: 'active', type: 'checkbox', defaultValue: true },
    { name: 'ruleKey', type: 'text', required: true, unique: true, admin: { readOnly: true, hidden: true } },
    { name: 'actorUser', type: 'relationship', relationTo: 'users', required: true, admin: { readOnly: true } },
    { name: 'actorCharacter', type: 'relationship', relationTo: 'characters', admin: { readOnly: true } },
  ],
  hooks: {
    beforeChange: [async ({ data, originalDoc, operation, req }) => {
      const domainId = relationId(data?.domain ?? originalDoc?.domain)
      const principalType = String(data?.principalType ?? originalDoc?.principalType ?? '')
      const resourceType = String(data?.resourceType ?? originalDoc?.resourceType ?? '')
      const principalId = relationId(data?.principal ?? originalDoc?.principal)
      const resourceId = relationId(data?.resource ?? originalDoc?.resource)
      if (!domainId || !principalId || !resourceId) throw new Error('Permission rules require a Domain, principal, and resource.')
      // P05R-T04 C: capability must come from the shared frozen contract list.
      const capability = String(data?.capability ?? originalDoc?.capability ?? '')
      if (!isCapability(capability)) throw new Error(`Unknown capability "${capability}".`)
      // P05R-T04 D: the polymorphic relation must match the declared type and
      // every Domain-scoped endpoint must stay inside the rule Domain
      // (characters and users are global identities and are not scoped).
      const principalRelation = resolveRelation(data?.principal ?? originalDoc?.principal)
      const resourceRelation = resolveRelation(data?.resource ?? originalDoc?.resource)
      const principalCollectionName = principalCollection(principalType)
      const resourceCollectionName = resourceCollection(resourceType)
      if (!principalCollectionName || !resourceCollectionName) throw new Error(`Unknown principalType "${principalType}" or resourceType "${resourceType}".`)
      if (principalRelation.relationTo && principalRelation.relationTo !== principalCollectionName) {
        throw new Error(`principalType ${principalType} requires a ${principalCollectionName} relation, got ${principalRelation.relationTo}.`)
      }
      if (resourceRelation.relationTo && resourceRelation.relationTo !== resourceCollectionName) {
        throw new Error(`resourceType ${resourceType} requires a ${resourceCollectionName} relation, got ${resourceRelation.relationTo}.`)
      }
      if (!principalRelation.relationTo || !resourceRelation.relationTo) throw new Error('Permission rules require explicit polymorphic relation types.')
      const scopedCollections = { roles: 'roles', 'domain-memberships': 'domain-memberships', folders: 'folders', documents: 'documents', subdomains: 'subdomains', domains: 'domains', 'document-types': 'document-types' } as const
      for (const [label, relation] of [['principal', principalRelation], ['resource', resourceRelation]] as const) {
        const collectionName = relation.relationTo && scopedCollections[relation.relationTo as keyof typeof scopedCollections] ? scopedCollections[relation.relationTo as keyof typeof scopedCollections] : null
        if (!collectionName) continue
        const row = await req.payload.findByID({ collection: collectionName, id: relationId(relation.value) ?? 0, depth: 0, overrideAccess: true }).catch(() => null)
        if (!row) throw new Error(`The ${label} resource does not exist.`)
        const rowDomain = collectionName === 'domains'
          ? Number(row.id)
          : relationId((row as { domain?: unknown }).domain)
        if (!rowDomain || Number(rowDomain) !== Number(domainId)) throw new Error(`The ${label} must belong to the rule Domain.`)
      }
      const key = permissionRuleKey({ domainId: Number(domainId), principalType, principalRelation: principalRelation.relationTo, principalId, resourceType, resourceRelation: resourceRelation.relationTo, resourceId, capability })
      ;(data as Record<string, unknown>).ruleKey = key
      const existing = await req.payload.find({ collection: 'permission-rules', where: { ruleKey: { equals: key } }, depth: 0, limit: 1, overrideAccess: true, req: req.transactionID == null ? undefined : { transactionID: req.transactionID } })
      if (existing.docs[0] && existing.docs[0].id !== originalDoc?.id) throw new Error('DUPLICATE_EQUIVALENT_RULE')
      if (operation === 'create' && !data?.ruleKey) {
        throw new Error('Permission rule identity could not be established.')
      }
      return data
    }],
  },
}
