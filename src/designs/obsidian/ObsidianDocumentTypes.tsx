'use client'

import { useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Tree, type NodeRendererProps, type TreeApi } from 'react-arborist'
import { ChevronRight, Copy, FileText, Folder, MoreHorizontal, Plus, Search, ShieldCheck } from 'lucide-react'

import { duplicateObsidianTypeAction, setObsidianTypeActiveAction } from '@/components/documentTypes/ObsidianActions'
import type { TypeTreeData, TypeTreeLeaf, TypeTreeNode } from '@/lib/documents/typeTree'
import type { DocumentTypesManagementPageModel } from '@/lib/page-models/management/documentTypes'
import { useDocumentTypesManagementWorkspace } from '@/components/functional/document-types/useDocumentTypesManagementWorkspace'
import { TypeInspector } from '@/components/documentTypes/TypeInspector'

import { ActionMenu } from './controls'
import s from './obsidian.module.css'

type DocumentTypeTreeNode = {
  id: string
  kind: TypeTreeNode['kind']
  name: string
  children: DocumentTypeTreeNode[]
  leaf?: TypeTreeLeaf
  template?: 'Blank' | 'Markdown' | 'Form'
  templateName?: string | null
  description?: string | null
}

function templateLabel(selection: TypeTreeLeaf['templateSelection']): 'Blank' | 'Markdown' | 'Form' {
  return selection === 'markdown' ? 'Markdown' : selection === 'form' ? 'Form' : 'Blank'
}

function mapNodes(nodes: TypeTreeData['roots']): DocumentTypeTreeNode[] {
  return nodes.map((node) => ({
    id: node.id,
    kind: node.kind,
    name: node.name,
    children: mapNodes(node.children),
    leaf: node.leaf,
    template: node.leaf ? templateLabel(node.leaf.templateSelection) : undefined,
    templateName: node.leaf?.templateName,
    description: node.leaf?.description,
  }))
}

function countTypes(nodes: DocumentTypeTreeNode[]): number {
  return nodes.reduce((count, node) => count + (node.kind === 'type' ? 1 : 0) + countTypes(node.children), 0)
}

function TypeTreeRow({ node, style, dragHandle }: NodeRendererProps<DocumentTypeTreeNode>) {
  const item = node.data
  const hasChildren = item.children.length > 0
  const isType = item.kind === 'type'
  return (
    <div
      className={`${s.arboristRow} ${s.typeTreeRow} ${node.isOpen ? s.treeOpen : ''} ${node.isSelected ? s.arboristSelected : ''}`}
      style={style}
      ref={dragHandle}
      onClick={(event) => node.handleClick(event)}
      onDoubleClick={() => !isType && item.kind !== 'unassigned' && node.toggle()}
    >
      <button
        type="button"
        className={s.treeChevron}
        onClick={(event) => { event.stopPropagation(); if (hasChildren) node.toggle() }}
        aria-label={hasChildren ? `${node.isOpen ? 'Collapse' : 'Expand'} ${item.name}` : undefined}
        aria-hidden={!hasChildren}
        tabIndex={hasChildren ? 0 : -1}
      >
        {hasChildren && <ChevronRight size={15} />}
      </button>
      {isType ? <FileText size={16} className={s.typeIcon} /> : <Folder size={16} className={s.treeFolderIcon} />}
      <span className={s.treeName}>{item.name}</span>
      {item.kind === 'department' && <span className={s.rootTag}>Department root</span>}
      {item.kind === 'unassigned' && <span className={s.rootTag}>Orphaned types</span>}
      {isType ? <><span className={s.templateChip}>{item.template}</span><span className={s.templateName}>{item.templateName ?? 'No template yet'}</span></> : null}
    </div>
  )
}

