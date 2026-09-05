import type { CollectionConfig } from 'payload'

import { assertDomainOwnership } from '@/lib/domains/invariants'

const ownerInvariant = ({ data, originalDoc }: { data: Record<string, unknown>; originalDoc?: Record<string, unknown> }) => {
  const kind = (data.kind ?? originalDoc?.kind ?? 'community') as string
  const lifecycle = (data.lifecycle ?? originalDoc?.lifecycle ?? 'active') as string
  const ownerUser = data.ownerUser ?? originalDoc?.ownerUser
  const ownerCharacter = data.ownerCharacter ?? originalDoc?.ownerCharacter
  assertDomainOwnership({ kind, lifecycle, ownerUser, ownerCharacter })
  return data
}

/** Durable Domain model. The legacy Tenants collection remains hidden only while migration runs. */
export const Domains: CollectionConfig = {
  slug: 'domains',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'slug', 'kind', 'ownerUser', 'lifecycle'],
  },
  hooks: {
    beforeChange: [({ data, originalDoc }) => ownerInvariant({ data: data as Record<string, unknown>, originalDoc: originalDoc as Record<string, unknown> | undefined })],
  },
  access: {
    read: () => true,
    // Domain creation and ownership/lifecycle changes use the explicit
    // platform/bootstrap workflow; direct REST/Admin writes stay closed.
    create: () => false,
    update: () => false,
    delete: () => false,
  },
  timestamps: true,
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'slug', type: 'text', required: true, unique: true, index: true },
    { name: 'kind', type: 'select', required: true, defaultValue: 'community', options: [{ label: 'Community', value: 'community' }, { label: 'Personal', value: 'personal' }] },
    { name: 'ownerUser', type: 'relationship', relationTo: 'users', label: 'Owner User', index: true },
    { name: 'ownerCharacter', type: 'relationship', relationTo: 'characters', label: 'Owner Character', index: true },
    { name: 'lifecycle', type: 'select', required: true, defaultValue: 'active', options: [{ label: 'Setup pending', value: 'setup-pending' }, { label: 'Active', value: 'active' }, { label: 'Grace', value: 'grace' }, { label: 'Read-only', value: 'read-only' }, { label: 'Suspended', value: 'suspended' }, { label: 'Archived / Closed', value: 'archived' }] },
    { name: 'defaultFilingPolicy', type: 'select', required: true, defaultValue: 'direct-file', options: [{ label: 'Direct file', value: 'direct-file' }, { label: 'Review required', value: 'review-required' }] },
    { name: 'motto', type: 'text' },
    { name: 'preset', type: 'select', label: 'Theme preset', options: [{ label: 'Heritage (traditional civic)', value: 'heritage' }, { label: 'Modern (coastal metropolitan)', value: 'modern' }], defaultValue: 'heritage', required: true },
    { name: 'primaryColor', type: 'text', label: 'Primary color', defaultValue: '#243145', required: true },
    { name: 'secondaryColor', type: 'text', label: 'Secondary color', defaultValue: '#8A6A3C', required: true },
    { name: 'accentColor', type: 'text', label: 'Accent color', defaultValue: '#B9975B', required: true },
    { name: 'backgroundColor', type: 'text', label: 'Page / background color', defaultValue: '#F3EFE6', required: true },
    { name: 'headingFontKey', type: 'select', label: 'Heading font', options: [{ label: 'Georgia (traditional serif)', value: 'georgia' }, { label: 'Palatino (bookish serif)', value: 'palatino' }, { label: 'Verdana (neutral sans-serif)', value: 'verdana' }, { label: 'Trebuchet (friendly sans-serif)', value: 'trebuchet' }], defaultValue: 'georgia', required: true },
    { name: 'bodyFontKey', type: 'select', label: 'Body font', options: [{ label: 'Verdana (highly readable sans)', value: 'verdana' }, { label: 'Georgia (readable serif)', value: 'georgia' }, { label: 'Trebuchet (friendly sans)', value: 'trebuchet' }, { label: 'Tahoma (compact sans)', value: 'tahoma' }], defaultValue: 'verdana', required: true },
    { name: 'logo', type: 'upload', relationTo: 'media', label: 'Seal / logo' },
    { name: 'banner', type: 'upload', relationTo: 'media', label: 'Banner image' },
    { name: 'publicEnabled', type: 'checkbox', defaultValue: false },
    { name: 'installedPackKey', type: 'text', admin: { readOnly: true } },
    { name: 'installedPackVersion', type: 'text', admin: { readOnly: true } },
  ],
}
