'use client'

import { useActionState, useMemo, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { MoreHorizontal, Plus, Search, SlidersHorizontal, UserRound } from 'lucide-react'

import { usePeopleManagementWorkspace } from '@/components/functional/people/usePeopleManagementWorkspace'
import { useRoleManagementWorkspace } from '@/components/functional/roles/useRoleManagementWorkspace'
import type { RoleDepartment, RoleTreeNode } from '@/components/people/PersonAccessTrees'
import type { DepartmentsManagementPageModel } from '@/lib/page-models/management/departments'
import type { InvitationsManagementPageModel } from '@/lib/page-models/management/invitations'
import type { PeopleManagementPageModel, PersonManagementPageModel } from '@/lib/page-models/management/people'
import type { RoleManagementPageModel } from '@/lib/page-models/management/roles'
import type { WorkDesignViewProps } from '@/lib/design/types'
import { issueObsidianInvitationAction, type IssueInvitationState } from '@/components/invitations/ObsidianActions'

import { ActionMenu, ChoiceMenu, Modal, type Action } from './controls'
import s from './obsidian.module.css'

type ManagementRow = {
  id: string | number
  primary: string
  secondary: string
  status?: string
  updatedLabel?: string
  href?: string
  actions?: Action[]
}

type ManagementTableProps = {
  title: string
  eyebrow: string
  description: string
  createLabel?: string
  createHref?: string
  onCreate?: () => void
  searchPlaceholder: string
  columns: [string, string, string]
  rows: ManagementRow[]
  emptyLabel: string
  searchValue?: string
  onSearchChange?: (event: ChangeEvent<HTMLInputElement>) => void
  onRowAction?: (row: ManagementRow, action: Action) => void
  status?: ReactNode
}

/**
 * The frozen incubator's generic management surface. Operational routes feed
 * this presentation with authorized Page Model rows; they do not inherit the
 * generic tenant-shell tables or their light styling.
 */
export function ObsidianManagementTable({
  title,
  eyebrow,
  description,
  createLabel,
  createHref,
  onCreate,
  searchPlaceholder,
  columns,
  rows,
  emptyLabel,
  searchValue,
  onSearchChange,
  onRowAction,
  status,
}: ManagementTableProps) {
  const router = useRouter()
  const [localQuery, setLocalQuery] = useState('')
  const query = searchValue ?? localQuery
  const filteredRows = useMemo(() => rows.filter((row) => `${row.primary} ${row.secondary} ${row.status ?? ''}`.toLowerCase().includes(query.toLowerCase())), [query, rows])
  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (onSearchChange) onSearchChange(event)
    else setLocalQuery(event.target.value)
  }
  const handleRowAction = (row: ManagementRow, action: Action) => {
    if (action.href) router.push(action.href)
    onRowAction?.(row, action)
  }

  return (
    <div className={s.workspacePage}>
      <header className={s.pageHeading}>
        <div>
          <p className={s.eyebrow}>{eyebrow}</p>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        {createLabel && (createHref ? (
          <a className={s.primaryButton} href={createHref}><Plus size={17} /> {createLabel}</a>
        ) : (
          <button className={s.primaryButton} type="button" onClick={onCreate}><Plus size={17} /> {createLabel}</button>
        ))}
      </header>
      {status}
      <section className={s.managementSurface} aria-label={`${title} management`}>
        <div className={s.managementToolbar}>
          <label className={s.search}>
            <Search size={18} />
            <span className={s.srOnly}>Search {title.toLowerCase()}</span>
            <input value={query} onChange={handleSearchChange} placeholder={searchPlaceholder} />
          </label>
          <button className={s.secondaryButton} type="button"><SlidersHorizontal size={15} /> Filters</button>
        </div>
        <div className={s.managementTable}>
          <div className={s.managementHead}>
            <span>{columns[0]}</span><span>{columns[1]}</span><span>{columns[2]}</span><span className={s.srOnly}>Actions</span>
          </div>
          {filteredRows.map((row) => (
            <div className={s.managementRow} key={row.id}>
              <strong>{row.primary}</strong>
              <span>{row.secondary}</span>
              <span className={row.status ? s.managementStatus : ''}>{row.status ?? row.updatedLabel}</span>
              {row.actions?.length ? <span className={s.srOnly}>{row.actions.map((action) => action.label).join(' ')}</span> : null}
              <ActionMenu
                label={`Actions for ${row.primary}`}
                trigger={<MoreHorizontal size={18} />}
                items={row.actions ?? []}
                onAction={(action) => handleRowAction(row, action)}
              />
            </div>
          ))}
        </div>
        {filteredRows.length === 0 && <p className={s.managementEmpty}>{emptyLabel}</p>}
      </section>
    </div>
  )
}

