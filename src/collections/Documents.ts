import type { CollectionConfig } from 'payload'

export const Documents: CollectionConfig = {
  slug: 'documents',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'tenant', 'origin', 'updatedAt'],
  },
  timestamps: true,
  fields: [
    {
      name: 'domain',
      type: 'relationship',
      relationTo: 'domains',
      label: 'Domain',
      admin: { description: 'Canonical Domain relationship. Populated by the Phase 3 migration.' },
    },
    {
      name: 'tenant',
      type: 'relationship',
      relationTo: 'tenants',
      required: true,
      admin: { hidden: true },
    },
    {
      name: 'folder',
      type: 'relationship',
      relationTo: 'folders',
      index: true,
      admin: {
        description: 'Archive folder. Leave empty to file at the root.',
      },
    },
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'body',
      type: 'textarea',
      required: true,
      admin: {
        description:
          'Canonical Markdown body. Presentation (theme) is applied by the tenant, never stored here.',
      },
    },
    {
      name: 'origin',
      type: 'select',
      required: true,
      defaultValue: 'web-editor',
      options: [
        { label: 'Web editor', value: 'web-editor' },
        { label: 'Markdown import', value: 'markdown-import' },
        { label: 'Form', value: 'form' },
      ],
    },
    {
      name: 'createdBy',
      type: 'relationship',
      relationTo: 'users',
      admin: {
        description: 'Author, if known',
      },
    },
  ],
}
