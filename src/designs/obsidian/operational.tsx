import type { MembersPageModel } from '@/lib/page-models/members'
import type { FolderManagementPageModel } from '@/lib/page-models/management/folders'
import type { RoleManagementPageModel } from '@/lib/page-models/management/roles'
import type { DocumentTypesManagementPageModel } from '@/lib/page-models/management/documentTypes'
import type { PeopleManagementPageModel, PersonManagementPageModel } from '@/lib/page-models/management/people'
import type { InvitationsManagementPageModel } from '@/lib/page-models/management/invitations'
import type { DepartmentsManagementPageModel } from '@/lib/page-models/management/departments'
import type { WorkDesignViewProps } from '@/lib/design/types'
import { FolderManager } from '@/components/folders/FolderManager'
import { DocumentTypesBrowser } from '@/components/documentTypes/DocumentTypesBrowser'
import { RoleManager } from '@/components/roles/RoleManager'
import { PeopleSearch } from '@/components/functional/people/PeopleSearch'
import { ObsidianCharacterProfile } from './ObsidianCharacterProfile'

import { DepartmentsBody, InvitationsBody, MembersBody, RolesBody, WorkBody } from '../shared/operational/bodies'

/**
 * Obsidian operational entrypoints. Presentation may reuse shared functional
 * primitives, but every route resolves through this Design-owned slot map and
 * every mutation remains behind the shared workspace/action boundary.
 */

export function ObsidianWork(props: WorkDesignViewProps) {
  return <WorkBody {...props} />
}

export function ObsidianMembers(props: MembersPageModel) {
  return <MembersBody {...props} />
}

export function ObsidianDepartments(props: DepartmentsManagementPageModel) {
  return <DepartmentsBody {...props} />
}

export function ObsidianFolders(props: FolderManagementPageModel) {
  return <section className="obsidian-management-surface"><p><a href={`/domain/${props.domainSlug}`}>← Domain home</a></p><h1>Folders</h1>{props.status ? <p role="alert">{props.status.message}</p> : null}<FolderManager model={props} /></section>
}

export function ObsidianRoles(props: RoleManagementPageModel) {
  return <section className="obsidian-management-surface"><p><a href={`/domain/${props.domainSlug}`}>← Domain home</a></p><h1>Roles</h1>{props.status ? <p role="alert">{props.status.message}</p> : null}<RoleManager model={props} /></section>
}

export function ObsidianDocumentTypes(props: DocumentTypesManagementPageModel) {
  return <section className="obsidian-management-surface"><p><a href={`/domain/${props.domainSlug}`}>← Domain home</a></p><h1>Document Types</h1>{props.status ? <p role="alert">{props.status.message}</p> : null}<DocumentTypesBrowser model={props} /></section>
}

export function ObsidianPeople(props: PeopleManagementPageModel) {
  return <section className="obsidian-management-surface"><p><a href={`/domain/${props.domainSlug}`}>← Domain home</a></p><h1>People</h1>{props.status ? <p role="alert">{props.status.message}</p> : null}{props.canOpenPeople ? <PeopleSearch domainSlug={props.domainSlug} /> : <p>People management is not available to this identity.</p>}</section>
}

export function ObsidianPerson(props: PersonManagementPageModel) {
  return <ObsidianCharacterProfile model={props} />
}

export function ObsidianInvitations(props: InvitationsManagementPageModel) {
  return <InvitationsBody {...props} />
}
