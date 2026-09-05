/**
 * P07X-T01 — acting-identity selector labels.
 *
 * platform_admin -> "Administrator"
 * domain_admin   -> "Administrator of <Domain Name>"
 * player | npc   -> Character.name
 */
export type LabelCharacter = {
  id: number | string
  name?: string | null
  kind?: string | null
  administrativeDomain?: { id?: number | string; name?: string } | number | string | null
}

export function characterDisplayLabel(character: LabelCharacter): string {
  if (character.kind === 'platform_admin') return 'Administrator'
  if (character.kind === 'domain_admin') {
    const domain = character.administrativeDomain
    const domainName = domain != null && typeof domain === 'object' && 'name' in domain
      ? String((domain as { name?: string }).name ?? '').trim()
      : ''
    return domainName ? `Administrator of ${domainName}` : 'Administrator'
  }
  return String(character.name ?? 'Character')
}