export function ObsidianDocumentTypes({ model }: { model: DocumentTypesManagementPageModel }) {
  const router = useRouter()
  const workspace = useDocumentTypesManagementWorkspace(model)
  const tree = useRef<TreeApi<DocumentTypeTreeNode> | null>(null)
  const [query, setQuery] = useState('')
  const [editOpen, setEditOpen] = useState(false)
  const nodes = useMemo(() => mapNodes(model.tree.roots), [model.tree.roots])
  const visibleTypes = useMemo(() => countTypes(nodes), [nodes])
  const selected = workspace.selectedLeaf

  const refreshAfter = async (operation: Promise<{ ok: boolean }>) => {
    await operation
    router.refresh()
  }

  return (
    <div className={s.workspacePage}>
      <header className={s.pageHeading}>
        <div>
          <p className={s.eyebrow}>FIRST-ORDER AUTHORING</p>
          <h1>Document types</h1>
          <p>Types define a record’s templates, lifecycle, and destination routing.</p>
        </div>
        {model.canManage ? <button className={s.primaryButton} type="button" onClick={() => { workspace.beginCreate(); setEditOpen(true) }}><Plus size={17} /> New document type</button> : null}
      </header>
      {model.status ? <p className={s.formError} role="alert">{model.status.message}</p> : null}
      <nav className={s.typeSubnav} aria-label="Document type navigation">
        <a aria-current="page" href="#types">Document types</a>
        <a href={`/domain/${model.domainSlug}/templates`}>Templates</a>
        <a href={`/domain/${model.domainSlug}/forms`}>Forms</a>
      </nav>
      {editOpen ? (
        <TypeInspector
          key={workspace.creating ? 'create' : `type-${selected?.id ?? 'none'}`}
          mode={workspace.creating ? 'create' : 'edit'}
          domainSlug={model.domainSlug}
          leaf={selected}
          departments={model.tree.departments}
          typeFolders={workspace.typeFolders}
          roles={model.inspector.roles}
          folders={model.inspector.folders}
          stages={workspace.creating || !selected ? null : (model.inspector.stagesByType[selected.id] ?? null)}
          defaultDepartmentId={selected?.departmentId ?? null}
          onCreated={workspace.finishCreate}
          onDuplicate={workspace.selectType}
          onCancel={workspace.creating ? () => { workspace.cancelCreate(); setEditOpen(false) } : undefined}
        />
      ) : (
        <section className={s.typeBrowser} id="types">
          <div className={s.typeTreePane}>
            <div className={s.treeToolbar}>
              <label className={s.search}>
                <Search size={18} />
                <span className={s.srOnly}>Search document types</span>
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search types and folders" />
              </label>
            </div>
            <div className={s.treeCanvas}>
              <Tree<DocumentTypeTreeNode>
                ref={tree}
                data={nodes}
                idAccessor={(node) => node.id}
                childrenAccessor={(node) => node.children}
                openByDefault
                width="100%"
                height={446}
                indent={24}
                rowHeight={42}
                searchTerm={query}
                searchMatch={(node, term) => node.data.name.toLowerCase().includes(term.toLowerCase())}
                disableDrag={(node) => node.kind === 'department' || node.kind === 'unassigned'}
                disableDrop={({ parentNode }) => !parentNode || parentNode.data.kind === 'unassigned' || parentNode.data.kind === 'type'}
                onSelect={(selectedNodes) => { const type = selectedNodes.find((node) => node.data.kind === 'type')?.data.leaf; workspace.selectType(type?.id ?? null); setEditOpen(false) }}
              >
                {TypeTreeRow}
              </Tree>
            </div>
            <div className={s.typeTreeFoot}>{visibleTypes} visible document types</div>
          </div>
          <aside className={s.typeInspector} aria-label="Document type inspector">
            {selected ? (
              <>
                <div className={s.inspectorHead}>
                  <span className={s.templateChip}>{templateLabel(selected.templateSelection)}</span>
                  <ActionMenu
                    label={`Actions for ${selected.name}`}
                    trigger={<MoreHorizontal size={19} />}
                    onAction={(action) => {
                      if (action.key === 'duplicate') void refreshAfter(duplicateObsidianTypeAction({ domainSlug: model.domainSlug, typeId: selected.id }))
                      if (action.key === 'deactivate') void refreshAfter(setObsidianTypeActiveAction({ domainSlug: model.domainSlug, typeId: selected.id, active: false }))
                      if (action.key === 'activate') void refreshAfter(setObsidianTypeActiveAction({ domainSlug: model.domainSlug, typeId: selected.id, active: true }))
                    }}
                    items={[{ key: selected.active ? 'deactivate' : 'activate', label: selected.active ? 'Deactivate' : 'Activate' }, { key: 'duplicate', label: 'Duplicate' }]}
                  />
                </div>
                <h2>{selected.name}</h2>
                <p>{selected.description ?? 'A document type ready for configuration.'}</p>
                <dl className={s.inspectorFacts}>
                  <div><dt>Creation method</dt><dd>{templateLabel(selected.templateSelection)} {selected.templateSelection === 'blank' ? 'document' : 'template'}</dd></div>
                  <div><dt>Attached template</dt><dd>{selected.templateName ?? 'No template yet'}</dd></div>
                  <div><dt>Lifecycle</dt><dd>Draft → Submitted → Filed</dd></div>
                </dl>
                {model.canManage ? <>
                  <button className={s.secondaryButton} type="button" onClick={() => setEditOpen(true)}><ShieldCheck size={15} /> Configure type</button>
                  <button className={s.quietButton} type="button" onClick={() => void refreshAfter(duplicateObsidianTypeAction({ domainSlug: model.domainSlug, typeId: selected.id }))}><Copy size={14} /> Duplicate with independent template</button>
                </> : null}
              </>
            ) : (
              <div className={s.inspectorEmpty}><FileText size={25} /><h2>Choose a document type</h2><p>Select a line in the tree to inspect its template and lifecycle configuration.</p></div>
            )}
          </aside>
        </section>
      )}
    </div>
  )
}
