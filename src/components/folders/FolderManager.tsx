'use client'

import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { TreeApi } from 'react-arborist'

import type { FolderMove } from './ArboristFolderTree'

import styles from './FolderManager.module.scss'

export type AdminFolderNode = { canManage?: boolean; id: number; name: string; createdAt: string; systemManaged: boolean; children: AdminFolderNode[] }
type Menu = { x: number; y: number; node: AdminFolderNode }

const ArboristFolderTree = dynamic(() => import('./ArboristFolderTree').then((module) => module.ArboristFolderTree), {
  ssr: false,
  loading: () => <p className={styles.empty}>Loading folders…</p>,
})

const TREE_HEIGHT = 480

function flatten(nodes: AdminFolderNode[], depth = 0): Array<{ node: AdminFolderNode; depth: number }> {
  return nodes.flatMap((node) => [{ node, depth }, ...flatten(node.children, depth + 1)])
}

function contains(node: AdminFolderNode, id: number): boolean {
  return node.id === id || node.children.some((child) => contains(child, id))
}

function findNode(nodes: AdminFolderNode[], id: number): AdminFolderNode | null {
  for (const node of nodes) {
    if (node.id === id) return node
    const found = findNode(node.children, id)
    if (found) return found
  }
  return null
}

export type FolderSort = 'name-asc' | 'name-desc' | 'date-asc' | 'date-desc'

const SORT_OPTIONS: Array<{ value: FolderSort; label: string; title: string }> = [
  { value: 'name-asc', label: 'A–Z', title: 'Sort by name, A to Z' },
  { value: 'name-desc', label: 'Z–A', title: 'Sort by name, Z to A' },
  { value: 'date-desc', label: 'Newest', title: 'Sort by creation date, newest first' },
  { value: 'date-asc', label: 'Oldest', title: 'Sort by creation date, oldest first' },
]

/** Recursive display sort; the archive itself stays name-ordered elsewhere. */
function sortFolders(nodes: AdminFolderNode[], sort: FolderSort): AdminFolderNode[] {
  const compare = (a: AdminFolderNode, b: AdminFolderNode): number => {
    switch (sort) {
      case 'name-desc': return b.name.localeCompare(a.name)
      case 'date-asc': return a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0
      case 'date-desc': return a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0
      default: return a.name.localeCompare(b.name)
    }
  }
  return [...nodes].sort(compare).map((node) => ({ ...node, children: sortFolders(node.children, sort) }))
}

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

