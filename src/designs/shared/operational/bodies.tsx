'use client'

import Link from 'next/link'

import { FolderManager } from '@/components/folders/FolderManager'
import { RoleManager } from '@/components/roles/RoleManager'
import { DocumentTypesBrowser } from '@/components/documentTypes/DocumentTypesBrowser'
import { FolderTree, RoleTree } from '@/components/people/PersonAccessTrees'
import { IssueCharacterInvitationPanel, IssueDomainJoinPanel } from '@/components/invitations/IssueInvitationPanel'
import { PeopleSearch } from '@/components/functional/people/PeopleSearch'
import type { MembersPageModel } from '@/lib/page-models/members'
import type { FolderManagementPageModel } from '@/lib/page-models/management/folders'
import type { RoleManagementPageModel } from '@/lib/page-models/management/roles'
import type { DocumentTypesManagementPageModel } from '@/lib/page-models/management/documentTypes'
import type { PeopleManagementPageModel, PersonManagementPageModel } from '@/lib/page-models/management/people'
import type { InvitationsManagementPageModel } from '@/lib/page-models/management/invitations'
import type { DepartmentsManagementPageModel } from '@/lib/page-models/management/departments'
import type { WorkDesignViewProps } from '@/lib/design/types'

import peopleStyles from '@/components/functional/people/people.module.scss'
import personStyles from '@/components/people/PersonWorkspace.module.scss'

/**
 * Shared operational bodies (OBSIDIAN-T08). These are the refactored current
 * route bodies as presentational components consuming the Page Models and
 * action bridges. First-class Designs (Civic/Ledger) own their entrypoints in
 * their own operational modules; these shared bodies are the low-level shared
 * functional primitives both may reuse while the operational surface tracks
 * the current information architecture.
 */

export function FoldersBody(model: FolderManagementPageModel) {
  return (
    <section>
      <p><a href={`/domain/${model.domainSlug}`}>← Domain home</a></p>
      <h1>Folders</h1>
      <FolderManager model={model} />
    </section>
  )
}

export function RolesBody(model: RoleManagementPageModel) {
  return (
    <section>
      <p><a href={`/domain/${model.domainSlug}`}>← Domain home</a></p>
      <h1>Roles</h1>
      <RoleManager model={model} />
    </section>
  )
}

export function DocumentTypesBody(model: DocumentTypesManagementPageModel) {
  return (
    <section style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gap: '1.2rem' }}>
      <nav aria-label="Document Types"><Link href={`/domain/${model.domainSlug}/document-types`} aria-current="page" title="Document Types are the first-order item; Templates and Forms hang off them">Document Types</Link> · <Link href={`/domain/${model.domainSlug}/templates`} title="Standalone Markdown templates">Templates</Link> · <Link href={`/domain/${model.domainSlug}/forms`} title="Standalone form templates">Forms</Link></nav>
      <div><h1>Document Types</h1><p>Document Types are the first-order item, organized by Department. Templates and Forms hang off each Type.</p></div>
      {model.status ? <p role="alert">{model.status.message}</p> : null}
      <DocumentTypesBrowser model={model} />
    </section>
  )
}

export function PeopleBody(model: PeopleManagementPageModel) {
  return (
    <section className={peopleStyles.page}>
      <p className={peopleStyles.crumb}><a href={`/domain/${model.domainSlug}`}>{model.domainName}</a> / People</p>
      <div className={peopleStyles.header}><div><h1>People</h1><p>Find a Character, then manage their Department Roles and Folder access in one workspace.</p></div><a href={`/domain/${model.domainSlug}/departments`}>View Departments</a></div>
      <PeopleSearch domainSlug={model.domainSlug} />
      <p className={peopleStyles.help}>Search results appear as you type. Choose a Character to open their workspace; Roles and Folder access are separate controls.</p>
    </section>
  )
}

