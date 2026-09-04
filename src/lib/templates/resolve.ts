import type { Payload } from 'payload'

import type { Folder, Template } from '@/payload-types'

const idOf = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'object' && value !== null && 'id' in value) return Number((value as { id: number | string }).id)
  return Number(value)
}

type FolderLike = Pick<Folder, 'id' | 'parent' | 'domain'>
type TemplateLike = Pick<Template, 'id' | 'domain' | 'scopeFolder' | 'availableToDescendants' | 'active' | 'destinationFolder'> & { kind?: string }

function parentId(folder: FolderLike): number | null { return idOf(folder.parent) }

/** True when the destination is the scope itself or a descendant allowed by the template. */
export function isTemplateAvailableAt(template: TemplateLike, destination: FolderLike, folders: FolderLike[]): boolean {
  if (!template.active) return false
  const templateDomain = idOf(template.domain)
  const destinationDomain = idOf(destination.domain)
  if (!templateDomain || !destinationDomain || templateDomain !== destinationDomain) return false
  const scopeId = idOf(template.scopeFolder)
  if (!scopeId) return false
  if (Number(destination.id) === scopeId) return true
  if (!template.availableToDescendants) return false
  const byId = new Map(folders.map((folder) => [Number(folder.id), folder]))
  let cursor: FolderLike | undefined = destination
  const visited = new Set<number>()
  while (cursor) {
    const current = Number(cursor.id)
    if (visited.has(current)) return false
    visited.add(current)
    const parent = parentId(cursor)
    if (!parent) return false
    if (parent === scopeId) return true
    cursor = byId.get(parent)
  }
  return false
}

export async function getTemplateFolders(payload: Payload, domainId: number | string): Promise<FolderLike[]> {
  const result = await payload.find({ collection: 'folders', where: { domain: { equals: domainId } }, depth: 0, limit: 10000, overrideAccess: true })
  return result.docs as unknown as FolderLike[]
}

/** Resolve active Templates whose availability scope includes the destination. */
export async function resolveAvailableTemplates(payload: Payload, args: { domainId: number | string; destinationFolderId: number | string; kind?: 'document' | 'form' }): Promise<Template[]> {
  const [templates, folders] = await Promise.all([
    payload.find({ collection: 'templates', where: { and: [{ domain: { equals: args.domainId } }, { active: { equals: true } }, ...(args.kind ? [{ kind: { equals: args.kind } }] : [])] }, depth: 1, limit: 10000, overrideAccess: true }),
    getTemplateFolders(payload, args.domainId),
  ])
  const destination = folders.find((folder) => Number(folder.id) === Number(args.destinationFolderId))
  if (!destination) return []
  return templates.docs.filter((template) => isTemplateAvailableAt(template as unknown as TemplateLike, destination, folders))
}

/** Resolve availability for all destinations, used to constrain override choices. */
export async function resolveTemplateDestinations(payload: Payload, template: Template): Promise<FolderLike[]> {
  const folders = await getTemplateFolders(payload, idOf(template.domain) ?? 0)
  return folders.filter((folder) => isTemplateAvailableAt(template as unknown as TemplateLike, folder, folders))
}

