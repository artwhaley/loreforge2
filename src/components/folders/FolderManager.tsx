'use client'

import { useEffect, useMemo, useState } from 'react'

import styles from './FolderManager.module.scss'

export type AdminFolderNode = { id: number; name: string; systemManaged: boolean; effectiveRead?: { allowed: boolean; source: string }; effectiveWrite?: { allowed: boolean; source: string }; children: AdminFolderNode[] }
type Menu = { x: number; y: number; node: AdminFolderNode }

function matches(node: AdminFolderNode, query: string): AdminFolderNode | null {
  const children = node.children.map((child) => matches(child, query)).filter((child): child is AdminFolderNode => child !== null)
  if (!query || node.name.toLocaleLowerCase().includes(query) || children.length > 0) return { ...node, children }
  return null
}

function flatten(nodes: AdminFolderNode[], depth = 0): Array<{ node: AdminFolderNode; depth: number }> {
  return nodes.flatMap((node) => [{ node, depth }, ...flatten(node.children, depth + 1)])
}

function contains(node: AdminFolderNode, id: number): boolean {
  return node.id === id || node.children.some((child) => contains(child, id))
}

function Node({ node, expanded, toggle, onContext }: { node: AdminFolderNode; expanded: Set<number>; toggle: (id: number) => void; onContext: (event: React.MouseEvent, node: AdminFolderNode) => void }) {
  const open = expanded.has(node.id)
  const hasChildren = node.children.length > 0
  return <li><div className={styles.row} onContextMenu={(event) => onContext(event, node)}><button type="button" className={hasChildren ? styles.disclosure : styles.spacer} aria-label={hasChildren ? `${open ? 'Collapse' : 'Expand'} ${node.name}` : undefined} aria-expanded={hasChildren ? open : undefined} onClick={() => hasChildren && toggle(node.id)}>{hasChildren ? (open ? '⌄' : '›') : null}</button><span className={styles.folderIcon} aria-hidden="true">{node.systemManaged ? '⌂' : '▱'}</span><span className={styles.name}>{node.name}</span>{node.systemManaged ? <span className={styles.system}>system root</span> : null}{node.effectiveRead || node.effectiveWrite ? <span className={styles.effective}>{node.effectiveRead ? `Read ${node.effectiveRead.allowed ? 'allowed' : 'denied'}` : null}{node.effectiveRead && node.effectiveWrite ? ' · ' : null}{node.effectiveWrite ? `Write ${node.effectiveWrite.allowed ? 'allowed' : 'denied'}` : null}</span> : null}</div>{hasChildren && open ? <ul className={styles.nested}>{node.children.map((child) => <Node key={child.id} node={child} expanded={expanded} toggle={toggle} onContext={onContext} />)}</ul> : null}</li>
}