export function PersonBody(model: PersonManagementPageModel) {
  const displayName = model.localDisplayName || model.character.name
  return (
    <section className={personStyles.page}>
      <p className={personStyles.crumb}><a href={`/domain/${model.domainSlug}/manage/people`}>People</a> / {displayName}</p>
      <header className={personStyles.identityHeader}>
        <div className={personStyles.nameLine}><h1>{displayName}</h1><span className={personStyles.characterHandle}>{model.controller?.name || model.controller?.email || 'Unclaimed Character'}</span></div>
        {model.canManageMembers ? <form action="/api/domain-memberships" method="post" className={personStyles.removeForm}><input type="hidden" name="domainSlug" value={model.domainSlug} /><input type="hidden" name="characterId" value={model.character.id} /><input type="hidden" name="action" value="remove" /><button type="submit">Remove from Domain</button></form> : null}
      </header>
      <RoleTree domainSlug={model.domainSlug} characterId={model.character.id} departments={model.roleDepartments} initialMode={model.roleFilter} />
      <section className={personStyles.typeAccess} aria-labelledby="type-access-heading">
        <div className={personStyles.detailHeading}><h2 id="type-access-heading">Record Type access</h2><p className={personStyles.panelMeta}>Effective access for {displayName}, from Type grants and any Folder restrictions.</p></div>
        {model.typeAccess.length === 0 ? <p className={personStyles.panelMeta}>No active Document Types in this Domain.</p> : <table className={personStyles.typeTable}><thead><tr><th>Document Type</th><th>Read</th><th>Create</th><th>Edit</th><th>Source</th></tr></thead><tbody>{model.typeAccess.map((type) => <tr key={type.id}><td className={personStyles.typeName}>{type.name}</td><td>{type.read.allowed ? 'Allowed' : 'Denied'}</td><td>{type.create.allowed ? 'Allowed' : 'Denied'}</td><td>{type.edit.allowed ? 'Allowed' : 'Denied'}</td><td className={personStyles.typeSource}>{type.read.source}</td></tr>)}</tbody></table>}
      </section>
      <FolderTree domainSlug={model.domainSlug} characterId={model.character.id} folders={model.folderNodes} />
      <section className={personStyles.recentWork}><h2>Recent Work</h2><p>Recent work will appear here when the activity feed is connected.</p></section>
    </section>
  )
}

export function InvitationsBody(model: InvitationsManagementPageModel) {
  const slug = model.domainSlug
  return (
    <section style={{ maxWidth: 1120, margin: '0 auto', display: 'grid', gap: '1.2rem' }}>
      <nav aria-label="Domain management"><Link href={`/domain/${slug}`}>Domain home</Link> · <Link href={`/domain/${slug}/manage/people`}>People</Link> · <Link href={`/domain/${slug}/manage/invitations`} aria-current="page">Invitations</Link></nav>
      <div><h1>Invitations</h1><p>Share secure links with people you want to welcome. Loreforge does not send email.</p></div>
      {model.status?.level === 'info' ? <p role="status">{model.status.message}</p> : null}
      {model.status?.level === 'error' ? <p role="alert">{model.status.message}</p> : null}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: '1rem' }}>
        <IssueCharacterInvitationPanel domainId={model.domainId} tenantSlug={slug} targets={model.claimTargets} />
        <IssueDomainJoinPanel domainId={model.domainId} tenantSlug={slug} />
      </div>
      <div><h2>Pending Domain join requests</h2>{model.pendingJoins.length === 0 ? <p>No pending join requests.</p> : <ul style={{ display: 'grid', gap: '.55rem', listStyle: 'none', padding: 0 }}>{model.pendingJoins.map((request) => <li key={request.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '.75rem', flexWrap: 'wrap', padding: '.8rem', border: '1px solid var(--tenant-border, #ddd)' }}><span><strong>{request.applicantLabel}</strong> · {request.characterLabel}</span><span style={{ display: 'inline-flex', gap: '.4rem' }}><form action="/api/invitations/join-decision" method="post"><input type="hidden" name="requestId" value={request.id} /><input type="hidden" name="tenantSlug" value={slug} /><input type="hidden" name="decision" value="approved" /><button type="submit">Approve</button></form><form action="/api/invitations/join-decision" method="post"><input type="hidden" name="requestId" value={request.id} /><input type="hidden" name="tenantSlug" value={slug} /><input type="hidden" name="decision" value="rejected" /><button type="submit">Reject</button></form></span></li> )}</ul>}</div>
      <div><h2>Issued links</h2>{model.invitations.length === 0 ? <p>No invitation links yet.</p> : <div style={{ overflowX: 'auto' }}><table><thead><tr><th>Purpose</th><th>Target</th><th>Issued</th><th>Expires</th><th>Uses</th><th>State</th><th /></tr></thead><tbody>{model.invitations.map((invitation) => <tr key={invitation.id}><td>{invitation.purpose}</td><td>{invitation.targetLabel}</td><td>{invitation.issuedByLabel ?? '—'}</td><td>{invitation.expiresLabel}</td><td>{invitation.useLabel}</td><td>{invitation.statusLabel}</td><td>{invitation.canRevoke ? <form action="/api/invitations/revoke" method="post"><input type="hidden" name="invitationId" value={invitation.id} /><input type="hidden" name="tenantSlug" value={slug} /><button type="submit">Revoke</button></form> : null}</td></tr>)}</tbody></table></div>}</div>
    </section>
  )
}

