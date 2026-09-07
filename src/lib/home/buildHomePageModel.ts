import type { Character, Domain, Tenant, User } from '@/payload-types'

import type { HomePageModel } from '@/lib/page-models/home'
import { loadDomainHome } from '@/lib/theme/home'

/**
 * Home page model assembly (Stage E). The existing `loadDomainHome()` already
 * separates server work from presentation; this reshapes its output into the
 * explicit semantic HomePageModel. Hard-coded quick-link composition moves
 * into the model as semantic destinations — Designs decide how to present them.
 */
export async function buildHomePageModel(input: {
  tenant: Domain | Tenant
  user: Pick<User, 'id'>
  activeCharacter: Character | null
}): Promise<HomePageModel> {
  const { tenant, user, activeCharacter } = input
  const { home } = await loadDomainHome(tenant, user, activeCharacter)
  const baseUrl = home.base
  return {
    baseUrl,
    domain: { name: home.name, motto: home.motto },
    welcome: { html: home.welcomeHtml, editHref: home.editHref ?? null },
    destinations: [
      { label: 'About', segment: 'about', href: `${baseUrl}/about` },
      { label: 'Lore', segment: 'lore', href: `${baseUrl}/lore` },
      { label: 'Departments', segment: 'departments', href: `${baseUrl}/departments` },
      { label: 'Records', segment: 'records', href: `${baseUrl}/records` },
    ],
    recentRecords: home.records.map((record) => ({ id: record.id, title: record.title, type: record.type, activity: record.activity })),
  }
}