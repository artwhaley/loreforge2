'use client'

import Link from 'next/link'
import { useActionState, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRight, Copy, FileText, Folder, FolderOpen, MoreHorizontal, Plus, Search, ShieldCheck, UserRound } from 'lucide-react'
import { Tree, type NodeRendererProps, type TreeApi } from 'react-arborist'

import { useFolderManagementWorkspace } from '@/components/functional/folders/useFolderManagementWorkspace'
import { usePeopleManagementWorkspace, peopleSearchOptionId } from '@/components/functional/people/usePeopleManagementWorkspace'
import { useRoleManagementWorkspace } from '@/components/functional/roles/useRoleManagementWorkspace'
import { useDocumentTypesManagementWorkspace } from '@/components/functional/document-types/useDocumentTypesManagementWorkspace'
import { FolderTree, RoleTree, type RoleDepartment, type RoleTreeNode } from '@/components/people/PersonAccessTrees'
import { TypeInspector } from '@/components/documentTypes/TypeInspector'
import { duplicateTypeAction, issueInvitationAction, setActiveTypeAction, type IssueInvitationState } from '@/lib/design/hostActionBridges'
import type { WorkDesignViewProps } from '@/lib/design/types'
import type { MembersPageModel } from '@/lib/page-models/members'
import type { FolderManagementPageModel, FolderManagementNode } from '@/lib/page-models/management/folders'
import type { RoleManagementPageModel } from '@/lib/page-models/management/roles'
import type { DocumentTypesManagementPageModel } from '@/lib/page-models/management/documentTypes'
import type { PeopleManagementPageModel, PersonManagementPageModel } from '@/lib/page-models/management/people'
import type { InvitationsManagementPageModel } from '@/lib/page-models/management/invitations'
import type { DepartmentsManagementPageModel } from '@/lib/page-models/management/departments'
import type { TypeTreeData, TypeTreeLeaf, TypeTreeNode } from '@/lib/documents/typeTree'

/**
 * Civic-owned operational entrypoints. Each surface is a first-class slot body
 * living in Civic's Design definition. Everything here consumes only the
 * mirrored host seam (workspace hooks, access trees, TypeInspector, action
 * bridges, and the authorized API endpoints) — the same seam the Lab mirrors —
 * so the folder is drop-in portable with zero host edits.
 */

const SHEET: Record<string, string | number> = {
  border: '1px solid var(--tenant-border, #ddd)',
  radius: 6,
  gap: '1.2rem',
}

function Sheet({ children }: { children: React.ReactNode }) {
  return <section style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gap: SHEET.gap }}>{children}</section>
}

function Crumb({ href, label }: { href: string; label: string }) {
  return <p style={{ margin: 0 }}><a href={href}>← {label}</a></p>
}

function Heading({ title, description }: { title: string; description?: string }) {
  return <div><h1 style={{ margin: '0 0 .25rem' }}>{title}</h1>{description ? <p style={{ margin: 0 }}>{description}</p> : null}</div>
}

function StatusLine({ status }: { status: { level: 'info' | 'error'; message: string } | null }) {
  if (!status) return null
  return <p role={status.level === 'error' ? 'alert' : 'status'}>{status.message}</p>
}

// ---------------------------------------------------------------------------
// Work
// ---------------------------------------------------------------------------

