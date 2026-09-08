'use client'

import type { FormEvent } from 'react'

import { FolderTree, RoleTree } from '@/components/people/PersonAccessTrees'
import type { RoleManagementPageModel } from '@/lib/page-models/management/roles'
import { applyFolderStates, canCreateRootRole, roleMenuActions } from '@/lib/roles/roleManagement'
import { useRoleManagementWorkspace } from '@/components/functional/roles/useRoleManagementWorkspace'
import { TypePermissionGrid } from './TypePermissionGrid'

import styles from './RoleManager.module.scss'

/**
 * Civic Role manager (OBSIDIAN-T04). Presentation-only: the authorized
 * `RoleManagementPageModel` and the shared `useRoleManagementWorkspace` own
 * data, selection, dialogs, people search, and the guarded mutation
 * transports. Visual behavior is unchanged from the pre-extraction
 * implementation. The TypePermissionGrid and FolderTree remain shared
 * functional primitives with their own guarded form actions.
 */
export function RoleManager({ model }: { model: RoleManagementPageModel }) {
  const workspace = useRoleManagementWorkspace(model)
  const { domainSlug, folderNodes, folderStatesByRole, types, typeStatesByRole } = model
  const selectedRole = workspace.selectedRole
  const selectedDepartment = workspace.selectedDepartment

  const submitCreateSubordinate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = event.currentTarget
    const name = new FormData(form).get('name')
    if (selectedRole && selectedDepartment) void workspace.createRole(String(name ?? ''), selectedRole.id, selectedDepartment.id)
  }
  const submitCreateRoot = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)
    const subdomainId = Number(data.get('subdomainId') ?? 0)
    void workspace.createRole(String(data.get('name') ?? ''), null, Number.isFinite(subdomainId) && subdomainId > 0 ? subdomainId : null)
  }
  const submitDelete = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (selectedRole) void workspace.deleteRole(selectedRole.id)
  }
  const submitAssign = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (selectedRole && workspace.selectedPeople.length > 0) void workspace.assignRole(selectedRole.id, workspace.selectedPeople.map((person) => person.id))
  }

  return <div className={styles.page} onClick={workspace.closeMenu}>
    <div className={styles.toolbar}><span className={styles.muted}>Select a role to inspect holders and default folder access. Right-click a role for actions.</span><button type="button" className={styles.primaryButton} disabled={!canCreateRootRole(model)} onClick={() => { workspace.setSelectedRoleId(null); workspace.openDialog('create'); }}>New top-level role</button></div>
    <RoleTree domainSlug={domainSlug} characterId={0} departments={model.departments} showModeFilter={false} showAssignmentCheckbox={false} selectedRoleId={workspace.selectedRoleId} onSelectRole={workspace.selectRole} onContextRole={workspace.openMenu} />

    {workspace.menu ? <div className={styles.contextMenu} style={{ left: workspace.menu.x, top: workspace.menu.y }} onClick={(event) => event.stopPropagation()} role="menu">
      {roleMenuActions({ departmentId: workspace.menu.department.id, roleId: workspace.menu.node.id, manageableDepartmentIds: model.manageableDepartmentIds, assignableRoleIds: model.assignableRoleIds }).map((action) => (
        <button key={action.kind} type="button" disabled={action.disabled} onClick={() => workspace.openDialog(action.kind === 'assign' ? 'assign' : action.kind)}>{action.kind === 'create' ? 'Create subordinate role' : action.kind === 'assign' ? 'Assign this role…' : 'Delete this role'}</button>
      ))}
    </div> : null}

    {workspace.dialog === 'create' && selectedRole && selectedDepartment ? <section className={styles.dialog} aria-labelledby="create-role-heading">
      <div className={styles.dialogHeader}><h2 id="create-role-heading">Create subordinate role</h2><button type="button" className={styles.close} onClick={workspace.closeDialog} aria-label="Close">×</button></div>
      <p className={styles.muted}>Reports to {selectedRole.name} in {selectedDepartment.name}.</p>
      <form onSubmit={submitCreateSubordinate}><label>Role name<input name="name" required autoFocus /></label><div className={styles.dialogActions}><button className={styles.primaryButton} type="submit">Create role</button><button className={styles.secondaryButton} type="button" onClick={workspace.closeDialog}>Cancel</button></div></form>
    </section> : null}
    {workspace.dialog === 'create' && !selectedRole ? <section className={styles.dialog} aria-labelledby="create-root-role-heading">
      <div className={styles.dialogHeader}><h2 id="create-root-role-heading">Create top-level role</h2><button type="button" className={styles.close} onClick={workspace.closeDialog} aria-label="Close">×</button></div>
      <form onSubmit={submitCreateRoot}><label>Role name<input name="name" required autoFocus /></label><label>Department<select name="subdomainId" required defaultValue=""><option value="">Choose Department</option>{model.departments.filter((department) => model.manageableDepartmentIds.includes(department.id)).map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}</select></label><div className={styles.dialogActions}><button className={styles.primaryButton} type="submit">Create role</button><button className={styles.secondaryButton} type="button" onClick={workspace.closeDialog}>Cancel</button></div></form>
    </section> : null}

    {workspace.dialog === 'delete' && selectedRole ? <section className={styles.dialog} aria-labelledby="delete-role-heading">
      <div className={styles.dialogHeader}><h2 id="delete-role-heading">Delete {selectedRole.name}?</h2><button type="button" className={styles.close} onClick={workspace.closeDialog} aria-label="Close">×</button></div>
      <p className={styles.muted}>This archives the role and its active assignments. Roles with subordinate roles must be reorganized first.</p>
      <form onSubmit={submitDelete}><div className={styles.dialogActions}><button className={styles.dangerButton} type="submit">Delete role</button><button className={styles.secondaryButton} type="button" onClick={workspace.closeDialog}>Cancel</button></div></form>
    </section> : null}

    {workspace.dialog === 'assign' && selectedRole ? <section className={styles.dialog} aria-labelledby="assign-role-heading">
      <div className={styles.dialogHeader}><h2 id="assign-role-heading">Assign {selectedRole.name}</h2><button type="button" className={styles.close} onClick={workspace.closeDialog} aria-label="Close">×</button></div>
      <label>Find people<input value={workspace.query} onChange={(event) => workspace.setQuery(event.target.value)} placeholder="Search a Character, alias, User, Department, or Role" autoFocus /></label>
      {workspace.results.length > 0 ? <ul className={styles.resultList}>{workspace.results.map((result) => { const checked = workspace.selectedPeople.some((person) => person.id === result.id); return <li key={result.id}><label className={styles.resultRow}><input type="checkbox" checked={checked} onChange={() => workspace.togglePerson(result)} /><span>{result.localName || result.name}<span>{result.localName && result.localName !== result.name ? `${result.name} · ` : ''}{result.controllerName || 'Unclaimed'}</span></span></label></li> })}</ul> : workspace.query ? <p className={styles.muted}>No active Domain members found.</p> : <p className={styles.muted}>Search to build a list of people for this assignment.</p>}
      {workspace.selectedPeople.length > 0 ? <ul className={styles.selectedPeople}>{workspace.selectedPeople.map((person) => <li key={person.id}>{person.localName || person.name}<button type="button" onClick={() => workspace.togglePerson(person)} aria-label={`Remove ${person.localName || person.name}`}>×</button></li>)}</ul> : null}
      <form onSubmit={submitAssign}><div className={styles.dialogActions}><button className={styles.primaryButton} type="submit" disabled={workspace.selectedPeople.length === 0}>Assign role</button><button className={styles.secondaryButton} type="button" onClick={workspace.closeDialog}>Cancel</button></div></form>
    </section> : null}

    {selectedRole ? <section className={styles.roleDetail} aria-labelledby="role-detail-heading">
      <section className={styles.holdersPanel}><div className={styles.detailHeading}><h2 id="role-detail-heading">People with {selectedRole.name}</h2><span>{model.holdersByRole[String(selectedRole.id)]?.length ?? 0} active holders</span></div>{(model.holdersByRole[String(selectedRole.id)]?.length ?? 0) > 0 ? <ul className={styles.holderList}>{model.holdersByRole[String(selectedRole.id)]!.map((holder) => <li key={holder.id} className={styles.holderChip}><a href={`/domain/${domainSlug}/manage/people/${holder.id}`}>{holder.name}</a></li>)}</ul> : <p>No active people hold this role.</p>}</section>
      <TypePermissionGrid domainSlug={domainSlug} principalType="Role" principalId={selectedRole.id} types={types} statesByType={typeStatesByRole[String(selectedRole.id)] ?? {}} canManage={model.manageableDepartmentIds.length > 0} />
      <details className={styles.folderAdvanced}><summary className={styles.folderAdvancedSummary}>Advanced: Folder organization and access</summary><p className={styles.muted}>Folder controls organize and restrict work. They do not grant record capabilities — those live in the Record Type grid above.</p><FolderTree domainSlug={domainSlug} principalType="Role" principalId={selectedRole.id} heading="Default folder access" description="Default access for this Role." folders={applyFolderStates(folderNodes, folderStatesByRole[String(selectedRole.id)] ?? {})} /></details>
    </section> : <p className={styles.muted}>Select a role to see its holders and record access.</p>}
    {workspace.selectedRecord ? <span className={styles.muted} hidden>{workspace.selectedRecord.parentRoleId}</span> : null}
  </div>
}