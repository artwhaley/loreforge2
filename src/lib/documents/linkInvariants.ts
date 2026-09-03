export type CharacterLinkInput = { kind: string; relationshipLabel?: string | null }

export function normalizeTagName(name: string): string {
  const normalized = name.trim().toLocaleLowerCase()
  if (!normalized) throw new Error('Tag names cannot be blank.')
  return normalized
}

export function assertCharacterLinkInput(input: CharacterLinkInput): true {
  if (input.kind !== 'prepared_by' && input.kind !== 'concerns') throw new Error('Character link kind is invalid.')
  if (input.kind === 'prepared_by' && String(input.relationshipLabel ?? '').trim()) throw new Error('Prepared by credits cannot have a relationship label.')
  return true
}