export function CivicWork(props: WorkDesignViewProps) {
  const slug = props.domainSlug
  const requestEntries = props.entries.filter((entry) => entry.kind === 'join' || entry.kind === 'claim')
  const documentEntries = props.entries.filter((entry) => entry.kind === 'document')
  return (
    <section style={{ maxWidth: 1050, margin: '0 auto', display: 'grid', gap: '1rem' }}>
      <nav aria-label="Work navigation"><Link href={`/domain/${slug}`}>Domain home</Link> · <Link href={`/domain/${slug}/work`} aria-current="page">Work</Link>{props.domainAdmin ? <> · <Link href={`/domain/${slug}/manage/invitations`}>Invitations</Link></> : null}</nav>
      <div><h1>Work</h1><p>{props.domainAdmin ? 'Requests and records that need your attention in this Domain.' : 'Records you are allowed to approve in this Domain.'}</p></div>
      {props.domainAdmin ? <section><h2>People requests</h2>{requestEntries.length === 0 ? <p>Nothing is waiting for a Domain decision.</p> : <ul style={{ display: 'grid', gap: '.6rem', listStyle: 'none', padding: 0 }}>{requestEntries.map((entry) => <li key={`${entry.kind}-${entry.id}`} style={{ display: 'flex', justifyContent: 'space-between', gap: '.8rem', flexWrap: 'wrap', padding: '.8rem', border: SHEET.border }}><span><strong>{entry.title}</strong><br /><small>{entry.summary}</small></span><Link href={entry.href ?? `/domain/${slug}/manage/invitations`}>Open</Link></li>)}</ul>}</section> : null}
      <section><h2>Submitted records</h2>{documentEntries.length === 0 ? <p>Submitted records awaiting approval will appear here when you have <code>approve_document</code> access on their Document Type.</p> : <ul style={{ display: 'grid', gap: '.8rem', listStyle: 'none', padding: 0 }}>{documentEntries.map((entry) => <li key={`document-${entry.id}`} style={{ padding: '1rem', border: SHEET.border }}><h3 style={{ marginTop: 0 }}><Link href={entry.href ?? `/domain/${slug}/documents/${entry.id}`}>{entry.title}</Link></h3><p><small>{entry.folderName ? `Folder: ${entry.folderName} · ` : ''}{entry.requestedAt ? new Date(entry.requestedAt).toLocaleString() : 'Recently updated'}</small></p><div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}><form action={props.approveAction}><input type="hidden" name="tenantSlug" value={slug} /><input type="hidden" name="documentId" value={entry.id} /><input type="hidden" name="operation" value="approve" /><button type="submit">Approve and file</button></form><form action={props.rejectAction}><input type="hidden" name="tenantSlug" value={slug} /><input type="hidden" name="documentId" value={entry.id} /><input type="hidden" name="operation" value="reject" /><button type="submit">Return to Draft</button></form></div></li>)}</ul>}</section>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Members directory
// ---------------------------------------------------------------------------

export function CivicMembers(model: MembersPageModel) {
  const slug = model.domainSlug
  const vocab = model.vocabulary
  return (
    <Sheet>
      <Crumb href={`/domain/${slug}`} label="Domain home" />
      <Heading title={`${vocab.domainSingular} ${vocab.memberPlural}`} description="Characters belong to this Domain independently of their controlling account and local alias. Department participation is derived from the Roles each Character holds." />
      {model.canSearch ? <p><strong>Lifecycle:</strong> removing Domain membership removes this Character&apos;s Role assignments and direct Folder access. Re-adding the Domain starts clean.</p> : null}
      {model.canSearch ? (
        <div>
          <form method="get">
            <input name="q" defaultValue={model.query} aria-label="Search Characters to add" placeholder="Search name or alias" />{' '}
            <button type="submit">Search</button>
          </form>
          {model.query ? (model.searchResults.length > 0 ? (
            <ul>
              {model.searchResults.map((hit) => (
                <li key={hit.id}>{hit.name}{' '}
                  <form action="/api/domain-memberships" method="post" style={{ display: 'inline' }}>
                    <input type="hidden" name="domainSlug" value={slug} />
                    <input type="hidden" name="characterId" value={hit.id} />
                    <button type="submit">Add to Domain</button>
                  </form>
                </li>
              ))}
            </ul>
          ) : <p>No matching Characters.</p>) : null}
        </div>
      ) : null}
      <table>
        <thead><tr><th>Character</th><th>Domain-local alias</th><th>Controlling User</th><th>Domain membership</th><th>Departments</th><th>Roles</th>{model.canSearch ? <th>Actions</th> : null}</tr></thead>
        <tbody>
          {model.rows.map((row) => (
            <tr key={row.membershipId}>
              <td>{row.name !== 'Unknown Character' ? <a href={`/characters/${row.characterId}`}>{row.name}</a> : 'Unknown Character'}</td>
              <td>{row.localDisplayName ?? '—'}</td>
              <td>{row.controllingUserName ?? 'Unclaimed'}</td>
              <td>{row.membershipStatus === 'active' ? 'Active' : 'Inactive'}</td>
              <td>{row.departments.join(', ') || 'None'}</td>
              <td>{row.roles.join(', ') || 'None'}</td>
              {model.canSearch ? <td><form action="/api/domain-memberships" method="post"><input type="hidden" name="domainSlug" value={slug} /><input type="hidden" name="characterId" value={row.characterId} /><input type="hidden" name="action" value="remove" /><button type="submit">Remove Domain membership</button></form></td> : null}
            </tr>
          ))}
        </tbody>
      </table>
      {model.rows.length === 0 ? <p>No active Character {vocab.memberPlural.toLowerCase()} yet.</p> : null}
      <p><a href={`/domain/${slug}/departments`}>View {vocab.subdomainPlural}</a></p>
    </Sheet>
  )
}

// ---------------------------------------------------------------------------
// Departments management
// ---------------------------------------------------------------------------

export function CivicDepartments(model: DepartmentsManagementPageModel) {
  const slug = model.domainSlug
  const vocab = model.vocabulary
  return (
    <Sheet>
      <Crumb href={`/domain/${slug}/departments`} label={vocab.subdomainPlural} />
      <Heading title={`Manage ${vocab.subdomainPlural}`} description={`Create the working groups in this Domain. ${vocab.subdomainSingular} membership and ${vocab.roleSingular} assignments remain managed from each person’s workspace.`} />
      <StatusLine status={model.status} />
      <section><h2>New {vocab.subdomainSingular}</h2><form action="/api/departments" method="post"><input type="hidden" name="domainSlug" value={slug} /><label>{vocab.subdomainSingular} name <input name="name" placeholder="e.g. Hall of Coin" required autoFocus /></label> <button type="submit">Create {vocab.subdomainSingular}</button></form></section>
      <section><h2>Existing {vocab.subdomainPlural}</h2>{model.departments.length === 0 ? <p>No {vocab.subdomainPlural.toLowerCase()} yet.</p> : <ul>{model.departments.map((department) => <li key={department.id}><strong>{department.name}</strong> <code>/{department.slug}</code> <a href={`/domain/${slug}/departments/${department.slug}`}>Open</a>{department.archived ? ' (hidden)' : ''} {department.canArchive ? <form style={{ display: 'inline' }} action="/api/departments" method="post"><input type="hidden" name="domainSlug" value={slug} /><input type="hidden" name="departmentId" value={department.id} /><input type="hidden" name="action" value="archive" /><button type="submit" title="Archive this Department — its Document Types move under Unassigned until it is restored">Archive</button></form> : department.canRestore ? <form style={{ display: 'inline' }} action="/api/departments" method="post"><input type="hidden" name="domainSlug" value={slug} /><input type="hidden" name="departmentId" value={department.id} /><input type="hidden" name="action" value="restore" /><button type="submit" title="Restore this Department — its Document Types return from Unassigned to a normal root">Restore</button></form> : null}</li>)}</ul>}</section>
    </Sheet>
  )
}

// ---------------------------------------------------------------------------
// Folders management (civic-owned over the shared folder workspace hook)
// ---------------------------------------------------------------------------

type CivicFolderNode = {
  id: string
  name: string
  systemManaged: boolean
  children: CivicFolderNode[]
}

function mapFolderNodes(nodes: FolderManagementNode[]): CivicFolderNode[] {
  return nodes.map((node) => ({ id: String(node.id), name: node.name, systemManaged: Boolean(node.systemManaged), children: mapFolderNodes(node.children) }))
}

function FolderRow({ node, style, dragHandle }: NodeRendererProps<CivicFolderNode>) {
  const hasChildren = node.data.children.length > 0
  return (
    <div
      style={{ ...style, display: 'flex', alignItems: 'center', gap: '.4rem', paddingRight: '.5rem' }}
      ref={dragHandle}
      onClick={(event) => node.handleClick(event)}
      onDoubleClick={() => !node.data.systemManaged && node.edit()}
    >
      <button
        type="button"
        style={{ border: 0, background: 'none', cursor: 'pointer', padding: 0, width: 18, display: 'inline-flex', justifyContent: 'center' }}
        onClick={(event) => { event.stopPropagation(); if (hasChildren) node.toggle() }}
        aria-label={hasChildren ? `${node.isOpen ? 'Collapse' : 'Expand'} ${node.data.name}` : undefined}
        aria-hidden={!hasChildren}
        tabIndex={hasChildren ? 0 : -1}
      >
        {hasChildren && <ChevronRight size={15} />}
      </button>
      {node.isOpen && hasChildren ? <FolderOpen size={17} /> : <Folder size={17} />}
      {node.isEditing ? (
        <input
          defaultValue={node.data.name}
          aria-label={`Rename ${node.data.name}`}
          autoFocus
          onBlur={(event) => node.submit(event.currentTarget.value)}
          onKeyDown={(event) => { if (event.key === 'Enter') node.submit(event.currentTarget.value); if (event.key === 'Escape') node.reset() }}
          onClick={(event) => event.stopPropagation()}
        />
      ) : <span>{node.data.name}</span>}
      {node.data.systemManaged && <span style={{ fontSize: '.75rem', color: '#667' }}>System</span>}
    </div>
  )
}

function findFolderNode(nodes: FolderManagementNode[], id: number): FolderManagementNode | null {
  for (const node of nodes) {
    if (node.id === id) return node
    const child = findFolderNode(node.children, id)
    if (child) return child
  }
  return null
}

export function CivicFolders(model: FolderManagementPageModel) {
  const workspace = useFolderManagementWorkspace(model)
  const tree = useRef<TreeApi<CivicFolderNode> | null>(null)
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const nodes = useMemo(() => mapFolderNodes(model.nodes), [model.nodes])
  const selected = selectedId == null ? null : findFolderNode(model.nodes, selectedId)

  const openDialog = (dialog: 'create' | 'delete' | 'move') => {
    workspace.setTarget(selected)
    workspace.setDialog(dialog)
  }

  return (
    <Sheet>
      <nav aria-label="Domain management"><Link href={`/domain/${model.domainSlug}`}>Domain home</Link> · <Link href={`/domain/${model.domainSlug}/manage/folders`} aria-current="page">Folders</Link></nav>
      <Heading title="Folders" description="Arrange the archive without changing the permissions carried by document types." />
      <StatusLine status={model.status} />
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <label><Search size={16} /> <span style={{ position: 'absolute', left: -9999 }}>Search folders</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search folders" aria-label="Search folders" /></label>
        <button type="button" disabled={!model.rootManageable} onClick={() => { workspace.setTarget(null); workspace.setDialog('create') }}><Plus size={17} /> New folder</button>
      </div>
      <section aria-label="Folder manager" style={{ border: SHEET.border, borderRadius: SHEET.radius, padding: '.5rem' }}>
        <Tree<CivicFolderNode>
          ref={tree}
          data={nodes}
          idAccessor={(node) => node.id}
          childrenAccessor={(node) => node.children}
          openByDefault
          width="100%"
          height={360}
          indent={24}
          rowHeight={40}
          overscanCount={5}
          aria-label="Domain folders"
          searchTerm={query}
          searchMatch={(node, term) => node.data.name.toLowerCase().includes(term.toLowerCase())}
          disableDrag={(node) => Boolean(node.systemManaged)}
          disableDrop={({ parentNode }) => !parentNode || Boolean(parentNode.data.systemManaged)}
          onSelect={(selectedNodes) => { const id = selectedNodes[0] == null ? null : Number(selectedNodes[0].id); setSelectedId(id); workspace.setSelectedIds(id == null ? [] : [id]); workspace.setTarget(id == null ? null : findFolderNode(model.nodes, id)) }}
          onMove={({ dragIds, parentId }) => { void workspace.moveNodes(dragIds.map((id) => ({ id: Number(id), parentId: parentId == null ? null : Number(parentId) }))) }}
          onRename={({ id, name }) => { void workspace.renameFolder(Number(id), name) }}
        >
          {FolderRow}
        </Tree>
      </section>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <span>{selected ? `Selected: ${selected.name}` : 'Select a folder to inspect or manage it.'}</span>
        <span style={{ display: 'inline-flex', gap: '.4rem' }}>
          <button type="button" disabled={!selected} onClick={() => { if (selected) openDialog('create') }}>New subfolder</button>
          <button type="button" disabled={!selected || Boolean(selected.systemManaged)} onClick={() => { if (selected && !selected.systemManaged) tree.current?.get(String(selected.id))?.edit() }}>Rename</button>
          <button type="button" disabled={!selected || Boolean(selected.systemManaged)} onClick={() => { if (selected) openDialog('move') }}>Move folder</button>
          <button type="button" disabled={!selected || Boolean(selected.systemManaged)} onClick={() => { if (selected) openDialog('delete') }}>Delete folder</button>
        </span>
      </div>
      {workspace.dialog === 'create' ? (
        <Dialog title="New folder" onClose={() => workspace.setDialog(null)}>
          <form onSubmit={(event) => { event.preventDefault(); const name = String(new FormData(event.currentTarget).get('name') ?? '').trim(); if (name) void workspace.createFolder(name, workspace.target?.id ?? null); workspace.setDialog(null) }}>
            <label>Name<input name="name" required autoFocus /></label>
            <DialogActions><button type="submit">Create folder</button><button type="button" onClick={() => workspace.setDialog(null)}>Cancel</button></DialogActions>
          </form>
        </Dialog>
      ) : null}
      {workspace.dialog === 'delete' && workspace.target ? (
        <Dialog title={`Delete ${workspace.target.name}?`} onClose={() => workspace.setDialog(null)}>
          <form onSubmit={(event) => { event.preventDefault(); void workspace.deleteFolder(workspace.target!.id); workspace.setDialog(null) }}>
            <p>The folder must be empty before it can be deleted.</p>
            <DialogActions><button type="submit">Delete folder</button><button type="button" onClick={() => workspace.setDialog(null)}>Cancel</button></DialogActions>
          </form>
        </Dialog>
      ) : null}
      {workspace.dialog === 'move' && workspace.target ? (
        <Dialog title={`Move ${workspace.target.name}`} onClose={() => workspace.setDialog(null)}>
          <form onSubmit={(event) => { event.preventDefault(); const parent = new FormData(event.currentTarget).get('parentId'); void workspace.moveFolder(workspace.target!.id, parent ? Number(parent) : null); workspace.setDialog(null) }}>
            <label>Move under<select name="parentId" defaultValue=""><option value="" disabled={!workspace.canManageRoot}>Domain root</option>{workspace.moveTargets(workspace.target).map(({ node, depth }) => <option key={node.id} value={node.id}>{'· '.repeat(depth)}{node.name}</option>)}</select></label>
            <DialogActions><button type="submit">Move folder</button><button type="button" onClick={() => workspace.setDialog(null)}>Cancel</button></DialogActions>
          </form>
        </Dialog>
      ) : null}
    </Sheet>
  )
}

// ---------------------------------------------------------------------------
// Roles management (civic-owned over the shared role workspace hook)
// ---------------------------------------------------------------------------

export function CivicRoles(model: RoleManagementPageModel) {
  const workspace = useRoleManagementWorkspace(model)
  const [createOpen, setCreateOpen] = useState(false)
  const [name, setName] = useState('')
  const [departmentId, setDepartmentId] = useState(model.departments[0]?.id ?? 0)
  const departmentName = useMemo(() => new Map(model.departments.map((department) => [department.id, department.name])), [model.departments])
  const rows = model.roleRecords.map((role) => ({
    id: role.id,
    name: role.name,
    department: departmentName.get(role.departmentId) ?? 'Unassigned department',
    holders: (model.holdersByRole[String(role.id)] ?? []).length,
  }))

  const createRole = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!name.trim() || departmentId <= 0) return
    await workspace.createRole(name.trim(), null, departmentId)
    setName('')
    setCreateOpen(false)
  }

  return (
    <Sheet>
      <nav aria-label="Domain management"><Link href={`/domain/${model.domainSlug}`}>Domain home</Link> · <Link href={`/domain/${model.domainSlug}/manage/roles`} aria-current="page">Roles</Link></nav>
      <Heading title="Roles" description="Define what people can do and where they can do it." />
      <StatusLine status={model.status} />
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        {model.manageableDepartmentIds.length > 0 ? <button type="button" onClick={() => setCreateOpen(true)}><Plus size={17} /> Create role</button> : null}
      </div>
      <table>
        <thead><tr><th>Role</th><th>Department</th><th>Holders</th>{model.manageableDepartmentIds.length > 0 ? <th>Actions</th> : null}</tr></thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td><strong>{row.name}</strong></td>
              <td>{row.department}</td>
              <td>{row.holders} member{row.holders === 1 ? '' : 's'}</td>
              {model.manageableDepartmentIds.includes(model.roleRecords.find((role) => role.id === row.id)?.departmentId ?? -1) ? <td><form onSubmit={(event) => { event.preventDefault(); void workspace.deleteRole(row.id) }}><button type="submit" title="Archive role">Archive role</button></form></td> : null}
            </tr>
          ))}
        </tbody>
      </table>
      {createOpen ? (
        <Dialog title="Create role" onClose={() => setCreateOpen(false)}>
          <form onSubmit={(event) => void createRole(event)}>
            <label>Name<input value={name} onChange={(event) => setName(event.target.value)} required autoFocus /></label>
            <label>Department<select value={departmentId} onChange={(event) => setDepartmentId(Number(event.target.value))}>{model.departments.filter((department) => model.manageableDepartmentIds.includes(department.id)).map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}</select></label>
            <DialogActions><button type="submit">Create</button><button type="button" onClick={() => setCreateOpen(false)}>Cancel</button></DialogActions>
          </form>
        </Dialog>
      ) : null}
    </Sheet>
  )
}

