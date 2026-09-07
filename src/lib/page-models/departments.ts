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
}

/** Department detail page model. */
export type DepartmentPageModel = {
  baseUrl: string
  domainSlug: string
  name: string
  description: string | null
  members: DepartmentMember[]
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