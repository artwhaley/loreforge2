'use client'

import { useMemo, useState } from 'react'

import styles from './PersonAccessTrees.module.scss'

export type RoleTreeNode = {
  id: number
  name: string
  held: boolean
  children: RoleTreeNode[]
}

export type RoleDepartment = {
  id: number
  name: string
  roles: RoleTreeNode[]
}

export type FolderTreeNode = {
  id: number
  name: string
  systemManaged: boolean
  readState: PermissionState
  writeState: PermissionState
  children: FolderTreeNode[]
}

export type PermissionState = 'inherit' | 'grant' | 'deny'
type RoleMode = 'all' | 'held'

type RoleTreeProps = {
  domainSlug: string
  characterId: number
  departments: RoleDepartment[]
  initialMode?: RoleMode
}

type FolderTreeProps = {
  domainSlug: string
  characterId: number
  folders: FolderTreeNode[]
}

function roleMatches(node: RoleTreeNode, query: string, mode: RoleMode): RoleTreeNode | null {
  const children = node.children
    .map((child) => roleMatches(child, query, mode))
    .filter((child): child is RoleTreeNode => child !== null)
  const ownMatch = (!query || node.name.toLocaleLowerCase().includes(query)) && (mode === 'all' || node.held)
  if (ownMatch || children.length > 0) return { ...node, children }
  return null
}

function filterDepartment(department: RoleDepartment, query: string, mode: RoleMode): RoleDepartment | null {
  const departmentMatches = Boolean(query) && department.name.toLocaleLowerCase().includes(query)
  const roles = department.roles
    .map((role) => roleMatches(role, departmentMatches ? '' : query, mode))
    .filter((role): role is RoleTreeNode => role !== null)
  return roles.length > 0 ? { ...department, roles } : null
}

function countRoles(nodes: RoleTreeNode[]): { total: number; held: number } {
  return nodes.reduce((result, node) => {
    const childCount = countRoles(node.children)
    return { total: result.total + 1 + childCount.total, held: result.held + (node.held ? 1 : 0) + childCount.held }
  }, { total: 0, held: 0 })
}

function RoleNode({ node, domainSlug, characterId, expanded, toggle }: { node: RoleTreeNode; domainSlug: string; characterId: number; expanded: Set<string>; toggle: (key: string) => void }) {
  const key = `role-${node.id}`
  const hasChildren = node.children.length > 0
  const isOpen = expanded.has(key)
  return <li className={styles.treeItem} role="treeitem" aria-expanded={hasChildren ? isOpen : undefined}>
    <div className={styles.treeRow}>
      {hasChildren ? <button type="button" className={styles.disclosure} aria-label={`${isOpen ? 'Collapse' : 'Expand'} ${node.name}`} aria-expanded={isOpen} onClick={() => toggle(key)}>{isOpen ? '⌄' : '›'}</button> : <span className={styles.disclosureSpacer} aria-hidden="true" />}
      <span className={styles.roleBranch} aria-hidden="true" />
      <span className={styles.roleAssignment}><RoleAssignmentToggle domainSlug={domainSlug} characterId={characterId} roleId={node.id} checked={node.held} label={node.name} /></span>
    </div>
    {hasChildren && isOpen ? <ul className={styles.nestedTree} role="group">{node.children.map((child) => <RoleNode key={child.id} node={child} domainSlug={domainSlug} characterId={characterId} expanded={expanded} toggle={toggle} />)}</ul> : null}
  </li>
}

function RoleAssignmentToggle({ domainSlug, characterId, roleId, checked, label }: { domainSlug: string; characterId: number; roleId: number; checked: boolean; label: string }) {
  return <form action="/api/role-assignments" method="post" className={styles.assignmentForm}>
    <input type="hidden" name="domainSlug" value={domainSlug} />
    <input type="hidden" name="characterId" value={characterId} />
    <input type="hidden" name="roleId" value={roleId} />
    <input type="hidden" name="action" value={checked ? 'remove' : 'add'} />
    <label className={styles.checkLabel}><input type="checkbox" defaultChecked={checked} onChange={(event) => event.currentTarget.form?.requestSubmit()} /><span>{label}</span></label>
  </form>
}

export function RoleTree({ domainSlug, characterId, departments, initialMode = 'all' }: RoleTreeProps) {
  const [query, setQuery] = useState('')
  const [mode, setMode] = useState<RoleMode>(initialMode)
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(departments.map((department) => `department-${department.id}`)))
  const normalizedQuery = query.trim().toLocaleLowerCase()
  const visibleDepartments = useMemo(() => departments.map((department) => filterDepartment(department, normalizedQuery, mode)).filter((department): department is RoleDepartment => department !== null), [departments, mode, normalizedQuery])
  const displayedCount = visibleDepartments.reduce((result, department) => {
    const count = countRoles(department.roles)
    return { total: result.total + count.total, held: result.held + count.held }
  }, { total: 0, held: 0 })
  const toggle = (key: string) => setExpanded((current) => {
    const next = new Set(current)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    return next
  })
  return <section className={styles.panel} aria-labelledby="roles-heading">
    <div className={styles.panelHeader}><div><h2 id="roles-heading">Roles</h2><p className={styles.panelMeta}>{displayedCount.held} held · {displayedCount.total} shown</p></div><div className={styles.modeTabs} role="group" aria-label="Role filter"><button type="button" className={mode === 'all' ? styles.modeActive : styles.modeButton} onClick={() => setMode('all')}>All roles</button><button type="button" className={mode === 'held' ? styles.modeActive : styles.modeButton} onClick={() => setMode('held')}>Held only</button></div></div>
    <div className={styles.searchBar}><span className={styles.searchIcon} aria-hidden="true">⌕</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search roles or departments" aria-label="Search roles or departments" /></div>
    <div className={styles.treeBox} role="tree" aria-label="Department roles">
      {visibleDepartments.map((department) => { const key = `department-${department.id}`; const isOpen = expanded.has(key); const count = countRoles(department.roles); return <div key={department.id} className={styles.departmentGroup}>
        <button type="button" className={styles.departmentHeader} aria-expanded={isOpen} onClick={() => toggle(key)}><span className={styles.chevron}>{isOpen ? '⌄' : '›'}</span><span className={styles.departmentName}>{department.name}</span><span className={styles.countBadge}>{count.held}/{count.total}</span></button>
        {isOpen ? <ul className={styles.roleTree} role="group">{department.roles.map((role) => <RoleNode key={role.id} node={role} domainSlug={domainSlug} characterId={characterId} expanded={expanded} toggle={toggle} />)}</ul> : null}
      </div> })}
      {visibleDepartments.length === 0 ? <p className={styles.emptyState}>No roles match your search.</p> : null}
    </div>
  </section>
}

