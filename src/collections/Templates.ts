import type { CollectionConfig, Payload } from 'payload'

import { assertFormSchema, validateFormSchema } from '@/lib/forms/schema'

const relationId = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'object' && value !== null && 'id' in value) return Number((value as { id: number | string }).id)
  return Number(value)
}

const relation = (value: unknown): { relationTo?: string; value?: unknown } => value && typeof value === 'object' && 'relationTo' in value && 'value' in value
  ? value as { relationTo: string; value: unknown }
  : { value }

const tokenNames = (value: string): string[] => [...value.matchAll(/\{\{\s*([\w-]+)\s*\}\}/g)].map((match) => match[1])

export function validateTemplateTokens(args: { kind: 'document' | 'form'; titleTemplate: string; bodyTemplate: string; formSchema?: unknown }) {
  const allowed = new Set<string>(['content'])
  if (args.kind === 'form') {
    const schema = assertFormSchema(args.formSchema)
    for (const field of schema.fields) allowed.add(field.key)
  }
  const invalid = [...new Set([...tokenNames(args.titleTemplate), ...tokenNames(args.bodyTemplate)].filter((name) => !allowed.has(name)))]
  if (invalid.length > 0) throw new Error(`Unknown template token(s): ${invalid.map((name) => `{{${name}}}`).join(', ')}`)
  return true
}

type RequestLike = { payload: Payload }

async function assertSameDomain(req: RequestLike, collection: string, id: number, domainId: number, label: string) {
  const row = await req.payload.findByID({ collection: collection as never, id, depth: 0, overrideAccess: true }) as unknown as Record<string, unknown> | null
  if (!row) throw new Error(`The ${label} does not exist.`)
  const rowDomain = collection === 'domains' ? Number(row.id) : relationId(row.domain)
  if (!rowDomain || Number(rowDomain) !== Number(domainId)) throw new Error(`The ${label} must belong to the same Domain.`)
  return row
}

async function assertBaseTemplateGraph(req: RequestLike, templateId: number | null, baseId: number | null, domainId: number) {
  if (!baseId) return
  if (templateId && baseId === templateId) throw new Error('A Template cannot base itself.')
  const all = await req.payload.find({ collection: 'templates', depth: 0, limit: 10000, overrideAccess: true })
  const byId = new Map<number, { baseTemplate?: unknown; domain?: unknown; bodyTemplate?: unknown; active?: unknown }>()
  for (const item of all.docs) byId.set(Number(item.id), item as unknown as { baseTemplate?: unknown; domain?: unknown; bodyTemplate?: unknown; active?: unknown })
  let cursor: number | null = baseId
  const visited = new Set<number>()
  while (cursor) {
    if (visited.has(cursor) || (templateId && cursor === templateId)) throw new Error('Template base graph contains a cycle.')
    visited.add(cursor)
    const row: { baseTemplate?: unknown; domain?: unknown; bodyTemplate?: unknown; active?: unknown } | null = byId.get(cursor) ?? await req.payload.findByID({ collection: 'templates', id: cursor, depth: 0, overrideAccess: true }).catch(() => null) as unknown as { baseTemplate?: unknown; domain?: unknown; bodyTemplate?: unknown; active?: unknown } | null
    if (!row) throw new Error('The base Template does not exist.')
    const rowDomain = relationId(row.domain)
    if (!rowDomain || rowDomain !== Number(domainId)) throw new Error('A base Template must belong to the same Domain.')
    if (row.active === false) throw new Error('A base Template must be active and available.')
    const contentPoints = [...String(row.bodyTemplate ?? '').matchAll(/\{\{\s*content\s*\}\}/g)].length
    if (contentPoints !== 1) throw new Error('Every referenced base Template must contain exactly one {{content}} insertion point.')
    cursor = relationId(row.baseTemplate)
  }
}

