'use client'

import { useRecordActions } from '@/components/functional/records/recordActions'
import type { FolderSummary, RecordSummary } from '@/lib/page-models/common'
import type { RecordsPageModel } from '@/lib/page-models/records'
import type { LedgerConfigV1 } from '@/lib/design/contracts'
import type { DesignConfigProps } from '@/lib/design/types'
import { folderActionDescriptors, importNotecardHref, newRecordHref, recordActionDescriptors } from '@/lib/records/presentation/operations'
import { useRecordsWorkspace } from '@/lib/records/workspace/useRecordsWorkspace'

import styles from './ledger-records.module.scss'

function recordDate(value: string) { return new Date(value).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) }

/**
 * Ledger Records (P08D-T07): an archival register over the shared workspace.
 * The full capability contract is present — New/Import, record actions
 * (View/Edit/Supersede/Delete), folder CRUD, filters, search subfolders,
 * supersession nesting — composed as Ledger's own command strip + index,
 * never as Civic's explorer panes.
 */
export function LedgerRecords(model: RecordsPageModel & DesignConfigProps<LedgerConfigV1>) {
  const base = model.baseUrl
  const tenantSlug = model.domainSlug
  const { manageFolders: canManageFolders, actOnRecords: canActOnRecords } = model.capabilities
  const { vocabulary, documentTypes } = model
  const ws = useRecordsWorkspace(model)
  const { deleteAction } = useRecordActions()
  const selectedRecord = ws.selection.selected
  const selectedIsSuperseded = ws.selection.isSuperseded
  const selectedFolder = ws.folders.selected
  const selectedFolderId = ws.folders.selectedId
  const dialog = ws.actions.dialog
  const returnTo = ws.actions.returnTo
  const recordActions = recordActionDescriptors({ baseUrl: base, record: selectedRecord, isSuperseded: selectedIsSuperseded, canActOnRecords, deleteActionProvided: Boolean(deleteAction) })
  const folderActions = folderActionDescriptors({ canManageFolders, selectedFolder })

  const renderFolder = (folder: FolderSummary, depth = 0): React.ReactNode => (
    <li key={folder.id} className={styles.folderItem} role="treeitem" aria-selected={selectedFolderId === folder.id} style={{ paddingLeft: depth * 14 }}>
      <button type="button" className={selectedFolderId === folder.id ? styles.folderSelectActive : styles.folderSelect} onClick={() => ws.folders.select(folder.id)}>
        <span className={styles.folderName}>{folder.name}</span>
        <span className={styles.countBadge}>{ws.results.counts.get(folder.id) ?? 0}</span>
      </button>
      {folder.children.length > 0 ? <ul className={styles.folderChildren} role="group">{folder.children.map((child) => renderFolder(child, depth + 1))}</ul> : null}
    </li>
  )
  const renderRecord = (node: { record: RecordSummary; children: Array<{ record: RecordSummary; children: never[] }> | never[] }): React.ReactNode => (
    <li key={node.record.id} className={styles.entry} role="treeitem" aria-selected={ws.selection.recordId === node.record.id}>
      <button type="button" className={styles.entrySelect} onClick={() => ws.selection.selectRecord(node.record.id)}>
        <span className={styles.entryTitle}>{node.record.title}</span>
        <span className={styles.entryMeta}>{node.record.preparedBy ?? 'No credit'} · {recordDate(node.record.updatedAt)}</span>
      </button>
      {node.children.length > 0 ? <ul className={styles.entryChildren} role="group">{node.children.map(renderRecord as never)}</ul> : null}
    </li>
  )

  return (
    <div className={styles.ledgerRecords}>
      <div className={styles.commandStrip} aria-label="Register commands">
        <h1 className={styles.title}>{selectedFolder?.name ?? vocabulary.documentPlural}</h1>
        <div className={styles.commands}>
          <a className={styles.command} href={newRecordHref(base, selectedFolderId)}>New document</a>
          <a className={styles.command} href={importNotecardHref(base)}>Import notecard</a>
        </div>
      </div>

      <div className={styles.filterBar}>
        <label className={styles.searchField}>
          <input type="search" value={ws.search.value} onChange={(event) => { ws.search.setValue(event.target.value); ws.resetSearchResults() }} placeholder="Search the register" aria-label="Search the register" />
        </label>
        <label className={styles.subfolderToggle}>
          <input type="checkbox" checked={ws.search.subfolders} onChange={(event) => { ws.search.setSubfolders(event.target.checked); ws.resetSearchResults() }} />
          Search subfolders
        </label>
        <select value={ws.exposure.typeChoice} onChange={(event) => ws.exposure.setTypeChoice(event.target.value)} aria-label="Document type filter">
          <option value="">All {vocabulary.documentSingular.toLowerCase()} types</option>
          {documentTypes.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}
        </select>
        <button type="button" className={styles.command} onClick={() => ws.exposure.apply(ws.exposure.typeChoice)}>Expose</button>
        <select className={styles.command} value={ws.folders.selectedId == null ? '' : String(ws.folders.selectedId)} onChange={(event) => ws.folders.select(event.target.value ? Number(event.target.value) : null)} aria-label="Folder jump">
          <option value="">All folders</option>
          {[...ws.folders.byId.values()].map((folder) => <option key={folder.id} value={folder.id}>{folder.name} ({ws.results.counts.get(folder.id) ?? folder.readableRecordCount})</option>)}
        </select>
      </div>

      <div className={styles.actionStrip} aria-label="Selected record actions">
        {recordActions.map((action) => action.operation === 'delete' ? (
          <form key="delete" action={deleteAction ?? undefined}>
            <input type="hidden" name="tenantSlug" value={tenantSlug} />
            <input type="hidden" name="documentId" value={selectedRecord?.id ?? ''} />
            <button type="submit" className={styles.commandDanger} disabled={!action.enabled}>{action.label}</button>
          </form>
        ) : (
          <a key={action.operation} className={action.enabled ? styles.command : styles.commandDisabled} href={action.href ?? undefined} aria-disabled={!action.enabled}>{action.label}</a>
        ))}
        <span className={styles.divider} aria-hidden="true" />
        {folderActions.map((action) => (
          <button key={action.operation} type="button" className={action.operation === 'delete-folder' ? styles.commandDanger : styles.command} disabled={!action.enabled} onClick={() => ws.actions.setDialog(action.dialog)}>{action.label}</button>
        ))}
      </div>

      <div className={styles.spread}>
        <aside className={styles.index} aria-label="Folder index">
          <h2 className={styles.indexTitle}>{vocabulary.folderPlural}</h2>
          <ul className={styles.folderTree} role="tree" aria-label="Domain folders">
            <li className={styles.folderItem} role="treeitem" aria-selected={selectedFolderId === null}>
              <button type="button" className={selectedFolderId === null ? styles.folderSelectActive : styles.folderSelect} onClick={() => ws.folders.select(null)}>
                <span className={styles.folderName}>{vocabulary.documentPlural}</span>
                <span className={styles.countBadge}>{ws.results.rootCount}</span>
              </button>
            </li>
            {ws.folders.list.map((folder) => renderFolder(folder))}
          </ul>
        </aside>
        <section className={styles.register} aria-label="Records register">
          <div className={styles.registerHead} aria-live="polite">
            <span>{ws.search.loading ? 'Searching…' : `${ws.results.records.length}${ws.results.hasMore ? '+' : ''} ${vocabulary.documentSingular.toLowerCase()}${ws.results.records.length === 1 && !ws.results.hasMore ? '' : 's'}`}</span>
          </div>
          <div className={styles.recordBox} role="tree" aria-label="Records" onScroll={(event) => { const target = event.currentTarget; if (target.scrollTop + target.clientHeight >= target.scrollHeight - 80) void ws.results.loadMore() }}>
            {ws.results.trees.length > 0 ? <ul className={styles.recordList}>{ws.results.trees.map(renderRecord as never)}</ul> : <p className={styles.empty}>No records here yet.</p>}
            {ws.results.loadingMore ? <p className={styles.empty}>Loading more…</p> : null}
          </div>
        </section>
      </div>

      {dialog ? <div className={styles.dialogBackdrop} role="presentation" onMouseDown={() => ws.actions.setDialog(null)}><section className={styles.dialog} role="dialog" aria-modal="true" aria-label={dialog.replace('-', ' ')} onMouseDown={(event) => event.stopPropagation()}>
        {dialog === 'create-folder' ? <><h2>Create folder</h2><form action="/api/folders" method="post"><input type="hidden" name="domainSlug" value={tenantSlug} /><input type="hidden" name="returnTo" value={returnTo} /><input type="hidden" name="action" value="create" /><input type="hidden" name="parentId" value={selectedFolder?.id ?? ''} /><label>Name<input name="name" required autoFocus /></label><div className={styles.dialogActions}><button type="submit" className={styles.confirmButton}>Create</button><button type="button" className={styles.cancelButton} onClick={() => ws.actions.setDialog(null)}>Cancel</button></div></form></> : null}
        {dialog === 'rename-folder' && selectedFolder ? <><h2>Rename folder</h2><form action="/api/folders" method="post"><input type="hidden" name="domainSlug" value={tenantSlug} /><input type="hidden" name="returnTo" value={returnTo} /><input type="hidden" name="action" value="rename" /><input type="hidden" name="folderId" value={selectedFolder.id} /><label>Name<input name="name" required autoFocus defaultValue={selectedFolder.name} /></label><div className={styles.dialogActions}><button type="submit" className={styles.confirmButton}>Rename</button><button type="button" className={styles.cancelButton} onClick={() => ws.actions.setDialog(null)}>Cancel</button></div></form></> : null}
        {dialog === 'delete-folder' && selectedFolder ? <><h2>Delete {selectedFolder.name}?</h2><p>The folder must be empty before it can be deleted.</p><form action="/api/folders" method="post"><input type="hidden" name="domainSlug" value={tenantSlug} /><input type="hidden" name="returnTo" value={`${base}/records`} /><input type="hidden" name="action" value="delete" /><input type="hidden" name="folderId" value={selectedFolder.id} /><div className={styles.dialogActions}><button type="submit" className={styles.deleteButton}>Delete folder</button><button type="button" className={styles.cancelButton} onClick={() => ws.actions.setDialog(null)}>Cancel</button></div></form></> : null}
      </section></div> : null}
    </div>
  )
}