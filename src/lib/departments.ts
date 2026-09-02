/**
 * Lightweight department directory for the tenant website's Departments page.
 *
 * Per the ticket this is explicitly fixture content, isolated here so it is
 * clear it is not a real org-chart/HCM subsystem (spec §10 seams, guardrails).
 * A future ticket could promote this to a collection without changing the page.
 */

export type Department = {
  name: string
  description: string
  phone: string
}

export const DEPARTMENTS: Record<string, Department[]> = {
  ravenhurst: [
    {
      name: 'City Hall',
      description: 'Mayor, clerk, and general municipal administration.',
      phone: '555-2100',
    },
    {
      name: 'Police Department',
      description: 'Public safety, patrol, and incident reporting.',
      phone: '555-3110',
    },
    {
      name: 'Municipal Court',
      description: 'Code enforcement, citations, and minor proceedings.',
      phone: '555-4100',
    },
  ],
  'port-victoria': [
    {
      name: 'Administration',
      description: 'City manager, permits, and municipal services.',
      phone: '555-7000',
    },
    {
      name: 'Public Safety',
      description: 'Police, fire, and emergency response coordination.',
      phone: '555-8000',
    },
    {
      name: 'Harbor Authority',
      description: 'Marina, waterfront, and maritime operations.',
      phone: '555-9000',
    },
  ],
}

export function getDepartmentsForTenant(tenantSlug: string): Department[] {
  return DEPARTMENTS[tenantSlug] ?? []
}