function statusMessage(modelStatus: { level: 'info' | 'error'; message: string } | null) {
  if (!modelStatus) return null
  return <p className={modelStatus.level === 'error' ? s.formError : s.managementStatus} role={modelStatus.level === 'error' ? 'alert' : 'status'}>{modelStatus.message}</p>
}

export function ObsidianDepartmentsManagement({ model }: { model: DepartmentsManagementPageModel }) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const rows = useMemo(() => model.departments
    .filter((department) => `${department.name} ${department.slug}`.toLowerCase().includes(query.toLowerCase()))
    .map((department) => ({
      id: department.id,
      primary: department.name,
      secondary: `/${department.slug}`,
      status: department.archived ? 'Hidden' : 'Active',
      href: `${model.baseUrl}/departments/${department.slug}`,
      actions: [
        { key: 'open', label: 'Open department', href: `${model.baseUrl}/departments/${department.slug}` },
        ...(department.canRestore ? [{ key: 'restore', label: 'Restore' }] : []),
        ...(department.canArchive ? [{ key: 'archive', label: 'Archive', danger: true }] : []),
      ],
    })), [model.baseUrl, model.departments, query])

  const handleAction = async (row: ManagementRow, action: Action) => {
    if (action.key !== 'archive' && action.key !== 'restore') return
    const body = new FormData()
    body.set('domainSlug', model.domainSlug)
    body.set('departmentId', String(row.id))
    body.set('action', action.key)
    await fetch('/api/departments', { method: 'POST', body })
    router.refresh()
  }

  return <>
    <span className={s.srOnly}>Manage {model.vocabulary.subdomainPlural}</span>
    <ObsidianManagementTable
      title={model.vocabulary.subdomainPlural}
      eyebrow="DOMAIN ORGANIZATION"
      description={`Groups, offices, and shared work within ${model.domainName}.`}
      createLabel={model.canCreate ? `New ${model.vocabulary.subdomainSingular.toLowerCase()}` : undefined}
      onCreate={() => setCreateOpen(true)}
      searchPlaceholder={`Search ${model.vocabulary.subdomainPlural.toLowerCase()}`}
      columns={['Department', 'Details', 'Status']}
      rows={rows}
      emptyLabel={`No ${model.vocabulary.subdomainPlural.toLowerCase()} match.`}
      searchValue={query}
      onSearchChange={(event) => setQuery(event.target.value)}
      onRowAction={(row, action) => void handleAction(row, action)}
      status={statusMessage(model.status)}
    />
    {createOpen ? (
      <Modal open onOpenChange={(open) => { if (!open) setCreateOpen(false) }} title={`New ${model.vocabulary.subdomainSingular}`} description="Name and description are used across the domain.">
        <form className={s.folderForm} action="/api/departments" method="post">
          <input type="hidden" name="domainSlug" value={model.domainSlug} />
          <label>Name<input name="name" required autoFocus /></label>
          <button type="submit" className={s.primaryButton}>Create</button>
        </form>
      </Modal>
    ) : null}
  </>
}

