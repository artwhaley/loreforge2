import { notFound } from 'next/navigation'

import { getActiveTenant } from '@/lib/tenant/activeTenant'
import { getLorePayload } from '@/lib/payload'
import { resolveDomainRouteShell } from '@/lib/design/resolveRoute'
import { ObsidianPublicCharacterProfile } from '@/designs/obsidian/ObsidianPublicCharacterProfile'

type Props = { params: Promise<{ slug: string; id: string }> }

export const dynamic = 'force-dynamic'

const relationId = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null
  return typeof value === 'object' && value !== null && 'id' in value
    ? Number((value as { id: number | string }).id)
    : Number(value)
}

export default async function DomainCharacterProfilePage({ params }: Props) {
  const { slug, id } = await params
  const characterId = Number(id)
  if (!Number.isFinite(characterId)) notFound()

  const context = await getActiveTenant()
  const { tenant, role, user, activeCharacter } = context
  if (!tenant || tenant.slug !== slug) notFound()

  const payload = await getLorePayload()
  const [route, character, localContexts, roles] = await Promise.all([
    resolveDomainRouteShell({ tenant, role, user, activeCharacter }),
    payload.findByID({ collection: 'characters', id: characterId, depth: 1 }),
    payload.find({
      collection: 'domain-character-contexts',
      where: { and: [{ domain: { equals: tenant.id } }, { character: { equals: characterId } }] },
      depth: 0,
      limit: 1,
    }),
    payload.find({
      collection: 'roles',
      where: { and: [{ domain: { equals: tenant.id } }, { active: { equals: true } }] },
      depth: 1,
      limit: 0,
      pagination: false,
    }),
  ])
  if (!character || character.kind === 'domain_admin' || character.kind === 'platform_admin') notFound()

  const roleIds = roles.docs.map((item) => Number(item.id))
  const assignments = roleIds.length === 0
    ? { docs: [] }
    : await payload.find({
        collection: 'role-assignments',
        where: { and: [{ character: { equals: characterId } }, { role: { in: roleIds } }, { status: { equals: 'active' } }] },
        depth: 1,
        limit: 20,
      })
  const roleById = new Map(roles.docs.map((item) => [Number(item.id), item]))
  const assignment = assignments.docs[0]
  const assignedRoleId = relationId(assignment?.role)
  const assignedRole = assignedRoleId === null ? null : roleById.get(assignedRoleId) ?? null
  const department = assignedRole && typeof assignedRole.subdomain === 'object' ? assignedRole.subdomain : null
  const departmentName = department?.name ?? 'Domain members'
  const departmentHref = department ? `/domain/${tenant.slug}/departments/${department.slug}` : `/domain/${tenant.slug}/members`
  const roleName = assignedRole?.name ?? 'Member'
  const localNote = localContexts.docs[0]?.localNote ?? ''
  const focus = localNote || character.bio || 'the shared work of the Domain'

  const Shell = route.design.Shell
  return (
    <Shell model={route.shell} theme={{ tokens: route.cssVars, headerLayout: route.headerLayout, documentStyle: route.documentStyle }} designConfig={route.config as object}>
      {route.design.key === 'obsidian' ? (
        <ObsidianPublicCharacterProfile
          departmentHref={departmentHref}
          departmentName={departmentName}
          name={character.name}
          role={roleName}
          focus={focus}
          description={department?.description ?? null}
        />
      ) : (
        <main>
          <a href={`/domain/${tenant.slug}/members`}>Back to members</a>
          <h1>{character.name}</h1>
          <p>{character.bio || 'No public profile has been written yet.'}</p>
        </main>
      )}
    </Shell>
  )
}
