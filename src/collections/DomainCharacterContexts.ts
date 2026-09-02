import type { CollectionConfig } from 'payload'

/**
 * Domain-local display context. This is intentionally not a membership table:
 * an alias can exist for a mentioned Character without granting participation.
 */
export const DomainCharacterContexts: CollectionConfig = {
  slug: 'domain-character-contexts',
  admin: {
    useAsTitle: 'localDisplayName',
    defaultColumns: ['tenant', 'character', 'localDisplayName', 'updatedAt'],
  },
  timestamps: true,
  fields: [
    {
      name: 'tenant',
      type: 'relationship',
      relationTo: 'tenants',
      required: true,
      index: true,
      label: 'Domain',
    },
    {
      name: 'character',
      type: 'relationship',
      relationTo: 'characters',
      required: true,
      index: true,
    },
    {
      name: 'localDisplayName',
      type: 'text',
      required: true,
      label: 'Local display name',
    },
    {
      name: 'localNote',
      type: 'textarea',
      label: 'Local note',
    },
  ],
}