export function ObsidianRolesManagement({ model }: { model: RoleManagementPageModel }) {
  const workspace = useRoleManagementWorkspace(model)
  const [createOpen, setCreateOpen] = useState(false)
  const [name, setName] = useState('')
  const [departmentId, setDepartmentId] = useState(model.departments[0]?.id ?? 0)
  const rows = useMemo(() => {
    const departmentName = new Map(model.departments.map((department) => [department.id, department.name]))
    return model.roleRecords.map((role) => ({
      id: role.id,
      primary: role.name,
      secondary: departmentName.get(role.departmentId) ?? 'Unassigned department',
      status: `${(model.holdersByRole[String(role.id)] ?? []).length} member${(model.holdersByRole[String(role.id)] ?? []).length === 1 ? '' : 's'}`,
      actions: [
        { key: 'open', label: 'Open role workspace', href: `${model.baseUrl}/roles?roleId=${role.id}` },
        ...(model.manageableDepartmentIds.includes(role.departmentId) ? [{ key: 'delete', label: 'Archive role', danger: true }] : []),
      ],
    }))
  }, [model.baseUrl, model.departments, model.holdersByRole, model.manageableDepartmentIds, model.roleRecords])

  const createRole = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!name.trim() || departmentId <= 0) return
    await workspace.createRole(name.trim(), null, departmentId)
    setName('')
    setCreateOpen(false)
  }

  const handleAction = (row: ManagementRow, action: Action) => {
    if (action.key === 'delete') void workspace.deleteRole(Number(row.id))
  }

  return <>
    <ObsidianManagementTable
      title="Roles"
      eyebrow="ACCESS AND RESPONSIBILITY"
      description="Define what people can do and where they can do it."
      createLabel={model.manageableDepartmentIds.length > 0 ? 'Create role' : undefined}
      onCreate={() => setCreateOpen(true)}
      searchPlaceholder="Search roles"
      columns={['Role', 'Details', 'Status']}
      rows={rows}
      emptyLabel="No roles match."
      onRowAction={handleAction}
      status={statusMessage(model.status)}
    />
    {createOpen ? (
      <Modal open onOpenChange={(open) => { if (!open) setCreateOpen(false) }} title="Create role" description="Roles live under a department.">
        <form className={s.folderForm} onSubmit={(event) => void createRole(event)}>
          <label>Name<input value={name} onChange={(event) => setName(event.target.value)} required autoFocus /></label>
          <label>Department<select value={departmentId} onChange={(event) => setDepartmentId(Number(event.target.value))}>{model.departments.filter((department) => model.manageableDepartmentIds.includes(department.id)).map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}</select></label>
          <button type="submit" className={s.primaryButton}>Create</button>
        </form>
      </Modal>
    ) : null}
  </>
}

export function ObsidianPeopleManagement({ model }: { model: PeopleManagementPageModel }) {
  const workspace = usePeopleManagementWorkspace(model.domainSlug)
  const rows = workspace.results.map((person) => ({
    id: person.id,
    primary: person.localName || person.name,
    secondary: person.controllerName ? `User: ${person.controllerName}` : 'Unclaimed Character',
    status: person.roles.join(', ') || 'No role',
    href: `${model.baseUrl}/manage/people/${person.id}`,
    actions: [{ key: 'open', label: 'Open person', href: `${model.baseUrl}/manage/people/${person.id}` }],
  }))
  return <ObsidianManagementTable
    title="People"
    eyebrow="DOMAIN MEMBERS"
    description="The people who can participate in this domain."
    createLabel="Invite person"
    createHref={`${model.baseUrl}/manage/invitations`}
    searchPlaceholder="Search people"
    columns={['Person', 'Details', 'Status']}
    rows={rows}
    emptyLabel={workspace.query ? `No people match “${workspace.query}”.` : 'Search the domain to find people.'}
    searchValue={workspace.query}
    onSearchChange={workspace.handleQueryChange}
    status={statusMessage(model.status)}
  />
}

function flattenRoles(departments: RoleDepartment[]) {
  return departments.flatMap((department) => {
    const visit = (nodes: RoleTreeNode[]): Array<RoleTreeNode & { department: string }> => nodes.flatMap((node) => [{ ...node, department: department.name }, ...visit(node.children)])
    return visit(department.roles)
  })
}

export function ObsidianPersonManagement({ model, details }: { model: PersonManagementPageModel; details?: ReactNode }) {
  const router = useRouter()
  const displayName = model.localDisplayName || model.character.name
  const roles = flattenRoles(model.roleDepartments).filter((role) => model.roleFilter === 'held' ? role.held : role.assignable)
  const handleRoleAction = async (row: ManagementRow, action: Action) => {
    if (action.key !== 'assign' && action.key !== 'unassign') return
    const body = new FormData()
    body.set('domainSlug', model.domainSlug)
    body.set('characterId', String(model.character.id))
    body.set('roleId', String(row.id))
    body.set('action', action.key === 'assign' ? 'add' : 'remove')
    await fetch('/api/role-assignments', { method: 'POST', body })
    router.refresh()
  }
  const rows = roles.map((role) => ({
    id: role.id,
    primary: role.name,
    secondary: role.department,
    status: role.held ? 'Held' : 'Available',
    actions: role.held
      ? [{ key: 'unassign', label: 'Unassign', danger: true }]
      : [{ key: 'assign', label: 'Assign' }],
  }))

  return <div className={s.workspacePage}>
    <header className={s.pageHeading}>
      <div>
        <p className={s.eyebrow}>PERSON WORKSPACE</p>
        <h1>{displayName}</h1>
        <p>{model.character.kind} · {model.character.status}</p>
      </div>
      <a className={s.secondaryButton} href={`${model.baseUrl}/manage/people/${model.character.id}?roleFilter=${model.roleFilter === 'assignable' ? 'held' : 'assignable'}`}><SlidersHorizontal size={15} /> {model.roleFilter === 'assignable' ? 'Show held roles' : 'Show assignable roles'}</a>
    </header>
    {model.controller ? <p className={s.managementStatus}>Controlled by {model.controller.name ?? model.controller.email}</p> : null}
    {statusMessage(model.status)}
    <section className={s.managementSurface} aria-label="Role access">
      {rows.length === 0 ? <div className={s.empty}><UserRound size={28} /><h2>No role assignments.</h2><p>This person has no roles in the current domain.</p></div> : <div className={s.managementTable}>
        <div className={s.managementHead}><span>Role</span><span>Department</span><span>Status</span><span className={s.srOnly}>Actions</span></div>
        {rows.map((row) => <div className={s.managementRow} key={row.id}><strong>{row.primary}</strong><span>{row.secondary}</span><span className={s.managementStatus}>{row.status}</span><ActionMenu label={`Actions for ${row.primary}`} trigger={<MoreHorizontal size={18} />} items={row.actions ?? []} onAction={(action) => void handleRoleAction(row, action)} /></div>)}
      </div>}
    </section>
    {details ? <details className={s.managementSurface} style={{ marginTop: 18 }}><summary className={s.managementToolbar}>Access details <span className={s.managementStatus}>Folders and Document Types</span></summary><div style={{ padding: 18 }}>{details}</div></details> : null}
  </div>
}

