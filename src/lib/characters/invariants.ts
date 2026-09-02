export type CharacterStatus = 'active' | 'inactive' | 'merged'

export type CharacterRecord = {
  id: number | string
  controlledBy?: number | string | null
  status: CharacterStatus
  mergedInto?: number | string | null
}

export function canUserActAsCharacter(
  userId: number | string,
  character: CharacterRecord | null | undefined,
): boolean {
  if (!character || character.status !== 'active' || character.controlledBy === null || character.controlledBy === undefined) {
    return false
  }
  return String(character.controlledBy) === String(userId)
}

export function validateCharacterStatus(record: CharacterRecord): string | true {
  if (record.status === 'merged' && (record.mergedInto === null || record.mergedInto === undefined)) {
    return 'Merged Characters must identify a surviving Character.'
  }
  if (record.status !== 'merged' && record.mergedInto !== null && record.mergedInto !== undefined) {
    return 'Only merged Characters may identify a surviving Character.'
  }
  if (String(record.mergedInto ?? '') === String(record.id)) {
    return 'A Character cannot merge into itself.'
  }
  return true
}
