import type { ManagementRouteFacts, ManagementStatusDescriptor } from './common'

/**
 * Folder management Page Model (OBSIDIAN-T01; builder lands in T03).
 *
 * Mirrors the current `AdminFolderNode` projection from
 * `src/app/(frontend)/domain/[slug]/manage/folders/page.tsx` plus the route's
 * root capability. Every node carries its own authorized `canManage`;
 * `systemManaged` nodes and descendant-cycle prevention stay enforced
 * server-side by the shared workspace/endpoint, not re-derived in the Design.
 */
export type FolderManagementNode = {
  id: number
  name: string
  createdAt: string
  systemManaged: boolean
  canManage: boolean
  children: FolderManagementNode[]
}

export type FolderManagementPageModel = ManagementRouteFacts & {
  /** Root-level create/manage capability (Domain authority). */
  rootManageable: boolean
  nodes: FolderManagementNode[]
  status: ManagementStatusDescriptor
}