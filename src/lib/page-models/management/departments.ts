import type { ManagementRouteFacts, ManagementStatusDescriptor } from './common'

/**
 * Department management Page Model (OBSIDIAN-T01; builder lands in T07).
 * Row-level archive/restore capability is derived from the request session
 * (currently the route is admin-scoped); create capability mirrors the route
 * decision. No UI labels or layout concepts.
 */
export type DepartmentsManagementRow = {
  id: number
  name: string
  slug: string
  /** `publicListing` is the current active/archive flag (archive == false). */
  archived: boolean
  canArchive: boolean
  canRestore: boolean
}

export type DepartmentsManagementPageModel = ManagementRouteFacts & {
  departments: DepartmentsManagementRow[]
  canCreate: boolean
  status: ManagementStatusDescriptor
  /** Platform vocabulary so a Design never hard-codes civic nouns. */
  vocabulary: { subdomainSingular: string; subdomainPlural: string; roleSingular: string }
}