export function DepartmentsBody(model: DepartmentsManagementPageModel) {
  const slug = model.domainSlug
  const vocab = model.vocabulary
  return (
    <section><p><a href={`/domain/${slug}/departments`}>{vocab.subdomainPlural}</a> / Manage</p><h1>Manage {vocab.subdomainPlural}</h1>{model.status ? <p role="alert">{model.status.message}</p> : null}<p>Create the working groups in this Domain. {vocab.subdomainSingular} membership and {vocab.roleSingular} assignments remain managed from each person’s workspace.</p><h2>New {vocab.subdomainSingular}</h2><form action="/api/departments" method="post"><input type="hidden" name="domainSlug" value={slug} /><label>{vocab.subdomainSingular} name <input name="name" placeholder="e.g. Hall of Coin" required autoFocus /></label> <button type="submit">Create {vocab.subdomainSingular}</button></form><h2>Existing {vocab.subdomainPlural}</h2>{model.departments.length === 0 ? <p>No {vocab.subdomainPlural.toLowerCase()} yet.</p> : <ul>{model.departments.map((department) => <li key={department.id}><strong>{department.name}</strong> <code>/{department.slug}</code> <a href={`/domain/${slug}/departments/${department.slug}`}>Open</a>{department.archived ? ' (hidden)' : ''} {department.canArchive ? <form style={{ display: 'inline' }} action="/api/departments" method="post"><input type="hidden" name="domainSlug" value={slug} /><input type="hidden" name="departmentId" value={department.id} /><input type="hidden" name="action" value="archive" /><button type="submit" title="Archive this Department — its Document Types move under Unassigned until it is restored">Archive</button></form> : department.canRestore ? <form style={{ display: 'inline' }} action="/api/departments" method="post"><input type="hidden" name="domainSlug" value={slug} /><input type="hidden" name="departmentId" value={department.id} /><input type="hidden" name="action" value="restore" /><button type="submit" title="Restore this Department — its Document Types return from Unassigned to a normal root">Restore</button></form> : null}</li>)}</ul>}</section>
  )
}

