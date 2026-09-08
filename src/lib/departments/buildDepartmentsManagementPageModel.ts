import type { Domain, Tenant } from '@/payload-types'

import type { DepartmentsManagementPageModel } from '@/lib/page-models/management/departments'
import { getSubdomainsForDomain } from '@/lib/domains/queries'
import { PLATFORM_NOUNS as vocab } from '@/lib/theme/nouns'

import { departmentStatusDescriptor } from './departmentStatus'

/**
 * Departments management Page Model builder (OBSIDIAN-T07). Admission comes
 * from the decision engine (never `role === 'admin'`); row-level archive/
 * restore capability mirrors the route's current admin scope. Copy matches
 * the previous inline route exactly.
 */
export async function buildDepartmentsManagementPageModel(input: {
  tenant: Domain | Tenant
  user: { id: number | string } | null
  activeCharacterId?: number | string | null
  statusQuery?: { error?: string }
}): Promise<DepartmentsManagementPageModel> {
  const { tenant, user, activeCharacterId, statusQuery } = input
  const baseUrl = `/domain/${tenant.slug}`
  const { loadCachedAuthorizationSession } = await import('@/lib/authz/sessionCache')
  const { decideOne } = await import('@/lib/authz/session')
  const { getLorePayload } = await import('@/lib/payload')
  const payload = await getLorePayload()
  const session = user ? await loadCachedAuthorizationSession(payload, Number(user.id), activeCharacterId ?? null, tenant.id) : null
  // P08-GATE-01: workspace admission from the decision engine, never role === 'admin'.
  const canManage = Boolean(session && (session.authority != null || decideOne(session, 'manage_subdomain', { type: 'Domain', id: Number(tenant.id) }).allowed))
  const departments = await getSubdomainsForDomain(tenant.id)
  return {
    baseUrl,
    domainSlug: tenant.slug,
    domainName: tenant.name,
    canCreate: canManage,
    departments: departments.map((department) => ({
      id: Number(department.id),
      name: department.name,
      slug: department.slug,
      archived: !department.publicListing,
      canArchive: canManage && Boolean(department.publicListing),
      canRestore: canManage && !department.publicListing,
    })),
    status: departmentStatusDescriptor(statusQuery?.error),
    vocabulary: { subdomainSingular: vocab.subdomain.singular, subdomainPlural: vocab.subdomain.plural, roleSingular: vocab.role.singular },
  }
}