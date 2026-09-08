'use client'

import { useMemo, useRef, useState } from 'react'
import { Tree, type NodeRendererProps, type TreeApi } from 'react-arborist'
import { ChevronRight, Folder, FolderOpen, MoreHorizontal, Plus, Search } from 'lucide-react'

import type { FolderManagementNode, FolderManagementPageModel } from '@/lib/page-models/management/folders'
import { useFolderManagementWorkspace } from '@/components/functional/folders/useFolderManagementWorkspace'

import { ActionMenu, ChoiceMenu, Modal } from './controls'
import s from './obsidian.module.css'

type ManagedFolderNode = {
  id: string
  name: string
  createdLabel: string
  systemManaged?: boolean
  children: ManagedFolderNode[]
}

type Sort = 'name-asc' | 'name-desc' | 'newest' | 'oldest'

function createdLabel(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric', year: 'numeric' })
}

function mapFolders(nodes: FolderManagementNode[]): ManagedFolderNode[] {
  return nodes.map((node) => ({
    id: String(node.id),
    name: node.name,
    createdLabel: createdLabel(node.createdAt),
    systemManaged: node.systemManaged,
    children: mapFolders(node.children),
  }))
}

function sortTree(nodes: ManagedFolderNode[], sort: Sort): ManagedFolderNode[] {
  const direction = sort === 'name-desc' || sort === 'oldest' ? -1 : 1
  return [...nodes]
    .sort((left, right) => {
      if (sort === 'newest' || sort === 'oldest') return left.createdLabel.localeCompare(right.createdLabel) * direction
      return left.name.localeCompare(right.name) * direction
    })
    .map((node) => ({ ...node, children: sortTree(node.children, sort) }))
}

function FolderRow({ node, style, dragHandle }: NodeRendererProps<ManagedFolderNode>) {
  const hasChildren = node.data.children.length > 0
  return (
    <div
      className={`${s.arboristRow} ${node.isOpen ? s.treeOpen : ''} ${node.isSelected ? s.arboristSelected : ''}`}
      style={style}
      ref={dragHandle}
      onClick={(event) => node.handleClick(event)}
      onDoubleClick={() => !node.data.systemManaged && node.edit()}
    >
      <button
        type="button"
        className={s.treeChevron}
        onClick={(event) => { event.stopPropagation(); if (hasChildren) node.toggle() }}
        aria-label={hasChildren ? `${node.isOpen ? 'Collapse' : 'Expand'} ${node.data.name}` : undefined}
        aria-hidden={!hasChildren}
        tabIndex={hasChildren ? 0 : -1}
      >
        {hasChildren && <ChevronRight size={15} />}
      </button>
      {node.isOpen && hasChildren ? <FolderOpen size={17} className={s.treeFolderIcon} /> : <Folder size={17} className={s.treeFolderIcon} />}
      {node.isEditing ? (
        <input
          className={s.treeRename}
          defaultValue={node.data.name}
          aria-label={`Rename ${node.data.name}`}
          autoFocus
          onBlur={(event) => node.submit(event.currentTarget.value)}
          onKeyDown={(event) => { if (event.key === 'Enter') node.submit(event.currentTarget.value); if (event.key === 'Escape') node.reset() }}
          onClick={(event) => event.stopPropagation()}
        />
      ) : <span className={s.treeName}>{node.data.name}</span>}
      {node.data.systemManaged && <span className={s.systemTag}>System</span>}
      <span className={s.treeDate}>{node.data.createdLabel}</span>
    </div>
  )
}

function findFolder(nodes: FolderManagementNode[], id: number): FolderManagementNode | null {
  for (const node of nodes) {
    if (node.id === id) return node
    const child = findFolder(node.children, id)
    if (child) return child
  }
  return null
}