export function ObsidianWork(props: WorkDesignViewProps) {
  if (!props.authorized) return <div className={s.workspacePage}><div className={s.empty}><UserRound size={28} /><h2>No access to Work.</h2><p>This surface is only available to signed-in members.</p></div></div>
  const rows: ManagementRow[] = props.entries.map((entry) => ({
    id: `${entry.kind}-${entry.id}`,
    primary: entry.title,
    secondary: entry.summary,
    status: entry.kind === 'document' ? 'Needs review' : entry.kind,
    updatedLabel: entry.requestedAt ? new Date(entry.requestedAt).toLocaleDateString() : 'Recently updated',
    href: entry.href ?? `${props.baseUrl}/work`,
    actions: [
      { key: 'open', label: 'Open', href: entry.href ?? `${props.baseUrl}/work` },
      ...(entry.kind === 'document' ? [{ key: 'approve', label: 'Approve and file' }, { key: 'return', label: 'Return to Draft', danger: true }] : []),
    ],
  }))
  const handleAction = (row: ManagementRow, action: Action) => {
    if (action.key !== 'approve' && action.key !== 'return') return
    const entry = props.entries.find((candidate) => `${candidate.kind}-${candidate.id}` === String(row.id))
    if (!entry) return
    const body = new FormData()
    body.set('tenantSlug', props.domainSlug)
    body.set('documentId', String(entry.id))
    body.set('operation', action.key === 'approve' ? 'approve' : 'reject')
    void (action.key === 'approve' ? props.approveAction(body) : props.rejectAction(body))
  }
  return <>
    <span className={s.srOnly}>Work</span>
    <ObsidianManagementTable
      title="Your work"
      eyebrow="CURRENT DOMAIN"
      description="Drafts and decisions that need your attention."
      createLabel="New document"
      createHref={`${props.baseUrl}/records/new`}
      searchPlaceholder="Search your work"
      columns={['Item', 'Details', 'Status']}
      rows={rows}
      emptyLabel="Nothing in the queue."
      onRowAction={handleAction}
      status={null}
    />
  </>
}

