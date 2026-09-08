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
 * POSTER COMPATIBILITY operational renderers (OBSIDIAN-T08).
 *
 * Poster's `status` is 'compatibility' (not 'first-class'); these renderers
 * satisfy the required slot shape so the compatibility Design stays usable,
 * but they are explicitly NOT first-class conformance bodies — they delegate
 * to the shared operational bodies and carry no Poster-owned presentation.
 * First-class conformance is gated at T09; Poster's bodies must be replaced
 * or its Design re-classified before Poster can be promoted.
 */

export function PosterWork(props: WorkDesignViewProps) {
  return <WorkBody {...props} />
}

export function PosterMembers(props: MembersPageModel) {
  return <MembersBody {...props} />
}

export function PosterDepartments(props: DepartmentsManagementPageModel) {
  return <DepartmentsBody {...props} />
}

export function PosterFolders(props: FolderManagementPageModel) {
  return <FoldersBody {...props} />
}

export function PosterRoles(props: RoleManagementPageModel) {
  return <RolesBody {...props} />
}

export function PosterDocumentTypes(props: DocumentTypesManagementPageModel) {
  return <DocumentTypesBody {...props} />
}

export function PosterPeople(props: PeopleManagementPageModel) {
  return <PeopleBody {...props} />
}

export function PosterPerson(props: PersonManagementPageModel) {
  return <PersonBody {...props} />
}

export function PosterInvitations(props: InvitationsManagementPageModel) {
  return <InvitationsBody {...props} />
}