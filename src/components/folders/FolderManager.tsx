'use client'

import dynamic from 'next/dynamic'
import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'

import type { FolderManagementPageModel } from '@/lib/page-models/management/folders'
import { folderMenuActions } from '@/lib/archive/folderManagement'
import { useFolderManagementWorkspace } from '@/components/functional/folders/useFolderManagementWorkspace'

import styles from './FolderManager.module.scss'

const ArboristFolderTree = dynamic(() => import('./ArboristFolderTree').then((module) => module.ArboristFolderTree), {
  ssr: false,
  loading: () => <p className={styles.empty}>Loading folders…</p>,
})

const TREE_HEIGHT = 480

const SORT_OPTIONS: Array<{ value: 'name-asc' | 'name-desc' | 'date-asc' | 'date-desc'; label: string; title: string }> = [
  { value: 'name-asc', label: 'A–Z', title: 'Sort by name, A to Z' },
  { value: 'name-desc', label: 'Z–A', title: 'Sort by name, Z to A' },
  { value: 'date-desc', label: 'Newest', title: 'Sort by creation date, newest first' },
  { value: 'date-asc', label: 'Oldest', title: 'Sort by creation date, oldest first' },
]

function useMeasure<T extends HTMLElement>() {
  const ref = useRef<T | null>(null)
  const [width, setWidth] = useState(0)
  useEffect(() => {
    if (!ref.current) return
    const observer = new ResizeObserver((entries) => setWidth(entries[0].contentRect.width))
    observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])
  return [ref, width] as const
}

/**
 * Civic Folder manager (OBSIDIAN-T03). Presentation-only: the authorized
 * `FolderManagementPageModel` and the shared `useFolderManagementWorkspace`
 * own data, selection, dialogs, and the guarded `/api/folders` transport.
 * Visual behavior is unchanged from the pre-extraction implementation.
 */
export function FolderManager({ model }: { model: FolderManagementPageModel }) {
  const [measureRef, measuredWidth] = useMeasure<HTMLDivElement>()
  const workspace = useFolderManagementWorkspace(model)

  const submitCreate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = event.currentTarget
    const name = new FormData(form).get('name')
    void workspace.createFolder(String(name ?? ''), workspace.target?.id ?? null)
  }
  const submitDelete = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (workspace.target) void workspace.deleteFolder(workspace.target.id)
  }
  const submitMove = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = event.currentTarget
    const parentRaw = new FormData(form).get('parentId')
    if (workspace.target) void workspace.moveFolder(workspace.target.id, parentRaw ? Number(parentRaw) : null)
  }

  return <div className={styles.page} onClick={() => workspace.closeMenu()}>
    <div className={styles.toolbar}><div><h2>Folders</h2>{workspace.selectedIds.length > 1 ? <p>{workspace.selectedIds.length} selected.</p> : null}</div><button type="button" className={styles.button} disabled={!workspace.canManageRoot} onClick={() => { workspace.setTarget(null); workspace.openDialog('create') }}>New folder</button></div>
    <div className={styles.search}><span aria-hidden="true">⌕</span><input type="search" value={workspace.query} onChange={(event) => workspace.setQuery(event.target.value)} placeholder="Search folders" aria-label="Search folders" /></div>
    {workspace.matchCount === 0 ? <p className={styles.empty}>No folders match your search.</p> : null}
    <div className={styles.treeBox} ref={measureRef} style={workspace.matchCount === 0 ? { display: 'none' } : undefined}>
      <ArboristFolderTree
        folders={workspace.sortedFolders}
        width={measuredWidth > 0 ? measuredWidth : 640}
        height={TREE_HEIGHT}
        searchTerm={workspace.query.trim()}
        treeRef={workspace.treeRef}
        canManageRoot={workspace.canManageRoot}
        onSelectIds={workspace.setSelectedIds}
        onMoveNodes={workspace.moveNodes}
        onRenameNode={workspace.renameFolder}
        onNodeMenu={workspace.openMenu}
      />
    </div>
    <div className={styles.sortBar} role="group" aria-label="Sort folders">
      <span className={styles.sortLabel}>Sort</span>
      {SORT_OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          className={workspace.sort === option.value ? styles.sortActive : styles.sortButton}
          aria-pressed={workspace.sort === option.value}
          title={option.title}
          onClick={() => workspace.setSort(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
    {workspace.menu ? <div className={styles.contextMenu} style={{ left: workspace.menu.x, top: workspace.menu.y }} onClick={(event) => event.stopPropagation()} role="menu">{folderMenuActions(workspace.menu.node).map((action) => (
      <button key={action.kind} type="button" disabled={action.disabled} onClick={() => {
        if (action.kind === 'create') workspace.openDialog('create')
        else if (action.kind === 'rename') workspace.renameTarget()
        else if (action.kind === 'move') workspace.openDialog('move')
        else workspace.openDialog('delete')
      }}>{action.kind === 'create' ? 'New subfolder' : action.kind === 'rename' ? 'Rename…' : action.kind === 'move' ? 'Move folder…' : 'Delete folder'}</button>
    ))}</div> : null}
    {workspace.dialog === 'create' ? <section className={styles.dialog}><div className={styles.dialogHeader}><h3>New folder</h3><button type="button" className={styles.close} onClick={() => workspace.setDialog(null)} aria-label="Close">×</button></div><form onSubmit={submitCreate}><label>Folder name<input name="name" required autoFocus /></label><div className={styles.actions}><button className={styles.primary} type="submit">Create folder</button><button className={styles.secondary} type="button" onClick={() => workspace.setDialog(null)}>Cancel</button></div></form></section> : null}
    {workspace.dialog === 'delete' && workspace.target ? <section className={styles.dialog}><div className={styles.dialogHeader}><h3>Delete {workspace.target.name}?</h3><button type="button" className={styles.close} onClick={() => workspace.setDialog(null)} aria-label="Close">×</button></div><p className={styles.empty}>The folder must be empty. Move its documents and subfolders first.</p><form onSubmit={submitDelete}><div className={styles.actions}><button className={styles.danger} type="submit">Delete folder</button><button className={styles.secondary} type="button" onClick={() => workspace.setDialog(null)}>Cancel</button></div></form></section> : null}
    {workspace.dialog === 'move' && workspace.target ? <section className={styles.dialog}><div className={styles.dialogHeader}><h3>Move {workspace.target.name}</h3><button type="button" className={styles.close} onClick={() => workspace.setDialog(null)} aria-label="Close">×</button></div><form onSubmit={submitMove}><label>Move under<select name="parentId" defaultValue=""> <option value="" disabled={!workspace.canManageRoot}>Domain root</option>{workspace.moveTargets(workspace.target).map(({ node, depth }) => <option key={node.id} value={node.id}>{'· '.repeat(depth)}{node.name}</option>)}</select></label><div className={styles.actions}><button className={styles.primary} type="submit">Move folder</button><button className={styles.secondary} type="button" onClick={() => workspace.setDialog(null)}>Cancel</button></div></form></section> : null}
  </div>
}