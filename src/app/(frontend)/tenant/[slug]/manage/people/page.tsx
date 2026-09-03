import { notFound } from 'next/navigation'

import { TenantShell } from '@/components/theme/TenantShell'
import { getActiveTenant } from '@/lib/tenant/activeTenant'
import { getLorePayload } from '@/lib/payload'
import { getTenantsForUser } from '@/lib/tenant/queries'
import { resolveThemeTokens, themeTokensToCssVars } from '@/lib/theme/fonts'

import styles from './people.module.scss'

type Props = { params: Promise<{ slug: string }>; searchParams?: Promise<{ q?: string }> }
const relationId = (value: unknown): number | null => value && typeof value === 'object' && 'id' in value ? Number((value as { id: number | string }).id) : value === null || value === undefined || value === '' ? null : Number(value)

export const dynamic = 'force-dynamic'

export default async function PeoplePage({ params, searchParams }: Props) {
  const { slug } = await params
  const query = ((await searchParams)?.q ?? '').trim().toLowerCase()
  const { tenant, role, user } = await getActiveTenant()
  if (!tenant || tenant.slug !== slug || role !== 'admin') notFound()
  const payload = await getLorePayload()
  const [characters, memberships, contexts, departments, departmentMemberships, roles, assignments, domains] = await Promise.all([
    payload.find({ collection: 'characters', where: { status: { equals: 'active' } }, depth: 1, limit: 500, sort: 'name' }),
    payload.find({ collection: 'domain-memberships', where: { domain: { equals: tenant.id } }, depth: 1, limit: 500 }),
    payload.find({ collection: 'domain-character-contexts', where: { domain: { equals: tenant.id } }, depth: 1, limit: 500 }),
    payload.find({ collection: 'subdomains', where: { domain: { equals: tenant.id } }, depth: 0, limit: 200, sort: 'name' }),
    payload.find({ collection: 'subdomain-memberships', where: { status: { equals: 'active' } }, depth: 1, limit: 1000 }),
    payload.find({ collection: 'roles', where: { domain: { equals: tenant.id } }, depth: 0, limit: 500, sort: 'name' }),
    payload.find({ collection: 'role-assignments', where: { status: { equals: 'active' } }, depth: 2, limit: 1000 }),
    user ? getTenantsForUser(user.id) : Promise.resolve([]),
  ])
  const membershipByCharacter = new Map(memberships.docs.map((membership) => [String(relationId(membership.character)), membership]))
  const contextByCharacter = new Map(contexts.docs.map((context) => [String(relationId(context.character)), context]))
  const departmentById = new Map(departments.docs.map((department) => [String(department.id), department.name]))
  const departmentsByCharacter = new Map<string, string[]>()
  for (const membership of departmentMemberships.docs) {
    const departmentId = relationId(membership.subdomain)
    const characterId = relationId(membership.character)
    const departmentName = departmentId ? departmentById.get(String(departmentId)) : null
    if (characterId && departmentName) departmentsByCharacter.set(String(characterId), [...(departmentsByCharacter.get(String(characterId)) ?? []), departmentName])
  }
  const roleById = new Map(roles.docs.map((item) => [String(item.id), item.name]))
  const rolesByCharacter = new Map<string, string[]>()
  for (const assignment of assignments.docs) {
    const characterId = relationId(assignment.character)
    const roleName = roleById.get(String(relationId(assignment.role)))
    if (characterId && roleName) rolesByCharacter.set(String(characterId), [...(rolesByCharacter.get(String(characterId)) ?? []), roleName])
  }
  const rows = characters.docs.map((character) => {
    const controller = character.controlledBy && typeof character.controlledBy === 'object' ? character.controlledBy : null
    const membership = membershipByCharacter.get(String(character.id))
    const context = contextByCharacter.get(String(character.id))
    const departmentsForCharacter = departmentsByCharacter.get(String(character.id)) ?? []
    const rolesForCharacter = rolesByCharacter.get(String(character.id)) ?? []
    return { character, controller, membership, context, departments: departmentsForCharacter, roles: rolesForCharacter }
  }).filter((row) => {
    if (!query) return true
    const haystack = [row.character.name, row.context?.localDisplayName, row.controller?.name, row.membership?.status, row.departments.join(' '), row.roles.join(' ')].filter(Boolean).join(' ').toLowerCase()
    return haystack.includes(query)
  })
  return <TenantShell tenant={tenant} cssVars={themeTokensToCssVars(resolveThemeTokens(tenant))} role={role} switcherTenants={domains}>
    <section className={styles.page}><p className={styles.crumb}><a href={`/domain/${slug}`}>{tenant.name}</a> / Manage / People</p><div className={styles.header}><div><h1>People</h1><p>Start with a Character to manage Domain membership, Departments, Roles, and folder-scope facts in one place.</p></div><a href={`/domain/${slug}/departments`}>View Departments</a></div>
      <form className={styles.search} action={`/domain/${slug}/manage/people`} method="get"><label htmlFor="people-search">Find a Character</label><input id="people-search" name="q" defaultValue={query} placeholder="Name, alias, User, Department, or Role" /><button type="submit">Search</button>{query ? <a href={`/domain/${slug}/manage/people`}>Clear</a> : null}</form>
      {rows.length === 0 ? <p className={styles.empty}>No Characters match this search.</p> : <div className={styles.list}>{rows.map((row) => <article className={styles.row} key={row.character.id}><div className={styles.rowMain}><h2><a href={`/domain/${slug}/manage/people/${row.character.id}`}>{row.context?.localDisplayName || row.character.name}</a></h2><p className={styles.meta}>{row.context?.localDisplayName && row.context.localDisplayName !== row.character.name ? `${row.character.name} · ` : ''}{row.controller?.name ? `User: ${row.controller.name}` : 'Unclaimed Character'}</p></div><div className={styles.facts}><span className={row.membership?.status === 'active' ? styles.active : styles.inactive}>{row.membership?.status === 'active' ? 'Domain member' : 'Not an active member'}</span><span>{row.departments.length ? row.departments.join(', ') : 'No Department'}</span><span>{row.roles.length ? row.roles.join(', ') : 'No Role'}</span></div><a className={styles.open} href={`/domain/${slug}/manage/people/${row.character.id}`}>Open workspace →</a></article>)}</div>}
    </section>
  </TenantShell>
}