/** LoreForge-owned reusable document/form templates. */
export const Templates: CollectionConfig = {
  slug: 'templates',
  admin: { useAsTitle: 'name', defaultColumns: ['name', 'domain', 'kind', 'active', 'version'] },
  timestamps: true,
  access: {
    // Customer routes use the audited service seam. Direct CMS/REST access is
    // intentionally closed until the final authorization evaluator is wired.
    read: () => false,
    create: () => false,
    update: () => false,
    delete: () => false,
  },
  hooks: {
    beforeChange: [async ({ data, originalDoc, operation, req }) => {
      const next = data as Record<string, unknown>
      const previous = originalDoc as Record<string, unknown> | undefined
      const domainId = relationId(next.domain ?? previous?.domain)
      const typeId = relationId(next.documentType ?? previous?.documentType)
      const scopeFolderId = relationId(next.scopeFolder ?? previous?.scopeFolder)
      const destinationFolderId = relationId(next.destinationFolder ?? previous?.destinationFolder)
      const baseId = relationId(next.baseTemplate ?? previous?.baseTemplate)
      const kind = String(next.kind ?? previous?.kind ?? 'document') as 'document' | 'form'
      const name = String(next.name ?? previous?.name ?? '').trim()
      const titleTemplate = String(next.titleTemplate ?? previous?.titleTemplate ?? '')
      const bodyTemplate = String(next.bodyTemplate ?? previous?.bodyTemplate ?? '')
      if (!domainId || !typeId || !scopeFolderId || !destinationFolderId || !name) throw new Error('Templates require a Domain, Document Type, availability Folder, destination Folder, and name.')
      if (kind !== 'document' && kind !== 'form') throw new Error('Template kind must be document or form.')
      if (!titleTemplate.trim()) throw new Error('Templates require a title template.')
      if (!bodyTemplate.trim()) throw new Error('Templates require a Markdown body template.')
      await assertSameDomain(req, 'domains', domainId, domainId, 'Template Domain')
      const type = await assertSameDomain(req, 'document-types', typeId, domainId, 'Document Type')
      const scope = await assertSameDomain(req, 'folders', scopeFolderId, domainId, 'availability Folder')
      const destination = await assertSameDomain(req, 'folders', destinationFolderId, domainId, 'destination Folder')
      const scopeSubdomain = relationId(scope.subdomain)
      const destinationSubdomain = relationId(destination.subdomain)
      // A template may cross Departments through the Domain root, but never
      // across Domains. Folder ancestry is resolved by the availability helper.
      void scopeSubdomain
      void destinationSubdomain
      const typeDomain = relationId(type.domain)
      if (!typeDomain || typeDomain !== Number(domainId)) throw new Error('Template Document Type must belong to the same Domain.')
      await assertBaseTemplateGraph(req, relationId(previous?.id), baseId, domainId)
      const formSchema = kind === 'form' ? assertFormSchema(next.formSchema ?? previous?.formSchema) : undefined
      if (kind === 'form' && !formSchema) throw new Error('Form Templates require a neutral form schema.')
      validateTemplateTokens({ kind, titleTemplate, bodyTemplate, formSchema })
      const normalized: Record<string, unknown> = { ...next, domain: domainId, documentType: typeId, scopeFolder: scopeFolderId, destinationFolder: destinationFolderId, name, titleTemplate, bodyTemplate, kind, allowDestinationOverride: Boolean(next.allowDestinationOverride ?? previous?.allowDestinationOverride ?? false), availableToDescendants: Boolean(next.availableToDescendants ?? previous?.availableToDescendants ?? true), active: Boolean(next.active ?? previous?.active ?? true), version: Number(next.version ?? previous?.version ?? 1) }
      if (kind === 'form') normalized.formSchema = formSchema
      else normalized.formSchema = null
      if (baseId) normalized.baseTemplate = baseId
      else normalized.baseTemplate = null
      return normalized
    }],
  },
  fields: [
    { name: 'domain', type: 'relationship', relationTo: 'domains', required: true, index: true },
    { name: 'documentType', type: 'relationship', relationTo: 'document-types', required: true, index: true, label: 'Document Type' },
    { name: 'name', type: 'text', required: true },
    { name: 'kind', type: 'select', required: true, defaultValue: 'document', options: [{ label: 'Document', value: 'document' }, { label: 'Form', value: 'form' }] },
    { name: 'scopeFolder', type: 'relationship', relationTo: 'folders', required: true, label: 'Available from Folder' },
    { name: 'destinationFolder', type: 'relationship', relationTo: 'folders', required: true, label: 'Normal destination Folder' },
    { name: 'allowDestinationOverride', type: 'checkbox', defaultValue: false },
    { name: 'availableToDescendants', type: 'checkbox', defaultValue: true },
    { name: 'baseTemplate', type: 'relationship', relationTo: 'templates' },
    { name: 'titleTemplate', type: 'text', required: true },
    { name: 'bodyTemplate', type: 'textarea', required: true },
    { name: 'formSchema', type: 'json', admin: { description: 'Versioned neutral form schema; managed through Form Studio.' } },
    { name: 'lifecyclePolicy', type: 'select', required: true, defaultValue: 'inherit', options: [{ label: 'Inherit', value: 'inherit' }, { label: 'Direct file', value: 'direct-file' }, { label: 'Review required', value: 'review-required' }] },
    { name: 'active', type: 'checkbox', defaultValue: true },
    { name: 'version', type: 'number', required: true, defaultValue: 1, min: 1 },
  ],
}
