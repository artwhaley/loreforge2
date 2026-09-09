/**
 * Public character profile Page Model. Authorized server projection of the
 * `/domain/[slug]/characters/[id]` route: safe identity facts (never account
 * details), the character's derived Department participation, their current
 * Role name, a focus line, and authorized back/escape links.
 *
 * `characterProfile` is an OPTIONAL design slot: a Design that implements it
 * owns this surface; a Design that omits it receives the Design-neutral
 * fallback the route renders. The route never branches on which Design is
 * active.
 */
export type CharacterProfilePageModel = {
  baseUrl: string
  domainSlug: string

  character: {
    id: number
    name: string
    kind: string
    status: string
  }

  /** Derived Department participation (never inferred from role labels). */
  departmentName: string
  departmentHref: string
  departmentDescription: string | null

  /** Current Role name, or the platform default when unassigned. */
  roleName: string

  /** Focus line (local note or bio) the community chooses to share. */
  focus: string

  /** Authorized escape route back to the public member directory. */
  backHref: string
}