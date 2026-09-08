'use client'

import { createContext, useContext, useMemo, useRef, useState } from 'react'
import { Tree, type CursorProps, type NodeApi, type NodeRendererProps, type TreeApi } from 'react-arborist'

import type { FolderManagementNode as AdminFolderNode } from '@/lib/page-models/management/folders'

import styles from './FolderManager.module.scss'

export type FolderMove = { id: number; parentId: number | null }

/** Must match the Tree's indent prop: guides are laid out in indent-wide columns. */
const ROW_INDENT = 22

type Props = {
  folders: AdminFolderNode[]
  width: number
  height: number
  searchTerm: string
  treeRef: React.Ref<TreeApi<AdminFolderNode> | undefined>
  canManageRoot: boolean
  onSelectIds: (ids: number[]) => void
  onMoveNodes: (moves: FolderMove[]) => void
  onRenameNode: (id: number, name: string) => void
  onNodeMenu: (id: number, x: number, y: number) => void
}

const MenuContext = createContext<{ onNodeMenu: (id: number, x: number, y: number) => void }>({ onNodeMenu: () => {} })

/** Plain folder silhouette in the tenant accent color: outline when closed, filled tint when open. */
function FolderGlyph({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true" focusable="false" fill={open ? 'currentColor' : 'none'} fillOpacity={open ? 0.3 : 0} stroke="currentColor" strokeWidth={1.4} strokeLinejoin="round">
      <path d="M1.5 4.2c0-.8.7-1.5 1.5-1.5h3.4l1.4 1.8h5.7c.8 0 1.5.7 1.5 1.5v5.5c0 .8-.7 1.5-1.5 1.5h-11c-.8 0-1.5-.7-1.5-1.5z" />
    </svg>
  )
}

function nodeClass(node: NodeApi<AdminFolderNode>): string {
  return [
    styles.node,
    node.isSelected ? styles.nodeSelected : '',
    node.isFocused ? styles.nodeFocused : '',
    node.isDragging ? styles.nodeDragging : '',
    node.willReceiveDrop ? styles.nodeDropTarget : '',
  ].filter(Boolean).join(' ')
}

function RenameInput({ node }: { node: NodeApi<AdminFolderNode> }) {
  const [value, setValue] = useState(node.data.name)
  const done = useRef(false)
  const commit = () => {
    if (done.current) return
    done.current = true
    const name = value.trim()
    if (!name || name === node.data.name) node.reset()
    else node.submit(name)
  }
  return (
    <input
      ref={(element) => { if (element) { element.focus(); element.select() } }}
      className={styles.renameInput}
      value={value}
      onChange={(event) => setValue(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        event.stopPropagation()
        if (event.key === 'Enter') commit()
        if (event.key === 'Escape') node.reset()
      }}
      onClick={(event) => event.stopPropagation()}
      onDoubleClick={(event) => event.stopPropagation()}
      aria-label={`Rename ${node.data.name}`}
    />
  )
}

/** Stable custom row: explorer look, badges, right-click menu, double-click toggle. */
function FolderNode({ node, style, dragHandle }: NodeRendererProps<AdminFolderNode>) {
  const { onNodeMenu } = useContext(MenuContext)
  const data = node.data
  const hasChildren = data.children.length > 0
  const open = node.isOpen && hasChildren
  return (
    <div
      ref={dragHandle}
      style={{ ...style, paddingLeft: 0 }}
      className={nodeClass(node)}
      onClick={(event) => node.handleClick(event)}
      onDoubleClick={(event) => { event.stopPropagation(); if (node.isInternal) node.toggle() }}
      onContextMenu={(event) => { event.preventDefault(); event.stopPropagation(); onNodeMenu(Number(node.id), event.clientX, event.clientY) }}
    >
      {Array.from({ length: node.level }, (_, level) => (
        <span key={level} aria-hidden="true" className={styles.guide} style={{ width: ROW_INDENT }} />
      ))}
      {hasChildren ? (
        <button
          type="button"
          className={styles.chevron}
          aria-label={`${open ? 'Collapse' : 'Expand'} ${data.name}`}
          onClick={(event) => { event.stopPropagation(); node.toggle() }}
        >
          {open ? '⌄' : '›'}
        </button>
      ) : <span className={styles.chevronSpacer} aria-hidden="true" />}
      <span className={styles.folderIcon} aria-hidden="true">{data.systemManaged ? '⌂' : <FolderGlyph open={open} />}</span>
      {node.isEditing ? <RenameInput node={node} /> : <span className={styles.name}>{data.name}</span>}
      {data.systemManaged ? <span className={styles.system}>system root</span> : null}
    </div>
  )
}

function DropCursor({ top, left }: CursorProps) {
  return (
    <div aria-hidden="true" style={{ position: 'absolute', top: top - 2, left, right: 0, height: 0, borderTop: '3px solid var(--tenant-accent)' }}>
      <span style={{ position: 'absolute', top: -6, left: -1, width: 9, height: 9, borderRadius: '50%', background: 'var(--tenant-accent)' }} />
    </div>
  )
}

export function ArboristFolderTree({
  folders, width, height, searchTerm, treeRef, canManageRoot,
  onSelectIds, onMoveNodes, onRenameNode, onNodeMenu,
}: Props) {
  const menuValue = useMemo(() => ({ onNodeMenu }), [onNodeMenu])
  // Ancestor chains for the drop guard (server re-validates placement anyway).
  const parentOf = useMemo(() => {
    const map = new Map<number, number | null>()
    const walk = (nodes: AdminFolderNode[], parentId: number | null) => {
      for (const node of nodes) { map.set(node.id, parentId); walk(node.children, node.id) }
    }
    walk(folders, null)
    return map
  }, [folders])
  const isDescendant = (ancestorId: number, id: number): boolean => {
    let current = parentOf.get(id)
    while (current != null) {
      if (current === ancestorId) return true
      current = parentOf.get(current)
    }
    return false
  }

  return (
    <MenuContext.Provider value={menuValue}>
      <Tree<AdminFolderNode>
        ref={treeRef}
        data={folders}
        idAccessor={(folder) => String(folder.id)}
        openByDefault
        width={width}
        height={height}
        indent={ROW_INDENT}
        rowHeight={34}
        overscanCount={4}
        aria-label="Domain folders"
        searchTerm={searchTerm}
        searchMatch={(node, term) => node.data.name.toLocaleLowerCase().includes(term.trim().toLocaleLowerCase())}
        disableDrag={(folder) => folder.systemManaged || folder.canManage === false}
        disableEdit={(folder) => folder.systemManaged || folder.canManage === false}
        disableDrop={({ parentNode, dragNodes }) => {
          if (parentNode.isRoot) return !canManageRoot
          const targetId = Number(parentNode.id)
          return dragNodes.some((dragged) => {
            const draggedId = Number(dragged.id)
            if (dragged.data.systemManaged || dragged.data.canManage === false) return true
            return draggedId === targetId || isDescendant(draggedId, targetId)
          })
        }}
        onActivate={() => {}}
        onSelect={(nodes) => onSelectIds(nodes.map((node) => Number(node.id)))}
        onMove={({ dragIds, parentId }) => {
          const moves = dragIds
            .map((id) => ({ id: Number(id), parentId: parentId == null ? null : Number(parentId) }))
            .filter((move) => parentOf.get(move.id) !== move.parentId)
          if (moves.length > 0) onMoveNodes(moves)
        }}
        onRename={({ id, name }) => onRenameNode(Number(id), name)}
        renderCursor={DropCursor}
      >
        {FolderNode}
      </Tree>
    </MenuContext.Provider>
  )
}
