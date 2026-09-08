import type {
  FolderTreeNode,
  RoleDepartment,
} from '@/components/people/PersonAccessTrees'

import type { ManagementRouteFacts, ManagementStatusDescriptor } from './common'

/**
 * People search Page Model (OBSIDIAN-T01; builder lands in T06).
 *
 * Intentionally small: actual search results are interactive/ephemeral and
 * stay server-filtered through the existing people-search machinery. The
 * model only carries capability-safe facts about the surface itself.
 */
export type PeopleManagementPageModel = ManagementRouteFacts & {
  /** Whether the acting identity may open the people workspace at all. */
  canOpenPeople: boolean
  status: ManagementStatusDescriptor
}

/** Effective access summary for one Document Type (person workspace). */
export type PersonTypeAccessSummary = {
  id: number
  name: string
  read: { allowed: boolean; source: string }
  create: { allowed: boolean; source: string }
  edit: { allowed: boolean; source: string }
}

/** Effective folder access for the subject (person workspace). */
export type PersonFolderAccess = {
  read: { allowed: boolean; source: string }
  write: { allowed: boolean; source: string }
}

/**
 * Individual person/Character workspace Page Model (OBSIDIAN-T01; builder
 * lands in T06). Reuses the route's current projection: Character identity
 * safe for this viewer, local alias, Department participation (via Role
 * assignments), Role tree with held/assignable marks, Folder tree with
 * assigned + effective access, Type access summary, and the actor's
 * authorized actions. User/controller and Character stay distinct.
 */
export type PersonManagementPageModel = ManagementRouteFacts & {
  character: {
    id: number
    name: string
    kind: string
    status: string
  }
  /** Controlling User, if claimed (null for unclaimed Characters). */
  controller: {
    id: number
    name: string | null
    email: string
  } | null
  localDisplayName: string | null
  roleDepartments: RoleDepartment[]
  folderNodes: FolderTreeNode[]
  typeAccess: PersonTypeAccessSummary[]
  canManageMembers: boolean
  /** 'held' | 'assignable' — the route's `?roleFilter=` request fact. */
  roleFilter: 'held' | 'assignable'
  status: ManagementStatusDescriptor
}