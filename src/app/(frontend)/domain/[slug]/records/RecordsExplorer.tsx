'use client'

import { useMemo } from 'react'

import { useRecordActions } from '@/components/functional/records/recordActions'
import { canEditDocumentBody, canSupersedeDocument, type Lifecycle } from '@/lib/documents/lifecycle'
import type { FolderSummary, RecordSummary } from '@/lib/page-models/common'
import type { RecordsPageModel } from '@/lib/page-models/records'
import { useRecordsWorkspace } from '@/lib/records/workspace/useRecordsWorkspace'

import styles from './records.module.scss'

export type ExplorerFolder = { id: number; name: string; systemManaged: boolean; recordCount: number; children: ExplorerFolder[] }
export type ExplorerRecord = { canEdit: boolean; canSupersede: boolean; canDelete: boolean; id: number; title: string; folderId: number | null; documentTypeId: number | null; updatedAt: string; preparedBy: string | null; lifecycle: string; locked: boolean }
export type SupersessionEdge = { newerId: number; olderId: number }

type Props = { base: string; tenantSlug: string; folders: ExplorerFolder[]; records: ExplorerRecord[]; totalRecordCount: number; documentTypes: Array<{ id: number; name: string }>; supersessionEdges: SupersessionEdge[]; initialFolderId: number | null; initialSearch: string; canManageFolders: boolean; canActOnRecords: boolean; canDeleteRecords: boolean; vocabulary: { documentSingular: string; documentPlural: string; folderPlural: string } }

function toFolderSummary(node: ExplorerFolder): FolderSummary {
  return { id: node.id, name: node.name, systemManaged: node.systemManaged, readableRecordCount: node.recordCount, children: node.children.map(toFolderSummary) }
}

function toRecordSummary(record: ExplorerRecord): RecordSummary {
  return { id: record.id, title: record.title, folderId: record.folderId, documentTypeId: record.documentTypeId, updatedAt: record.updatedAt, preparedBy: record.preparedBy, lifecycle: record.lifecycle, locked: record.locked, capabilities: { read: true, edit: record.canEdit, supersede: record.canSupersede, delete: record.canDelete } }
}

function recordDate(value: string) { return new Date(value).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) }

/**
 * Records explorer now runs on the shared workspace behavior (Stage G): the
 * debounced search, cursor pagination, folder selection/expansion,
 * supersession derivation, and dialog/menu state all come from
 * `useRecordsWorkspace`. This composition is unchanged; the behavior moved.
 */
