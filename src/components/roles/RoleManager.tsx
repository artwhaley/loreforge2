'use client'

import { useEffect, useMemo, useState } from 'react'

import { FolderTree, RoleTree, type FolderTreeNode, type PermissionState, type RoleDepartment, type RoleTreeNode } from '@/components/people/PersonAccessTrees'

import styles from './RoleManager.module.scss'

type RoleRecord = { id: number; name: string; departmentId: number; parentRoleId: number | null }
type Holder = { id: number; name: string }
type SearchResult = { id: number; name: string; localName: string | null; controllerName: string | null; roles: string[]; departments: string[] }
type FolderState = { readState: PermissionState; writeState: PermissionState }

type Props = {
  domainSlug: string
  manageableDepartmentIds: number[]
  assignableRoleIds: number[]
  departments: RoleDepartment[]
  roleRecords: RoleRecord[]
  holdersByRole: Record<string, Holder[]>
  folders: FolderTreeNode[]
  folderStatesByRole: Record<string, Record<string, FolderState>>
  initialRoleId?: number | null
}

type Menu = { x: number; y: number; node: RoleTreeNode; department: RoleDepartment }

function flatten(nodes: RoleTreeNode[]): RoleTreeNode[] {
  return nodes.flatMap((node) => [node, ...flatten(node.children)])
}

function applyFolderStates(nodes: FolderTreeNode[], states: Record<string, FolderState>): FolderTreeNode[] {
  return nodes.map((node) => ({ ...node, ...(states[String(node.id)] ?? {}), children: applyFolderStates(node.children, states) }))
}