export function WorkBody(props: WorkDesignViewProps) {
  const slug = props.domainSlug
  const requestEntries = props.entries.filter((entry) => entry.kind === 'join' || entry.kind === 'claim')
  const documentEntries = props.entries.filter((entry) => entry.kind === 'document')
  return (
    <section style={{ maxWidth: 1050, margin: '0 auto', display: 'grid', gap: '1rem' }}>
      <nav aria-label="Work navigation"><Link href={`/domain/${slug}`}>Domain home</Link> · <Link href={`/domain/${slug}/work`} aria-current="page">Work</Link>{props.domainAdmin ? <> · <Link href={`/domain/${slug}/manage/invitations`}>Invitations</Link></> : null}</nav>
      <div><h1>Work</h1><p>{props.domainAdmin ? 'Requests and records that need your attention in this Domain.' : 'Records you are allowed to approve in this Domain.'}</p></div>
      {props.domainAdmin ? <section><h2>People requests</h2>{requestEntries.length === 0 ? <p>Nothing is waiting for a Domain decision.</p> : <ul style={{ display: 'grid', gap: '.6rem', listStyle: 'none', padding: 0 }}>{requestEntries.map((entry) => <li key={`${entry.kind}-${entry.id}`} style={{ display: 'flex', justifyContent: 'space-between', gap: '.8rem', flexWrap: 'wrap', padding: '.8rem', border: '1px solid var(--tenant-border, #ddd)' }}><span><strong>{entry.title}</strong><br /><small>{entry.summary}</small></span><Link href={entry.href ?? `/domain/${slug}/manage/invitations`}>Open</Link></li>)}</ul>}</section> : null}
      <section><h2>Submitted records</h2>{documentEntries.length === 0 ? <p>Submitted records awaiting approval will appear here when you have <code>approve_document</code> access on their Document Type.</p> : <ul style={{ display: 'grid', gap: '.8rem', listStyle: 'none', padding: 0 }}>{documentEntries.map((entry) => <li key={`document-${entry.id}`} style={{ padding: '1rem', border: '1px solid var(--tenant-border, #ddd)' }}><h3 style={{ marginTop: 0 }}><Link href={entry.href ?? `/domain/${slug}/documents/${entry.id}`}>{entry.title}</Link></h3><p><small>{entry.folderName ? `Folder: ${entry.folderName} · ` : ''}{entry.requestedAt ? new Date(entry.requestedAt).toLocaleString() : 'Recently updated'}</small></p><div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}><form action={props.approveAction}><input type="hidden" name="tenantSlug" value={slug} /><input type="hidden" name="documentId" value={entry.id} /><input type="hidden" name="operation" value="approve" /><button type="submit">Approve and file</button></form><form action={props.rejectAction}><input type="hidden" name="tenantSlug" value={slug} /><input type="hidden" name="documentId" value={entry.id} /><input type="hidden" name="operation" value="reject" /><button type="submit">Return to Draft</button></form></div></li>)}</ul>}</section>
    </section>
  )
}

export function MembersBody(model: MembersPageModel) {
  const slug = model.domainSlug
  const vocab = model.vocabulary
  return (
    <section>
      <p><a href={`/domain/${slug}`}>← Domain home</a></p>
      <h1>{vocab.domainSingular} {vocab.memberPlural}</h1>
      <p>Characters belong to this Domain independently of their controlling account and local alias. {vocab.subdomainSingular} participation is derived from the {vocab.rolePlural} each Character holds.</p>
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
              <td>{row.departments.join(', ') ?? 'None'}</td>
              <td>{row.roles.join(', ') ?? 'None'}</td>
              {model.canSearch ? <td><form action="/api/domain-memberships" method="post"><input type="hidden" name="domainSlug" value={slug} /><input type="hidden" name="characterId" value={row.characterId} /><input type="hidden" name="action" value="remove" /><button type="submit">Remove Domain membership</button></form></td> : null}
            </tr>
          ))}
        </tbody>
      </table>
      {model.rows.length === 0 ? <p>No active Character {vocab.memberPlural.toLowerCase()} yet.</p> : null}
      <p><a href={`/domain/${slug}/departments`}>View {vocab.subdomainPlural}</a></p>
    </section>
  )
}