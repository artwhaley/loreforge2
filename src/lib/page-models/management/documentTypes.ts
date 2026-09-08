import type { Lifecycle } from '@/lib/documents/lifecycle'
import type { LifecycleStageRowShape } from '@/lib/documents/lifecycleStages'
import type { InspectorFolderNode, InspectorRole, TypeTreeData } from '@/lib/documents/typeTree'

import type { ManagementRouteFacts, ManagementStatusDescriptor } from './common'

/**
 * Document Types management Page Model (OBSIDIAN-T01; builder lands in T05).
 *
 * Wraps the existing P08X `resolveTypeTree` / `resolveInspectorData` results
 * without flattening the semantic distinction between Department roots,
 * manual type folders, and actual Document Types. The virtual Unassigned root
 * semantics are preserved exactly as the resolver produces them.
 */
export type DocumentTypesInspectorModel = {
  roles: InspectorRole[]
  folders: InspectorFolderNode[]
  stagesByType: Record<number, Record<Lifecycle, LifecycleStageRowShape | null>>
}

export type DocumentTypesManagementPageModel = ManagementRouteFacts & {
  tree: TypeTreeData
  inspector: DocumentTypesInspectorModel
  canManage: boolean
  status: ManagementStatusDescriptor
}