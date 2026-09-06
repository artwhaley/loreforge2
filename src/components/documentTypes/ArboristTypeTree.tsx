'use client'

import { createContext, useContext, useMemo, useRef, useState } from 'react'
import { Tree, type CursorProps, type NodeApi, type NodeRendererProps, type TreeApi } from 'react-arborist'

import type { TemplateSelection, TypeTreeLeaf, TypeTreeNode } from '@/lib/documents/typeTree'

import styles from './TypeTree.module.scss'

/** Must match the Tree's indent prop: guides are laid out in indent-wide columns. */
const ROW_INDENT = 22

type Props = {
  nodes: TypeTreeNode[]
  width: number
  height: number
  searchTerm: string
  treeRef: React.Ref<TreeApi<TypeTreeNode> | undefined>
  canManage: boolean
  selectedTypeId: number | null
  onSelectType: (id: number | null) => void
  onNodeMenu: (id: string, x: number, y: number) => void
  onNodePopover: (leaf: TypeTreeLeaf, x: number, y: number) => void
  onMoveNodes: (moves: Array<{ id: string; parentId: string | null }>) => void
  onRenameFolder: (id: number, name: string) => void
  kindLabels: Record<TemplateSelection, string>
  base: string
}

const MenuContext = createContext<{ onNodeMenu: (id: string, x: number, y: number) => void; onNodePopover: (leaf: TypeTreeLeaf, x: number, y: number) => void; kindLabels: Record<TemplateSelection, string>; base: string; canManage: boolean }>({
  onNodeMenu: () => {}, onNodePopover: () => {}, kindLabels: { blank: 'Blank Document', markdown: 'Markdown Template', form: 'Form Template' }, base: '/', canManage: false,
})

function nodeClass(node: NodeApi<TypeTreeNode>): string {
  return [
    styles.node,
    node.isSelected ? styles.nodeSelected : '',
    node.isFocused ? styles.nodeFocused : '',
    node.isDragging ? styles.nodeDragging : '',
    node.willReceiveDrop ? styles.nodeDropTarget : '',
  ].filter(Boolean).join(' ')
}

