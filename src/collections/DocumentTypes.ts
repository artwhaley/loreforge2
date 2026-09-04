import type { CollectionConfig } from 'payload'

const relationId = (value: unknown): number | null => value && typeof value === 'object' && 'id' in value ? Number((value as { id: number | string }).id) : value === null || value === undefined || value === '' ? null : Number(value)

/** Domain-scoped record types. Plain Text is seeded for every active Domain. */
export const DocumentTypes: CollectionConfig = {
  slug: 'document-types',
  admin: { useAsTitle: 'name', defaultColumns: ['name', 'domain', 'active', 'defaultFilingPolicy'] },
  timestamps: true,
  access: { read: ({ req }) => Boolean((req.user as { isPlatformAdmin?: boolean } | null)?.isPlatformAdmin), create: () => false, update: () => false, delete: () => false },
  hooks: {
    beforeChange: [async ({ data, originalDoc, operation, req }) => {
      const domainId = relationId(data?.domain ?? originalDoc?.domain)
      const name = String(data?.name ?? originalDoc?.name ?? '').trim()
      if (operation === 'create' && !domainId) throw new Error('Every Document Type must belong to a Domain.')
      if (domainId && name && Boolean(data?.active ?? originalDoc?.active ?? true)) {
        const existing = await req.payload.find({ collection: 'document-types', where: { domain: { equals: domainId } }, depth: 0, limit: 500 })
        const duplicate = existing.docs.find((item) => Number(item.id) !== Number(originalDoc?.id) && Boolean(item.active) && item.name.trim().toLocaleLowerCase() === name.toLocaleLowerCase())
        if (duplicate) throw new Error('An active Document Type with this name already exists in the Domain.')
      }
      return data
    }],
  },
  fields: [
    { name: 'domain', type: 'relationship', relationTo: 'domains', required: true, index: true },
    { name: 'name', type: 'text', required: true },
    { name: 'description', type: 'textarea' },
    { name: 'active', type: 'checkbox', defaultValue: true },
    { name: 'defaultFilingPolicy', type: 'select', required: true, defaultValue: 'direct-file', options: [{ label: 'Direct file', value: 'direct-file' }, { label: 'Review required', value: 'review-required' }] },
    { name: 'defaultFolder', type: 'relationship', relationTo: 'folders', label: 'Default folder' },
    { name: 'templateFilingPolicy', type: 'select', required: true, defaultValue: 'inherit', label: 'Template-compatible filing policy', options: [{ label: 'Inherit', value: 'inherit' }, { label: 'Direct file', value: 'direct-file' }, { label: 'Review required', value: 'review-required' }] },
  ],
}
