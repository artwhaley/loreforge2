/**
 * One-way data cleanup for the P05-T00 assignment model.
 *
 * The customer model no longer reads `subdomain_memberships`.  This script
 * removes those legacy rows, gives the fixture's historical roles concrete
 * Department-owned names, and leaves RoleAssignment rows as Character+Role
 * records only.  It is intentionally idempotent so a local database can be
 * repaired and re-run while the phase is in progress.
 */
import { getPayload } from 'payload'
import { sql } from '@payloadcms/db-sqlite'

import config from '@/payload.config'

const relationId = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null
  return typeof value === 'object' && value !== null && 'id' in value
    ? Number((value as { id: number | string }).id)
    : Number(value)
}

const payload = await getPayload({ config })

// The collection is intentionally not in payload.config anymore, so remove
// legacy rows with a guarded SQL statement instead of reintroducing it.
try {
  await payload.db.drizzle.run(sql`DELETE FROM subdomain_memberships`)
  payload.logger.info('P05-T00 removed legacy SubdomainMembership rows.')
} catch {
  payload.logger.info('P05-T00 found no legacy SubdomainMembership table; continuing.')
}

const domains = await payload.find({ collection: 'domains', where: { slug: { equals: 'ar' } }, depth: 0, limit: 1 })
const ar = domains.docs[0]
if (ar) {
  const departments = await payload.find({ collection: 'subdomains', where: { domain: { equals: ar.id } }, depth: 0, limit: 100 })
  const bySlug = new Map(departments.docs.map((department) => [department.slug, department]))
  const roles = await payload.find({ collection: 'roles', where: { domain: { equals: ar.id } }, depth: 0, limit: 500 })

  // Names from the original Phase 3 spike are migrated to the explicit
  // Department jobs used by the corrected fixture contract.
  const rename: Record<string, string> = {
    'Senior Scribe': 'Assistant Head Scribe',
    'Junior Scribe': 'Property Records Clerk',
    Captain: 'First Captain',
  }
  for (const role of roles.docs) {
    const nextName = rename[role.name]
    if (nextName && role.name !== nextName) {
      await payload.update({ collection: 'roles', id: role.id, data: { name: nextName } })
      payload.logger.info(`P05-T00 renamed Role ${role.id}: ${role.name} -> ${nextName}`)
    }
  }

  const refreshed = await payload.find({ collection: 'roles', where: { domain: { equals: ar.id } }, depth: 0, limit: 500 })
  const ensureRole = async (name: string, departmentSlug: string, parentName?: string) => {
    const department = bySlug.get(departmentSlug)
    if (!department) return null
    const current = refreshed.docs.find((role) => role.name.toLowerCase() === name.toLowerCase())
    if (current) return current
    const parent = parentName ? refreshed.docs.find((role) => role.name.toLowerCase() === parentName.toLowerCase()) : null
    return payload.create({ collection: 'roles', data: { domain: ar.id, subdomain: department.id, name, parentRole: parent?.id ?? null, active: true, system: false } })
  }
  const firstCaptain = await ensureRole('First Captain', 'warriors', 'Commander')
  const secondCaptain = await ensureRole('Second Captain', 'warriors', 'Commander')
  await ensureRole('Assistant Head Scribe', 'scribes', 'Head Scribe')
  await ensureRole('Property Records Clerk', 'scribes', 'Assistant Head Scribe')
  await ensureRole('Historical Records Clerk', 'scribes', 'Assistant Head Scribe')

  // The fixture's Tarl Character is the second captain.  Preserve all other
  // legacy Captain assignments as First Captain rather than dropping them.
  if (secondCaptain && firstCaptain) {
    const tarl = await payload.find({ collection: 'characters', where: { name: { equals: 'Tarl' } }, depth: 0, limit: 1 })
    if (tarl.docs[0]) {
      const firstAssignments = await payload.find({ collection: 'role-assignments', where: { and: [{ character: { equals: tarl.docs[0].id } }, { role: { equals: firstCaptain.id } }] }, depth: 0, limit: 20 })
      for (const assignment of firstAssignments.docs) await payload.update({ collection: 'role-assignments', id: assignment.id, data: { role: secondCaptain.id } })
    }
  }
}

payload.logger.info('P05-T00 model migration complete.')
process.exit(0)
