export type RelationshipKind = 'supersedes'

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
