'use client'

import { useEffect, useId, useMemo, useState } from 'react'

import { filterRoleTree, roleMatchesMode, ROLE_MODE_LABELS, ROLE_MODES, type RoleMode } from '@/lib/people/roleFilters'

import styles from './PersonAccessTrees.module.scss'

export type RoleTreeNode = {
  id: number
  name: string
  held: boolean
  /** Whether the viewing actor may assign this Role under interim rules (P05R-T03 B). */
  assignable?: boolean
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

type RoleTreeProps = {
  domainSlug: string
  characterId: number
  departments: RoleDepartment[]
  initialMode?: RoleMode
  showModeFilter?: boolean
  showAssignmentCheckbox?: boolean
  selectedRoleId?: number | null
  onSelectRole?: (node: RoleTreeNode, department: RoleDepartment) => void
  onContextRole?: (event: React.MouseEvent, node: RoleTreeNode, department: RoleDepartment) => void
}

type FolderTreeProps = {
  domainSlug: string
  characterId?: number
  principalType?: 'Character' | 'Role'
  principalId?: number
  folders: FolderTreeNode[]
  heading?: string
  description?: string
}

function roleMatches(node: RoleTreeNode, query: string, mode: RoleMode): RoleTreeNode | null {
  return filterRoleTree(node, (candidate) => (!query || candidate.name.toLocaleLowerCase().includes(query)) && roleMatchesMode(candidate, mode))
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

function RoleNode({ node, department, domainSlug, characterId, expanded, toggle, showAssignmentCheckbox, selectedRoleId, onSelectRole, onContextRole }: { node: RoleTreeNode; department: RoleDepartment; domainSlug: string; characterId: number; expanded: Set<string>; toggle: (key: string) => void; showAssignmentCheckbox: boolean; selectedRoleId?: number | null; onSelectRole?: (node: RoleTreeNode, department: RoleDepartment) => void; onContextRole?: (event: React.MouseEvent, node: RoleTreeNode, department: RoleDepartment) => void }) {
  const key = `role-${node.id}`
  const hasChildren = node.children.length > 0
  const isOpen = expanded.has(key)
  const selected = selectedRoleId === node.id
  return <li className={styles.treeItem} role="treeitem" aria-expanded={hasChildren ? isOpen : undefined} aria-selected={onSelectRole ? selected : undefined}>
    <div className={`${styles.treeRow} ${selected ? styles.treeRowSelected : ''}`} onClick={() => onSelectRole?.(node, department)} onContextMenu={(event) => onContextRole?.(event, node, department)}>
      {hasChildren ? <button type="button" className={styles.disclosure} aria-label={`${isOpen ? 'Collapse' : 'Expand'} ${node.name}`} aria-expanded={isOpen} onClick={(event) => { event.stopPropagation(); toggle(key) }}>{isOpen ? '⌄' : '›'}</button> : <span className={styles.disclosureSpacer} aria-hidden="true" />}
      <span className={styles.roleBranch} aria-hidden="true" />
      <span className={styles.roleAssignment}>{showAssignmentCheckbox ? <RoleAssignmentToggle domainSlug={domainSlug} characterId={characterId} roleId={node.id} checked={node.held} label={node.name} /> : <button type="button" className={styles.roleSelectButton} onClick={(event) => { event.stopPropagation(); onSelectRole?.(node, department) }} onContextMenu={(event) => { event.stopPropagation(); onContextRole?.(event, node, department) }}>{node.name}</button>}</span>
    </div>
    {hasChildren && isOpen ? <ul className={styles.nestedTree} role="group">{node.children.map((child) => <RoleNode key={child.id} node={child} department={department} domainSlug={domainSlug} characterId={characterId} expanded={expanded} toggle={toggle} showAssignmentCheckbox={showAssignmentCheckbox} selectedRoleId={selectedRoleId} onSelectRole={onSelectRole} onContextRole={onContextRole} />)}</ul> : null}
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

export function RoleTree({ domainSlug, characterId, departments, initialMode = 'assignable', showModeFilter = true, showAssignmentCheckbox = true, selectedRoleId, onSelectRole, onContextRole }: RoleTreeProps) {
  const [query, setQuery] = useState('')
  const [mode, setMode] = useState<RoleMode>(initialMode)
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(departments.map((department) => `department-${department.id}`)))
  const normalizedQuery = query.trim().toLocaleLowerCase()
  const visibleDepartments = useMemo(() => departments.map((department) => filterDepartment(department, normalizedQuery, mode)).filter((department): department is RoleDepartment => department !== null), [departments, mode, normalizedQuery])
  useEffect(() => {
    if (mode !== 'held' && !normalizedQuery) return
    setExpanded((current) => {
      const next = new Set(current)
      for (const department of visibleDepartments) {
        next.add(`department-${department.id}`)
        const openBranch = (node: RoleTreeNode) => {
          if (node.children.length > 0) {
            next.add(`role-${node.id}`)
            node.children.forEach(openBranch)
          }
        }
        department.roles.forEach(openBranch)
      }
      return next
    })
  }, [mode, normalizedQuery, visibleDepartments])
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
    <div className={styles.panelHeader}><div><h2 id="roles-heading">Roles</h2><p className={styles.panelMeta}>{displayedCount.held} held · {displayedCount.total} shown</p></div>{showModeFilter ? <div className={styles.modeTabs} role="group" aria-label="Role filter">{ROLE_MODES.map((candidate) => <button key={candidate} type="button" className={mode === candidate ? styles.modeActive : styles.modeButton} onClick={() => setMode(candidate)}>{ROLE_MODE_LABELS[candidate]}</button>)}</div> : null}</div>
    <div className={styles.searchBar}><span className={styles.searchIcon} aria-hidden="true">⌕</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search roles or departments" aria-label="Search roles or departments" /></div>
    <div className={styles.treeBox} role="tree" aria-label="Department roles">
      {visibleDepartments.map((department) => { const key = `department-${department.id}`; const isOpen = expanded.has(key); const count = countRoles(department.roles); return <div key={department.id} className={styles.departmentGroup}>
        <button type="button" className={styles.departmentHeader} aria-expanded={isOpen} onClick={() => toggle(key)}><span className={styles.chevron}>{isOpen ? '⌄' : '›'}</span><span className={styles.departmentName}>{department.name}</span><span className={styles.countBadge}>{count.held}/{count.total}</span></button>
        {isOpen ? <ul className={styles.roleTree} role="group">{department.roles.map((role) => <RoleNode key={role.id} node={role} department={department} domainSlug={domainSlug} characterId={characterId} expanded={expanded} toggle={toggle} showAssignmentCheckbox={showAssignmentCheckbox} selectedRoleId={selectedRoleId} onSelectRole={onSelectRole} onContextRole={onContextRole} />)}</ul> : null}
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

/**
 * P05R-T03 A: a real three-state control per access axis (Inherited | Allow |
 * Deny), so a mistaken Deny is never a one-way ratchet — Inherited deletes the
 * direct rules on save. Each axis is its own radiogroup; mouse and keyboard
 * both select exactly one state.
 */
function PermissionAxis({ label, state, onChange }: { label: string; state: PermissionState; onChange: (next: PermissionState) => void }) {
  const name = useId()
  const options: Array<{ value: PermissionState; text: string }> = [
    { value: 'inherit', text: 'Inherited' },
    { value: 'grant', text: 'Allow' },
    { value: 'deny', text: 'Deny' },
  ]
  return <div className={styles.permissionAxis} role="radiogroup" aria-label={`${label} access`}>
    <span className={styles.permissionName}>{label}</span>
    <span className={styles.permissionOptions}>{options.map((option) => <label key={option.value} className={`${styles.permissionOption} ${state === option.value ? styles.permissionOptionActive : ''}`} title={option.value === 'inherit' ? `${label} is inherited (no direct rule).` : option.value === 'grant' ? `${label} explicitly allowed here.` : `${label} explicitly denied here.`}>
      <input type="radio" name={name} value={option.value} checked={state === option.value} onChange={() => onChange(option.value)} />
      <span>{option.text}</span>
    </label>)}</span>
  </div>
}

function FolderNode({ node, domainSlug, principalType, principalId, expanded, toggle }: { node: FolderTreeNode; domainSlug: string; principalType: 'Character' | 'Role'; principalId: number; expanded: Set<string>; toggle: (key: string) => void }) {
  const key = `${principalType.toLowerCase()}-folder-${node.id}`
  const hasChildren = node.children.length > 0
  const isOpen = expanded.has(key)
  const [readState, setReadState] = useState<PermissionState>(node.readState)
  const [writeState, setWriteState] = useState<PermissionState>(node.writeState)
  return <li className={styles.folderItem} role="treeitem" aria-expanded={hasChildren ? isOpen : undefined}>
    <form action="/api/permission-rules" method="post" className={styles.folderRow}>
      <input type="hidden" name="domainSlug" value={domainSlug} /><input type="hidden" name={principalType === 'Role' ? 'roleId' : 'characterId'} value={principalId} /><input type="hidden" name="principalType" value={principalType} /><input type="hidden" name="folderId" value={node.id} /><input type="hidden" name="readState" value={readState} /><input type="hidden" name="writeState" value={writeState} />
      <div className={styles.folderIdentity}>{hasChildren ? <button type="button" className={styles.disclosure} aria-label={`${isOpen ? 'Collapse' : 'Expand'} ${node.name}`} aria-expanded={isOpen} onClick={() => toggle(key)}>{isOpen ? '⌄' : '›'}</button> : <span className={styles.disclosureSpacer} aria-hidden="true" />}<span className={styles.folderIcon} aria-hidden="true">{node.systemManaged ? '⌂' : '▱'}</span><span className={styles.folderName}>{node.name}</span></div>
      <div className={styles.permissionSet}><PermissionAxis label="Read" state={readState} onChange={setReadState} /><PermissionAxis label="Write" state={writeState} onChange={setWriteState} /></div>
      <button type="submit" className={styles.saveButton}>Save</button>
    </form>
    {hasChildren && isOpen ? <ul className={styles.folderTree} role="group">{node.children.map((child) => <FolderNode key={`${principalType}-${principalId}-${child.id}`} node={child} domainSlug={domainSlug} principalType={principalType} principalId={principalId} expanded={expanded} toggle={toggle} />)}</ul> : null}
  </li>
}

export function FolderTree({ domainSlug, characterId, principalType = 'Character', principalId = characterId, folders, heading, description }: FolderTreeProps) {
  const resolvedPrincipalId = principalId ?? 0
  const [query, setQuery] = useState('')
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(folders.map((folder) => `${principalType.toLowerCase()}-folder-${folder.id}`)))
  const normalizedQuery = query.trim().toLocaleLowerCase()
  const visibleFolders = useMemo(() => folders.map((folder) => folderMatches(folder, normalizedQuery)).filter((folder): folder is FolderTreeNode => folder !== null), [folders, normalizedQuery])
  const toggle = (key: string) => setExpanded((current) => {
    const next = new Set(current)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    return next
  })
  const resolvedHeading = heading ?? 'Folder access'
  const resolvedDescription = description ?? (principalType === 'Role' ? 'Default access for this Role' : 'Direct access for this Character')
  return <section className={styles.panel} aria-labelledby="folder-access-heading">
    <div className={styles.panelHeader}><div><h2 id="folder-access-heading">{resolvedHeading}</h2><p className={styles.panelMeta}>{resolvedDescription}</p></div><span className={styles.legend}><span className={styles.legendSwatch} /> inherited</span></div>
    <div className={styles.searchBar}><span className={styles.searchIcon} aria-hidden="true">⌕</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search folders" aria-label="Search folders" /></div>
    <div className={styles.treeBox} role="tree" aria-label="Folder access">
      {visibleFolders.map((folder) => <ul key={`${principalType}-${resolvedPrincipalId}-${folder.id}`} className={styles.folderTree} role="group"><FolderNode node={folder} domainSlug={domainSlug} principalType={principalType} principalId={resolvedPrincipalId} expanded={expanded} toggle={toggle} /></ul>)}
      {visibleFolders.length === 0 ? <p className={styles.emptyState}>No folders match your search.</p> : null}
    </div>
  </section>
}