export function RecordsExplorer({ base, tenantSlug, folders, records, totalRecordCount, documentTypes, supersessionEdges, initialFolderId, initialSearch, canManageFolders, canActOnRecords, canDeleteRecords, vocabulary }: Props) {
  const model = useMemo<RecordsPageModel>(() => ({
    baseUrl: base,
    domainSlug: tenantSlug,
    folders: folders.map(toFolderSummary),
    totalReadableRecordCount: totalRecordCount,
    records: records.map(toRecordSummary),
    documentTypes,
    supersessionEdges,
    query: { folderId: initialFolderId, search: initialSearch },
    capabilities: { manageFolders: canManageFolders, actOnRecords: canActOnRecords, deleteRecords: canDeleteRecords },
    vocabulary,
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [])
  const ws = useRecordsWorkspace(model)
  // Server-action bridge (route-provided). Null in preview/tests: the delete
  // affordances render disabled rather than posting anywhere.
  const { deleteAction } = useRecordActions()
  const selectedFolderId = ws.folders.selectedId
  const selectedRecordId = ws.selection.recordId
  const search = ws.search.value
  const searchSubfolders = ws.search.subfolders
  const typeChoice = ws.exposure.typeChoice
  const exposedTypeId = ws.exposure.typeId
  const dialog = ws.actions.dialog
  const contextMenu = ws.actions.menu
  const searching = ws.search.loading
  const loadingMore = ws.results.loadingMore
  const searchActive = ws.search.active
  const searchHasMore = ws.results.hasMore
  const expandedFolders = ws.folders.expandedIds
  const folderById = ws.folders.byId
  const selectedFolder = ws.folders.selected
  const selectedFolderDescendants = ws.folders.descendantIds
  const directCountByFolder = ws.results.counts
  const visibleFolders = ws.folders.list
  const matchingRecords = ws.results.records
  const activeEdges = ws.results.edges
  const recordTrees = ws.results.trees
  const selectedRecord = ws.selection.selected
  const selectedIsSuperseded = ws.selection.isSuperseded
  const documentTypeName = ws.exposure.typeName
  const returnTo = ws.actions.returnTo
  const resetSearchResults = ws.resetSearchResults
  const selectFolder = ws.folders.select
  const applyExposure = () => ws.exposure.apply(typeChoice)
  const toggleFolder = ws.folders.toggleExpanded
  const setSearch = (value: string) => { ws.search.setValue(value); resetSearchResults() }
  const setTypeChoice = ws.exposure.setTypeChoice
  const setDialog = ws.actions.setDialog
  const setContextMenu = ws.actions.setMenu
  const setSearchSubfolders = (value: boolean) => { ws.search.setSubfolders(value); resetSearchResults() }
  const loadMoreSearchResults = ws.results.loadMore

  const contextRecord = contextMenu?.kind === 'record' && contextMenu.id !== null ? ws.results.records.find((record) => record.id === contextMenu.id) ?? records.find((record) => record.id === contextMenu.id) ?? null : null
  const rowShape = (record: RecordSummary | ExplorerRecord | null | undefined): { canEdit: boolean; canSupersede: boolean; lifecycle: string; locked: boolean } | null => {
    if (!record) return null
    return 'capabilities' in record
      ? { canEdit: record.capabilities.edit, canSupersede: record.capabilities.supersede, lifecycle: record.lifecycle, locked: record.locked }
      : { canEdit: record.canEdit, canSupersede: record.canSupersede, lifecycle: record.lifecycle, locked: record.locked }
  }
  const contextRecordRow = rowShape(contextRecord)
  const contextRecordIsSuperseded = contextRecord ? activeEdges.some((edge) => edge.olderId === contextRecord.id) : false
  const canOfferSupersede = (record: { canSupersede: boolean; lifecycle: string } | null | undefined) => Boolean(record && record.canSupersede && canSupersedeDocument(record.lifecycle))
  const canOfferEdit = (record: { canEdit: boolean; lifecycle: string; locked: boolean } | null) => Boolean(record?.canEdit && canEditDocumentBody(record.lifecycle as Lifecycle, Boolean(record.locked)))
  const selectedRow = rowShape(selectedRecord)

  const renderFolder = (folder: FolderSummary) => <li key={folder.id} className={styles.folderItem} role="treeitem" aria-selected={selectedFolderId === folder.id} aria-expanded={folder.children.length > 0 ? expandedFolders.has(folder.id) : undefined}>
    <div className={`${styles.folderRow} ${selectedFolderId === folder.id ? styles.folderRowSelected : ''}`} onContextMenu={(event) => { event.preventDefault(); selectFolder(folder.id); setContextMenu({ kind: 'folder', id: folder.id, x: event.clientX, y: event.clientY }) }}>{folder.children.length > 0 ? <button type="button" className={styles.folderDisclosure} aria-label={`${expandedFolders.has(folder.id) ? 'Collapse' : 'Expand'} ${folder.name}`} aria-expanded={expandedFolders.has(folder.id)} onClick={() => toggleFolder(folder.id)}>{expandedFolders.has(folder.id) ? '⌄' : '›'}</button> : <span className={styles.folderSpacer} aria-hidden="true" />}<span className={styles.folderIcon} aria-hidden="true">{folder.systemManaged ? '⌂' : '▱'}</span><button type="button" className={styles.folderSelect} onClick={() => selectFolder(folder.id)}><span className={styles.folderName}>{folder.name}</span><span className={styles.countBadge}>{directCountByFolder.get(folder.id) ?? 0}</span></button></div>
    {folder.children.length > 0 && expandedFolders.has(folder.id) ? <ul className={styles.nestedFolders} role="group">{folder.children.map(renderFolder)}</ul> : null}
  </li>
  const renderRecord = (node: { record: RecordSummary; children: Array<{ record: RecordSummary; children: never[] }> | never[] }): React.ReactNode => <li key={node.record.id} className={styles.recordItem} role="treeitem" aria-selected={selectedRecordId === node.record.id}>
    <button type="button" className={`${styles.recordRow} ${selectedRecordId === node.record.id ? styles.recordRowSelected : ''}`} onClick={() => ws.selection.selectRecord(node.record.id)} onContextMenu={(event) => { event.preventDefault(); ws.selection.selectRecord(node.record.id); setContextMenu({ kind: 'record', id: node.record.id, x: event.clientX, y: event.clientY }) }}><span className={styles.recordTitle}>{node.record.title}</span><span className={styles.recordPrepared}>{node.record.preparedBy ? `Prepared by ${node.record.preparedBy}` : 'No Character credit'}</span><span className={styles.recordDate}>{recordDate(node.record.updatedAt)}</span></button>
    {node.children.length > 0 ? <ul className={styles.nestedRecords} role="group">{node.children.map(renderRecord as never)}</ul> : null}
  </li>

  return <div className={styles.explorer}>
    <div className={styles.explorerToolbar}>
      <section className={styles.toolbarGroup} aria-label="Folder actions"><span className={styles.toolbarLabel}>Folders</span><button type="button" className={styles.toolbarButton} disabled={!canManageFolders} onClick={() => setDialog('create-folder')}>Create folder</button><button type="button" className={styles.toolbarButton} disabled={!canManageFolders || !selectedFolder || selectedFolder.systemManaged} onClick={() => setDialog('rename-folder')}>Rename folder</button><button type="button" className={styles.toolbarButtonDanger} disabled={!canManageFolders || !selectedFolder || selectedFolder.systemManaged} onClick={() => setDialog('delete-folder')}>Delete folder</button></section>
      <section className={styles.toolbarGroup} aria-label="Record actions"><span className={styles.toolbarLabel}>Records</span><a className={`${styles.toolbarButton} ${!selectedRecord ? styles.toolbarButtonDisabled : ''}`} href={selectedRecord ? `${base}/documents/${selectedRecord.id}` : undefined} aria-disabled={!selectedRecord}>View</a><a className={`${styles.toolbarButton} ${!canOfferEdit(selectedRow) || selectedIsSuperseded ? styles.toolbarButtonDisabled : ''}`} href={canOfferEdit(selectedRow) && selectedRecord && !selectedIsSuperseded ? `${base}/documents/${selectedRecord.id}/edit` : undefined} aria-disabled={!canOfferEdit(selectedRow) || selectedIsSuperseded}>Edit</a><a className={`${styles.toolbarButton} ${!canActOnRecords || !selectedRecord || selectedIsSuperseded || !canOfferSupersede(selectedRow) ? styles.toolbarButtonDisabled : ''}`} href={canActOnRecords && selectedRecord && !selectedIsSuperseded && canOfferSupersede(selectedRow) ? `${base}/records/new?supersedes=${selectedRecord.id}` : undefined} aria-disabled={!canActOnRecords || !selectedRow || selectedIsSuperseded || !canOfferSupersede(selectedRow)}>Supersede</a><form action={deleteAction ?? undefined}><input type="hidden" name="tenantSlug" value={tenantSlug} /><input type="hidden" name="documentId" value={selectedRecord?.id ?? ''} /><button type="submit" className={styles.toolbarButtonDanger} disabled={!deleteAction || !canActOnRecords || !selectedRecord?.capabilities?.delete} title={canDeleteRecords ? undefined : 'Only the Domain Owner or an operational Domain Admin may delete records.'}>Delete</button></form><span className={styles.creationActions}><span className={styles.toolbarDivider} aria-hidden="true" /><a className={styles.toolbarButton} href={`${base}/records/new${selectedFolderId ? `?folder=${selectedFolderId}` : ''}`}>New document</a><a className={styles.toolbarButton} href={`${base}/import`}>Import notecard</a></span></section>
    </div>
    <div className={styles.panes}>
      <aside className={styles.folderPane} aria-label="Folder navigator"><div className={styles.paneHeader}><h1>{vocabulary.folderPlural}</h1><span>{documentTypeName ?? 'All types'}</span></div><div className={styles.folderTreeBox} role="tree" aria-label="Domain folders"><ul className={styles.folderTree}><li className={styles.folderItem} role="treeitem" aria-selected={selectedFolderId === null}><button type="button" className={`${styles.folderSelectRoot} ${selectedFolderId === null ? styles.folderRowSelected : ''}`} onClick={() => selectFolder(null)} onContextMenu={(event) => { event.preventDefault(); selectFolder(null); setContextMenu({ kind: 'folder', id: null, x: event.clientX, y: event.clientY }) }}><span className={styles.folderSpacer} aria-hidden="true" /><span className={styles.folderIcon} aria-hidden="true">⌂</span><span className={styles.folderName}>{vocabulary.documentPlural}</span><span className={styles.countBadge}>{ws.results.rootCount}</span></button></li>{visibleFolders.map(renderFolder)}</ul></div></aside>
      <section className={styles.recordPane} aria-label="Records browser"><div className={styles.paneHeader}><div><h1>{selectedFolder?.name ?? vocabulary.documentPlural}</h1><span aria-live="polite">{searching ? 'Searching…' : `${matchingRecords.length}${searchActive && searchHasMore ? '+' : ''} ${vocabulary.documentSingular.toLowerCase()}${matchingRecords.length === 1 && !(searchActive && searchHasMore) ? '' : 's'}`}</span></div><a className={`${styles.openRecord} ${!selectedRecord ? styles.openRecordDisabled : ''}`} href={selectedRecord ? `${base}/documents/${selectedRecord.id}` : undefined} aria-disabled={!selectedRecord}>Open</a></div><div className={styles.filterBar}><label className={styles.searchField}><span className={styles.searchIcon} aria-hidden="true">⌕</span><input type="search" value={search} onChange={(event) => { setSearch(event.target.value) }} placeholder="Search this folder" aria-label="Search this folder" /></label><label className={styles.subfolderToggle}><input type="checkbox" checked={searchSubfolders} onChange={(event) => { setSearchSubfolders(event.target.checked) }} />Search subfolders</label><select value={typeChoice} onChange={(event) => setTypeChoice(event.target.value)} aria-label="Document type filter"><option value="">All {vocabulary.documentSingular.toLowerCase()} types</option>{documentTypes.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}</select><button type="button" className={styles.exposeButton} onClick={applyExposure}>Expose</button></div><div className={styles.recordTreeBox} role="tree" aria-label="Records" onScroll={(event) => { const target = event.currentTarget; if (target.scrollTop + target.clientHeight >= target.scrollHeight - 80) void loadMoreSearchResults() }}><div className={styles.recordColumns} aria-hidden="true"><span>Name</span><span>Prepared by</span><span>Updated</span></div>{recordTrees.length > 0 ? <ul className={styles.recordTree}>{recordTrees.map(renderRecord as never)}</ul> : <p className={styles.emptyState}>No records here yet.</p>}{loadingMore ? <p className={styles.emptyState}>Loading more…</p> : null}</div></section>
    </div>
    {contextMenu ? <div className={styles.contextMenu} style={{ left: contextMenu.x, top: contextMenu.y }} role="menu" onClick={(event) => event.stopPropagation()}>{contextMenu.kind === 'folder' ? <><button type="button" role="menuitem" disabled={!canManageFolders} onClick={() => { setContextMenu(null); setDialog('create-folder') }}>Create subfolder</button><button type="button" role="menuitem" disabled={!canManageFolders || !selectedFolder || selectedFolder.systemManaged} onClick={() => { setContextMenu(null); setDialog('rename-folder') }}>Rename folder</button><button type="button" role="menuitem" className={styles.contextDanger} disabled={!canManageFolders || !selectedFolder || selectedFolder.systemManaged} onClick={() => { setContextMenu(null); setDialog('delete-folder') }}>Delete folder</button></> : <><a role="menuitem" href={contextRecord ? `${base}/documents/${contextRecord.id}` : undefined}>View</a><a role="menuitem" className={!canOfferEdit(contextRecordRow) || contextRecordIsSuperseded ? styles.contextDisabled : ''} href={canOfferEdit(contextRecordRow) && contextRecord && !contextRecordIsSuperseded ? `${base}/documents/${contextRecord.id}/edit` : undefined} aria-disabled={!canOfferEdit(contextRecordRow) || contextRecordIsSuperseded}>Edit</a><a role="menuitem" className={!canActOnRecords || !contextRecord || contextRecordIsSuperseded || !canOfferSupersede(contextRecordRow) ? styles.contextDisabled : ''} href={canActOnRecords && contextRecord && !contextRecordIsSuperseded && canOfferSupersede(contextRecordRow) ? `${base}/records/new?supersedes=${contextRecord.id}` : undefined} aria-disabled={!canActOnRecords || !contextRecord || contextRecordIsSuperseded || !canOfferSupersede(contextRecordRow)}>Supersede</a><form action={deleteAction ?? undefined} onSubmit={() => setContextMenu(null)}><input type="hidden" name="tenantSlug" value={tenantSlug} /><input type="hidden" name="documentId" value={contextRecord?.id ?? ''} /><button type="submit" role="menuitem" disabled={!deleteAction || !canActOnRecords || !(contextRecord && 'capabilities' in contextRecord ? contextRecord.capabilities.delete : (contextRecord as ExplorerRecord | null)?.canDelete)}>Delete</button></form></>}</div> : null}
    {dialog ? <div className={styles.dialogBackdrop} role="presentation" onMouseDown={() => setDialog(null)}><section className={styles.dialog} role="dialog" aria-modal="true" aria-label={dialog.replace('-', ' ')} onMouseDown={(event) => event.stopPropagation()}>
      {dialog === 'create-folder' ? <><h2>Create folder</h2><form action="/api/folders" method="post"><input type="hidden" name="domainSlug" value={tenantSlug} /><input type="hidden" name="returnTo" value={returnTo} /><input type="hidden" name="action" value="create" /><input type="hidden" name="parentId" value={selectedFolder?.id ?? ''} /><label>Name<input name="name" required autoFocus /></label><div className={styles.dialogActions}><button type="submit" className={styles.confirmButton}>Create</button><button type="button" className={styles.cancelButton} onClick={() => setDialog(null)}>Cancel</button></div></form></> : null}
      {dialog === 'rename-folder' && selectedFolder ? <><h2>Rename folder</h2><form action="/api/folders" method="post"><input type="hidden" name="domainSlug" value={tenantSlug} /><input type="hidden" name="returnTo" value={returnTo} /><input type="hidden" name="action" value="rename" /><input type="hidden" name="folderId" value={selectedFolder.id} /><label>Name<input name="name" required autoFocus defaultValue={selectedFolder.name} /></label><div className={styles.dialogActions}><button type="submit" className={styles.confirmButton}>Rename</button><button type="button" className={styles.cancelButton} onClick={() => setDialog(null)}>Cancel</button></div></form></> : null}
      {dialog === 'delete-folder' && selectedFolder ? <><h2>Delete {selectedFolder.name}?</h2><p>The folder must be empty before it can be deleted.</p><form action="/api/folders" method="post"><input type="hidden" name="domainSlug" value={tenantSlug} /><input type="hidden" name="returnTo" value={`${base}/records`} /><input type="hidden" name="action" value="delete" /><input type="hidden" name="folderId" value={selectedFolder.id} /><div className={styles.dialogActions}><button type="submit" className={styles.deleteButton}>Delete folder</button><button type="button" className={styles.cancelButton} onClick={() => setDialog(null)}>Cancel</button></div></form></> : null}
    </section></div> : null}
  </div>
}
