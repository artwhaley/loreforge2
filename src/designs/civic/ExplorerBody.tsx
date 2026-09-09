'use client'

import { useRecordActions } from '@/components/functional/records/recordActions'
import type { FolderSummary, RecordSummary } from '@/lib/page-models/common'
import type { RecordsPageModel } from '@/lib/page-models/records'
import { folderActionDescriptors, importNotecardHref, newRecordHref, recordActionDescriptors } from '@/lib/records/presentation/operations'
import { useRecordsWorkspace } from '@/lib/records/workspace/useRecordsWorkspace'

import styles from './explorer.module.css'

function recordDate(value: string) { return new Date(value).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) }

/**
 * Civic records composition (spec §25D): visual composition lives in the
 * Design; behavior runs on the shared workspace (Stage G). The debounced
 * search, cursor pagination, folder selection/expansion, supersession
 * derivation, and dialog/menu state all come from `useRecordsWorkspace`.
 */
export function ExplorerBody(model: RecordsPageModel) {
  const base = model.baseUrl
  const tenantSlug = model.domainSlug
  const { manageFolders: canManageFolders, actOnRecords: canActOnRecords, deleteRecords: canDeleteRecords } = model.capabilities
  const { vocabulary, documentTypes } = model
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

  const contextRecord = contextMenu?.kind === 'record' && contextMenu.id !== null ? matchingRecords.find((record) => record.id === contextMenu.id) ?? null : null
  const contextRecordIsSuperseded = contextRecord ? activeEdges.some((edge) => edge.olderId === contextRecord.id) : false
  // P08D-T01-E: the action surface is described once, UI-neutrally, and this
  // Design composes it (same semantics the Ledger/Poster designs can reuse).
  const recordActions = recordActionDescriptors({ baseUrl: base, record: selectedRecord, isSuperseded: selectedIsSuperseded, canActOnRecords, deleteActionProvided: Boolean(deleteAction) })
  const contextRecordActions = recordActionDescriptors({ baseUrl: base, record: contextRecord, isSuperseded: contextRecordIsSuperseded, canActOnRecords, deleteActionProvided: Boolean(deleteAction) })
  const folderActions = folderActionDescriptors({ canManageFolders, selectedFolder })

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
      <section className={styles.toolbarGroup} aria-label="Folder actions"><span className={styles.toolbarLabel}>Folders</span>{folderActions.filter((action) => action.operation !== 'create-subfolder').map((action) => <button key={action.operation} type="button" className={action.operation === 'delete-folder' ? styles.toolbarButtonDanger : styles.toolbarButton} disabled={!action.enabled} onClick={() => setDialog(action.dialog)}>{action.label}</button>)}</section>
      <section className={styles.toolbarGroup} aria-label="Record actions"><span className={styles.toolbarLabel}>Records</span>{recordActions.map((action) => action.operation === 'delete' ? <form key="delete" action={deleteAction ?? undefined}><input type="hidden" name="tenantSlug" value={tenantSlug} /><input type="hidden" name="documentId" value={selectedRecord?.id ?? ''} /><button type="submit" className={styles.toolbarButtonDanger} disabled={!action.enabled} title={canDeleteRecords ? undefined : 'Only the Domain Owner or an operational Domain Admin may delete records.'}>{action.label}</button></form> : <a key={action.operation} className={`${styles.toolbarButton} ${action.enabled ? '' : styles.toolbarButtonDisabled}`} href={action.href ?? undefined} aria-disabled={!action.enabled}>{action.label}</a>)}<span className={styles.creationActions}><span className={styles.toolbarDivider} aria-hidden="true" /><a className={styles.toolbarButton} href={newRecordHref(base, selectedFolderId)}>New document</a><a className={styles.toolbarButton} href={importNotecardHref(base)}>Import notecard</a></span></section>
    </div>
    <div className={styles.panes}>
      <aside className={styles.folderPane} aria-label="Folder navigator"><div className={styles.paneHeader}><h1>{vocabulary.folderPlural}</h1><span>{documentTypeName ?? 'All types'}</span></div><div className={styles.folderTreeBox} role="tree" aria-label="Domain folders"><ul className={styles.folderTree}><li className={styles.folderItem} role="treeitem" aria-selected={selectedFolderId === null}><button type="button" className={`${styles.folderSelectRoot} ${selectedFolderId === null ? styles.folderRowSelected : ''}`} onClick={() => selectFolder(null)} onContextMenu={(event) => { event.preventDefault(); selectFolder(null); setContextMenu({ kind: 'folder', id: null, x: event.clientX, y: event.clientY }) }}><span className={styles.folderSpacer} aria-hidden="true" /><span className={styles.folderIcon} aria-hidden="true">⌂</span><span className={styles.folderName}>{vocabulary.documentPlural}</span><span className={styles.countBadge}>{ws.results.rootCount}</span></button></li>{visibleFolders.map(renderFolder)}</ul></div></aside>
      <section className={styles.recordPane} aria-label="Records browser"><div className={styles.paneHeader}><div><h1>{selectedFolder?.name ?? vocabulary.documentPlural}</h1><span aria-live="polite">{searching ? 'Searching…' : `${matchingRecords.length}${searchActive && searchHasMore ? '+' : ''} ${vocabulary.documentSingular.toLowerCase()}${matchingRecords.length === 1 && !(searchActive && searchHasMore) ? '' : 's'}`}</span></div><a className={`${styles.openRecord} ${!selectedRecord ? styles.openRecordDisabled : ''}`} href={selectedRecord ? `${base}/documents/${selectedRecord.id}` : undefined} aria-disabled={!selectedRecord}>Open</a></div><div className={styles.filterBar}><label className={styles.searchField}><span className={styles.searchIcon} aria-hidden="true">⌕</span><input type="search" value={search} onChange={(event) => { setSearch(event.target.value) }} placeholder="Search this folder" aria-label="Search this folder" /></label><label className={styles.subfolderToggle}><input type="checkbox" checked={searchSubfolders} onChange={(event) => { setSearchSubfolders(event.target.checked) }} />Search subfolders</label><select value={typeChoice} onChange={(event) => setTypeChoice(event.target.value)} aria-label="Document type filter"><option value="">All {vocabulary.documentSingular.toLowerCase()} types</option>{documentTypes.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}</select><button type="button" className={styles.exposeButton} onClick={applyExposure}>Expose</button></div><div className={styles.recordTreeBox} role="tree" aria-label="Records" onScroll={(event) => { const target = event.currentTarget; if (target.scrollTop + target.clientHeight >= target.scrollHeight - 80) void loadMoreSearchResults() }}><div className={styles.recordColumns} aria-hidden="true"><span>Name</span><span>Prepared by</span><span>Updated</span></div>{recordTrees.length > 0 ? <ul className={styles.recordTree}>{recordTrees.map(renderRecord as never)}</ul> : <p className={styles.emptyState}>No records here yet.</p>}{loadingMore ? <p className={styles.emptyState}>Loading more…</p> : null}</div></section>
    </div>
    {contextMenu ? <div className={styles.contextMenu} style={{ left: contextMenu.x, top: contextMenu.y }} role="menu" onClick={(event) => event.stopPropagation()}>{contextMenu.kind === 'folder' ? <>{folderActions.filter((action) => action.operation !== 'create-folder').map((action) => <button key={action.operation} type="button" role="menuitem" className={action.operation === 'delete-folder' ? styles.contextDanger : undefined} disabled={!action.enabled} onClick={() => { setContextMenu(null); setDialog(action.dialog) }}>{action.label}</button>)}</> : <>{contextRecordActions.map((action) => action.operation === 'delete' ? <form key="delete" action={deleteAction ?? undefined} onSubmit={() => setContextMenu(null)}><input type="hidden" name="tenantSlug" value={tenantSlug} /><input type="hidden" name="documentId" value={contextRecord?.id ?? ''} /><button type="submit" role="menuitem" disabled={!action.enabled}>{action.label}</button></form> : <a key={action.operation} role="menuitem" className={action.enabled ? undefined : styles.contextDisabled} href={action.href ?? undefined} aria-disabled={!action.enabled}>{action.label}</a>)}</>}</div> : null}
    {dialog ? <div className={styles.dialogBackdrop} role="presentation" onMouseDown={() => setDialog(null)}><section className={styles.dialog} role="dialog" aria-modal="true" aria-label={dialog.replace('-', ' ')} onMouseDown={(event) => event.stopPropagation()}>
      {dialog === 'create-folder' ? <><h2>Create folder</h2><form action="/api/folders" method="post"><input type="hidden" name="domainSlug" value={tenantSlug} /><input type="hidden" name="returnTo" value={returnTo} /><input type="hidden" name="action" value="create" /><input type="hidden" name="parentId" value={selectedFolder?.id ?? ''} /><label>Name<input name="name" required autoFocus /></label><div className={styles.dialogActions}><button type="submit" className={styles.confirmButton}>Create</button><button type="button" className={styles.cancelButton} onClick={() => setDialog(null)}>Cancel</button></div></form></> : null}
      {dialog === 'rename-folder' && selectedFolder ? <><h2>Rename folder</h2><form action="/api/folders" method="post"><input type="hidden" name="domainSlug" value={tenantSlug} /><input type="hidden" name="returnTo" value={returnTo} /><input type="hidden" name="action" value="rename" /><input type="hidden" name="folderId" value={selectedFolder.id} /><label>Name<input name="name" required autoFocus defaultValue={selectedFolder.name} /></label><div className={styles.dialogActions}><button type="submit" className={styles.confirmButton}>Rename</button><button type="button" className={styles.cancelButton} onClick={() => setDialog(null)}>Cancel</button></div></form></> : null}
      {dialog === 'delete-folder' && selectedFolder ? <><h2>Delete {selectedFolder.name}?</h2><p>The folder must be empty before it can be deleted.</p><form action="/api/folders" method="post"><input type="hidden" name="domainSlug" value={tenantSlug} /><input type="hidden" name="returnTo" value={`${base}/records`} /><input type="hidden" name="action" value="delete" /><input type="hidden" name="folderId" value={selectedFolder.id} /><div className={styles.dialogActions}><button type="submit" className={styles.deleteButton}>Delete folder</button><button type="button" className={styles.cancelButton} onClick={() => setDialog(null)}>Cancel</button></div></form></> : null}
    </section></div> : null}
  </div>
}
