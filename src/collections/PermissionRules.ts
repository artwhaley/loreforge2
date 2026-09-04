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
const resourceCollection = (type: string): string | null => ({ Domain: 'domains', Subdomain: 'subdomains', Folder: 'folders', Document: 'documents' })[type] ?? null

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
    { name: 'resource', type: 'relationship', relationTo: ['domains', 'subdomains', 'folders', 'documents'], required: true, index: true },
    { name: 'capability', type: 'select', required: true, options: CAPABILITIES.map((value) => ({ label: CAPABILITY_LABELS[value], value })) },
    { name: 'effect', type: 'select', required: true, options: [{ label: 'Grant', value: 'grant' }, { label: 'Deny', value: 'deny' }] },
    { name: 'active', type: 'checkbox', defaultValue: true },
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
      const scopedCollections = { roles: 'roles', 'domain-memberships': 'domain-memberships', folders: 'folders', documents: 'documents', subdomains: 'subdomains', domains: 'domains' } as const
      for (const [label, relation] of [['principal', principalRelation], ['resource', resourceRelation]] as const) {
        const collectionName = relation.relationTo && scopedCollections[relation.relationTo as keyof typeof scopedCollections] ? scopedCollections[relation.relationTo as keyof typeof scopedCollections] : null
        if (!collectionName) continue
        const row = await req.payload.findByID({ collection: collectionName, id: relationId(relation.value) ?? 0, depth: 0, overrideAccess: true }).catch(() => null)
        const rowDomain = row ? relationId((row as { domain?: unknown }).domain) : null
        if (rowDomain && Number(rowDomain) !== Number(domainId)) throw new Error(`The ${label} must belong to the rule Domain.`)
      }
      // P05R-T04 E: one current effect per deterministic logical identity
      // (Domain + principalType + principal + resourceType + resource +
      // capability). The hook is READ-ONLY and rejects any write that would
      // create a duplicate identity — effect changes go through
      // upsertPermissionRule (src/lib/permissions/rules.ts), which updates the
      // surviving row deterministically. The hook must not write here: with
      // real per-operation transactions, hook-inner payload writes on the
      // single-connection SQLite client fail with SQLITE_BUSY. (Polymorphic
      // relations live in the _rels join table, so a plain column unique index
      // cannot express the identity either.)
      if (operation === 'create' || data?.capability !== undefined || data?.effect !== undefined) {
        const existing = await req.payload.find({ collection: 'permission-rules', where: { and: [{ domain: { equals: domainId } }, { principalType: { equals: principalType } }, { resourceType: { equals: resourceType } }, { capability: { equals: capability } }] }, depth: 0, limit: 100, overrideAccess: true })
        for (const rule of existing.docs) {
          if (rule.id === originalDoc?.id) continue
          const rulePrincipal = resolveRelation((rule as { principal: unknown }).principal)
          const ruleResource = resolveRelation((rule as { resource: unknown }).resource)
          const sameIdentity = rulePrincipal.relationTo === principalRelation.relationTo
            && relationId(rulePrincipal.value) === principalId
            && ruleResource.relationTo === resourceRelation.relationTo
            && relationId(ruleResource.value) === resourceId
          if (!sameIdentity) continue
          throw new Error('DUPLICATE_EQUIVALENT_RULE')
        }
      }
      return data
    }],
  },
}