import type { Character, User } from '@/payload-types'

export type PublicCharacterProjection = {
  id: number
  name: string
  bio: string | null
  status: Character['status']
  controller: { name: string } | null
}

/** Safe public shape; account identifiers and SL/admin fields never escape. */
export function publicCharacterProjection(
  character: Character,
  controller?: User | null,
): PublicCharacterProjection {
  return {
    id: Number(character.id),
    name: character.name,
    bio: character.bio ?? null,
    status: character.status,
    controller: controller?.name ? { name: controller.name } : null,
  }
}