export function FolderManager({ domainSlug, folders, canManageRoot }: { domainSlug: string; folders: AdminFolderNode[]; canManageRoot: boolean }) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [menu, setMenu] = useState<Menu | null>(null)
  const [target, setTarget] = useState<AdminFolderNode | null>(null)
  const [dialog, setDialog] = useState<'create' | 'delete' | 'move' | null>(null)
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [busy, setBusy] = useState(false)
  const [sort, setSort] = useState<FolderSort>('name-asc')
  const treeRef = useRef<TreeApi<AdminFolderNode> | undefined>(undefined)
  const [measureRef, measuredWidth] = useMeasure<HTMLDivElement>()
  const all = useMemo(() => flatten(folders), [folders])
  const sortedFolders = useMemo(() => sortFolders(folders, sort), [folders, sort])
  const matchCount = useMemo(() => {
    const term = query.trim().toLocaleLowerCase()
    if (!term) return -1
    let count = 0
    const walk = (nodes: AdminFolderNode[]) => { for (const node of nodes) { if (node.name.toLocaleLowerCase().includes(term)) count += 1; walk(node.children) } }
    walk(folders)
    return count
  }, [folders, query])

  useEffect(() => {
    if (!menu) return
    const close = (event: KeyboardEvent | MouseEvent) => { if (event instanceof KeyboardEvent && event.key === 'Escape') setMenu(null); if (event instanceof MouseEvent) setMenu(null) }
    window.addEventListener('click', close)
    window.addEventListener('keydown', close)
    return () => { window.removeEventListener('click', close); window.removeEventListener('keydown', close) }
  }, [menu])

  const postFolder = async (fields: Record<string, string>) => {
    const body = new FormData()
    body.set('domainSlug', domainSlug)
    for (const [key, value] of Object.entries(fields)) body.set(key, value)
    await fetch('/api/folders', { method: 'POST', body })
    router.refresh()
  }

  const moveNodes = async (moves: FolderMove[]) => {
    if (busy || moves.length === 0) return
    setBusy(true)
    try {
      for (const move of moves) {
        await postFolder({ action: 'move', folderId: String(move.id), parentId: move.parentId == null ? '' : String(move.parentId) })
      }
    } finally {
      setBusy(false)
    }
  }

  const renameNode = async (id: number, name: string) => {
    if (busy || !name.trim()) return
    setBusy(true)
    try {
      await postFolder({ action: 'rename', folderId: String(id), name: name.trim() })
    } finally {
      setBusy(false)
    }
  }

  const openMenu = (id: number, x: number, y: number) => {
    const node = findNode(folders, id)
    if (!node) return
    if (!selectedIds.includes(id)) treeRef.current?.select(String(id))
    setMenu({ x, y, node })
  }
  const openDialog = (next: 'create' | 'delete' | 'move') => { setTarget(menu?.node ?? null); setDialog(next); setMenu(null) }
  const renameTarget = () => { const node = menu?.node; setMenu(null); if (node) treeRef.current?.get(String(node.id))?.edit() }

  return <div className={styles.page} onClick={() => menu && setMenu(null)}>
    <div className={styles.toolbar}><div><h2>Folders</h2>{selectedIds.length > 1 ? <p>{selectedIds.length} selected.</p> : null}</div><button type="button" className={styles.button} disabled={!canManageRoot} onClick={() => { setTarget(null); setDialog('create') }}>New folder</button></div>
    <div className={styles.search}><span aria-hidden="true">⌕</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search folders" aria-label="Search folders" /></div>
    {matchCount === 0 ? <p className={styles.empty}>No folders match your search.</p> : null}
    <div className={styles.treeBox} ref={measureRef} style={matchCount === 0 ? { display: 'none' } : undefined}>
      <ArboristFolderTree
        folders={sortedFolders}
        width={measuredWidth > 0 ? measuredWidth : 640}
        height={TREE_HEIGHT}
        searchTerm={query.trim()}
        treeRef={treeRef}
        canManageRoot={canManageRoot}
        onSelectIds={setSelectedIds}
        onMoveNodes={moveNodes}
        onRenameNode={renameNode}
        onNodeMenu={openMenu}
      />
    </div>
    <div className={styles.sortBar} role="group" aria-label="Sort folders">
      <span className={styles.sortLabel}>Sort</span>
      {SORT_OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          className={sort === option.value ? styles.sortActive : styles.sortButton}
          aria-pressed={sort === option.value}
          title={option.title}
          onClick={() => setSort(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
    {menu ? <div className={styles.contextMenu} style={{ left: menu.x, top: menu.y }} onClick={(event) => event.stopPropagation()} role="menu"><button type="button" disabled={menu.node.canManage === false} onClick={() => openDialog('create')}>New subfolder</button>{!menu.node.systemManaged ? <><button type="button" disabled={menu.node.canManage === false} onClick={renameTarget}>Rename…</button><button type="button" disabled={menu.node.canManage === false} onClick={() => openDialog('move')}>Move folder…</button><button type="button" disabled={menu.node.canManage === false} onClick={() => openDialog('delete')}>Delete folder</button></> : null}</div> : null}
    {dialog === 'create' ? <section className={styles.dialog}><div className={styles.dialogHeader}><h3>New folder</h3><button type="button" className={styles.close} onClick={() => setDialog(null)} aria-label="Close">×</button></div><form action="/api/folders" method="post"><input type="hidden" name="domainSlug" value={domainSlug} /><input type="hidden" name="action" value="create" /><input type="hidden" name="parentId" value={target?.id ?? ''} /><label>Folder name<input name="name" required autoFocus /></label><div className={styles.actions}><button className={styles.primary} type="submit">Create folder</button><button className={styles.secondary} type="button" onClick={() => setDialog(null)}>Cancel</button></div></form></section> : null}
    {dialog === 'delete' && target ? <section className={styles.dialog}><div className={styles.dialogHeader}><h3>Delete {target.name}?</h3><button type="button" className={styles.close} onClick={() => setDialog(null)} aria-label="Close">×</button></div><p className={styles.empty}>The folder must be empty. Move its documents and subfolders first.</p><form action="/api/folders" method="post"><input type="hidden" name="domainSlug" value={domainSlug} /><input type="hidden" name="action" value="delete" /><input type="hidden" name="folderId" value={target.id} /><div className={styles.actions}><button className={styles.danger} type="submit">Delete folder</button><button className={styles.secondary} type="button" onClick={() => setDialog(null)}>Cancel</button></div></form></section> : null}
    {dialog === 'move' && target ? <section className={styles.dialog}><div className={styles.dialogHeader}><h3>Move {target.name}</h3><button type="button" className={styles.close} onClick={() => setDialog(null)} aria-label="Close">×</button></div><form action="/api/folders" method="post"><input type="hidden" name="domainSlug" value={domainSlug} /><input type="hidden" name="action" value="move" /><input type="hidden" name="folderId" value={target.id} /><label>Move under<select name="parentId" defaultValue=""> <option value="" disabled={!canManageRoot}>Domain root</option>{all.filter(({ node }) => node.canManage !== false && node.id !== target.id && !contains(target, node.id)).map(({ node, depth }) => <option key={node.id} value={node.id}>{'· '.repeat(depth)}{node.name}</option>)}</select></label><div className={styles.actions}><button className={styles.primary} type="submit">Move folder</button><button className={styles.secondary} type="button" onClick={() => setDialog(null)}>Cancel</button></div></form></section> : null}
  </div>
}
