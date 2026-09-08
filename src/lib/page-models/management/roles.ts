import type {
  FolderTreeNode,
  PermissionState,
  RoleDepartment,
} from '@/components/people/PersonAccessTrees'
import type { TypeStateMap } from '@/components/roles/TypePermissionGrid'

import type { ManagementRouteFacts, ManagementStatusDescriptor } from './common'

/**
 * Role management Page Model (OBSIDIAN-T01; builder lands in T04).
 *
 * The projection currently assembled inline in the roles route becomes the
 * model: Department → Role hierarchy, flat role records (for hierarchy
 * edges), active holders by role, capability-decorated folder tree, Role ×
 * Folder access states, Role × Document Type capability states, and the
 * session-derived manageable/assignable id sets. `initialRoleId` comes from
 * the route's `?roleId=` query (a request fact, not UI state).
 *
 * People-search results are interactive/ephemeral and belong to the shared
 * workspace/search adapter, NOT to this initial Page Model.
 */
export type RoleRecord = {
  id: number
  name: string
  departmentId: number
  parentRoleId: number | null
}

export type RoleHolder = {
  id: number
  name: string
}

export type RoleFolderState = {
  readState: PermissionState
  writeState: PermissionState
}

export type RoleManagementPageModel = ManagementRouteFacts & {
  departments: RoleDepartment[]
  roleRecords: RoleRecord[]
  holdersByRole: Record<string, RoleHolder[]>
  folderNodes: FolderTreeNode[]
  folderStatesByRole: Record<string, Record<string, RoleFolderState>>
  types: Array<{ id: number; name: string }>
  typeStatesByRole: Record<string, TypeStateMap>
  manageableDepartmentIds: number[]
  assignableRoleIds: number[]
  initialRoleId: number | null
  status: ManagementStatusDescriptor
}