// UI-neutral Records presentation semantics (P08D-T01-E). These descriptors
// say WHAT an action is — its operation key, accessible label, canonical
// target, dialog intent — never HOW a Design lays it out. No class names, no
// placement, no CSS, no card/row assumptions. Every first-class Design may
// consume them to keep the application action semantics shared.
import { canEditDocumentBody, canSupersedeDocument } from '@/lib/documents/lifecycle'
import type { FolderSummary, RecordSummary } from '@/lib/page-models/common'

export type RecordOperationKey = 'view' | 'edit' | 'supersede' | 'delete'
export type FolderOperationKey = 'create-folder' | 'create-subfolder' | 'rename-folder' | 'delete-folder'
export type RecordsDialogIntent = 'create-folder' | 'rename-folder' | 'delete-folder'

/** Link-shaped record action. `href` is null when the action is not permitted. */
export type RecordLinkDescriptor = {
  operation: 'view' | 'edit' | 'supersede'
  label: string
  href: string | null
  enabled: boolean
}

/** Form-shaped record action (server-action bridge supplied by the route). */
export type RecordDeleteDescriptor = {
  operation: 'delete'
  label: string
  enabled: boolean
}

export type RecordActionDescriptor = RecordLinkDescriptor | RecordDeleteDescriptor

export type FolderActionDescriptor = {
  operation: FolderOperationKey
  label: string
  /** Dialog intent the action opens (create-subfolder shares create-folder). */
  dialog: RecordsDialogIntent
  enabled: boolean
}

// --- Canonical hrefs ---------------------------------------------------------

export const recordViewHref = (baseUrl: string, recordId: number): string => `${baseUrl}/documents/${recordId}`
export const recordEditHref = (baseUrl: string, recordId: number): string => `${baseUrl}/documents/${recordId}/edit`
export const recordSupersedeHref = (baseUrl: string, recordId: number): string => `${baseUrl}/records/new?supersedes=${recordId}`
export const newRecordHref = (baseUrl: string, folderId: number | null): string => folderId == null ? `${baseUrl}/records/new` : `${baseUrl}/records/new?folder=${folderId}`
export const importNotecardHref = (baseUrl: string): string => `${baseUrl}/import`
export const recordsReturnTo = (baseUrl: string, folderId: number | null): string => folderId == null ? `${baseUrl}/records` : `${baseUrl}/records?folder=${folderId}`

// --- Descriptor builders -----------------------------------------------------

/**
 * Record actions for one target. `record` may be null (nothing selected):
 * every action then reports disabled with no href, so toolbars render a
 * consistent, non-destructive surface before any row is chosen.
 */
export function recordActionDescriptors(input: {
  baseUrl: string
  record: RecordSummary | null
  isSuperseded: boolean
  canActOnRecords: boolean
  deleteActionProvided: boolean
}): RecordActionDescriptor[] {
  const { baseUrl, record, isSuperseded, canActOnRecords, deleteActionProvided } = input
  const canEdit = record !== null && !isSuperseded && record.capabilities.edit && canEditDocumentBody(record.lifecycle, record.locked)
  const canSupersede = record !== null && !isSuperseded && canActOnRecords && record.capabilities.supersede && canSupersedeDocument(record.lifecycle)
  const canDelete = record !== null && canActOnRecords && deleteActionProvided && record.capabilities.delete
  return [
    { operation: 'view', label: 'View', href: record ? recordViewHref(baseUrl, record.id) : null, enabled: record !== null },
    { operation: 'edit', label: 'Edit', href: canEdit ? recordEditHref(baseUrl, record.id) : null, enabled: canEdit },
    { operation: 'supersede', label: 'Supersede', href: canSupersede ? recordSupersedeHref(baseUrl, record.id) : null, enabled: canSupersede },
    { operation: 'delete', label: 'Delete', enabled: canDelete },
  ]
}

/**
 * Folder actions for the current selection. System-managed folders can never
 * be renamed or deleted; subfolder creation targets the selected folder as
 * parent (root when nothing is selected).
 */
export function folderActionDescriptors(input: {
  canManageFolders: boolean
  selectedFolder: FolderSummary | null
}): FolderActionDescriptor[] {
  const { canManageFolders, selectedFolder } = input
  const canEditSelected = canManageFolders && selectedFolder !== null && !selectedFolder.systemManaged
  return [
    { operation: 'create-folder', label: 'Create folder', dialog: 'create-folder', enabled: canManageFolders },
    { operation: 'create-subfolder', label: 'Create subfolder', dialog: 'create-folder', enabled: canManageFolders },
    { operation: 'rename-folder', label: 'Rename folder', dialog: 'rename-folder', enabled: canEditSelected },
    { operation: 'delete-folder', label: 'Delete folder', dialog: 'delete-folder', enabled: canEditSelected },
  ]
}