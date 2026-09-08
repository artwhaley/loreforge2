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
 * Civic-owned operational entrypoints (OBSIDIAN-T08). Each is a first-class
 * slot body living in Civic's Design definition. Currently they render the
 * shared operational bodies (tracking the established information
 * architecture); Civic may diverge its presentation per surface later without
 * touching routes, models, or the other Designs.
 */

export function CivicWork(props: WorkDesignViewProps) {
  return <WorkBody {...props} />
}

export function CivicMembers(props: MembersPageModel) {
  return <MembersBody {...props} />
}

export function CivicDepartments(props: DepartmentsManagementPageModel) {
  return <DepartmentsBody {...props} />
}

export function CivicFolders(props: FolderManagementPageModel) {
  return <FoldersBody {...props} />
}

export function CivicRoles(props: RoleManagementPageModel) {
  return <RolesBody {...props} />
}

export function CivicDocumentTypes(props: DocumentTypesManagementPageModel) {
  return <DocumentTypesBody {...props} />
}

export function CivicPeople(props: PeopleManagementPageModel) {
  return <PeopleBody {...props} />
}

export function CivicPerson(props: PersonManagementPageModel) {
  return <PersonBody {...props} />
}

export function CivicInvitations(props: InvitationsManagementPageModel) {
  return <InvitationsBody {...props} />
}