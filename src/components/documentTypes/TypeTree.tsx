'use client'

import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react'
import type { TreeApi } from 'react-arborist'

import type { TypeTreeData, TypeTreeLeaf, TypeTreeNode, TemplateSelection } from '@/lib/documents/typeTree'
import { deleteTypeAction, duplicateTypeAction, moveTypeAction, setActiveTypeAction, updateTypeAction } from '@/lib/actions/documentTypes'
import { createTypeFolderAction, deleteTypeFolderAction, moveTypeFolderAction, renameTypeFolderAction } from '@/lib/actions/typeFolders'

import styles from './TypeTree.module.scss'

const ArboristTypeTree = dynamic(() => import('./ArboristTypeTree').then((module) => module.ArboristTypeTree), {
  ssr: false,
  loading: () => <p className={styles.empty}>Loading Document Types…</p>,
})

const TREE_HEIGHT = 420

export type TypeMove = { id: number; parentId: number | null; departmentId: number | null }

const KIND_LABELS: Record<TemplateSelection, string> = { blank: 'Blank Document', markdown: 'Markdown Template', form: 'Form Template' }

type Menu = { x: number; y: number; node: TypeTreeNode }
type Popover = { x: number; y: number; leaf: TypeTreeLeaf }

function flatten(nodes: TypeTreeNode[], depth = 0): Array<{ node: TypeTreeNode; depth: number }> {
  return nodes.flatMap((node) => [{ node, depth }, ...flatten(node.children, depth + 1)])
}

function contains(node: TypeTreeNode, id: string): boolean {
  return node.id === id || node.children.some((child) => contains(child, id))
}

