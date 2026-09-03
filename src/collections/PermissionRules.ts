import type { CollectionConfig } from 'payload'

const relationId = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'object' && value !== null && 'value' in value) return relationId((value as { value: unknown }).value)
  return typeof value === 'object' && 'id' in value ? Number((value as { id: number | string }).id) : Number(value)
}

/** Central permission rows. P05 uses Character/Role + Folder Read/Write rows; P07 completes evaluation. */
export const PermissionRules: CollectionConfig = {
  slug: 'permission-rules',
  admin: { useAsTitle: 'capability', defaultColumns: ['domain', 'principalType', 'resourceType', 'capability', 'effect'] },
  timestamps: true,
  fields: [
    { name: 'domain', type: 'relationship', relationTo: 'domains', required: true, index: true },
    { name: 'principalType', type: 'select', required: true, options: [{ label: 'Character', value: 'Character' }, { label: 'User', value: 'User' }, { label: 'Role', value: 'Role' }, { label: 'Domain membership', value: 'DomainMembership' }] },
    { name: 'principal', type: 'relationship', relationTo: ['characters', 'users', 'roles', 'domain-memberships'], required: true, index: true },
    { name: 'resourceType', type: 'select', required: true, options: [{ label: 'Domain', value: 'Domain' }, { label: 'Department', value: 'Subdomain' }, { label: 'Folder', value: 'Folder' }, { label: 'Document', value: 'Document' }] },
    { name: 'resource', type: 'relationship', relationTo: ['domains', 'subdomains', 'folders', 'documents'], required: true, index: true },
    { name: 'capability', type: 'select', required: true, options: [{ label: 'Read', value: 'read' }, { label: 'Create documents', value: 'create_document' }, { label: 'Edit documents', value: 'edit_document' }, { label: 'Manage access', value: 'manage_access' }, { label: 'Manage roles', value: 'manage_roles' }, { label: 'Assign roles', value: 'assign_roles' }, { label: 'Assign subordinates', value: 'assign_subordinates' }] },
    { name: 'effect', type: 'select', required: true, options: [{ label: 'Grant', value: 'grant' }, { label: 'Deny', value: 'deny' }] },
    { name: 'active', type: 'checkbox', defaultValue: true },
    { name: 'actorUser', type: 'relationship', relationTo: 'users', required: true, admin: { readOnly: true } },
    { name: 'actorCharacter', type: 'relationship', relationTo: 'characters', admin: { readOnly: true } },
  ],
  hooks: {
    beforeChange: [async ({ data, originalDoc, req }) => {
      const domainId = relationId(data?.domain ?? originalDoc?.domain)
      const principalType = String(data?.principalType ?? originalDoc?.principalType ?? '')
      const resourceType = String(data?.resourceType ?? originalDoc?.resourceType ?? '')
      const principalId = relationId(data?.principal ?? originalDoc?.principal)
      const resourceId = relationId(data?.resource ?? originalDoc?.resource)
      if (!domainId || !principalId || !resourceId) throw new Error('Permission rules require a Domain, principal, and resource.')
      if ((principalType === 'Character' || principalType === 'Role') && resourceType === 'Folder') {
        const folder = await req.payload.findByID({ collection: 'folders', id: resourceId, depth: 0 })
        if (relationId(folder.domain) !== domainId) throw new Error('Folder access must stay inside the rule Domain.')
      }
      if ((principalType === 'Character' || principalType === 'User') && resourceType === 'Document') {
        const document = await req.payload.findByID({ collection: 'documents', id: resourceId, depth: 0, overrideAccess: true })
        if (relationId(document.domain) !== domainId) throw new Error('Document sharing must stay inside the rule Domain.')
      }
      return data
    }],
  },
}
