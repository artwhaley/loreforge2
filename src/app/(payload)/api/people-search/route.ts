import { NextResponse } from 'next/server'
import { getPayload } from 'payload'

import config from '@payload-config'

import { authorizeInterimOperation } from '@/lib/authorization/interim'

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
  if (!domain || await authorizeInterimOperation(payload, { userId: user.id }, domain.id) !== true) return NextResponse.json({ results: [] }, { status: 403 })
  const memberships = await payload.find({ collection: 'domain-memberships', where: { and: [{ domain: { equals: domain.id } }, { status: { equals: 'active' } }] }, depth: 0, limit: 1000 })
  const characterIds = memberships.docs.map((membership) => idOf(membership.character)).filter((id): id is number => id !== null)
  if (characterIds.length === 0) return NextResponse.json({ results: [] })
  const [characters, contexts, roles, assignments, departments] = await Promise.all([
    payload.find({ collection: 'characters', where: { and: [{ id: { in: characterIds } }, { status: { equals: 'active' } }] }, depth: 1, limit: 1000, sort: 'name' }),
    payload.find({ collection: 'domain-character-contexts', where: { domain: { equals: domain.id } }, depth: 0, limit: 1000 }),
    payload.find({ collection: 'roles', where: { domain: { equals: domain.id } }, depth: 1, limit: 1000 }),
    payload.find({ collection: 'role-assignments', where: { status: { equals: 'active' } }, depth: 1, limit: 2000 }),
    payload.find({ collection: 'subdomains', where: { domain: { equals: domain.id } }, depth: 0, limit: 500 }),
  ])
  const contextByCharacter = new Map(contexts.docs.map((context) => [String(idOf(context.character)), context]))
  const roleById = new Map(roles.docs.map((role) => [String(role.id), role]))
  const departmentById = new Map(departments.docs.map((department) => [String(department.id), department.name]))
  const membershipIds = new Set(characterIds.map(String))
  const roleData = new Map<string, { names: string[]; departments: string[] }>()
  for (const assignment of assignments.docs) {
    const characterId = idOf(assignment.character)
    const role = roleById.get(String(idOf(assignment.role)))
    if (characterId === null || !membershipIds.has(String(characterId)) || !role) continue
    const departmentName = departmentById.get(String(idOf(role.subdomain)))
    const current = roleData.get(String(characterId)) ?? { names: [], departments: [] }
    if (!current.names.includes(role.name)) current.names.push(role.name)
    if (departmentName && !current.departments.includes(departmentName)) current.departments.push(departmentName)
    roleData.set(String(characterId), current)
  }
  const results = characters.docs.map((character) => {
    const context = contextByCharacter.get(String(character.id))
    const controller = character.controlledBy && typeof character.controlledBy === 'object' ? character.controlledBy : null
    const data = roleData.get(String(character.id)) ?? { names: [], departments: [] }
    const fields = [character.name, context?.localDisplayName, controller?.name, controller?.email, ...data.names, ...data.departments].filter(Boolean).map(String)
    const haystack = fields.join(' ').toLowerCase()
    const score = fields.reduce((total, field) => total + (field.toLowerCase().startsWith(query) ? 100 : field.toLowerCase().includes(query) ? 50 : 0), 0)
    return { character, context, controller, roles: data.names, departments: data.departments, haystack, score }
  }).filter((row) => row.score > 0 || row.haystack.includes(query)).sort((a, b) => b.score - a.score || a.character.name.localeCompare(b.character.name)).slice(0, 25)
  return NextResponse.json({ results: results.map(({ character, context, controller, roles: roleNames, departments: departmentNames }) => ({ id: character.id, name: character.name, localName: context?.localDisplayName ?? null, controllerName: controller?.name ?? null, roles: roleNames, departments: departmentNames })) })
}
