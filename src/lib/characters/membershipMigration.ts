export type LegacyMembershipRow = {
  id: number | string
  userId: number | string
  tenantId: number | string
  role: string
}

export type ExplicitMembershipMapping = {
  userId: number | string
  tenantId: number | string
  characterId: number | string
  reason: string
}

export type MembershipMigrationResult = {
  mapped: Array<LegacyMembershipRow & { characterId: number | string; reason: string }>
  unresolved: Array<LegacyMembershipRow & { reason: string }>
  accountedRowIds: string[]
}

const keyFor = (userId: number | string, tenantId: number | string) => `${userId}:${tenantId}`

/**
 * Produce a deterministic, restartable plan. A legacy row maps to exactly one
 * Character: explicit fixture mapping first, otherwise only a User with one
 * active controlled Character. Ambiguous Users never fan out.
 */
export function planMembershipMigration(
  legacyRows: LegacyMembershipRow[],
  controlledCharacterIds: Map<string, Array<number | string>>,
  explicitMappings: ExplicitMembershipMapping[] = [],
): MembershipMigrationResult {
  const explicit = new Map(explicitMappings.map((mapping) => [keyFor(mapping.userId, mapping.tenantId), mapping]))
  const mapped: MembershipMigrationResult['mapped'] = []
  const unresolved: MembershipMigrationResult['unresolved'] = []

  for (const row of legacyRows) {
    const explicitMapping = explicit.get(keyFor(row.userId, row.tenantId))
    const candidates = controlledCharacterIds.get(String(row.userId)) ?? []
    if (explicitMapping) {
      if (!candidates.some((id) => String(id) === String(explicitMapping.characterId))) {
        unresolved.push({ ...row, reason: 'Explicit mapping does not belong to the legacy User.' })
      } else {
        mapped.push({ ...row, characterId: explicitMapping.characterId, reason: explicitMapping.reason })
      }
      continue
    }
    if (candidates.length === 1) {
      mapped.push({ ...row, characterId: candidates[0], reason: 'Only one active controlled Character.' })
    } else if (candidates.length === 0) {
      unresolved.push({ ...row, reason: 'User controls no active Character.' })
    } else {
      unresolved.push({ ...row, reason: 'User controls multiple active Characters; explicit selection required.' })
    }
  }

  return {
    mapped,
    unresolved,
    accountedRowIds: [...mapped, ...unresolved].map((row) => String(row.id)),
  }
}
