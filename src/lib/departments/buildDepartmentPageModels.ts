import type { Character, Domain, Tenant, User } from '@/payload-types'

import type { AboutPageModel, LorePageModel } from '@/lib/page-models/info'
import type { DepartmentPageModel, DepartmentsPageModel } from '@/lib/page-models/departments'
import { getDepartmentParticipants, getSubdomainBySlug, getSubdomainsForDomain } from '@/lib/domains/queries'
import { getFoldersForTenant, getPageForTenant } from '@/lib/tenant/queries'
import { renderMarkdown } from '@/lib/markdown/render'
import { PLATFORM_NOUNS as vocab } from '@/lib/theme/nouns'

/** Thin-page builders (Stage J): small semantic models, no layout concepts. */
export async function buildDepartmentsPageModel(input: {
  tenant: Domain | Tenant
  role: 'admin' | 'member' | null
}): Promise<DepartmentsPageModel> {
  const { tenant, role } = input
  const baseUrl = `/domain/${tenant.slug}`
  const departments = await getSubdomainsForDomain(tenant.id)
  const memberCounts = new Map<number, number>()
  await Promise.all(departments.map(async (department) => { memberCounts.set(Number(department.id), (await getDepartmentParticipants(department.id)).length) }))
  return {
    baseUrl,
    domainSlug: tenant.slug,
    domainName: tenant.name,
    departments: departments.map((department) => ({
      id: Number(department.id),
      name: department.name,
      slug: department.slug,
      description: department.description ?? null,
      memberCount: memberCounts.get(Number(department.id)) ?? 0,
    })),
    manageHref: role === 'admin' ? `${baseUrl}/manage/people` : null,
    vocabulary: { subdomainSingular: vocab.subdomain.singular, subdomainPlural: vocab.subdomain.plural },
  }
}

export async function buildDepartmentPageModel(input: {
  tenant: Domain | Tenant
  role: 'admin' | 'member' | null
  departmentSlug: string
}): Promise<DepartmentPageModel | null> {
  const { tenant, role, departmentSlug } = input
  const baseUrl = `/domain/${tenant.slug}`
  const department = await getSubdomainBySlug(tenant.id, departmentSlug)
  if (!department) return null
  const [memberships, folders] = await Promise.all([
    getDepartmentParticipants(department.id),
    getFoldersForTenant(tenant),
  ])
  const departmentFolders = folders.filter((folder) => Number(typeof folder.subdomain === 'object' ? folder.subdomain?.id : folder.subdomain) === Number(department.id))
  return {
    baseUrl,
    domainSlug: tenant.slug,
    name: department.name,
    description: department.description ?? null,
    members: memberships.map((membership) => {
      const character = typeof membership.character === 'object' ? membership.character : null
      return { id: Number(membership.id), name: character?.name ?? 'Unknown Character' }
    }),
    folderNames: departmentFolders.map((folder) => folder.name),
    manageHref: role === 'admin' ? `${baseUrl}/manage/people` : null,
    vocabulary: { subdomainSingular: vocab.subdomain.singular, subdomainPlural: vocab.subdomain.plural, folderPlural: vocab.folder.plural, memberPlural: vocab.member.plural },
    destinations: [{ label: vocab.subdomain.plural, segment: 'departments', href: `${baseUrl}/departments` }],
  }
}

export async function buildAboutPageModel(input: {
  tenant: Domain | Tenant
  user: Pick<User, 'id'> | null
}): Promise<AboutPageModel> {
  const { tenant, user } = input
  const baseUrl = `/domain/${tenant.slug}`
  const page = await getPageForTenant(tenant, 'about')
  return {
    baseUrl,
    bodyHtml: page ? renderMarkdown(page.body) : '',
    editHref: user && page ? `${baseUrl}/pages/about/edit` : null,
    destinations: [],
  }
}

export async function buildLorePageModel(input: { tenant: Domain | Tenant }): Promise<LorePageModel> {
  return { baseUrl: `/domain/${input.tenant.slug}`, destinations: [] }
}
