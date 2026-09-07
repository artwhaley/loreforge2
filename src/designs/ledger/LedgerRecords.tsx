'use client'

import type { RecordsPageModel } from '@/lib/page-models/records'
import { useRecordsWorkspace } from '@/lib/records/workspace/useRecordsWorkspace'

import styles from './ledger-records.module.scss'

/** Ledger Records: an archival index composition over the shared workspace. */
export function LedgerRecords(model: RecordsPageModel) {
  const ws = useRecordsWorkspace(model)
  const renderTree = (roots: typeof ws.results.trees, depth = 0): React.ReactNode => roots.map((node) => (
    <div key={node.record.id} className={depth > 0 ? styles.child : undefined}>
      <div className={styles.entry}>
        <a className={styles.entryTitle} href={`${model.baseUrl}/documents/${node.record.id}`}>{node.record.title}</a>
        <span className={styles.entryMeta}>{node.record.preparedBy ?? 'No credit'} · {new Date(node.record.updatedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
      </div>
      {node.children.length > 0 ? renderTree(node.children as never, depth + 1) : null}
    </div>
  ))
  return (
    <div className={styles.ledgerRecords}>
      <div className={styles.toolbar}>
        <h1>{ws.folders.selected?.name ?? model.vocabulary.documentPlural}</h1>
        <input className={styles.search} type="search" value={ws.search.value} onChange={(event) => { ws.search.setValue(event.target.value); ws.resetSearchResults() }} placeholder="Search records" aria-label="Search records" />
        <select className={styles.select} value={ws.folders.selectedId == null ? '' : String(ws.folders.selectedId)} onChange={(event) => ws.folders.select(event.target.value ? Number(event.target.value) : null)} aria-label="Folder">
          <option value="">All folders</option>
          {[...ws.folders.byId.values()].map((folder) => <option key={folder.id} value={folder.id}>{folder.name} ({folder.readableRecordCount})</option>)}
        </select>
        <a className={styles.select} href={`${model.baseUrl}/records/new`}>New document</a>
      </div>
      <div className={styles.index} role="tree" aria-label="Records index">
        {ws.results.trees.length > 0 ? renderTree(ws.results.trees) : <p className={styles.empty}>No records here yet.</p>}
      </div>
      {ws.results.hasMore ? <button type="button" className={styles.more} onClick={() => void ws.results.loadMore()} disabled={ws.results.loadingMore}>{ws.results.loadingMore ? 'Loading…' : 'Load more'}</button> : null}
    </div>
  )
}