function findNode(nodes: TypeTreeNode[], id: string): TypeTreeNode | null {
  for (const node of nodes) {
    if (node.id === id) return node
    const found = findNode(node.children, id)
    if (found) return found
  }
  return null
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

const DEPT_ROOT_PREFIX = 'dept-'

export function TypeTree({
  domainSlug,
  data,
  canManage,
  selectedTypeId,
  onSelectType,
  onCreateNew,
}: {
  domainSlug: string
  data: TypeTreeData
  canManage: boolean
  selectedTypeId: number | null
  onSelectType: (id: number | null) => void
  onCreateNew?: () => void
}) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [menu, setMenu] = useState<Menu | null>(null)
  const [popover, setPopover] = useState<Popover | null>(null)
  const [target, setTarget] = useState<TypeTreeNode | null>(null)
  const [dialog, setDialog] = useState<'create-folder' | 'delete-folder' | 'move-folder' | 'delete-type' | null>(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [, startTransition] = useTransition()
  const treeRef = useRef<TreeApi<TypeTreeNode> | undefined>(undefined)
  const [measureRef, measuredWidth] = useMeasure<HTMLDivElement>()
  const all = useMemo(() => flatten(data.roots), [data.roots])
  const matchCount = useMemo(() => {
    const term = query.trim().toLocaleLowerCase()
    if (!term) return -1
    let count = 0
    const walk = (nodes: TypeTreeNode[]) => { for (const node of nodes) { if (node.name.toLocaleLowerCase().includes(term)) count += 1; walk(node.children) } }
    walk(data.roots)
    return count
  }, [data.roots, query])

  useEffect(() => {
    if (!menu && !popover) return
    const close = (event: KeyboardEvent | MouseEvent) => { if (event instanceof KeyboardEvent && event.key === 'Escape') { setMenu(null); setPopover(null) } if (event instanceof MouseEvent) { setMenu(null); setPopover(null) } }
    window.addEventListener('click', close)
    window.addEventListener('keydown', close)
    return () => { window.removeEventListener('click', close); window.removeEventListener('keydown', close) }
  }, [menu, popover])

  const run = useCallback(async (operation: () => Promise<{ ok: boolean; error?: string }>) => {
    if (busy) return
    setBusy(true)
    setNotice(null)
    try {
      const result = await operation()
      if (!result.ok) setNotice(result.error ?? 'That action could not be completed.')
      startTransition(() => router.refresh())
    } finally {
      setBusy(false)
    }
  }, [busy, router])

  const openMenu = (id: string, x: number, y: number) => {
    const node = findNode(data.roots, id)
    if (!node) return
    if (node.kind === 'type' && node.leaf) {
      setMenu(null)
      setPopover(null)
      onSelectType(node.leaf.id)
      setMenu({ x, y, node })
    } else {
      setMenu({ x, y, node })
    }
  }

  const openPopover = (leaf: TypeTreeLeaf, x: number, y: number) => {
    if (!canManage) return
    setMenu(null)
    setPopover({ x, y, leaf })
  }

  const setTemplate = (leaf: TypeTreeLeaf, selection: TemplateSelection) => {
    setPopover(null)
    if (selection === leaf.templateSelection) return
    void run(() => updateTypeAction({ domainSlug, typeId: leaf.id, templateSelection: selection }))
  }

  // --- drag & drop ---
  const moveType = (typeId: number, parentNode: TypeTreeNode) => {
    if (parentNode.kind === 'department') {
      return moveTypeAction({ domainSlug, typeId, departmentId: Number(parentNode.id.slice(DEPT_ROOT_PREFIX.length)), typeFolderId: null })
    }
    if (parentNode.kind === 'folder') {
      const departmentId = parentNode.departmentId ?? (parentNode.id.startsWith(DEPT_ROOT_PREFIX) ? Number(parentNode.id.slice(DEPT_ROOT_PREFIX.length)) : null)
      return moveTypeAction({ domainSlug, typeId, departmentId, typeFolderId: Number(parentNode.id.slice('fld-'.length)) })
    }
    return Promise.resolve({ ok: false, error: 'invalid' })
  }
  const moveTypeFolder = (folderId: number, parentNode: TypeTreeNode) => {
    if (parentNode.kind === 'department') {
      return moveTypeFolderAction({ domainSlug, typeFolderId: folderId, parentId: null, departmentId: Number(parentNode.id.slice(DEPT_ROOT_PREFIX.length)) })
    }
    if (parentNode.kind === 'folder') {
      return moveTypeFolderAction({ domainSlug, typeFolderId: folderId, parentId: Number(parentNode.id.slice('fld-'.length)), departmentId: parentNode.departmentId ?? null })
    }
    return Promise.resolve({ ok: false, error: 'invalid' })
  }
  const handleMove = (moves: Array<{ id: string; parentId: string | null }>) => {
    for (const move of moves) {
      const node = findNode(data.roots, move.id)
      if (!node) continue
      const parentNode = move.parentId == null ? null : findNode(data.roots, move.parentId)
      if (!parentNode || parentNode.kind === 'unassigned') continue
      if (node.kind === 'type') {
        const leaf = node.leaf
        if (leaf) void run(() => moveType(leaf.id, parentNode))
      }
      if (node.kind === 'folder') void run(() => moveTypeFolder(Number(node.id.slice('fld-'.length)), parentNode))
    }
  }

  const renameFolder = (id: number, name: string) => {
    if (busy || !name.trim()) return
    void run(() => renameTypeFolderAction({ domainSlug, typeFolderId: id, name: name.trim() }))
  }

  const openDialog = (next: 'create-folder' | 'delete-folder' | 'move-folder' | 'delete-type') => {
    setTarget(menu?.node ?? null)
    setDialog(next)
    setMenu(null)
  }
  const renameTarget = () => {
    const node = menu?.node
    setMenu(null)
    if (node) treeRef.current?.get(node.id)?.edit()
  }
  const deleteTargetType = () => {
    const node = menu?.node
    setMenu(null)
    if (node?.leaf) {
      void run(async () => {
        const result = await deleteTypeAction({ domainSlug, typeId: node.leaf!.id })
        if (!result.ok && result.error === 'has-documents') setNotice('This Document Type still has documents. Deactivate it instead.')
        return result
      })
    }
  }

  // --- context menu content ---
  const menuNode = menu?.node ?? null
  const menuLeaf = menuNode?.kind === 'type' ? menuNode.leaf : null

  return <div className={styles.page} onClick={() => { setMenu(null); setPopover(null) }}>
    <div className={styles.toolbar}>
      <div><h2>Document Types</h2><p title="Document Types are the first-order item; Templates and Forms hang off them. Drag types between folders; right-click for actions.">Organized by Department. Templates and Forms hang off each Type.</p></div>
      {canManage ? <button type="button" className={styles.button} title="Create a new Document Type — the inspector opens beneath the list to configure it" onClick={() => onCreateNew?.()}>Create new</button> : null}
    </div>
    {notice ? <p className={styles.notice} role="alert">{notice}</p> : null}
    <div className={styles.search}><span aria-hidden="true">⌕</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search Document Types" aria-label="Search Document Types" title="Type to filter the tree to matching nodes" /></div>
    {matchCount === 0 ? <p className={styles.empty}>No Document Types match your search.</p> : null}
    {popover ? <div className={styles.popover} style={{ left: popover.x, top: popover.y }} onClick={(event) => event.stopPropagation()} role="menu" aria-label={`Template type for ${popover.leaf.name}`}>
      {(Object.keys(KIND_LABELS) as TemplateSelection[]).map((selection) => (
        <button key={selection} type="button" aria-pressed={popover.leaf.templateSelection === selection} title={selection === 'blank' ? 'Blank Document — no template attached' : selection === 'markdown' ? 'Markdown Template — composed from a document template' : 'Form Template — built in the Form Studio'} onClick={() => setTemplate(popover.leaf, selection)}>
          {KIND_LABELS[selection]}
        </button>
      ))}
    </div> : null}
    <div className={styles.treeBox} ref={measureRef} style={matchCount === 0 ? { display: 'none' } : undefined}>
      <ArboristTypeTree
        nodes={data.roots}
        width={measuredWidth > 0 ? measuredWidth : 680}
        height={TREE_HEIGHT}
        searchTerm={query.trim()}
        treeRef={treeRef}
        canManage={canManage}
        selectedTypeId={selectedTypeId}
        onSelectType={onSelectType}
        onNodeMenu={openMenu}
        onNodePopover={openPopover}
        onMoveNodes={handleMove}
        onRenameFolder={renameFolder}
        kindLabels={KIND_LABELS}
        base={`/domain/${domainSlug}`}
      />
    </div>
    <p className={styles.empty} title="The tree is capped so the view stays manageable; use Departments and subfolders to keep it tidy.">Tree height is capped — create subfolders under a Department to keep the view tidy.</p>

    {menu ? <div className={styles.contextMenu} style={{ left: menu.x, top: menu.y }} onClick={(event) => event.stopPropagation()} role="menu">
      {menuNode?.kind === 'type' && menuLeaf ? <>
        {menuLeaf.active
          ? <button type="button" title="Inactive Types stay editable but render greyed out with an (inactive) suffix" onClick={() => { setMenu(null); void run(() => setActiveTypeAction({ domainSlug, typeId: menuLeaf.id, active: false })) }}>Set inactive</button>
          : <button type="button" title="Make this Type available for new documents again" onClick={() => { setMenu(null); void run(() => setActiveTypeAction({ domainSlug, typeId: menuLeaf.id, active: true })) }}>Set active</button>}
        <button type="button" title="Copy this Type with its own independent copies of its templates and lifecycle configuration — the copy keeps active/inactive and gets a (copyN) name" onClick={() => { setMenu(null); void run(() => duplicateTypeAction({ domainSlug, typeId: menuLeaf.id })) }}>Duplicate</button>
        <button type="button" className={styles.contextDanger} title="Deleting is refused while the Type still has documents — deactivate instead" onClick={deleteTargetType}>Delete…</button>
      </> : null}
      {menuNode?.kind === 'folder' ? <>
        <button type="button" title="Create a navigation subfolder inside this folder" onClick={() => openDialog('create-folder')}>New subfolder</button>
        <button type="button" title="Rename this navigation folder" onClick={renameTarget}>Rename…</button>
        <button type="button" title="Move this folder under another Department root or folder" onClick={() => openDialog('move-folder')}>Move folder…</button>
        <button type="button" className={styles.contextDanger} title="Only empty folders (no subfolders or Types) can be deleted" onClick={() => openDialog('delete-folder')}>Delete folder</button>
      </> : null}
      {menuNode?.kind === 'department' ? <button type="button" disabled title="Departments are managed on the Departments page; Types in an archived Department appear under Unassigned">Managed on the Departments page</button> : null}
      {menuNode?.kind === 'unassigned' ? <button type="button" disabled title="Unassigned collects Types whose Department was archived or removed. Restore the Department on the Departments page to return them.">Restore the Department to return these Types</button> : null}
    </div> : null}

    {dialog === 'create-folder' ? <section className={styles.dialog}><div className={styles.dialogHeader}><h3>New subfolder</h3><button type="button" className={styles.close} onClick={() => setDialog(null)} aria-label="Close">×</button></div>
      <form onSubmit={async (event) => {
        event.preventDefault()
        const form = event.currentTarget
        const name = String(new FormData(form).get('name') ?? '').trim()
        const departmentId = target?.kind === 'department' ? Number(target.id.slice(DEPT_ROOT_PREFIX.length)) : target?.kind === 'folder' ? target.departmentId ?? null : null
        const parentId = target?.kind === 'folder' ? Number(target.id.slice('fld-'.length)) : null
        const result = await createTypeFolderAction({ domainSlug, name, departmentId, parentId })
        if (!result.ok) setNotice(result.error ?? 'That folder could not be created.')
        setDialog(null)
        void run(() => Promise.resolve({ ok: true }))
      }}>
        <label>Folder name <input name="name" required autoFocus /></label>
        <div className={styles.actions}><button className={styles.primary} type="submit">Create folder</button><button className={styles.secondary} type="button" onClick={() => setDialog(null)}>Cancel</button></div>
      </form>
    </section> : null}
    {dialog === 'delete-folder' && target ? <section className={styles.dialog}><div className={styles.dialogHeader}><h3>Delete {target.name}?</h3><button type="button" className={styles.close} onClick={() => setDialog(null)} aria-label="Close">×</button></div>
      <p className={styles.empty}>The folder must be empty — move or delete its subfolders and Types first.</p>
      <form onSubmit={(event) => { event.preventDefault(); const id = Number(target.id.slice('fld-'.length)); void run(() => deleteTypeFolderAction({ domainSlug, typeFolderId: id })); setDialog(null) }}>
        <div className={styles.actions}><button className={styles.danger} type="submit">Delete folder</button><button className={styles.secondary} type="button" onClick={() => setDialog(null)}>Cancel</button></div>
      </form>
    </section> : null}
    {dialog === 'move-folder' && target ? <section className={styles.dialog}><div className={styles.dialogHeader}><h3>Move {target.name}</h3><button type="button" className={styles.close} onClick={() => setDialog(null)} aria-label="Close">×</button></div>
      <form onSubmit={(event) => { event.preventDefault(); const raw = String(new FormData(event.currentTarget).get('parentId') ?? ''); const parentNode = raw ? findNode(data.roots, raw) : null; const folderId = Number(target.id.slice('fld-'.length)); void run(() => moveTypeFolderAction({ domainSlug, typeFolderId: folderId, parentId: parentNode?.kind === 'folder' ? Number(parentNode.id.slice('fld-'.length)) : null, departmentId: parentNode?.kind === 'department' ? Number(parentNode.id.slice(DEPT_ROOT_PREFIX.length)) : parentNode?.kind === 'folder' ? parentNode.departmentId ?? null : null })); setDialog(null) }}>
        <label>Move under<select name="parentId" defaultValue="">
          {data.roots.filter((root) => root.kind === 'department').map((root) => <option key={root.id} value={root.id}>{root.name} (root)</option>)}
          {all.filter(({ node }) => node.kind === 'folder' && node.id !== target.id && !contains(target, node.id)).map(({ node, depth }) => <option key={node.id} value={node.id}>{'· '.repeat(depth)}{node.name}</option>)}
        </select></label>
        <div className={styles.actions}><button className={styles.primary} type="submit">Move folder</button><button className={styles.secondary} type="button" onClick={() => setDialog(null)}>Cancel</button></div>
      </form>
    </section> : null}
  </div>
}