// ---------------------------------------------------------------------------
// Document Types management (civic-owned over the shared workspace + inspector)
// ---------------------------------------------------------------------------

type CivicTypeNode = {
  id: string
  kind: TypeTreeNode['kind']
  name: string
  children: CivicTypeNode[]
  leaf?: TypeTreeLeaf
}

function mapTypeNodes(nodes: TypeTreeData['roots']): CivicTypeNode[] {
  return nodes.map((node) => ({ id: node.id, kind: node.kind, name: node.name, children: mapTypeNodes(node.children), leaf: node.leaf }))
}

function countTypeNodes(nodes: CivicTypeNode[]): number {
  return nodes.reduce((count, node) => count + (node.kind === 'type' ? 1 : 0) + countTypeNodes(node.children), 0)
}

function templateLabel(selection: TypeTreeLeaf['templateSelection']): string {
  return selection === 'markdown' ? 'Markdown' : selection === 'form' ? 'Form' : 'Blank'
}

function TypeTreeRow({ node, style, dragHandle }: NodeRendererProps<CivicTypeNode>) {
  const item = node.data
  const hasChildren = item.children.length > 0
  const isType = item.kind === 'type'
  return (
    <div
      style={{ ...style, display: 'flex', alignItems: 'center', gap: '.4rem', paddingRight: '.5rem' }}
      ref={dragHandle}
      onClick={(event) => node.handleClick(event)}
      onDoubleClick={() => !isType && item.kind !== 'unassigned' && node.toggle()}
    >
      <button
        type="button"
        style={{ border: 0, background: 'none', cursor: 'pointer', padding: 0, width: 18, display: 'inline-flex', justifyContent: 'center' }}
        onClick={(event) => { event.stopPropagation(); if (hasChildren) node.toggle() }}
        aria-label={hasChildren ? `${node.isOpen ? 'Collapse' : 'Expand'} ${item.name}` : undefined}
        aria-hidden={!hasChildren}
        tabIndex={hasChildren ? 0 : -1}
      >
        {hasChildren && <ChevronRight size={15} />}
      </button>
      {isType ? <FileText size={16} /> : <Folder size={16} />}
      <span>{item.name}</span>
      {item.kind === 'department' && <span style={{ fontSize: '.75rem', color: '#667' }}>Department root</span>}
      {item.kind === 'unassigned' && <span style={{ fontSize: '.75rem', color: '#667' }}>Orphaned types</span>}
      {isType ? <><span style={{ fontSize: '.75rem', color: '#445' }}>{item.leaf ? templateLabel(item.leaf.templateSelection) : ''}</span><span style={{ fontSize: '.75rem', color: '#889' }}>{item.leaf?.templateName ?? 'No template yet'}</span></> : null}
    </div>
  )
}

