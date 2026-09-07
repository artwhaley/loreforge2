'use client'

import type { FolderSummary, RecordSummary } from '@/lib/page-models/common'
import type { RecordsPageModel } from '@/lib/page-models/records'
import { RecordsExplorer, type ExplorerFolder, type ExplorerRecord } from '@/app/(frontend)/domain/[slug]/records/RecordsExplorer'

function toExplorerFolder(node: FolderSummary): ExplorerFolder {
  return { id: node.id, name: node.name, systemManaged: node.systemManaged, recordCount: node.readableRecordCount, children: node.children.map(toExplorerFolder) }
}

function toExplorerRecord(record: RecordSummary): ExplorerRecord {
  return { canEdit: record.capabilities.edit, canSupersede: record.capabilities.supersede, canDelete: record.capabilities.delete, id: record.id, title: record.title, folderId: record.folderId, documentTypeId: record.documentTypeId, updatedAt: record.updatedAt, preparedBy: record.preparedBy, lifecycle: record.lifecycle, locked: record.locked }
}

/**
 * Civic Records preserves the compact two-pane explorer composition. Behavior
 * runs on the shared workspace via RecordsExplorer; only the mapping lives here.
 */
export function CivicRecords(model: RecordsPageModel) {
  return (
    <RecordsExplorer
      base={model.baseUrl}
      tenantSlug={model.domainSlug}
      folders={model.folders.map(toExplorerFolder)}
      records={model.records.map(toExplorerRecord)}
      totalRecordCount={model.totalReadableRecordCount}
      documentTypes={model.documentTypes}
      supersessionEdges={model.supersessionEdges}
      initialFolderId={model.query.folderId}
      initialSearch={model.query.search}
      canManageFolders={model.capabilities.manageFolders}
      canActOnRecords={model.capabilities.actOnRecords}
      canDeleteRecords={model.capabilities.deleteRecords}
      vocabulary={model.vocabulary}
    />
  )
}
