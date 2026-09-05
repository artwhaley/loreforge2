import type { CollectionConfig } from 'payload'

// Legacy compatibility only (P05R-T06 D). New product code must not depend on
// this model — Domains are the canonical unit. Removal is P10 work (DEF-TENANT-01).
export const Tenants: CollectionConfig = {
  slug: 'tenants',
  admin: {
    hidden: true,
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
        { label: 'Ink (Loreforge print)', value: 'ink' },
        { label: 'Gallery (quiet light)', value: 'gallery' },
        { label: 'Verdant (forest civic)', value: 'verdant' },
        { label: 'Nocturne (dramatic dark)', value: 'nocturne' },
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
        { label: 'Newsreader (Loreforge editorial serif)', value: 'newsreader' },
        { label: 'Verdana (neutral sans-serif)', value: 'verdana' },
        { label: 'Trebuchet (friendly sans-serif)', value: 'trebuchet' },
        { label: 'Lato (Loreforge clean sans)', value: 'lato' },
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
        { label: 'Lato (Loreforge clean sans)', value: 'lato' },
        { label: 'Newsreader (editorial serif)', value: 'newsreader' },
      ],
      defaultValue: 'verdana',
      required: true,
    },
    {
      name: 'logo',
      type: 'upload',
      relationTo: 'media',
      label: 'Seal / logo',
      admin: {
        description: 'Optional Domain seal or logo (image).',
      },
    },
    {
      name: 'banner',
      type: 'upload',
      relationTo: 'media',
      label: 'Banner image',
      admin: {
        description: 'Optional header banner (image).',
      },
    },
    // ---- Design template + layout/document/background tokens (mirrored from
    // Domains while the legacy union is alive; see DEF-TENANT-01) ----
    {
      name: 'designTemplate',
      type: 'select',
      label: 'Design template',
      options: [
        { label: 'Civic (classic community)', value: 'civic' },
        { label: 'Ledger (Loreforge print)', value: 'ledger' },
        { label: 'Poster (bold modern)', value: 'poster' },
      ],
      defaultValue: 'civic',
    },
    {
      name: 'contentWidth',
      type: 'select',
      label: 'Content width',
      options: [
        { label: 'Narrow (focused reading)', value: 'narrow' },
        { label: 'Standard', value: 'standard' },
        { label: 'Wide', value: 'wide' },
      ],
      defaultValue: 'standard',
    },
    {
      name: 'headerLayout',
      type: 'select',
      label: 'Header layout',
      options: [
        { label: 'Centered masthead', value: 'centered' },
        { label: 'Compact bar', value: 'left-aligned' },
        { label: 'Banner hero', value: 'banner-forward' },
      ],
      defaultValue: 'centered',
    },
    {
      name: 'documentStyle',
      type: 'select',
      label: 'Document reading style',
      options: [
        { label: 'Classic (serif record sheet)', value: 'classic' },
        { label: 'Modern (clean reading)', value: 'modern' },
      ],
      defaultValue: 'classic',
    },
    {
      name: 'backgroundTreatment',
      type: 'select',
      label: 'Background treatment',
      options: [
        { label: 'Plain color', value: 'plain' },
        { label: 'Color washes', value: 'washes' },
        { label: 'Soft texture (image)', value: 'soft' },
        { label: 'Vignette (image)', value: 'vignette' },
      ],
      defaultValue: 'plain',
    },
    {
      name: 'backgroundImage',
      type: 'upload',
      relationTo: 'media',
      label: 'Background image',
    },
  ],
}