export function CivicDocumentTypes(model: DocumentTypesManagementPageModel) {
  const router = useRouter()
  const workspace = useDocumentTypesManagementWorkspace(model)
  const tree = useRef<TreeApi<CivicTypeNode> | null>(null)
  const [query, setQuery] = useState('')
  const [editOpen, setEditOpen] = useState(false)
  const nodes = useMemo(() => mapTypeNodes(model.tree.roots), [model.tree.roots])
  const visibleTypes = countTypeNodes(nodes)
  const selected = workspace.selectedLeaf

  const refreshAfter = async (operation: Promise<{ ok: boolean }>) => {
    await operation
    router.refresh()
  }

  return (
    <Sheet>
      <nav aria-label="Document Types"><Link href={`/domain/${model.domainSlug}/document-types`} aria-current="page" title="Document Types are the first-order item; Templates and Forms hang off them">Document Types</Link> · <Link href={`/domain/${model.domainSlug}/templates`} title="Standalone Markdown templates">Templates</Link> · <Link href={`/domain/${model.domainSlug}/forms`} title="Standalone form templates">Forms</Link></nav>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <Heading title="Document Types" description="Document Types are the first-order item, organized by Department. Templates and Forms hang off each Type." />
        {model.canManage ? <button type="button" onClick={() => { workspace.beginCreate(); setEditOpen(true) }}><Plus size={17} /> New document type</button> : null}
      </div>
      <StatusLine status={model.status} />
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
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 320px', gap: '1rem', alignItems: 'start' }}>
          <section aria-label="Document type browser" style={{ border: SHEET.border, borderRadius: SHEET.radius, padding: '.5rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '.4rem', marginBottom: '.4rem' }}><Search size={16} /><span style={{ position: 'absolute', left: -9999 }}>Search document types</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search types and folders" aria-label="Search document types" /></label>
            <Tree<CivicTypeNode>
              ref={tree}
              data={nodes}
              idAccessor={(node) => node.id}
              childrenAccessor={(node) => node.children}
              openByDefault
              width="100%"
              height={380}
              indent={24}
              rowHeight={40}
              searchTerm={query}
              searchMatch={(node, term) => node.data.name.toLowerCase().includes(term.toLowerCase())}
              disableDrag={(node) => node.kind === 'department' || node.kind === 'unassigned'}
              disableDrop={({ parentNode }) => !parentNode || parentNode.data.kind === 'unassigned' || parentNode.data.kind === 'type'}
              onSelect={(selectedNodes) => { const type = selectedNodes.find((node) => node.data.kind === 'type')?.data.leaf; workspace.selectType(type?.id ?? null); setEditOpen(false) }}
            >
              {TypeTreeRow}
            </Tree>
            <p style={{ fontSize: '.8rem', color: '#667' }}>{visibleTypes} visible document types</p>
          </section>
          <aside aria-label="Document type inspector" style={{ border: SHEET.border, borderRadius: SHEET.radius, padding: '1rem', display: 'grid', gap: '.6rem' }}>
            {selected ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '.5rem', alignItems: 'center' }}>
                  <span style={{ fontSize: '.75rem', color: '#445' }}>{templateLabel(selected.templateSelection)}</span>
                  <button type="button" aria-label={`Actions for ${selected.name}`} onClick={() => setEditOpen(true)}><MoreHorizontal size={19} /></button>
                </div>
                <h2 style={{ margin: 0 }}>{selected.name}</h2>
                <p style={{ margin: 0 }}>{selected.description ?? 'A document type ready for configuration.'}</p>
                <dl style={{ margin: 0, display: 'grid', gap: '.3rem' }}>
                  <div><dt style={{ fontWeight: 600 }}>Creation method</dt><dd style={{ margin: 0 }}>{templateLabel(selected.templateSelection)} {selected.templateSelection === 'blank' ? 'document' : 'template'}</dd></div>
                  <div><dt style={{ fontWeight: 600 }}>Attached template</dt><dd style={{ margin: 0 }}>{selected.templateName ?? 'No template yet'}</dd></div>
                  <div><dt style={{ fontWeight: 600 }}>Lifecycle</dt><dd style={{ margin: 0 }}>Draft → Submitted → Filed</dd></div>
                </dl>
                {model.canManage ? <div style={{ display: 'flex', gap: '.4rem', flexWrap: 'wrap' }}>
                  <button type="button" onClick={() => setEditOpen(true)}><ShieldCheck size={15} /> Configure type</button>
                  <button type="button" onClick={() => void refreshAfter(duplicateTypeAction({ domainSlug: model.domainSlug, typeId: selected.id }))}><Copy size={14} /> Duplicate</button>
                  <button type="button" onClick={() => void refreshAfter(setActiveTypeAction({ domainSlug: model.domainSlug, typeId: selected.id, active: !selected.active }))}>{selected.active ? 'Deactivate' : 'Activate'}</button>
                </div> : null}
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '1rem 0' }}><FileText size={25} /><h2>Choose a document type</h2><p>Select a line in the tree to inspect its template and lifecycle configuration.</p></div>
            )}
          </aside>
        </div>
      )}
    </Sheet>
  )
}

