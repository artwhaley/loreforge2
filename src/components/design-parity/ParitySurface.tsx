'use client'

import type { AboutPageModel, LorePageModel } from '@/lib/page-models/info'
import type { DepartmentPageModel, DepartmentsPageModel } from '@/lib/page-models/departments'
import type { DocumentPageModel } from '@/lib/page-models/document'
import type { HomePageModel } from '@/lib/page-models/home'
import type { MembersPageModel } from '@/lib/page-models/members'
import type { RecordsPageModel } from '@/lib/page-models/records'
import type { DepartmentsManagementPageModel } from '@/lib/page-models/management/departments'
import type { DocumentTypesManagementPageModel } from '@/lib/page-models/management/documentTypes'
import type { FolderManagementPageModel } from '@/lib/page-models/management/folders'
import type { InvitationsManagementPageModel } from '@/lib/page-models/management/invitations'
import type { PeopleManagementPageModel, PersonManagementPageModel } from '@/lib/page-models/management/people'
import type { RoleManagementPageModel } from '@/lib/page-models/management/roles'
import type { WorkPageModel } from '@/lib/page-models/management/work'
import { resolveDesign } from '@/lib/design/registry'
import { designPreviewTheme } from '@/lib/design/previewTheme'
import {
  ABOUT_PREVIEW_MODEL,
  DEPARTMENT_PREVIEW_MODEL,
  DEPARTMENTS_MANAGEMENT_MODEL,
  DEPARTMENTS_PREVIEW_MODEL,
  DOCUMENT_PREVIEW_MODEL,
  DOCUMENT_TYPES_MANAGEMENT_MODEL,
  FOLDERS_MANAGEMENT_MODEL,
  HOME_PREVIEW_MODEL,
  INVITATIONS_MANAGEMENT_MODEL,
  LORE_PREVIEW_MODEL,
  MEMBERS_MANAGEMENT_MODEL,
  PEOPLE_MANAGEMENT_MODEL,
  PERSON_MANAGEMENT_MODEL,
  RECORDS_PREVIEW_MODEL,
  ROLES_MANAGEMENT_MODEL,
  SHELL_PREVIEW_MODEL,
  WORK_MANAGEMENT_MODEL,
} from '@/lib/design/fixtures'

type Surface =
  | 'home'
  | 'records'
  | 'document'
  | 'departments'
  | 'department'
  | 'about'
  | 'lore'
  | 'members'
  | 'work'
  | 'management-departments'
  | 'management-folders'
  | 'management-roles'
  | 'management-document-types'
  | 'management-people'
  | 'management-person'
  | 'management-invitations'

const PARITY_BASE = '/design-parity'

function productionParityModel<T>(model: T): T {
  const serialized = JSON.stringify(model).replaceAll('/domain/preview-domain', PARITY_BASE)
  return JSON.parse(serialized) as T
}

function pageModel(surface: Surface) {
  switch (surface) {
    case 'home': return productionParityModel(HOME_PREVIEW_MODEL) as HomePageModel
    case 'records': return productionParityModel(RECORDS_PREVIEW_MODEL) as RecordsPageModel
    case 'document': return productionParityModel(DOCUMENT_PREVIEW_MODEL) as DocumentPageModel
    case 'departments': return productionParityModel(DEPARTMENTS_PREVIEW_MODEL) as DepartmentsPageModel
    case 'department': return productionParityModel(DEPARTMENT_PREVIEW_MODEL) as DepartmentPageModel
    case 'about': return productionParityModel(ABOUT_PREVIEW_MODEL) as AboutPageModel
    case 'lore': return productionParityModel(LORE_PREVIEW_MODEL) as LorePageModel
    case 'members': return productionParityModel(MEMBERS_MANAGEMENT_MODEL) as MembersPageModel
    case 'work': return productionParityModel(WORK_MANAGEMENT_MODEL) as WorkPageModel
    case 'management-departments': return productionParityModel(DEPARTMENTS_MANAGEMENT_MODEL) as DepartmentsManagementPageModel
    case 'management-folders': return productionParityModel(FOLDERS_MANAGEMENT_MODEL) as FolderManagementPageModel
    case 'management-roles': return productionParityModel(ROLES_MANAGEMENT_MODEL) as RoleManagementPageModel
    case 'management-document-types': return productionParityModel(DOCUMENT_TYPES_MANAGEMENT_MODEL) as DocumentTypesManagementPageModel
    case 'management-people': return productionParityModel(PEOPLE_MANAGEMENT_MODEL) as PeopleManagementPageModel
    case 'management-person': return productionParityModel(PERSON_MANAGEMENT_MODEL) as PersonManagementPageModel
    case 'management-invitations': return productionParityModel(INVITATIONS_MANAGEMENT_MODEL) as InvitationsManagementPageModel
  }
}

