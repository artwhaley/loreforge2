'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { TreeApi } from 'react-arborist'

import type { FolderManagementNode, FolderManagementPageModel } from '@/lib/page-models/management/folders'
import { flattenFolderNodes, folderContains, findFolderNode, sortFolderNodes, type FolderSort } from '@/lib/archive/folderManagement'
import type { FolderMove } from '@/components/folders/ArboristFolderTree'

/**
 * Shared Folder-management workspace (OBSIDIAN-T03). Owns the interactive
 * state machine — search, sort, selection, context menu, dialogs, drag/move
 * orchestration, rename — and hides the guarded `/api/folders` transport.
 * A Design (Civic today, Obsidian T17 later) supplies only presentation.
 *
 * Authorization is NOT here: the Page Model carries per-node `canManage` for
 * UI affordances only, and the server endpoint re-authorizes every mutation.
 */
export type FolderDialog = 'create' | 'delete' | 'move' | null

export type FolderMenuState = { x: number; y: number; node: FolderManagementNode } | null

export function useFolderManagementWorkspace(model: FolderManagementPageModel) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [menu, setMenu] = useState<FolderMenuState>(null)
  const [target, setTarget] = useState<FolderManagementNode | null>(null)
  const [dialog, setDialog] = useState<FolderDialog>(null)
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [busy, setBusy] = useState(false)
  const [sort, setSort] = useState<FolderSort>('name-asc')
  const treeRef = useRef<TreeApi<FolderManagementNode> | undefined>(undefined)

  const { domainSlug, nodes, rootManageable: canManageRoot } = model

  const all = useMemo(() => flattenFolderNodes(nodes), [nodes])
  const sortedFolders = useMemo(() => sortFolderNodes(nodes, sort), [nodes, sort])
  const matchCount = useMemo(() => {
    const term = query.trim().toLocaleLowerCase()
    if (!term) return -1
    let count = 0
    const walk = (nodeList: FolderManagementNode[]) => { for (const node of nodeList) { if (node.name.toLocaleLowerCase().includes(term)) count += 1; walk(node.children) } }
    walk(nodes)
    return count
  }, [nodes, query])

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
    const response = await fetch('/api/folders', { method: 'POST', body })
    if (!response.ok || (response.redirected && new URL(response.url).searchParams.has('error'))) throw new Error('The change could not be saved. Check your access and try again.')
    router.refresh()
  }

  const createFolder = async (name: string, parentId: number | null) => {
    if (busy || !name.trim()) return
    setBusy(true)
    try {
      await postFolder({ action: 'create', parentId: parentId == null ? '' : String(parentId), name: name.trim() })
    } finally {
      setBusy(false)
    }
  }

  const renameFolder = async (id: number, name: string) => {
    if (busy || !name.trim()) return
    setBusy(true)
    try {
      await postFolder({ action: 'rename', folderId: String(id), name: name.trim() })
    } finally {
      setBusy(false)
    }
  }

  const deleteFolder = async (id: number) => {
    if (busy) return
    setBusy(true)
    try {
      await postFolder({ action: 'delete', folderId: String(id) })
    } finally {
      setBusy(false)
    }
  }

  const moveFolder = async (id: number, parentId: number | null) => {
    if (busy) return
    setBusy(true)
    try {
      await postFolder({ action: 'move', folderId: String(id), parentId: parentId == null ? '' : String(parentId) })
    } finally {
      setBusy(false)
    }
  }

  const moveNodes = async (moves: FolderMove[]) => {
    if (busy || moves.length === 0) return
    setBusy(true)
    try {
      for (const move of moves) await moveFolder(move.id, move.parentId)
    } finally {
      setBusy(false)
    }
  }

  const openMenu = (id: number, x: number, y: number) => {
    const node = findFolderNode(nodes, id)
    if (!node) return
    if (!selectedIds.includes(id)) treeRef.current?.select(String(id))
    setMenu({ x, y, node })
  }

  const openDialog = (next: Exclude<FolderDialog, null>) => { setTarget(menu?.node ?? null); setDialog(next); setMenu(null) }
  const renameTarget = () => { const node = menu?.node; setMenu(null); if (node) treeRef.current?.get(String(node.id))?.edit() }
  const closeMenu = () => setMenu(null)

  // Legal move targets for the move picker: never the target itself or its
  // descendants; only nodes the actor can manage; root gated by canManageRoot.
  const moveTargets = (targetNode: FolderManagementNode | null): Array<{ node: FolderManagementNode; depth: number }> => {
    if (!targetNode) return []
    return all.filter(({ node }) => node.canManage !== false && node.id !== targetNode.id && !folderContains(targetNode, node.id))
  }

  return {
    query, setQuery,
    menu, closeMenu, openMenu,
    dialog, openDialog, setDialog,
    renameTarget,
    target, setTarget,
    selectedIds, setSelectedIds,
    busy,
    sort, setSort,
    treeRef,
    canManageRoot,
    all, sortedFolders, matchCount, moveTargets,
    createFolder, renameFolder, deleteFolder, moveFolder, moveNodes,
  }
}
