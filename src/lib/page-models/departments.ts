import type { NavigationItem } from './common'

export type DepartmentSummary = {
  id: number
  name: string
  slug: string
  description: string | null
  memberCount: number
}

/** Departments directory model. */
export type DepartmentsPageModel = {
  baseUrl: string
  domainSlug: string
  domainName: string
  departments: DepartmentSummary[]
  manageHref: string | null
  vocabulary: {
    subdomainSingular: string
    subdomainPlural: string
  }
}

export type DepartmentMember = {
  id: number
  name: string
  /** Role metadata powers the Obsidian organization chart when available. */
  characterId?: number
  roleId?: number | null
  parentRoleId?: number | null
  role?: string
}

/** Department detail page model. */
export type DepartmentPageModel = {
  baseUrl: string
  domainSlug: string
  slug?: string
  name: string
  description: string | null
  members: DepartmentMember[]
  /** Sibling departments used by the public detail-page tab strip. */
  departments?: DepartmentSummary[]
  folderNames: string[]
  manageHref: string | null
  vocabulary: {
    subdomainSingular: string
    subdomainPlural: string
    folderPlural: string
    memberPlural: string
  }
  destinations: NavigationItem[]
}