export function ObsidianFolderManager({ model }: { model: FolderManagementPageModel }) {
  const workspace = useFolderManagementWorkspace(model)
  const tree = useRef<TreeApi<ManagedFolderNode> | null>(null)
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<Sort>('name-asc')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const folders = useMemo(() => mapFolders(model.nodes), [model.nodes])
  const sorted = useMemo(() => sortTree(folders, sort), [folders, sort])
  const selected = selectedId == null ? null : findFolder(model.nodes, selectedId)

  const setSelected = (ids: string[]) => {
    const id = ids[0] == null ? null : Number(ids[0])
    setSelectedId(id)
    workspace.setSelectedIds(id == null ? [] : [id])
    workspace.setTarget(id == null ? null : findFolder(model.nodes, id))
  }

  const openDialog = (dialog: 'create' | 'delete' | 'move') => {
    workspace.setTarget(selected)
    workspace.setDialog(dialog)
  }

  return (
    <div className={s.workspacePage}>
      <header className={s.pageHeading}>
        <div>
          <p className={s.eyebrow}>RECORDS ORGANIZATION</p>
          <h1>Folders</h1>
          <p>Arrange the archive without changing the permissions carried by document types.</p>
        </div>
        <button className={s.primaryButton} type="button" disabled={!model.rootManageable} onClick={() => { workspace.setTarget(null); workspace.setDialog('create') }}>
          <Plus size={17} /> New folder
        </button>
      </header>
      {model.status ? <p className={s.formError} role="alert">{model.status.message}</p> : null}
      <section className={s.treeManager} aria-label="Folder manager">
        <div className={s.treeToolbar}>
          <label className={s.search}>
            <Search size={18} />
            <span className={s.srOnly}>Search folders</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search folders" />
          </label>
          <ChoiceMenu
            label="Sort folders"
            value={sort}
            onChange={(value) => setSort(value as Sort)}
            choices={[{ value: 'name-asc', label: 'Name A–Z' }, { value: 'name-desc', label: 'Name Z–A' }, { value: 'newest', label: 'Newest' }, { value: 'oldest', label: 'Oldest' }]}
          />
        </div>
        <div className={s.treeCanvas}>
          <Tree<ManagedFolderNode>
            ref={tree}
            data={sorted}
            idAccessor={(node) => node.id}
            childrenAccessor={(node) => node.children}
            openByDefault
            width="100%"
            height={470}
            indent={24}
            rowHeight={42}
            overscanCount={5}
            aria-label="Domain folders"
            searchTerm={query}
            searchMatch={(node, term) => node.data.name.toLowerCase().includes(term.toLowerCase())}
            disableDrag={(node) => Boolean(node.systemManaged)}
            disableDrop={({ parentNode }) => !parentNode || Boolean(parentNode.data.systemManaged)}
            onSelect={(nodes) => setSelected(nodes.map((node) => node.id))}
            onMove={({ dragIds, parentId }) => { void workspace.moveNodes(dragIds.map((id) => ({ id: Number(id), parentId: parentId == null ? null : Number(parentId) }))) }}
            onRename={({ id, name }) => { void workspace.renameFolder(Number(id), name) }}
          >
            {FolderRow}
          </Tree>
        </div>
        <div className={s.treeFooter}>
          <span>{selected ? `Selected: ${selected.name}` : 'Select a folder to inspect or manage it.'}</span>
          <ActionMenu
            label="Folder actions"
            trigger={<><MoreHorizontal size={18} /> Folder actions</>}
            onAction={(action) => {
              if (action.key === 'new-child' && selected) openDialog('create')
              if (action.key === 'rename' && selected && !selected.systemManaged) tree.current?.get(String(selected.id))?.edit()
              if (action.key === 'move' && selected && !selected.systemManaged) openDialog('move')
              if (action.key === 'delete' && selected && !selected.systemManaged) openDialog('delete')
            }}
            items={[{ key: 'new-child', label: 'New subfolder', disabled: !selected || selected.systemManaged }, { key: 'rename', label: 'Rename', disabled: !selected || selected.systemManaged }, { key: 'move', label: 'Move folder', disabled: !selected || selected.systemManaged }, { key: 'delete', label: 'Delete folder', disabled: !selected || selected.systemManaged, danger: true }]}
          />
        </div>
      </section>
      {workspace.dialog === 'create' ? (
        <Modal open onOpenChange={(open) => { if (!open) workspace.setDialog(null) }} title="New folder" description="Create a folder in the archive.">
          <form className={s.folderForm} onSubmit={(event) => { event.preventDefault(); const name = String(new FormData(event.currentTarget).get('name') ?? '').trim(); if (name) void workspace.createFolder(name, workspace.target?.id ?? null); workspace.setDialog(null) }}>
            <label>Name<input name="name" required autoFocus /></label>
            <button type="submit" className={s.primaryButton}>Create folder</button>
          </form>
        </Modal>
      ) : null}
      {workspace.dialog === 'delete' && workspace.target ? (
        <Modal open onOpenChange={(open) => { if (!open) workspace.setDialog(null) }} title={`Delete ${workspace.target.name}?`} description="The folder must be empty before it can be deleted.">
          <form className={s.folderForm} onSubmit={(event) => { event.preventDefault(); void workspace.deleteFolder(workspace.target!.id); workspace.setDialog(null) }}>
            <div className={s.dialogActions}><button type="submit" className={s.danger}>Delete folder</button><button type="button" className={s.secondaryButton} onClick={() => workspace.setDialog(null)}>Cancel</button></div>
          </form>
        </Modal>
      ) : null}
      {workspace.dialog === 'move' && workspace.target ? (
        <Modal open onOpenChange={(open) => { if (!open) workspace.setDialog(null) }} title={`Move ${workspace.target.name}`} description="Choose a new parent folder.">
          <form className={s.folderForm} onSubmit={(event) => { event.preventDefault(); const parent = new FormData(event.currentTarget).get('parentId'); void workspace.moveFolder(workspace.target!.id, parent ? Number(parent) : null); workspace.setDialog(null) }}>
            <label>Move under<select name="parentId" defaultValue=""><option value="" disabled={!workspace.canManageRoot}>Domain root</option>{workspace.moveTargets(workspace.target).map(({ node, depth }) => <option key={node.id} value={node.id}>{'· '.repeat(depth)}{node.name}</option>)}</select></label>
            <button type="submit" className={s.primaryButton}>Move folder</button>
          </form>
        </Modal>
      ) : null}
    </div>
  )
}
