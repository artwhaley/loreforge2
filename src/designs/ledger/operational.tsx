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
 * Ledger-owned operational entrypoints (OBSIDIAN-T08). Each is a first-class
 * slot body living in Ledger's Design definition. Ledger may reuse the shared
 * operational bodies (the low-level shared functional primitives) while the
 * surface tracks the current information architecture; Ledger can later
 * diverge presentation per surface without touching routes, models, or other
 * Designs.
 */

export function LedgerWork(props: WorkDesignViewProps) {
  return <WorkBody {...props} />
}

export function LedgerMembers(props: MembersPageModel) {
  return <MembersBody {...props} />
}

export function LedgerDepartments(props: DepartmentsManagementPageModel) {
  return <DepartmentsBody {...props} />
}

export function LedgerFolders(props: FolderManagementPageModel) {
  return <FoldersBody {...props} />
}

export function LedgerRoles(props: RoleManagementPageModel) {
  return <RolesBody {...props} />
}

export function LedgerDocumentTypes(props: DocumentTypesManagementPageModel) {
  return <DocumentTypesBody {...props} />
}

export function LedgerPeople(props: PeopleManagementPageModel) {
  return <PeopleBody {...props} />
}

export function LedgerPerson(props: PersonManagementPageModel) {
  return <PersonBody {...props} />
}

export function LedgerInvitations(props: InvitationsManagementPageModel) {
  return <InvitationsBody {...props} />
}