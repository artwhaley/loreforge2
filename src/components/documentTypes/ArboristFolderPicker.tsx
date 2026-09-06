'use client'

import { Tree, type NodeApi, type NodeRendererProps, type TreeApi } from 'react-arborist'

import styles from './TypeTree.module.scss'

const ROW_INDENT = 20

export type PickerNode = { id: string; name: string; children: PickerNode[] }

function rowClass(node: NodeApi<PickerNode>): string {
  return [styles.node, node.isSelected ? styles.nodeSelected : '', node.isFocused ? styles.nodeFocused : ''].filter(Boolean).join(' ')
}

function PickerRow({ node, style }: NodeRendererProps<PickerNode>) {
  const hasChildren = node.data.children.length > 0
  const open = node.isOpen && hasChildren
  return (
    <div
      style={{ ...style, paddingLeft: 0 }}
      className={rowClass(node)}
      onClick={(event) => node.handleClick(event)}
      onDoubleClick={(event) => { event.stopPropagation(); if (node.isInternal) node.toggle() }}
    >
      {Array.from({ length: node.level }, (_, level) => (
        <span key={level} aria-hidden="true" className={styles.guide} style={{ width: ROW_INDENT }} />
      ))}
      {hasChildren ? (
        <button
          type="button"
          className={styles.chevron}
          aria-label={`${open ? 'Collapse' : 'Expand'} ${node.data.name}`}
          onClick={(event) => { event.stopPropagation(); node.toggle() }}
        >{open ? '⌄' : '›'}</button>
      ) : <span className={styles.chevronSpacer} aria-hidden="true" />}
      <span className={styles.folderIcon} aria-hidden="true">▱</span>
      <span className={styles.name} title={node.data.name}>{node.data.name}</span>
    </div>
  )
}

/** Static single-select arborist tree — the compressed folder navigation popup. */
export function ArboristFolderPicker({ nodes, width, height, treeRef, selectedId, onSelect }: {
  nodes: PickerNode[]
  width: number
  height: number
  treeRef: React.Ref<TreeApi<PickerNode> | undefined>
  selectedId?: string
  onSelect: (id: number | null) => void
}) {
  return (
    <Tree<PickerNode>
      ref={treeRef}
      data={nodes}
      idAccessor={(node) => node.id}
      openByDefault={false}
      width={width}
      height={height}
      indent={ROW_INDENT}
      rowHeight={32}
      overscanCount={4}
      aria-label="Choose a folder"
      selection={selectedId}
      disableDrag={() => true}
      disableDrop={() => true}
      onSelect={(selectedNodes) => onSelect(selectedNodes[0] ? Number(selectedNodes[0].id) : null)}
      onActivate={() => {}}
    >
      {PickerRow}
    </Tree>
  )
}