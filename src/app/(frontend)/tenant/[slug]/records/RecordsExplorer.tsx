'use client'

import { useEffect, useMemo, useState } from 'react'

import { softDeleteDocumentAction } from '@/lib/actions/documentWorkflow'

import styles from './records.module.scss'

export type ExplorerFolder = { id: number; name: string; systemManaged: boolean; children: ExplorerFolder[] }
export type ExplorerRecord = { id: number; title: string; body: string; folderId: number | null; documentTypeId: number | null; updatedAt: string; preparedBy: string | null; lifecycle: string }
export type SupersessionEdge = { newerId: number; olderId: number }

type Props = { base: string; tenantSlug: string; folders: ExplorerFolder[]; records: ExplorerRecord[]; documentTypes: Array<{ id: number; name: string }>; supersessionEdges: SupersessionEdge[]; initialFolderId: number | null; initialSearch: string; canManageFolders: boolean; canActOnRecords: boolean }
type RecordNode = { record: ExplorerRecord; children: RecordNode[] }
type Dialog = 'create-folder' | 'rename-folder' | 'delete-folder' | 'send' | null

function filterFolders(node: ExplorerFolder, matchingFolderIds: Set<number>): ExplorerFolder | null {
  const children = node.children.map((child) => filterFolders(child, matchingFolderIds)).filter((child): child is ExplorerFolder => child !== null)
  return matchingFolderIds.has(node.id) || children.length > 0 ? { ...node, children } : null
}

function descendantFolderIds(folder: ExplorerFolder): number[] { return [folder.id, ...folder.children.flatMap(descendantFolderIds)] }
function recordDate(value: string) { return new Date(value).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) }

