'use client'

import type { RecordsPageModel } from '@/lib/page-models/records'
import { useRecordsWorkspace } from '@/lib/records/workspace/useRecordsWorkspace'

import styles from './poster-records.module.scss'

/** Poster Records: a card-grid composition over the shared workspace. */
export function PosterRecords(model: RecordsPageModel) {
  const ws = useRecordsWorkspace(model)
  const flat = ws.results.trees.flatMap(function walk(node): Array<typeof node.record> { return [node.record, ...node.children.flatMap(walk)] })
  return (
    <div className={styles.posterRecords}>
      <div className={styles.masthead}>
        <h1>{ws.folders.selected?.name ?? model.vocabulary.documentPlural}</h1>
        <input className={styles.search} type="search" value={ws.search.value} onChange={(event) => { ws.search.setValue(event.target.value); ws.resetSearchResults() }} placeholder="Search records" aria-label="Search records" />
        <a className={styles.chip} href={`${model.baseUrl}/records/new`}>New document</a>
      </div>
      <div className={styles.chips} role="group" aria-label="Folders">
        <button type="button" className={ws.folders.selectedId === null ? `${styles.chip} ${styles.chipActive}` : styles.chip} onClick={() => ws.folders.select(null)}>All · {ws.results.total}</button>
        {[...ws.folders.byId.values()].map((folder) => <button key={folder.id} type="button" className={ws.folders.selectedId === folder.id ? `${styles.chip} ${styles.chipActive}` : styles.chip} onClick={() => ws.folders.select(folder.id)}>{folder.name} · {folder.readableRecordCount}</button>)}
      </div>
      {flat.length > 0 ? (
        <ul className={styles.grid}>
          {flat.map((record) => <li key={record.id} className={styles.card}>
            <a className={styles.cardTitle} href={`${model.baseUrl}/documents/${record.id}`}>{record.title}</a>
            <span className={styles.cardMeta}>{record.preparedBy ?? 'No credit'} · {new Date(record.updatedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
            <span className={styles.cardActions}>
              <a href={`${model.baseUrl}/documents/${record.id}`}>Open</a>
              {record.capabilities.edit ? <a href={`${model.baseUrl}/documents/${record.id}/edit`}>Edit</a> : null}
            </span>
          </li>)}
        </ul>
      ) : <p className={styles.empty}>No records here yet.</p>}
      {ws.results.hasMore ? <button type="button" className={styles.more} onClick={() => void ws.results.loadMore()} disabled={ws.results.loadingMore}>{ws.results.loadingMore ? 'Loading…' : 'Load more'}</button> : null}
    </div>
  )
}
