import type { ManagementRouteFacts, ManagementStatusDescriptor } from './management/common'

/**
 * Public member directory Page Model (OBSIDIAN-T01; builder lands in T08).
 * Authorized server projection of the current `/members` route: one row per
 * Domain member Character with its derived Department participation and Role
 * names, plus admin-only server-filtered search results for adding members.
 * The search availability flag comes from the request session, not role labels.
 */
export type MemberRow = {
  characterId: number
  name: string
  departments: string[]
  roles: string[]
}

export type MembersPageModel = ManagementRouteFacts & {
  rows: MemberRow[]
  /** Whether the acting identity may search/add Characters (admin-only today). */
  canSearch: boolean
  /** Server-filtered search results for the current query (admin only). */
  searchResults: Array<{ id: number; name: string }>
  query: string
  status: ManagementStatusDescriptor
}