export function FolderManager({ domainSlug, folders }: { domainSlug: string; folders: AdminFolderNode[] }) {
  const [query, setQuery] = useState('')
  const [expanded, setExpanded] = useState<Set<number>>(() => new Set(folders.map((folder) => folder.id)))
  const [menu, setMenu] = useState<Menu | null>(null)
  const [target, setTarget] = useState<AdminFolderNode | null>(null)
  const [dialog, setDialog] = useState<'create' | 'delete' | 'move' | null>(null)
  const visible = useMemo(() => folders.map((folder) => matches(folder, query.trim().toLocaleLowerCase())).filter((folder): folder is AdminFolderNode => folder !== null), [folders, query])
  const all = useMemo(() => flatten(folders), [folders])

  useEffect(() => {
    if (!menu) return
    const close = () => setMenu(null)
    window.addEventListener('click', close)
    return () => window.removeEventListener('click', close)
  }, [menu])

  // P05R-T08: auto-expanding on a non-empty search happens at the change
  // event (empty -> non-empty transition) instead of a setState-in-effect.
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const next = event.target.value
    const wasEmpty = query.trim().length === 0
    setQuery(next)
    if (wasEmpty && next.trim().length > 0) {
      setExpanded((current) => new Set([...current, ...all.map(({ node }) => node.id)]))
    }
  }

  const openDialog = (next: 'create' | 'delete' | 'move') => { setTarget(menu?.node ?? null); setDialog(next); setMenu(null) }
  const toggle = (id: number) => setExpanded((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next })
  return <div className={styles.page} onClick={() => menu && setMenu(null)}>
    <div className={styles.toolbar}><div><h2>Folders</h2><p>Configure the document filing tree for this Domain.</p></div><button type="button" className={styles.button} onClick={() => { setTarget(null); setDialog('create') }}>New folder</button></div>
    <div className={styles.search}><span aria-hidden="true">⌕</span><input type="search" value={query} onChange={handleSearchChange} placeholder="Search folders" aria-label="Search folders" /></div>
    <div className={styles.treeBox} role="tree" aria-label="Domain folders">{visible.length > 0 ? <ul className={styles.tree}>{visible.map((folder) => <Node key={folder.id} node={folder} expanded={expanded} toggle={toggle} onContext={(event, node) => { event.preventDefault(); event.stopPropagation(); setMenu({ x: event.clientX, y: event.clientY, node }) }} />)}</ul> : <p className={styles.empty}>No folders match your search.</p>}</div>
    {menu ? <div className={styles.contextMenu} style={{ left: menu.x, top: menu.y }} onClick={(event) => event.stopPropagation()} role="menu"><button type="button" onClick={() => openDialog('create')}>New subfolder</button>{!menu.node.systemManaged ? <><button type="button" onClick={() => openDialog('move')}>Move folder…</button><button type="button" onClick={() => openDialog('delete')}>Delete folder</button></> : null}</div> : null}
    {dialog === 'create' ? <section className={styles.dialog}><div className={styles.dialogHeader}><h3>New folder</h3><button type="button" className={styles.close} onClick={() => setDialog(null)} aria-label="Close">×</button></div><form action="/api/folders" method="post"><input type="hidden" name="domainSlug" value={domainSlug} /><input type="hidden" name="action" value="create" /><input type="hidden" name="parentId" value={target?.id ?? ''} /><label>Folder name<input name="name" required autoFocus /></label><div className={styles.actions}><button className={styles.primary} type="submit">Create folder</button><button className={styles.secondary} type="button" onClick={() => setDialog(null)}>Cancel</button></div></form></section> : null}
    {dialog === 'delete' && target ? <section className={styles.dialog}><div className={styles.dialogHeader}><h3>Delete {target.name}?</h3><button type="button" className={styles.close} onClick={() => setDialog(null)} aria-label="Close">×</button></div><p className={styles.empty}>The folder must be empty. Move its documents and subfolders first.</p><form action="/api/folders" method="post"><input type="hidden" name="domainSlug" value={domainSlug} /><input type="hidden" name="action" value="delete" /><input type="hidden" name="folderId" value={target.id} /><div className={styles.actions}><button className={styles.danger} type="submit">Delete folder</button><button className={styles.secondary} type="button" onClick={() => setDialog(null)}>Cancel</button></div></form></section> : null}
    {dialog === 'move' && target ? <section className={styles.dialog}><div className={styles.dialogHeader}><h3>Move {target.name}</h3><button type="button" className={styles.close} onClick={() => setDialog(null)} aria-label="Close">×</button></div><form action="/api/folders" method="post"><input type="hidden" name="domainSlug" value={domainSlug} /><input type="hidden" name="action" value="move" /><input type="hidden" name="folderId" value={target.id} /><label>Move under<select name="parentId" defaultValue=""> <option value="">Domain root</option>{all.filter(({ node }) => node.id !== target.id && !contains(target, node.id)).map(({ node, depth }) => <option key={node.id} value={node.id}>{'· '.repeat(depth)}{node.name}</option>)}</select></label><div className={styles.actions}><button className={styles.primary} type="submit">Move folder</button><button className={styles.secondary} type="button" onClick={() => setDialog(null)}>Cancel</button></div></form></section> : null}
  </div>
}
