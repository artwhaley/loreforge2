import type { CollectionConfig } from 'payload'

/**
 * Tenant informational website pages (Home welcome, About, etc.).
 *
 * Prose lives as canonical Markdown in `body` so it round-trips through the
 * same editor as archive documents (spec §6.5, §7.6). No block layout builder.
 * Tenant scoping of reads/writes is enforced in the application data layer
 * (see src/lib/tenant), not here.
 */
export const Pages: CollectionConfig = {
  slug: 'pages',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'slug', 'tenant', 'published'],
  },
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'tenant',
      type: 'relationship',
      relationTo: 'tenants',
      required: true,
    },
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      admin: {
        description: 'URL identifier, e.g. about, home',
      },
    },
    {
      name: 'body',
      type: 'textarea',
      required: true,
      admin: {
        description: 'Canonical Markdown body.',
      },
    },
    {
      name: 'published',
      type: 'checkbox',
      label: 'Published',
      defaultValue: true,
    },
  ],
}