function RenameInput({ node }: { node: NodeApi<TypeTreeNode> }) {
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

/** The file-browser style line card: name (+inactive) · template-type chip · template hyperlink. */
function TypeRow({ node }: { node: NodeApi<TypeTreeNode> }) {
  const { onNodePopover, kindLabels, base } = useContext(MenuContext)
  const leaf = node.data.leaf!
  const inactive = !leaf.active
  const label = kindLabels[leaf.templateSelection]
  const templateHref = leaf.templateId && leaf.templateKind ? `${base}/${leaf.templateKind === 'form' ? 'forms' : 'templates'}/${leaf.templateId}/edit` : null
  return (
    <span className={styles.lineCard}>
      <span className={inactive ? styles.nameInactive : styles.name} title={leaf.description ?? leaf.name}>
        {leaf.name}
        {inactive ? <span className={styles.inactiveSuffix}> (inactive)</span> : null}
      </span>
      <button
        type="button"
        className={styles.kindChip}
        title={`Template type: ${label}. Click to choose Blank / Markdown / Form.`}
        onClick={(event) => { event.stopPropagation(); onNodePopover(leaf, event.clientX, event.clientY) }}
      >
        {label}
      </button>
      {leaf.templateSelection === 'blank' ? (
        <span className={styles.templateEmpty} title="Blank Document — no template is attached">—</span>
      ) : templateHref ? (
        <a
          className={styles.templateLink}
          href={templateHref}
          title={`Edit the ${leaf.templateKind === 'form' ? 'Form' : 'Markdown'} template "${leaf.templateName}"`}
          onClick={(event) => event.stopPropagation()}
        >
          {leaf.templateName}
        </a>
      ) : <span className={styles.templateEmpty} title={`No ${label} exists yet — create one from the inspector.`}>No template yet</span>}
    </span>
  )
}

function TypeTreeNodeRow({ node, style, dragHandle }: NodeRendererProps<TypeTreeNode>) {
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
      onContextMenu={(event) => { event.preventDefault(); event.stopPropagation(); onNodeMenu(node.id, event.clientX, event.clientY) }}
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
      {data.kind === 'type' ? (
        <>
          <span className={styles.typeIcon} aria-hidden="true" title={data.leaf?.active === false ? 'Inactive Document Type' : 'Document Type'}>▤</span>
          {node.isEditing ? <RenameInput node={node} /> : <TypeRow node={node} />}
        </>
      ) : (
        <>
          <span className={styles.folderIcon} aria-hidden="true">{data.kind === 'department' ? '⌂' : data.kind === 'unassigned' ? '◌' : '▱'}</span>
          {node.isEditing ? <RenameInput node={node} /> : <span className={styles.name}>{data.name}</span>}
          {data.kind === 'department' ? <span className={styles.rootTag}>Department root</span> : null}
          {data.kind === 'unassigned' ? <span className={styles.rootTag}>appears only when populated</span> : null}
        </>
      )}
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

export function ArboristTypeTree({
  nodes, width, height, searchTerm, treeRef, canManage, selectedTypeId,
  onSelectType, onNodeMenu, onNodePopover, onMoveNodes, onRenameFolder, kindLabels, base,
}: Props) {
  const menuValue = useMemo(() => ({ onNodeMenu, onNodePopover, kindLabels, base, canManage }), [onNodeMenu, onNodePopover, kindLabels, base, canManage])
  // Ancestor chains for the drop guard (server re-validates placement anyway).
  const parentOf = useMemo(() => {
    const map = new Map<string, string | null>()
    const walk = (treeNodes: TypeTreeNode[], parentId: string | null) => {
      for (const node of treeNodes) { map.set(node.id, parentId); walk(node.children, node.id) }
    }
    walk(nodes, null)
    return map
  }, [nodes])
  const isDescendant = (ancestorId: string, id: string): boolean => {
    let current = parentOf.get(id)
    while (current != null) {
      if (current === ancestorId) return true
      current = parentOf.get(current)
    }
    return false
  }

  return (
    <MenuContext.Provider value={menuValue}>
      <Tree<TypeTreeNode>
        ref={treeRef}
        data={nodes}
        idAccessor={(node) => node.id}
        openByDefault
        width={width}
        height={height}
        indent={ROW_INDENT}
        rowHeight={36}
        overscanCount={4}
        aria-label="Document Types"
        searchTerm={searchTerm}
        searchMatch={(node, term) => node.data.name.toLocaleLowerCase().includes(term.trim().toLocaleLowerCase())}
        selection={selectedTypeId != null ? `type-${selectedTypeId}` : undefined}
        // Types and navigation folders drag; Department roots and Unassigned do not.
        disableDrag={(node) => !canManage || node.kind === 'department' || node.kind === 'unassigned'}
        disableDrop={({ parentNode, dragNodes }) => {
          // Types are leaves; drops land on roots and folders only.
          if (!parentNode || parentNode.isRoot) return true
          const target = parentNode.data
          if (target.kind === 'unassigned' || target.kind === 'type') return true
          return dragNodes.some((dragged) => {
            const draggedData = dragged.data
            if (draggedData.kind === 'department' || draggedData.kind === 'unassigned') return true
            if (draggedData.kind === 'type') return false // types may land in any root/folder
            // folder -> folder: no cycles, no self.
            return dragged.id === target.id || isDescendant(dragged.id, target.id)
          })
        }}
        onActivate={() => {}}
        onSelect={(nodesList) => {
          const typeNode = nodesList.find((node) => node.data.kind === 'type' && node.data.leaf)
          onSelectType(typeNode?.data.leaf?.id ?? null)
        }}
        onMove={({ dragIds, parentId }) => {
          const moves = dragIds
            .map((id) => ({ id, parentId }))
            .filter((move) => parentOf.get(move.id) !== move.parentId)
          if (moves.length > 0) onMoveNodes(moves)
        }}
        onRename={({ id, name }) => onRenameFolder(Number(String(id).slice('fld-'.length)), name)}
        renderCursor={DropCursor}
      >
        {TypeTreeNodeRow}
      </Tree>
    </MenuContext.Provider>
  )
}