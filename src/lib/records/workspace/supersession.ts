import type { RecordSummary, SupersessionEdge } from '@/lib/page-models/common'

/**
 * Pure supersession derivation (Stage G). Turns flat, already-authorized
 * `supersessionEdges` into a Design-neutral tree over `RecordSummary` rows.
 * Works entirely from the DTOs — no fetch, no authorization, no hidden
 * neighbors. Duplicated rows of the same record are impossible.
 */
export type SupersessionNode = {
  record: RecordSummary
  children: SupersessionNode[]
}

/** Build a map of newest-id -> older-id for a set of edges. */
export function olderByNewer(edges: SupersessionEdge[]): Map<number, number> {
  const out = new Map<number, number>()
  for (const edge of edges) out.set(edge.newerId, edge.olderId)
  return out
}

/** Build a map of older-id -> newest-id for a set of edges. */
export function newerByOlder(edges: SupersessionEdge[]): Map<number, number> {
  const out = new Map<number, number>()
  for (const edge of edges) out.set(edge.olderId, edge.newerId)
  return out
}

/** Follow the `newerByOlder` chain to the canonical (current) root of a record. */
export function rootOf(recordId: number, newerByOlder: Map<number, number>): number {
  const visited = new Set<number>()
  let current = recordId
  while (newerByOlder.has(current) && !visited.has(current)) {
    visited.add(current)
    current = newerByOlder.get(current)!
  }
  return current
}

/**
 * Assemble the forest of supersession trees over the given records. Each tree
 * is rooted at the current version so a Design can render version history
 * without reimplementing traversal. Records with no edges become singletons.
 */
export function buildSupersessionTrees(records: RecordSummary[], edges: SupersessionEdge[]): SupersessionNode[] {
  const byId = new Map(records.map((record) => [record.id, record]))
  const olderMap = olderByNewer(edges)
  const newerMap = newerByOlder(edges)
  const roots = new Map<number, SupersessionNode>()
  const buildTree = (recordId: number, visited = new Set<number>()): SupersessionNode | null => {
    const record = byId.get(recordId)
    if (!record || visited.has(recordId)) return null
    const nextVisited = new Set(visited).add(recordId)
    const olderId = olderMap.get(recordId)
    const child = olderId != null ? buildTree(olderId, nextVisited) : null
    return { record, children: child ? [child] : [] }
  }
  for (const record of records) {
    const rootId = rootOf(record.id, newerMap)
    const root = buildTree(rootId)
    if (root) roots.set(root.record.id, root)
  }
  return [...roots.values()]
}

/** True when a record has a newer successor in the edge set (it is superseded). */
export function isSuperseded(recordId: number, edges: SupersessionEdge[]): boolean {
  return edges.some((edge) => edge.olderId === recordId)
}