import type { Payload } from 'payload'

export type CharacterSearchHit = { id: number; name: string }

/**
 * Ranked search over the global active Character directory — the single
 * implementation behind the Concerns-chip picker and the member add flow.
 * Prefix on name beats prefix on alias, which beats any substring; ties are
 * resolved by name. Bounded to the interactive result cap of 25.
 */
export async function searchActiveCharacters(payload: Payload, query: string): Promise<CharacterSearchHit[]> {
  const q = query.trim().toLocaleLowerCase()
  if (!q) return []
  const characters = await payload.find({ collection: 'characters', where: { status: { equals: 'active' } }, depth: 0, limit: 5000, sort: 'name', overrideAccess: true })
  return characters.docs.map((character) => {
    const aliases = (character.aliases ?? []).map((alias) => alias.value).filter(Boolean)
    const haystack = [character.name, ...aliases].join(' ').toLocaleLowerCase()
    const score = character.name.toLocaleLowerCase().startsWith(q) ? 100 : aliases.some((alias) => alias.toLocaleLowerCase().startsWith(q)) ? 75 : haystack.includes(q) ? 50 : 0
    return { id: Number(character.id), name: character.name, score }
  }).filter((result) => result.score > 0).sort((a, b) => b.score - a.score || a.name.localeCompare(b.name)).slice(0, 25).map(({ id, name }) => ({ id, name }))
}