import type { MembersPageModel } from '@/lib/page-models/members'
import type { FolderManagementPageModel } from '@/lib/page-models/management/folders'
import type { RoleManagementPageModel } from '@/lib/page-models/management/roles'
import type { DocumentTypesManagementPageModel } from '@/lib/page-models/management/documentTypes'
import type { PeopleManagementPageModel, PersonManagementPageModel } from '@/lib/page-models/management/people'
import type { InvitationsManagementPageModel } from '@/lib/page-models/management/invitations'
import type { DepartmentsManagementPageModel } from '@/lib/page-models/management/departments'
import type { WorkDesignViewProps } from '@/lib/design/types'

import { DepartmentsBody, DocumentTypesBody, FoldersBody, InvitationsBody, MembersBody, PeopleBody, PersonBody, RolesBody, WorkBody } from '../shared/operational/bodies'

/**
 * Obsidian operational entrypoints (OBSIDIAN-T11). The slot contract is
 * required for every Design, so Obsidian declares the full set from
 * registration; T17/T18 bind the bespoke Obsidian presentations
 * (ObsidianFolderManager/ObsidianDocumentTypes/ObsidianManagement). Until
 * then these delegate to the shared operational bodies — the same posture
 * Poster's compatibility renderers take, and Obsidian's status stays
 * 'compatibility' until T19's full conformance pass.
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
  return <FoldersBody {...props} />
}

export function ObsidianRoles(props: RoleManagementPageModel) {
  return <RolesBody {...props} />
}

export function ObsidianDocumentTypes(props: DocumentTypesManagementPageModel) {
  return <DocumentTypesBody {...props} />
}

export function ObsidianPeople(props: PeopleManagementPageModel) {
  return <PeopleBody {...props} />
}

export function ObsidianPerson(props: PersonManagementPageModel) {
  return <PersonBody {...props} />
}

export function ObsidianInvitations(props: InvitationsManagementPageModel) {
  return <InvitationsBody {...props} />
}