export function ObsidianInvitationsManagement({ model }: { model: InvitationsManagementPageModel }) {
  const router = useRouter()
  const [purpose, setPurpose] = useState<'domain_join' | 'character_claim'>('domain_join')
  const [issueState, issueAction] = useActionState<IssueInvitationState, FormData>(issueObsidianInvitationAction, { ok: false })
  const invitationRows = model.invitations.map((invitation) => ({
    id: invitation.id,
    primary: invitation.purpose,
    secondary: `${invitation.targetLabel} · ${invitation.expiresLabel}`,
    status: invitation.statusLabel,
    actions: invitation.canRevoke ? [{ key: 'revoke', label: 'Revoke', danger: true }] : [],
  }))
  const post = async (path: string, fields: Record<string, string>) => {
    const body = new FormData()
    Object.entries(fields).forEach(([key, value]) => body.set(key, value))
    await fetch(path, { method: 'POST', body })
    router.refresh()
  }
  return <div className={s.workspacePage}>
    <header className={s.pageHeading}><div><p className={s.eyebrow}>ACCESS CONTROL</p><h1>Invitations</h1><p>Invite people to join the domain or claim a character.</p></div></header>
    {statusMessage(model.status)}
    {model.canManage ? <>
      <form className={s.inviteForm} action={issueAction}>
        <input type="hidden" name="purpose" value={purpose} />
        <input type="hidden" name="domainId" value={model.domainId} />
        <input type="hidden" name="tenantSlug" value={model.domainSlug} />
        <ChoiceMenu label="Invitation purpose" value={purpose} onChange={(value) => setPurpose(value as typeof purpose)} choices={[{ value: 'domain_join', label: 'Join' }, { value: 'character_claim', label: 'Claim character' }]} />
        {purpose === 'character_claim' ? <label className={s.search}><Search size={18} /><span className={s.srOnly}>Character</span><select name="characterId" required defaultValue=""><option value="">Choose character</option>{model.claimTargets.map((target) => <option key={target.id} value={target.id}>{target.name}</option>)}</select></label> : <label className={s.search}><Search size={18} /><span className={s.srOnly}>Maximum uses</span><input name="maxUses" type="number" min="2" placeholder="Unlimited uses" /></label>}
        <button type="submit" className={s.primaryButton}><Plus size={16} /> Send invitation</button>
      </form>
      {issueState.ok && issueState.link ? <p className={s.managementStatus} role="status">Invitation created: <a href={issueState.link}>{issueState.link}</a></p> : null}
      {!issueState.ok && issueState.error ? <p className={s.formError} role="alert">That invitation could not be created.</p> : null}
    </> : null}
    <section className={s.managementSurface} aria-label="Invitations">
      <div className={s.managementTable}>
        <div className={s.managementHead}><span>Purpose</span><span>Target</span><span>Status</span><span className={s.srOnly}>Actions</span></div>
        {invitationRows.map((row) => <div className={s.managementRow} key={row.id}><strong>{row.primary}</strong><span>{row.secondary}</span><span className={s.managementStatus}>{row.status}</span>{row.actions?.length ? <span className={s.srOnly}>{row.actions.map((action) => action.label).join(' ')}</span> : null}<ActionMenu label={`Actions for ${row.secondary}`} trigger={<MoreHorizontal size={18} />} items={row.actions ?? []} onAction={(action) => { if (action.key === 'revoke') void post('/api/invitations/revoke', { invitationId: String(row.id), tenantSlug: model.domainSlug }) }} /></div>)}
      </div>
      {invitationRows.length === 0 ? <p className={s.managementEmpty}>No invitation links yet.</p> : null}
      <div className={s.requestColumns}>
        <div className={s.requestColumn}><p className={s.eyebrow}>PENDING JOINS</p>{model.pendingJoins.length === 0 ? <p className={s.managementEmpty}>None.</p> : model.pendingJoins.map((request) => <div className={s.requestRow} key={request.id}><span>{request.applicantLabel} → {request.characterLabel}</span><ActionMenu label={`Actions for ${request.applicantLabel}`} trigger={<MoreHorizontal size={16} />} items={[{ key: 'approve', label: 'Approve' }, { key: 'deny', label: 'Deny', danger: true }]} onAction={(action) => { if (action.key === 'approve' || action.key === 'deny') void post('/api/invitations/join-decision', { requestId: String(request.id), tenantSlug: model.domainSlug, decision: action.key === 'approve' ? 'approved' : 'rejected' }) }} /></div>)}</div>
        <div className={s.requestColumn}><p className={s.eyebrow}>PENDING CLAIMS</p>{model.pendingClaims.length === 0 ? <p className={s.managementEmpty}>None.</p> : model.pendingClaims.map((request) => <div className={s.requestRow} key={request.id}><span>{request.characterLabel} ← {request.claimantLabel}</span><ActionMenu label={`Actions for ${request.claimantLabel}`} trigger={<MoreHorizontal size={16} />} items={[{ key: 'approve', label: 'Approve' }, { key: 'deny', label: 'Deny', danger: true }]} onAction={(action) => { if (action.key === 'approve' || action.key === 'deny') void post('/api/character-claims', { action: 'decide', claimId: String(request.id), characterId: String(model.claimTargets.find((target) => target.name === request.characterLabel)?.id ?? ''), tenantSlug: model.domainSlug, decision: action.key === 'approve' ? 'approved' : 'rejected' }) }} /></div>)}</div>
      </div>
    </section>
  </div>
}
