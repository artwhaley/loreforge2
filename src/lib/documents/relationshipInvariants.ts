export type RelationshipKind = 'supersedes'

export type SupersedesEdgeRow = { sourceId: number | string; targetId: number | string; id?: number | string | null }

export function assertRelationshipInput(input: { sourceId: number | string; targetId: number | string; kind: string; label?: string | null }): true {
  if (String(input.sourceId) === String(input.targetId)) throw new Error('A Document cannot relate to itself.')
  if (input.kind !== 'supersedes') throw new Error('Only supersedes relationships are supported.')
  return true
}

export function assertNoSupersedesCycle(sourceId: number | string, targetId: number | string, newerToOlder: Map<string, string>): true {
  let current: string | undefined = String(targetId)
  const seen = new Set<string>()
  while (current) {
    if (current === String(sourceId)) throw new Error('Supersedes relationships must be acyclic.')
    if (seen.has(current)) throw new Error('Supersedes relationships must be acyclic.')
    seen.add(current)
    current = newerToOlder.get(current)
  }
  return true
}

/** Build the newer -> older edge map used by the cycle walk. */
export function supersedesEdgeMap(edges: SupersedesEdgeRow[]): Map<string, string> {
  const newerToOlder = new Map<string, string>()
  for (const edge of edges) newerToOlder.set(String(edge.sourceId), String(edge.targetId))
  return newerToOlder
}

/**
 * The complete linear-chain invariant set for one supersedes edge, shared by
 * the relationship service (good messages) and the collection beforeChange
 * hook (defense in depth against direct writes):
 * - self-link and kind are checked by assertRelationshipInput;
 * - the source Document may supersede only one direct predecessor;
 * - the target Document may have only one direct superseding successor;
 * - the proposed edge must not close a cycle.
 * `excludeEdgeId` lets an update of an existing edge skip its own row.
 */
export function assertSupersessionInvariants(input: { sourceId: number | string; targetId: number | string; edges: SupersedesEdgeRow[]; excludeEdgeId?: number | string | null }): true {
  assertRelationshipInput({ sourceId: input.sourceId, targetId: input.targetId, kind: 'supersedes' })
  const sourceId = String(input.sourceId)
  const targetId = String(input.targetId)
  for (const edge of input.edges) {
    if (input.excludeEdgeId != null && String(edge.id) === String(input.excludeEdgeId)) continue
    if (String(edge.sourceId) === sourceId) throw new Error('A Document can supersede only one direct predecessor.')
    if (String(edge.targetId) === targetId) throw new Error('An older Document can have only one direct superseding successor; remove the existing one first.')
  }
  assertNoSupersedesCycle(input.sourceId, input.targetId, supersedesEdgeMap(input.edges))
  return true
}