function folderMatches(node: FolderTreeNode, query: string): FolderTreeNode | null {
  const children = node.children.map((child) => folderMatches(child, query)).filter((child): child is FolderTreeNode => child !== null)
  const ownMatch = !query || node.name.toLocaleLowerCase().includes(query)
  if (ownMatch || children.length > 0) return { ...node, children }
  return null
}

function PermissionCheckbox({ label, state, onChange }: { label: string; state: PermissionState; onChange: (next: PermissionState) => void }) {
  const checked = state !== 'deny'
  return <label className={`${styles.permission} ${state === 'inherit' ? styles.permissionInherited : ''}`} title={state === 'inherit' ? `${label} is inherited. Click to set an explicit Deny; click again for Allow.` : `${label}: ${state === 'grant' ? 'Allowed' : 'Denied'}`}>
    <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked ? 'grant' : 'deny')} />
    <span className={styles.permissionName}>{label}</span>
    <span className={styles.permissionState}>{state === 'inherit' ? 'Inherited' : state === 'grant' ? 'Allow' : 'Deny'}</span>
  </label>
}

function FolderNode({ node, domainSlug, characterId, expanded, toggle }: { node: FolderTreeNode; domainSlug: string; characterId: number; expanded: Set<string>; toggle: (key: string) => void }) {
  const key = `folder-${node.id}`
  const hasChildren = node.children.length > 0
  const isOpen = expanded.has(key)
  const [readState, setReadState] = useState<PermissionState>(node.readState)
  const [writeState, setWriteState] = useState<PermissionState>(node.writeState)
  return <li className={styles.folderItem} role="treeitem" aria-expanded={hasChildren ? isOpen : undefined}>
    <form action="/api/permission-rules" method="post" className={styles.folderRow}>
      <input type="hidden" name="domainSlug" value={domainSlug} /><input type="hidden" name="characterId" value={characterId} /><input type="hidden" name="folderId" value={node.id} /><input type="hidden" name="readState" value={readState} /><input type="hidden" name="writeState" value={writeState} />
      <div className={styles.folderIdentity}>{hasChildren ? <button type="button" className={styles.disclosure} aria-label={`${isOpen ? 'Collapse' : 'Expand'} ${node.name}`} aria-expanded={isOpen} onClick={() => toggle(key)}>{isOpen ? '⌄' : '›'}</button> : <span className={styles.disclosureSpacer} aria-hidden="true" />}<span className={styles.folderIcon} aria-hidden="true">{node.systemManaged ? '⌂' : '▱'}</span><span className={styles.folderName}>{node.name}</span></div>
      <div className={styles.permissionSet}><PermissionCheckbox label="Read" state={readState} onChange={setReadState} /><PermissionCheckbox label="Write" state={writeState} onChange={setWriteState} /></div>
      <button type="submit" className={styles.saveButton}>Save</button>
    </form>
    {hasChildren && isOpen ? <ul className={styles.folderTree} role="group">{node.children.map((child) => <FolderNode key={child.id} node={child} domainSlug={domainSlug} characterId={characterId} expanded={expanded} toggle={toggle} />)}</ul> : null}
  </li>
}

export function FolderTree({ domainSlug, characterId, folders }: FolderTreeProps) {
  const [query, setQuery] = useState('')
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(folders.map((folder) => `folder-${folder.id}`)))
  const normalizedQuery = query.trim().toLocaleLowerCase()
  const visibleFolders = useMemo(() => folders.map((folder) => folderMatches(folder, normalizedQuery)).filter((folder): folder is FolderTreeNode => folder !== null), [folders, normalizedQuery])
  const toggle = (key: string) => setExpanded((current) => {
    const next = new Set(current)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    return next
  })
  return <section className={styles.panel} aria-labelledby="folder-access-heading">
    <div className={styles.panelHeader}><div><h2 id="folder-access-heading">Folder access</h2><p className={styles.panelMeta}>Direct access for this Character</p></div><span className={styles.legend}><span className={styles.legendSwatch} /> inherited</span></div>
    <div className={styles.searchBar}><span className={styles.searchIcon} aria-hidden="true">⌕</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search folders" aria-label="Search folders" /></div>
    <div className={styles.treeBox} role="tree" aria-label="Folder access">
      {visibleFolders.map((folder) => <ul key={folder.id} className={styles.folderTree} role="group"><FolderNode node={folder} domainSlug={domainSlug} characterId={characterId} expanded={expanded} toggle={toggle} /></ul>)}
      {visibleFolders.length === 0 ? <p className={styles.emptyState}>No folders match your search.</p> : null}
    </div>
  </section>
}
