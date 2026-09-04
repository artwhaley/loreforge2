import { NextResponse } from 'next/server'
import { getPayload } from 'payload'

import config from '@payload-config'

import { canOpenPeopleSession } from '@/lib/authz/workspaces'
import { loadAuthorizationSession } from '@/lib/authz/session'
import { getActiveContext } from '@/lib/tenant/activeTenant'

const idOf = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null
  return typeof value === 'object' && 'id' in value ? Number((value as { id: number | string }).id) : Number(value)
}

export async function GET(request: Request) {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: request.headers })
  const url = new URL(request.url)
  const domainSlug = url.searchParams.get('domainSlug')?.trim() ?? ''
  const query = url.searchParams.get('q')?.trim().toLowerCase() ?? ''
  if (!user || !domainSlug || !query) return NextResponse.json({ results: [] })
  const domainResult = await payload.find({ collection: 'domains', where: { slug: { equals: domainSlug } }, depth: 0, limit: 1 })
  const domain = domainResult.docs[0]
  if (!domain) return NextResponse.json({ results: [] }, status403())
  const active = await getActiveContext().catch(() => null)
  const activeCharacterId = active?.tenant?.slug === domainSlug ? active.activeCharacter?.id : null
  // P07P-02: admission via one request-owned session (previously a serial
  // per-capability evaluator fan-out across Domain, Departments, and Folders).
  const session = await loadAuthorizationSession(payload, { userId: user.id, activeCharacterId: activeCharacterId ?? null }, domain.id)
  if (!await canOpenPeopleSession(session)) return NextResponse.json({ results: [] }, status403())

  // P07P-05: bounded server-side search with the contract fields. Domain and
  // active-membership scoping happen in SQL; role/department joins are scoped
  // to the Domain; assignments are scoped to the Domain's active members.
  // Ranking keeps the current prefix-before-substring behavior with the
  // owner-approved stable ID tie (2026-09-04). The 25-result bound is the
  // visible interactive result cap, not an authorization input.
  const memberships = await payload.find({ collection: 'domain-memberships', where: { and: [{ domain: { equals: domain.id } }, { status: { equals: 'active' } }] }, depth: 1, limit: 0, pagination: false })
  const characterIds = memberships.docs.map((membership) => idOf(membership.character)).filter((id): id is number => id !== null)
  if (characterIds.length === 0) return NextResponse.json({ results: [] })
  const memberCharacterIds = new Set(characterIds.map(String))
  const [contexts, roles, departments] = await Promise.all([
    payload.find({ collection: 'domain-character-contexts', where: { domain: { equals: domain.id } }, depth: 0, limit: 0, pagination: false }),
    payload.find({ collection: 'roles', where: { domain: { equals: domain.id } }, depth: 1, limit: 0, pagination: false }),
    payload.find({ collection: 'subdomains', where: { domain: { equals: domain.id } }, depth: 0, limit: 0, pagination: false }),
  ])
  type SearchCharacter = { id: number | string; name: string; status?: string; controlledBy?: { name?: string } | number | string | null }
  const characters: { docs: SearchCharacter[] } = { docs: [] }
  for (let offset = 0; offset < characterIds.length; offset += 400) {
    const batch = characterIds.slice(offset, offset + 400)
    const result = await payload.find({ collection: 'characters', where: { and: [{ id: { in: batch } }, { status: { equals: 'active' } }] }, depth: 1, limit: 0, pagination: false, sort: 'name' })
    characters.docs.push(...result.docs as unknown as SearchCharacter[])
  }
  // Never load the global assignment table. Read only active assignments for
  // this Domain's active member Character IDs, in exhaustive bind-safe
  // batches. The previous global dump was both wasteful and an accidental
  // cross-Domain ranking input.
  const assignments: { docs: Array<Record<string, unknown>> } = { docs: [] }
  for (let offset = 0; offset < characterIds.length; offset += 400) {
    const batch = characterIds.slice(offset, offset + 400)
    const result = await payload.find({ collection: 'role-assignments', where: { and: [{ character: { in: batch } }, { status: { equals: 'active' } }] }, depth: 1, limit: 0, pagination: false })
    assignments.docs.push(...result.docs as unknown as Array<Record<string, unknown>>)
  }
  const contextByCharacter = new Map(contexts.docs.map((context) => [String(idOf(context.character)), context]))
  const roleById = new Map(roles.docs.map((role) => [String(role.id), role]))
  const departmentById = new Map(departments.docs.map((department) => [String(department.id), department.name]))
  const roleData = new Map<string, { names: string[]; departments: string[] }>()
  for (const assignment of assignments.docs) {
    const characterId = idOf(assignment.character)
    const role = roleById.get(String(idOf(assignment.role)))
    // Scoped to this Domain's active members (owner decision 2026-09-04: no
    // global assignment dump influences ranking).
    if (characterId === null || !memberCharacterIds.has(String(characterId)) || !role) continue
    const departmentName = departmentById.get(String(idOf(role.subdomain)))
    const current = roleData.get(String(characterId)) ?? { names: [], departments: [] }
    if (!current.names.includes(role.name)) current.names.push(role.name)
    if (departmentName && !current.departments.includes(departmentName)) current.departments.push(departmentName)
    roleData.set(String(characterId), current)
  }
  const results = characters.docs.map((character) => {
    const context = contextByCharacter.get(String(character.id))
    const controller = character.controlledBy && typeof character.controlledBy === 'object' ? character.controlledBy as { name?: string } : null
    const data = roleData.get(String(character.id)) ?? { names: [], departments: [] }
    // P05R-T03 D: the controlling account EMAIL is never scored or surfaced —
    // searching contracted identity fields only (name, local alias,
    // Department, Role, controller display name) avoids an email side channel.
    const fields = [character.name, context?.localDisplayName, controller?.name, ...data.names, ...data.departments].filter(Boolean).map(String)
    const haystack = fields.join(' ').toLowerCase()
    const score = fields.reduce((total, field) => total + (field.toLowerCase().startsWith(query) ? 100 : field.toLowerCase().includes(query) ? 50 : 0), 0)
    return { character, context, controller, roles: data.names, departments: data.departments, haystack, score }
  }).filter((row) => row.score > 0 || row.haystack.includes(query))
    // Stable ID tie is the owner-approved deterministic order (2026-09-04).
    .sort((a, b) => b.score - a.score || Number(a.character.id) - Number(b.character.id))
    .slice(0, 25)
  return NextResponse.json({ results: results.map(({ character, context, controller, roles: roleNames, departments: departmentNames }) => ({ id: character.id, name: character.name, localName: context?.localDisplayName ?? null, controllerName: controller?.name ?? null, roles: roleNames, departments: departmentNames })) })
}

function status403() { return { status: 403 } }