// ---------------------------------------------------------------------------
// People search (civic-owned over the shared people workspace hook)
// ---------------------------------------------------------------------------

export function CivicPeople(model: PeopleManagementPageModel) {
  const workspace = usePeopleManagementWorkspace(model.domainSlug)
  if (!model.canOpenPeople) {
    return <Sheet><Heading title="People" description="Find a Character, then manage their Department Roles and Folder access in one workspace." /><p role="alert">You do not have access to this workspace.</p></Sheet>
  }
  return (
    <Sheet>
      <Crumb href={`/domain/${model.domainSlug}`} label={model.domainName} />
      <Heading title="People" description="Find a Character, then manage their Department Roles and Folder access in one workspace." />
      <StatusLine status={model.status} />
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}><a href={`/domain/${model.domainSlug}/departments`}>View Departments</a></div>
      <div>
        <label style={{ display: 'grid', gap: '.3rem' }}>
          <span style={{ fontSize: '.8rem', fontWeight: 600 }}>Search people</span>
          <input
            ref={workspace.inputRef}
            value={workspace.query}
            onChange={workspace.handleQueryChange}
            onKeyDown={workspace.handleKeyDown}
            aria-label="Search people"
            placeholder="Search name or alias"
            aria-autocomplete="list"
            aria-controls="civic-people-results"
            aria-activedescendant={workspace.activeIndex !== null && workspace.results[workspace.activeIndex] ? peopleSearchOptionId(workspace.results[workspace.activeIndex].id) : undefined}
          />
        </label>
        {workspace.listOpen ? (
          workspace.loading ? <p>Searching…</p> : (
            <ul id="civic-people-results" role="listbox" aria-label="People search results" style={{ display: 'grid', gap: '.3rem', listStyle: 'none', padding: 0 }}>
              {workspace.results.length === 0 ? <li>No people match “{workspace.query}”.</li> : workspace.results.map((person, index) => (
                <li key={person.id} id={peopleSearchOptionId(person.id)} role="option" aria-selected={workspace.activeIndex === index} style={{ display: 'flex', justifyContent: 'space-between', gap: '.5rem', padding: '.5rem', border: SHEET.border, borderRadius: SHEET.radius }}>
                  <span><strong>{person.localName || person.name}</strong>{person.controllerName ? <span style={{ color: '#667' }}> · User: {person.controllerName}</span> : <span style={{ color: '#667' }}> · Unclaimed Character</span>}</span>
                  <a href={`/domain/${model.domainSlug}/manage/people/${person.id}`}>Open person</a>
                </li>
              ))}
            </ul>
          )
        ) : <p style={{ color: '#667' }}>Search results appear as you type. Choose a Character to open their workspace; Roles and Folder access are separate controls.</p>}
      </div>
    </Sheet>
  )
}

