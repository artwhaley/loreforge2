import type { CollectionConfig } from 'payload'

export const Tenants: CollectionConfig = {
  slug: 'tenants',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'slug', 'preset'],
  },
  access: {
    // MVP: local spike, keep the admin usable. Tenant scoping of reads/writes is
    // enforced in application data access, not here (see src/lib/tenant).
    read: () => true,
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      admin: {
        description: 'URL identifier, e.g. ravenhurst',
      },
    },
    {
      name: 'motto',
      type: 'text',
    },
    // ---- TenantTheme (embedded: one theme per tenant for MVP) ----
    {
      type: 'ui',
      name: 'themeDivider',
      label: 'Theme',
      admin: {},
    },
    {
      name: 'preset',
      type: 'select',
      label: 'Theme preset',
      options: [
        { label: 'Heritage (traditional civic)', value: 'heritage' },
        { label: 'Modern (coastal metropolitan)', value: 'modern' },
      ],
      defaultValue: 'heritage',
      required: true,
    },
    {
      name: 'primaryColor',
      type: 'text',
      label: 'Primary color',
      defaultValue: '#243145',
      required: true,
    },
    {
      name: 'secondaryColor',
      type: 'text',
      label: 'Secondary color',
      defaultValue: '#8A6A3C',
      required: true,
    },
    {
      name: 'accentColor',
      type: 'text',
      label: 'Accent color',
      defaultValue: '#B9975B',
      required: true,
    },
    {
      name: 'backgroundColor',
      type: 'text',
      label: 'Page / background color',
      defaultValue: '#F3EFE6',
      required: true,
    },
    {
      name: 'headingFontKey',
      type: 'select',
      label: 'Heading font',
      options: [
        { label: 'Georgia (traditional serif)', value: 'georgia' },
        { label: 'Palatino (bookish serif)', value: 'palatino' },
        { label: 'Verdana (neutral sans-serif)', value: 'verdana' },
        { label: 'Trebuchet (friendly sans-serif)', value: 'trebuchet' },
      ],
      defaultValue: 'georgia',
      required: true,
    },
    {
      name: 'bodyFontKey',
      type: 'select',
      label: 'Body font',
      options: [
        { label: 'Verdana (highly readable sans)', value: 'verdana' },
        { label: 'Georgia (readable serif)', value: 'georgia' },
        { label: 'Trebuchet (friendly sans)', value: 'trebuchet' },
        { label: 'Tahoma (compact sans)', value: 'tahoma' },
      ],
      defaultValue: 'verdana',
      required: true,
    },
  ],
}