function parityPath(surface: Surface): string {
  return surface === 'home' ? PARITY_BASE : `${PARITY_BASE}/${surface}`
}

export function ParitySurface({ surface }: { surface: string }) {
  if (!isSurface(surface)) return <p data-parity-error>Unknown parity surface: {surface}</p>

  const design = resolveDesign('obsidian')
  const theme = designPreviewTheme('obsidian', design.config.defaults)
  const config = design.config.defaults
  const shell = productionParityModel(SHELL_PREVIEW_MODEL)
  const model = pageModel(surface)
  const noop = async (_formData: FormData): Promise<void> => {}
  const body = (() => {
    switch (surface) {
      case 'home': return <design.pages.home {...model as HomePageModel} designConfig={config} headerLayout={theme.headerLayout} documentStyle={theme.documentStyle} />
      case 'records': return <design.pages.records {...model as RecordsPageModel} designConfig={config} />
      case 'document': return <design.pages.document {...model as DocumentPageModel} designConfig={config} headerLayout={theme.headerLayout} documentStyle={theme.documentStyle} workflowAction={noop} deleteAction={noop} />
      case 'departments': return <design.pages.departments {...model as DepartmentsPageModel} designConfig={config} headerLayout={theme.headerLayout} documentStyle={theme.documentStyle} />
      case 'department': return <design.pages.department {...model as DepartmentPageModel} designConfig={config} headerLayout={theme.headerLayout} documentStyle={theme.documentStyle} />
      case 'about': return <design.pages.about {...model as AboutPageModel} designConfig={config} headerLayout={theme.headerLayout} documentStyle={theme.documentStyle} />
      case 'lore': return <design.pages.lore {...model as LorePageModel} designConfig={config} headerLayout={theme.headerLayout} documentStyle={theme.documentStyle} />
      case 'members': return <design.pages.members {...model as MembersPageModel} designConfig={config} headerLayout={theme.headerLayout} documentStyle={theme.documentStyle} />
      case 'work': return <design.pages.work {...model as WorkPageModel} designConfig={config} headerLayout={theme.headerLayout} documentStyle={theme.documentStyle} approveAction={noop} rejectAction={noop} />
      case 'management-departments': return <design.pages.management.departments {...model as DepartmentsManagementPageModel} designConfig={config} headerLayout={theme.headerLayout} documentStyle={theme.documentStyle} />
      case 'management-folders': return <design.pages.management.folders {...model as FolderManagementPageModel} designConfig={config} headerLayout={theme.headerLayout} documentStyle={theme.documentStyle} />
      case 'management-roles': return <design.pages.management.roles {...model as RoleManagementPageModel} designConfig={config} headerLayout={theme.headerLayout} documentStyle={theme.documentStyle} />
      case 'management-document-types': return <design.pages.management.documentTypes {...model as DocumentTypesManagementPageModel} designConfig={config} headerLayout={theme.headerLayout} documentStyle={theme.documentStyle} />
      case 'management-people': return <design.pages.management.people {...model as PeopleManagementPageModel} designConfig={config} headerLayout={theme.headerLayout} documentStyle={theme.documentStyle} />
      case 'management-person': return <design.pages.management.person {...model as PersonManagementPageModel} designConfig={config} headerLayout={theme.headerLayout} documentStyle={theme.documentStyle} />
      case 'management-invitations': return <design.pages.management.invitations {...model as InvitationsManagementPageModel} designConfig={config} headerLayout={theme.headerLayout} documentStyle={theme.documentStyle} />
    }
  })()

  return (
    <div data-parity-host="production" data-parity-input={JSON.stringify({ fixtureSource: 'production/src/lib/design/fixtures.ts', surface, surfaceKey: canonicalSurfaceKey(surface), pathname: parityPath(surface), shell, page: model, config, theme: theme.tokens })}>
      <design.Shell model={shell} theme={theme} designConfig={config}>
        {body}
      </design.Shell>
    </div>
  )
}

function canonicalSurfaceKey(surface: Surface): string {
  const management = {
    'management-departments': 'management.departments',
    'management-folders': 'management.folders',
    'management-roles': 'management.roles',
    'management-document-types': 'management.documentTypes',
    'management-people': 'management.people',
    'management-person': 'management.person',
    'management-invitations': 'management.invitations',
  } as const
  return management[surface as keyof typeof management] ?? surface
}

function isSurface(value: string): value is Surface {
  return [
    'home', 'records', 'document', 'departments', 'department', 'about', 'lore', 'members', 'work',
    'management-departments', 'management-folders', 'management-roles', 'management-document-types',
    'management-people', 'management-person', 'management-invitations',
  ].includes(value)
}