// ---------------------------------------------------------------------------
// Person workspace (civic-owned; RoleTree/FolderTree from the mirrored seam)
// ---------------------------------------------------------------------------

export function CivicPerson(model: PersonManagementPageModel) {
  const displayName = model.localDisplayName || model.character.name
  return (
    <Sheet>
      <Crumb href={`/domain/${model.domainSlug}/manage/people`} label="People" />
      <header style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ margin: 0 }}>{displayName}</h1>
          <p style={{ margin: 0 }}>{model.controller?.name || model.controller?.email || 'Unclaimed Character'}</p>
        </div>
        {model.canManageMembers ? <form action="/api/domain-memberships" method="post"><input type="hidden" name="domainSlug" value={model.domainSlug} /><input type="hidden" name="characterId" value={model.character.id} /><input type="hidden" name="action" value="remove" /><button type="submit">Remove from Domain</button></form> : null}
      </header>
      <StatusLine status={model.status} />
      <section aria-labelledby="civic-person-roles"><h2 id="civic-person-roles">Department Roles</h2><RoleTree domainSlug={model.domainSlug} characterId={model.character.id} departments={model.roleDepartments} initialMode={model.roleFilter} /></section>
      <section aria-labelledby="civic-person-types">
        <div><h2 id="civic-person-types">Record Type access</h2><p>Effective access for {displayName}, from Type grants and any Folder restrictions.</p></div>
        {model.typeAccess.length === 0 ? <p>No active Document Types in this Domain.</p> : <table><thead><tr><th>Document Type</th><th>Read</th><th>Create</th><th>Edit</th><th>Source</th></tr></thead><tbody>{model.typeAccess.map((type) => <tr key={type.id}><td>{type.name}</td><td>{type.read.allowed ? 'Allowed' : 'Denied'}</td><td>{type.create.allowed ? 'Allowed' : 'Denied'}</td><td>{type.edit.allowed ? 'Allowed' : 'Denied'}</td><td>{type.read.source}</td></tr>)}</tbody></table>}
      </section>
      <section aria-labelledby="civic-person-folders"><h2 id="civic-person-folders">Folder access</h2><FolderTree domainSlug={model.domainSlug} characterId={model.character.id} folders={model.folderNodes} /></section>
      <section><h2>Recent Work</h2><p>Recent work will appear here when the activity feed is connected.</p></section>
    </Sheet>
  )
}