export function RecordsExplorer({ base, tenantSlug, folders, records, documentTypes, supersessionEdges, initialFolderId, initialSearch, canManageFolders, canActOnRecords }: Props) {
  const [selectedFolderId, setSelectedFolderId] = useState<number | null>(initialFolderId)
  const [selectedRecordId, setSelectedRecordId] = useState<number | null>(null)
  const [search, setSearch] = useState(initialSearch)
  const [searchSubfolders, setSearchSubfolders] = useState(true)
  const [typeChoice, setTypeChoice] = useState('')
  const [exposedTypeId, setExposedTypeId] = useState<number | null>(null)
  const [dialog, setDialog] = useState<Dialog>(null)
  const [expandedFolders, setExpandedFolders] = useState<Set<number>>(() => {
    const expanded = new Set<number>()
    const visit = (nodes: ExplorerFolder[]) => nodes.forEach((folder) => {
      if (folder.children.length > 0) expanded.add(folder.id)
      visit(folder.children)
    })
    visit(folders)
    return expanded
  })

  const folderById = useMemo(() => {
    const byId = new Map<number, ExplorerFolder>()
    const visit = (nodes: ExplorerFolder[]) => nodes.forEach((folder) => { byId.set(folder.id, folder); visit(folder.children) })
    visit(folders)
    return byId
  }, [folders])
  const selectedFolder = selectedFolderId ? folderById.get(selectedFolderId) ?? null : null
  const selectedRecord = selectedRecordId ? records.find((record) => record.id === selectedRecordId) ?? null : null
  const selectedFolderDescendants = useMemo(() => selectedFolder ? new Set(descendantFolderIds(selectedFolder)) : null, [selectedFolder])

  const directCountByFolder = useMemo(() => {
    const counts = new Map<number, number>()
    for (const record of records) {
      if (exposedTypeId !== null && record.documentTypeId !== exposedTypeId) continue
      if (record.folderId !== null) counts.set(record.folderId, (counts.get(record.folderId) ?? 0) + 1)
    }
    return counts
  }, [exposedTypeId, records])
  const visibleFolders = useMemo(() => {
    if (exposedTypeId === null) return folders
    const matchingFolderIds = new Set<number>(records.filter((record) => record.documentTypeId === exposedTypeId && record.folderId !== null).map((record) => record.folderId as number))
    return folders.map((folder) => filterFolders(folder, matchingFolderIds)).filter((folder): folder is ExplorerFolder => folder !== null)
  }, [exposedTypeId, folders, records])
  const matchingRecords = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase()
    return records.filter((record) => {
      if (exposedTypeId !== null && record.documentTypeId !== exposedTypeId) return false
      if (selectedFolderId !== null) {
        const inSelectedFolder = record.folderId === selectedFolderId
        const inSelectedSubfolder = selectedFolderDescendants?.has(record.folderId ?? -1) ?? false
        if (normalizedSearch && searchSubfolders ? !inSelectedSubfolder : !inSelectedFolder) return false
      }
      return !normalizedSearch || `${record.title}\n${record.body}`.toLocaleLowerCase().includes(normalizedSearch)
    })
  }, [exposedTypeId, records, search, searchSubfolders, selectedFolderDescendants, selectedFolderId])
  const recordTrees = useMemo(() => {
    const byId = new Map(records.map((record) => [record.id, record]))
    const newerByOlder = new Map(supersessionEdges.map((edge) => [edge.olderId, edge.newerId]))
    const olderByNewer = new Map(supersessionEdges.map((edge) => [edge.newerId, edge.olderId]))
    const rootFor = (recordId: number) => { const visited = new Set<number>(); let current = recordId; while (newerByOlder.has(current) && !visited.has(current)) { visited.add(current); current = newerByOlder.get(current)! } return current }
    const buildTree = (recordId: number, visited = new Set<number>()): RecordNode | null => { const record = byId.get(recordId); if (!record || visited.has(recordId)) return null; const nextVisited = new Set(visited).add(recordId); const olderId = olderByNewer.get(recordId); const child = olderId ? buildTree(olderId, nextVisited) : null; return { record, children: child ? [child] : [] } }
    const roots = new Map<number, RecordNode>()
    for (const record of matchingRecords) { const root = buildTree(rootFor(record.id)); if (root) roots.set(root.record.id, root) }
    return [...roots.values()]
  }, [matchingRecords, records, supersessionEdges])

  useEffect(() => {
    if (selectedRecordId !== null && !matchingRecords.some((record) => record.id === selectedRecordId)) setSelectedRecordId(null)
  }, [matchingRecords, selectedRecordId])

  const returnTo = selectedFolderId === null ? `${base}/records` : `${base}/records?folder=${selectedFolderId}`
  const selectedIsSuperseded = selectedRecord ? supersessionEdges.some((edge) => edge.olderId === selectedRecord.id) : false
  const documentTypeName = exposedTypeId === null ? null : documentTypes.find((type) => type.id === exposedTypeId)?.name ?? null
  const applyExposure = () => { setExposedTypeId(typeChoice ? Number(typeChoice) : null); setSelectedRecordId(null) }

  const toggleFolder = (folderId: number) => setExpandedFolders((current) => {
    const next = new Set(current)
    if (next.has(folderId)) next.delete(folderId)
    else next.add(folderId)
    return next
  })
  const renderFolder = (folder: ExplorerFolder) => <li key={folder.id} className={styles.folderItem} role="treeitem" aria-selected={selectedFolderId === folder.id} aria-expanded={folder.children.length > 0 ? expandedFolders.has(folder.id) : undefined}>
    <div className={`${styles.folderRow} ${selectedFolderId === folder.id ? styles.folderRowSelected : ''}`}>{folder.children.length > 0 ? <button type="button" className={styles.folderDisclosure} aria-label={`${expandedFolders.has(folder.id) ? 'Collapse' : 'Expand'} ${folder.name}`} aria-expanded={expandedFolders.has(folder.id)} onClick={() => toggleFolder(folder.id)}>{expandedFolders.has(folder.id) ? '⌄' : '›'}</button> : <span className={styles.folderSpacer} aria-hidden="true" />}<span className={styles.folderIcon} aria-hidden="true">{folder.systemManaged ? '⌂' : '▱'}</span><button type="button" className={styles.folderSelect} onClick={() => { setSelectedFolderId(folder.id); setSelectedRecordId(null) }}><span className={styles.folderName}>{folder.name}</span><span className={styles.countBadge}>{directCountByFolder.get(folder.id) ?? 0}</span></button></div>
    {folder.children.length > 0 && expandedFolders.has(folder.id) ? <ul className={styles.nestedFolders} role="group">{folder.children.map(renderFolder)}</ul> : null}
  </li>
  const renderRecord = (node: RecordNode): React.ReactNode => <li key={node.record.id} className={styles.recordItem} role="treeitem" aria-selected={selectedRecordId === node.record.id}>
    <button type="button" className={`${styles.recordRow} ${selectedRecordId === node.record.id ? styles.recordRowSelected : ''}`} onClick={() => setSelectedRecordId(node.record.id)}><span className={styles.recordTitle}>{node.record.title}</span><span className={styles.recordPrepared}>{node.record.preparedBy ? `Prepared by ${node.record.preparedBy}` : 'No Character credit'}</span><span className={styles.recordDate}>{recordDate(node.record.updatedAt)}</span></button>
    {node.children.length > 0 ? <ul className={styles.nestedRecords} role="group">{node.children.map(renderRecord)}</ul> : null}
  </li>

  return <div className={styles.explorer}>
    <div className={styles.explorerToolbar}>
      <section className={styles.toolbarGroup} aria-label="Folder actions"><span className={styles.toolbarLabel}>Folders</span><button type="button" className={styles.toolbarButton} disabled={!canManageFolders} onClick={() => setDialog('create-folder')}>Create folder</button><button type="button" className={styles.toolbarButton} disabled={!canManageFolders || !selectedFolder || selectedFolder.systemManaged} onClick={() => setDialog('rename-folder')}>Rename folder</button><button type="button" className={styles.toolbarButtonDanger} disabled={!canManageFolders || !selectedFolder || selectedFolder.systemManaged} onClick={() => setDialog('delete-folder')}>Delete folder</button></section>
      <section className={styles.toolbarGroup} aria-label="Record actions"><span className={styles.toolbarLabel}>Records</span><a className={`${styles.toolbarButton} ${!selectedRecord ? styles.toolbarButtonDisabled : ''}`} href={selectedRecord ? `${base}/documents/${selectedRecord.id}` : undefined} aria-disabled={!selectedRecord}>View</a><a className={`${styles.toolbarButton} ${!canActOnRecords || !selectedRecord || selectedIsSuperseded ? styles.toolbarButtonDisabled : ''}`} href={canActOnRecords && selectedRecord && !selectedIsSuperseded ? `${base}/documents/${selectedRecord.id}/edit` : undefined} aria-disabled={!canActOnRecords || !selectedRecord || selectedIsSuperseded}>Edit</a><a className={`${styles.toolbarButton} ${!canActOnRecords || !selectedRecord || selectedIsSuperseded ? styles.toolbarButtonDisabled : ''}`} href={canActOnRecords && selectedRecord && !selectedIsSuperseded ? `${base}/records/new?supersedes=${selectedRecord.id}` : undefined} aria-disabled={!canActOnRecords || !selectedRecord || selectedIsSuperseded}>Supersede</a><form action={softDeleteDocumentAction}><input type="hidden" name="tenantSlug" value={tenantSlug} /><input type="hidden" name="documentId" value={selectedRecord?.id ?? ''} /><button type="submit" className={styles.toolbarButtonDanger} disabled={!canActOnRecords || !selectedRecord}>Delete</button></form><button type="button" className={styles.toolbarButton} disabled={!selectedRecord} onClick={() => setDialog('send')}>Send</button><span className={styles.creationActions}><span className={styles.toolbarDivider} aria-hidden="true" /><a className={styles.toolbarButton} href={`${base}/records/new${selectedFolderId ? `?folder=${selectedFolderId}` : ''}`}>New document</a><a className={styles.toolbarButton} href={`${base}/import`}>Import notecard</a></span></section>
    </div>
    <div className={styles.panes}>
      <aside className={styles.folderPane} aria-label="Folder navigator"><div className={styles.paneHeader}><h1>Folders</h1><span>{documentTypeName ?? 'All types'}</span></div><div className={styles.folderTreeBox} role="tree" aria-label="Domain folders"><ul className={styles.folderTree}><li className={styles.folderItem} role="treeitem" aria-selected={selectedFolderId === null}><button type="button" className={`${styles.folderSelectRoot} ${selectedFolderId === null ? styles.folderRowSelected : ''}`} onClick={() => { setSelectedFolderId(null); setSelectedRecordId(null) }}><span className={styles.folderSpacer} aria-hidden="true" /><span className={styles.folderIcon} aria-hidden="true">⌂</span><span className={styles.folderName}>All records</span><span className={styles.countBadge}>{exposedTypeId === null ? records.length : records.filter((record) => record.documentTypeId === exposedTypeId).length}</span></button></li>{visibleFolders.map(renderFolder)}</ul></div></aside>
      <section className={styles.recordPane} aria-label="Records browser"><div className={styles.paneHeader}><div><h1>{selectedFolder?.name ?? 'All records'}</h1><span>{matchingRecords.length} record{matchingRecords.length === 1 ? '' : 's'}</span></div><a className={`${styles.openRecord} ${!selectedRecord ? styles.openRecordDisabled : ''}`} href={selectedRecord ? `${base}/documents/${selectedRecord.id}` : undefined} aria-disabled={!selectedRecord}>Open</a></div><div className={styles.filterBar}><label className={styles.searchField}><span className={styles.searchIcon} aria-hidden="true">⌕</span><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search this folder" aria-label="Search this folder" /></label><label className={styles.subfolderToggle}><input type="checkbox" checked={searchSubfolders} onChange={(event) => setSearchSubfolders(event.target.checked)} />Search subfolders</label><select value={typeChoice} onChange={(event) => setTypeChoice(event.target.value)} aria-label="Document type filter"><option value="">All document types</option>{documentTypes.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}</select><button type="button" className={styles.exposeButton} onClick={applyExposure}>Expose</button></div><div className={styles.recordTreeBox} role="tree" aria-label="Records"><div className={styles.recordColumns} aria-hidden="true"><span>Name</span><span>Prepared by</span><span>Updated</span></div>{recordTrees.length > 0 ? <ul className={styles.recordTree}>{recordTrees.map(renderRecord)}</ul> : <p className={styles.emptyState}>No records match this folder, search, and document-type filter.</p>}</div></section>
    </div>
    {dialog ? <div className={styles.dialogBackdrop} role="presentation" onMouseDown={() => setDialog(null)}><section className={styles.dialog} role="dialog" aria-modal="true" aria-label={dialog.replace('-', ' ')} onMouseDown={(event) => event.stopPropagation()}>
      {dialog === 'create-folder' ? <><h2>Create folder</h2><form action="/api/folders" method="post"><input type="hidden" name="domainSlug" value={tenantSlug} /><input type="hidden" name="returnTo" value={returnTo} /><input type="hidden" name="action" value="create" /><input type="hidden" name="parentId" value={selectedFolder?.id ?? ''} /><label>Name<input name="name" required autoFocus /></label><div className={styles.dialogActions}><button type="submit" className={styles.confirmButton}>Create</button><button type="button" className={styles.cancelButton} onClick={() => setDialog(null)}>Cancel</button></div></form></> : null}
      {dialog === 'rename-folder' && selectedFolder ? <><h2>Rename folder</h2><form action="/api/folders" method="post"><input type="hidden" name="domainSlug" value={tenantSlug} /><input type="hidden" name="returnTo" value={returnTo} /><input type="hidden" name="action" value="rename" /><input type="hidden" name="folderId" value={selectedFolder.id} /><label>Name<input name="name" required autoFocus defaultValue={selectedFolder.name} /></label><div className={styles.dialogActions}><button type="submit" className={styles.confirmButton}>Rename</button><button type="button" className={styles.cancelButton} onClick={() => setDialog(null)}>Cancel</button></div></form></> : null}
      {dialog === 'delete-folder' && selectedFolder ? <><h2>Delete {selectedFolder.name}?</h2><p>The folder must be empty before it can be deleted.</p><form action="/api/folders" method="post"><input type="hidden" name="domainSlug" value={tenantSlug} /><input type="hidden" name="returnTo" value={`${base}/records`} /><input type="hidden" name="action" value="delete" /><input type="hidden" name="folderId" value={selectedFolder.id} /><div className={styles.dialogActions}><button type="submit" className={styles.deleteButton}>Delete folder</button><button type="button" className={styles.cancelButton} onClick={() => setDialog(null)}>Cancel</button></div></form></> : null}
      {dialog === 'send' && selectedRecord ? <><h2>Send record</h2><p>Sending records will be added with messages and correspondence. It is not implemented yet.</p><div className={styles.dialogActions}><button type="button" className={styles.confirmButton} onClick={() => setDialog(null)}>Close</button></div></> : null}
    </section></div> : null}
  </div>
}
