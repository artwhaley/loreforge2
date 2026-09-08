'use client'

import { useMemo, useState } from 'react'

import type { DocumentTypesManagementPageModel } from '@/lib/page-models/management/documentTypes'
import type { TypeTreeData, TypeTreeLeaf } from '@/lib/documents/typeTree'

/**
 * Shared Document Types workspace (OBSIDIAN-T05). The tree/inspector data is
 * fully resolved server-side; the shared interactive state is the selection:
 * which Type is inspected, whether the create inspector is open, and the
 * flattened type-folder picker options. The TypeInspector itself remains a
 * shared functional editor (it already drives the guarded server actions and
 * router.refresh). A Design supplies only presentation.
 */
export type TypeFolderOption = { id: number; name: string; departmentId: number | null; depth: number }

/**
 * Manual type-folder options (never Department roots, Type nodes, or the
 * virtual Unassigned root). Recurses through every node kind so folders
 * nested under Department roots surface in the picker. (The pre-extraction
 * implementation only returned folders at the top level of `roots`, which
 * silently emptied the subfolder picker for real trees; the semantic here is
 * the documented one — every manual folder at any depth, with its depth.)
 */
export function flattenTypeFolders(nodes: TypeTreeData['roots'], depth = 0): TypeFolderOption[] {
  return nodes.flatMap((node) => {
    if (node.kind === 'folder') {
      return [{ id: Number(node.id.slice('fld-'.length)), name: node.name, departmentId: node.departmentId ?? null, depth }, ...flattenTypeFolders(node.children, depth + 1)]
    }
    return flattenTypeFolders(node.children, depth)
  })
}

export function useDocumentTypesManagementWorkspace(model: DocumentTypesManagementPageModel) {
  const [selectedTypeId, setSelectedTypeId] = useState<number | null>(null)
  const [creating, setCreating] = useState(false)

  const selectedLeaf = useMemo(() => model.tree.types.find((type) => type.id === selectedTypeId) ?? null, [model.tree.types, selectedTypeId])
  const typeFolders = useMemo(() => flattenTypeFolders(model.tree.roots), [model.tree.roots])

  const selectType = (id: number | null) => { setSelectedTypeId(id); setCreating(false) }
  const beginCreate = () => { setSelectedTypeId(null); setCreating(true) }
  const finishCreate = (typeId: number) => { setCreating(false); setSelectedTypeId(typeId) }
  const cancelCreate = () => setCreating(false)

  return {
    selectedTypeId, setSelectedTypeId,
    creating,
    selectedLeaf,
    typeFolders,
    selectType, beginCreate, finishCreate, cancelCreate,
  }
}

export type { TypeTreeLeaf }