export function RoleManager({ domainSlug, departments, roleRecords, holdersByRole, folders, folderStatesByRole, initialRoleId, manageableDepartmentIds, assignableRoleIds }: Props) {
  const allRoles = useMemo(() => departments.flatMap((department) => flatten(department.roles)), [departments])
  const firstRoleId = initialRoleId && allRoles.some((role) => role.id === initialRoleId) ? initialRoleId : allRoles[0]?.id ?? null
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(firstRoleId)
  const [menu, setMenu] = useState<Menu | null>(null)
  const [dialog, setDialog] = useState<'create' | 'delete' | 'assign' | null>(null)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [selectedPeople, setSelectedPeople] = useState<SearchResult[]>([])
  const selectedRole = allRoles.find((role) => role.id === selectedRoleId) ?? null
  const selectedRecord = roleRecords.find((role) => role.id === selectedRoleId) ?? null
  const selectedDepartment = selectedRole ? departments.find((department) => department.roles.some((root) => flatten([root]).some((role) => role.id === selectedRole.id))) : null

  useEffect(() => {
    if (!menu) return
    const close = () => setMenu(null)
    window.addEventListener('click', close)
    return () => window.removeEventListener('click', close)
  }, [menu])

  useEffect(() => {
    const value = query.trim()
    const controller = new AbortController()
    // P05R-T08: the guard (empty query / not the assign dialog) clears stale
    // results from inside the debounce callback, not synchronously in the
    // effect body; results only render inside the assign dialog, so the
    // 180ms clear is never visible.
    const timer = window.setTimeout(() => {
      if (!value || dialog !== 'assign') { setResults([]); return }
      void fetch(`/api/people-search?domainSlug=${encodeURIComponent(domainSlug)}&q=${encodeURIComponent(value)}`, { signal: controller.signal })
        .then((response) => response.json() as Promise<{ results?: SearchResult[] }>)
        .then((body) => setResults(body.results ?? []))
        .catch((error: unknown) => {
          if ((error as { name?: string }).name !== 'AbortError') setResults([])
        })
    }, 180)
    return () => { controller.abort(); window.clearTimeout(timer) }
  }, [domainSlug, dialog, query])

  const selectRole = (node: RoleTreeNode, department: RoleDepartment) => {
    setSelectedRoleId(node.id)
    setMenu(null)
    setDialog(null)
    // The department is carried by the tree callback for context-menu actions;
    // selectedRecord remains the canonical role metadata for forms.
    void department
  }

  const openMenu = (event: React.MouseEvent, node: RoleTreeNode, department: RoleDepartment) => {
    event.preventDefault()
    event.stopPropagation()
    setSelectedRoleId(node.id)
    setMenu({ x: event.clientX, y: event.clientY, node, department })
  }

  const openDialog = (next: 'create' | 'delete' | 'assign') => {
    setMenu(null)
    setDialog(next)
    setQuery('')
    setResults([])
    setSelectedPeople([])
  }

  return <div className={styles.page} onClick={() => menu && setMenu(null)}>
    <div className={styles.toolbar}><span className={styles.muted}>Select a role to inspect holders and default folder access. Right-click a role for actions.</span><button type="button" className={styles.primaryButton} disabled={manageableDepartmentIds.length === 0} onClick={() => { setSelectedRoleId(null); setDialog('create'); setMenu(null) }}>New top-level role</button></div>
    <RoleTree domainSlug={domainSlug} characterId={0} departments={departments} showModeFilter={false} showAssignmentCheckbox={false} selectedRoleId={selectedRoleId} onSelectRole={selectRole} onContextRole={openMenu} />

    {menu ? <div className={styles.contextMenu} style={{ left: menu.x, top: menu.y }} onClick={(event) => event.stopPropagation()} role="menu">
      <button type="button" disabled={!manageableDepartmentIds.includes(menu.department.id)} onClick={() => openDialog('create')}>Create subordinate role</button>
      <button type="button" disabled={!assignableRoleIds.includes(menu.node.id)} onClick={() => openDialog('assign')}>Assign this role…</button>
      <button type="button" disabled={!manageableDepartmentIds.includes(menu.department.id)} onClick={() => openDialog('delete')}>Delete this role</button>
    </div> : null}

    {dialog === 'create' && selectedRole && selectedDepartment ? <section className={styles.dialog} aria-labelledby="create-role-heading">
      <div className={styles.dialogHeader}><h2 id="create-role-heading">Create subordinate role</h2><button type="button" className={styles.close} onClick={() => setDialog(null)} aria-label="Close">×</button></div>
      <p className={styles.muted}>Reports to {selectedRole.name} in {selectedDepartment.name}.</p>
      <form action="/api/roles" method="post"><input type="hidden" name="domainSlug" value={domainSlug} /><input type="hidden" name="parentRoleId" value={selectedRole.id} /><input type="hidden" name="subdomainId" value={selectedDepartment.id} /><label>Role name<input name="name" required autoFocus /></label><div className={styles.dialogActions}><button className={styles.primaryButton} type="submit">Create role</button><button className={styles.secondaryButton} type="button" onClick={() => setDialog(null)}>Cancel</button></div></form>
    </section> : null}
    {dialog === 'create' && !selectedRole ? <section className={styles.dialog} aria-labelledby="create-root-role-heading">
      <div className={styles.dialogHeader}><h2 id="create-root-role-heading">Create top-level role</h2><button type="button" className={styles.close} onClick={() => setDialog(null)} aria-label="Close">×</button></div>
      <form action="/api/roles" method="post"><input type="hidden" name="domainSlug" value={domainSlug} /><label>Role name<input name="name" required autoFocus /></label><label>Department<select name="subdomainId" required defaultValue=""><option value="">Choose Department</option>{departments.filter((department) => manageableDepartmentIds.includes(department.id)).map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}</select></label><div className={styles.dialogActions}><button className={styles.primaryButton} type="submit">Create role</button><button className={styles.secondaryButton} type="button" onClick={() => setDialog(null)}>Cancel</button></div></form>
    </section> : null}

    {dialog === 'delete' && selectedRole ? <section className={styles.dialog} aria-labelledby="delete-role-heading">
      <div className={styles.dialogHeader}><h2 id="delete-role-heading">Delete {selectedRole.name}?</h2><button type="button" className={styles.close} onClick={() => setDialog(null)} aria-label="Close">×</button></div>
      <p className={styles.muted}>This archives the role and its active assignments. Roles with subordinate roles must be reorganized first.</p>
      <form action="/api/roles" method="post"><input type="hidden" name="domainSlug" value={domainSlug} /><input type="hidden" name="roleId" value={selectedRole.id} /><input type="hidden" name="action" value="delete" /><div className={styles.dialogActions}><button className={styles.dangerButton} type="submit">Delete role</button><button className={styles.secondaryButton} type="button" onClick={() => setDialog(null)}>Cancel</button></div></form>
    </section> : null}

    {dialog === 'assign' && selectedRole ? <section className={styles.dialog} aria-labelledby="assign-role-heading">
      <div className={styles.dialogHeader}><h2 id="assign-role-heading">Assign {selectedRole.name}</h2><button type="button" className={styles.close} onClick={() => setDialog(null)} aria-label="Close">×</button></div>
      <label>Find people<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search a Character, alias, User, Department, or Role" autoFocus /></label>
      {results.length > 0 ? <ul className={styles.resultList}>{results.map((result) => { const checked = selectedPeople.some((person) => person.id === result.id); return <li key={result.id}><label className={styles.resultRow}><input type="checkbox" checked={checked} onChange={() => setSelectedPeople((current) => checked ? current.filter((person) => person.id !== result.id) : [...current, result])} /><span>{result.localName || result.name}<span>{result.localName && result.localName !== result.name ? `${result.name} · ` : ''}{result.controllerName || 'Unclaimed'}</span></span></label></li> })}</ul> : query ? <p className={styles.muted}>No active Domain members found.</p> : <p className={styles.muted}>Search to build a list of people for this assignment.</p>}
      {selectedPeople.length > 0 ? <ul className={styles.selectedPeople}>{selectedPeople.map((person) => <li key={person.id}>{person.localName || person.name}<button type="button" onClick={() => setSelectedPeople((current) => current.filter((item) => item.id !== person.id))} aria-label={`Remove ${person.localName || person.name}`}>×</button></li>)}</ul> : null}
      <form action="/api/role-assignments" method="post"><input type="hidden" name="domainSlug" value={domainSlug} /><input type="hidden" name="roleId" value={selectedRole.id} /><input type="hidden" name="action" value="add" /><input type="hidden" name="returnTo" value={`/domain/${domainSlug}/roles?roleId=${selectedRole.id}`} />{selectedPeople.map((person) => <input key={person.id} type="hidden" name="characterId" value={person.id} />)}<div className={styles.dialogActions}><button className={styles.primaryButton} type="submit" disabled={selectedPeople.length === 0}>Assign role</button><button className={styles.secondaryButton} type="button" onClick={() => setDialog(null)}>Cancel</button></div></form>
    </section> : null}

    {selectedRole ? <section className={styles.roleDetail} aria-labelledby="role-detail-heading">
      <section className={styles.holdersPanel}><div className={styles.detailHeading}><h2 id="role-detail-heading">People with {selectedRole.name}</h2><span>{holdersByRole[String(selectedRole.id)]?.length ?? 0} active holders</span></div>{(holdersByRole[String(selectedRole.id)]?.length ?? 0) > 0 ? <ul className={styles.holderList}>{holdersByRole[String(selectedRole.id)]!.map((holder) => <li key={holder.id} className={styles.holderChip}><a href={`/domain/${domainSlug}/manage/people/${holder.id}`}>{holder.name}</a></li>)}</ul> : <p>No active people hold this role.</p>}</section>
      <FolderTree domainSlug={domainSlug} principalType="Role" principalId={selectedRole.id} heading="Default folder access" description="Default access for this Role." folders={applyFolderStates(folders, folderStatesByRole[String(selectedRole.id)] ?? {})} />
    </section> : <p className={styles.muted}>Select a role to see its holders and default folder access.</p>}
    {selectedRecord ? <span className={styles.muted} hidden>{selectedRecord.parentRoleId}</span> : null}
  </div>
}
