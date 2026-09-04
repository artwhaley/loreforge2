import type { Payload } from 'payload'

import type { ResourceType } from '@/lib/permissions/capabilities'

export type ResourceRef = { type: ResourceType; id: number | string }
export type ResourceNode = ResourceRef & { domainId: number; parentId?: number | null; subdomainId?: number | null; depth: number }

const idOf = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'object' && value !== null && 'id' in value) return Number((value as { id: number | string }).id)
  return Number(value)
}

/** Resolve a resource and its containing Folder/Department/Domain chain. */
export async function resolveResourceTree(payload: Payload, resource: ResourceRef): Promise<{ domainId: number; nodes: ResourceNode[] }> {
  if (resource.type === 'Domain') return { domainId: Number(resource.id), nodes: [{ ...resource, id: Number(resource.id), domainId: Number(resource.id), depth: 0 }] }
  const collection = resource.type === 'Subdomain' ? 'subdomains' : resource.type === 'Folder' ? 'folders' : 'documents'
  const row = await payload.findByID({ collection, id: resource.id, depth: 0, overrideAccess: true }).catch(() => null) as unknown as Record<string, unknown> | null
  if (!row) throw new Error('Resource not found.')
  const domainId = idOf(row.domain) ?? idOf(row.tenant)
  if (!domainId) throw new Error('Resource has no Domain.')
  const nodes: ResourceNode[] = [{ type: resource.type, id: Number(resource.id), domainId, parentId: null, subdomainId: idOf(row.subdomain), depth: resource.type === 'Document' ? 0 : 0 }]
  if (resource.type === 'Document') {
    const folderId = idOf(row.folder)
    if (folderId) {
      const folderTree = await resolveResourceTree(payload, { type: 'Folder', id: folderId })
      nodes.push(...folderTree.nodes.map((node) => ({ ...node, depth: node.depth + 1 })))
    }
  } else if (resource.type === 'Folder') {
    let parentId = idOf(row.parent)
    let depth = 1
    const visited = new Set<number>()
    while (parentId && !visited.has(parentId)) {
      visited.add(parentId)
      const parent = await payload.findByID({ collection: 'folders', id: parentId, depth: 0, overrideAccess: true }).catch(() => null) as unknown as Record<string, unknown> | null
      if (!parent) break
      nodes.push({ type: 'Folder', id: parentId, domainId, parentId: idOf(parent.parent), subdomainId: idOf(parent.subdomain), depth })
      parentId = idOf(parent.parent)
      depth += 1
    }
  }
  const subdomainId = nodes.find((node) => node.subdomainId)?.subdomainId ?? idOf(row.subdomain)
  if (subdomainId) nodes.push({ type: 'Subdomain', id: subdomainId, domainId, depth: 100 })
  nodes.push({ type: 'Domain', id: domainId, domainId, depth: 200 })
  return { domainId, nodes }
}

export function resourceSpecificity(nodes: ResourceNode[], ruleType: ResourceType, ruleId: number | string): number {
  const match = nodes.find((node) => node.type === ruleType && Number(node.id) === Number(ruleId))
  if (!match) return -1
  if (ruleType === 'Document') return 400
  if (ruleType === 'Folder') return 300 - match.depth
  if (ruleType === 'Subdomain') return 200
  return 100
}