// ---------------------------------------------------------------------------
// Invitations management (civic-owned; action bridge + seam endpoints)
// ---------------------------------------------------------------------------

export function CivicInvitations(model: InvitationsManagementPageModel) {
  const router = useRouter()
  const [purpose, setPurpose] = useState<'domain_join' | 'character_claim'>('domain_join')
  const [issueState, issueAction] = useActionState<IssueInvitationState, FormData>(issueInvitationAction, { ok: false })
  const post = async (path: string, fields: Record<string, string>) => {
    const body = new FormData()
    Object.entries(fields).forEach(([key, value]) => body.set(key, value))
    await fetch(path, { method: 'POST', body })
    router.refresh()
  }
  return (
    <Sheet>
      <nav aria-label="Domain management"><Link href={`/domain/${model.domainSlug}`}>Domain home</Link> · <Link href={`/domain/${model.domainSlug}/manage/people`}>People</Link> · <Link href={`/domain/${model.domainSlug}/manage/invitations`} aria-current="page">Invitations</Link></nav>
      <Heading title="Invitations" description="Share secure links with people you want to welcome. Loreforge does not send email." />
      <StatusLine status={model.status} />
      {model.canManage ? (
        <form action={issueAction} style={{ display: 'grid', gap: '.6rem', maxWidth: 560, padding: '1rem', border: SHEET.border, borderRadius: SHEET.radius }}>
          <label>Purpose<select value={purpose} onChange={(event) => setPurpose(event.target.value as typeof purpose)}>{[{ value: 'domain_join', label: 'Domain join' }, { value: 'character_claim', label: 'Claim character' }].map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
          <input type="hidden" name="purpose" value={purpose} />
          <input type="hidden" name="domainId" value={model.domainId} />
          <input type="hidden" name="tenantSlug" value={model.domainSlug} />
          {purpose === 'character_claim' ? (
            <label>Character<select name="characterId" required defaultValue=""><option value="">Choose character</option>{model.claimTargets.map((target) => <option key={target.id} value={target.id}>{target.name}</option>)}</select></label>
          ) : (
            <label>Maximum uses<input name="maxUses" type="number" min="2" placeholder="Unlimited uses" /></label>
          )}
          <button type="submit"><Plus size={16} /> Send invitation</button>
          {issueState.ok && issueState.link ? <p role="status">Invitation created: <a href={issueState.link}>{issueState.link}</a></p> : null}
          {!issueState.ok && issueState.error ? <p role="alert">That invitation could not be created.</p> : null}
        </form>
      ) : null}
      <section aria-label="Pending requests">
        <h2>Pending Domain join requests</h2>
        {model.pendingJoins.length === 0 ? <p>No pending join requests.</p> : <ul style={{ display: 'grid', gap: '.55rem', listStyle: 'none', padding: 0 }}>{model.pendingJoins.map((request) => <li key={request.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '.75rem', flexWrap: 'wrap', padding: '.8rem', border: SHEET.border }}><span><strong>{request.applicantLabel}</strong> · {request.characterLabel}</span><span style={{ display: 'inline-flex', gap: '.4rem' }}><form action="/api/invitations/join-decision" method="post"><input type="hidden" name="requestId" value={request.id} /><input type="hidden" name="tenantSlug" value={model.domainSlug} /><input type="hidden" name="decision" value="approved" /><button type="submit">Approve</button></form><form action="/api/invitations/join-decision" method="post"><input type="hidden" name="requestId" value={request.id} /><input type="hidden" name="tenantSlug" value={model.domainSlug} /><input type="hidden" name="decision" value="rejected" /><button type="submit">Reject</button></form></span></li>)}</ul>}
        <h2>Pending Character claims</h2>
        {model.pendingClaims.length === 0 ? <p>No pending character claims.</p> : <ul style={{ display: 'grid', gap: '.55rem', listStyle: 'none', padding: 0 }}>{model.pendingClaims.map((request) => <li key={request.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '.75rem', flexWrap: 'wrap', padding: '.8rem', border: SHEET.border }}><span><strong>{request.characterLabel}</strong> ← {request.claimantLabel}</span><span style={{ display: 'inline-flex', gap: '.4rem' }}><form action="/api/character-claims" method="post"><input type="hidden" name="claimId" value={request.id} /><input type="hidden" name="tenantSlug" value={model.domainSlug} /><input type="hidden" name="decision" value="approved" /><button type="submit">Approve</button></form><form action="/api/character-claims" method="post"><input type="hidden" name="claimId" value={request.id} /><input type="hidden" name="tenantSlug" value={model.domainSlug} /><input type="hidden" name="decision" value="rejected" /><button type="submit">Reject</button></form></span></li>)}</ul>}
      </section>
      <section aria-label="Issued links">
        <h2>Issued links</h2>
        {model.invitations.length === 0 ? <p>No invitation links yet.</p> : <div style={{ overflowX: 'auto' }}><table><thead><tr><th>Purpose</th><th>Target</th><th>Issued</th><th>Expires</th><th>Uses</th><th>State</th><th /></tr></thead><tbody>{model.invitations.map((invitation) => <tr key={invitation.id}><td>{invitation.purpose}</td><td>{invitation.targetLabel}</td><td>{invitation.issuedByLabel ?? '—'}</td><td>{invitation.expiresLabel}</td><td>{invitation.useLabel}</td><td>{invitation.statusLabel}</td><td>{invitation.canRevoke ? <form action="/api/invitations/revoke" method="post"><input type="hidden" name="invitationId" value={invitation.id} /><input type="hidden" name="tenantSlug" value={model.domainSlug} /><button type="submit">Revoke</button></form> : null}</td></tr>)}</tbody></table></div>}
      </section>
    </Sheet>
  )
}

// ---------------------------------------------------------------------------
// Shared presentational helpers (civic-owned)
// ---------------------------------------------------------------------------

function Dialog({ title, onClose, children }: { title: string; onClose(): void; children: React.ReactNode }) {
  return (
    <div role="dialog" aria-modal="true" aria-label={title} style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,.35)', zIndex: 50, padding: '1rem' }}>
      <div style={{ background: '#fff', border: '1px solid #ccc', borderRadius: 8, padding: '1rem', width: 'min(420px, 100%)', display: 'grid', gap: '.8rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '.75rem' }}><h2 style={{ margin: 0 }}>{title}</h2><button type="button" aria-label="Close dialog" onClick={onClose}>×</button></div>
        {children}
      </div>
    </div>
  )
}

function DialogActions({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'flex', gap: '.4rem', justifyContent: 'flex-end' }}>{children}</div>
}
