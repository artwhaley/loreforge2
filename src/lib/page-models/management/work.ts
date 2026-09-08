import type { WorkEntry } from '@/lib/work/projection'

import type { ManagementRouteFacts, ManagementStatusDescriptor } from './common'

/**
 * Domain Work Page Model (OBSIDIAN-T01; builder lands in T07).
 * Adapts `projectDomainWork()` directly: `authorized`, `domainAdmin` (whether
 * request/claim sections are available), and the already-filtered entries.
 * A Design must never derive `domainAdmin` from role labels or identity names.
 */
export type WorkPageModel = ManagementRouteFacts & {
  authorized: boolean
  domainAdmin: boolean
  entries: WorkEntry[]
  status: ManagementStatusDescriptor
}