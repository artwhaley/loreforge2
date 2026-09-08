import type { MembersPageModel } from '@/lib/page-models/members'
import type { FolderManagementPageModel } from '@/lib/page-models/management/folders'
import type { RoleManagementPageModel } from '@/lib/page-models/management/roles'
import type { DocumentTypesManagementPageModel } from '@/lib/page-models/management/documentTypes'
import type { PeopleManagementPageModel, PersonManagementPageModel } from '@/lib/page-models/management/people'
import type { InvitationsManagementPageModel } from '@/lib/page-models/management/invitations'
import type { DepartmentsManagementPageModel } from '@/lib/page-models/management/departments'
import type { WorkDesignViewProps } from '@/lib/design/types'
import { ObsidianCharacterProfile } from './ObsidianCharacterProfile'
import { ObsidianDocumentTypes as ObsidianDocumentTypesSurface } from './ObsidianDocumentTypes'
import { ObsidianFolderManager } from './ObsidianFolderManager'
import { ObsidianMembersDirectory } from './ObsidianMembersDirectory'
import {
  ObsidianDepartmentsManagement,
  ObsidianInvitationsManagement,
  ObsidianPeopleManagement,
  ObsidianPersonManagement,
  ObsidianRolesManagement,
  ObsidianWork as ObsidianWorkSurface,
} from './ObsidianOperationalSurfaces'

/**
 * Obsidian operational entrypoints. Presentation may reuse shared functional
 * primitives, but every route resolves through this Design-owned slot map and
 * every mutation remains behind the shared workspace/action boundary.
 */

export function ObsidianWork(props: WorkDesignViewProps) {
  return <ObsidianWorkSurface {...props} />
}

export function ObsidianMembers(props: MembersPageModel) {
  return <ObsidianMembersDirectory model={props} />
}

export function ObsidianDepartments(props: DepartmentsManagementPageModel) {
  return <ObsidianDepartmentsManagement model={props} />
}

export function ObsidianFolders(props: FolderManagementPageModel) {
  return <ObsidianFolderManager model={props} />
}

export function ObsidianRoles(props: RoleManagementPageModel) {
  return <ObsidianRolesManagement model={props} />
}

export function ObsidianDocumentTypes(props: DocumentTypesManagementPageModel) {
  return <ObsidianDocumentTypesSurface model={props} />
}

export function ObsidianPeople(props: PeopleManagementPageModel) {
  return <ObsidianPeopleManagement model={props} />
}

export function ObsidianPerson(props: PersonManagementPageModel) {
  return <ObsidianCharacterProfile model={props} />
}

export function ObsidianInvitations(props: InvitationsManagementPageModel) {
  return <ObsidianInvitationsManagement model={props} />
}
