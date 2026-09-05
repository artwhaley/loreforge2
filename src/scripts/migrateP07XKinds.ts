import { getPayload } from 'payload'

import config from '@/payload.config'
import { CHARACTER_KINDS, isCharacterKind } from '@/lib/characters/kinds'
import { ensureDomainAdminIdentity, ensurePlatformAdminIdentity } from '@/lib/characters/provisioning'

const idOf = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'object' && value !== null && 'id' in value) return Number((value as { id: number | string }).id)
  return Number(value)
}

/**
 * P07X-T01 — Character kind backfill and administrative identity provisioning.
 *
 * Rules (spec §6): existing ordinary Characters backfill to `player` unless an
 * explicit NPC allowlist names them; one platform_admin Character per
 * isPlatformAdmin User; one domain_admin Character per Community Domain
 * ownerUser; legacy `domain-admins` rows for non-owner Users are reported, not
 * silently promoted.
 *
 * Run: `DATABASE_URI=file:./sl-civic-archive.db PAYLOAD_PUSH=true npx payload run ./src/scripts/migrateP07XKinds.ts`
 * Dry run: append `dry-run` as argv[2].
 */

/** Explicit NPC fixtures (name allowlist). Character names not on this list
 *  backfill to player, matching the packet rule "unless explicit fixture data
 *  identifies NPC". */
const EXPLICIT_NPC_NAMES = new Set<string>(['NPC Villager', 'NPC Guard'])

const dryRun = process.argv.includes('dry-run')

const payload = await getPayload({ config })

const allCharacters = await payload.find({ collection: 'characters', depth: 1, limit: 0, pagination: false, overrideAccess: true })

let backfilled = 0
let npcMarked = 0
let alreadyValid = 0
for (const character of allCharacters.docs as unknown as Array<Record<string, unknown> & { id: number | string; kind?: string | null; name: string }>) {
  const current = String(character.kind ?? '')
  const desired = EXPLICIT_NPC_NAMES.has(character.name) ? 'npc' : isCharacterKind(current) ? current : 'player'
  if (current === desired) {
    alreadyValid += 1
    continue
  }
  const data = { kind: desired }
  if (dryRun) payload.logger.info(`[dry-run] Character ${character.id} "${character.name}" kind ${current || '(none)'} -> ${desired}`)
  else await payload.update({ collection: 'characters', id: character.id, overrideAccess: true, data })
  if (desired === 'npc') npcMarked += 1
  else backfilled += 1
}

// Provision administrative identities.
const adminUsers = await payload.find({ collection: 'users', where: { isPlatformAdmin: { equals: true } }, depth: 0, limit: 0, pagination: false, overrideAccess: true })
let platformProvisioned = 0
let platformSkipped = 0
for (const user of adminUsers.docs) {
  const result = dryRun
    ? { characterId: null as number | null, reason: 'existing' as const }
    : await ensurePlatformAdminIdentity(payload, Number(user.id))
  if (result.reason === 'created' || result.reason === 'reactivated') platformProvisioned += 1
  else platformSkipped += 1
  payload.logger.info(`${dryRun ? '[dry-run] would provision' : 'Provisioned'} platform_admin for User ${user.id} (${result.reason}).`)
}

const domains = await payload.find({ collection: 'domains', depth: 1, limit: 0, pagination: false, overrideAccess: true })
let domainProvisioned = 0
let ownerless = 0
for (const domain of domains.docs as unknown as Array<Record<string, unknown> & { id: number | string; kind?: string; ownerUser?: unknown; name: string }>) {
  if (String(domain.kind ?? 'community') !== 'community') continue
  const ownerId = idOf(domain.ownerUser)
  if (ownerId == null) {
    ownerless += 1
    payload.logger.info(`Domain ${domain.id} "${domain.name}" has no ownerUser (setup-pending is allowed from P07X-T09).`)
    continue
  }
  const result = dryRun ? { characterId: null as number | null, reason: 'existing' as const } : await ensureDomainAdminIdentity(payload, Number(domain.id))
  if (result.reason === 'created' || result.reason === 'reactivated') domainProvisioned += 1
  payload.logger.info(`${dryRun ? '[dry-run] would provision' : 'Provisioned'} domain_admin for Domain ${domain.id} "${domain.name}" (${result.reason}).`)
}

// Legacy domain-admins report: duplicates of the owner are redundant; rows for
// a different User are incompatible with the one-owner rule and are reported.
const adminRows = await payload.find({ collection: 'domain-admins', depth: 1, limit: 0, pagination: false, overrideAccess: true }).catch(() => ({ docs: [] as never[] }))
let ownerDuplicates = 0
let foreignAdmins = 0
for (const row of adminRows.docs as unknown as Array<Record<string, unknown> & { id: number | string; domain?: unknown; user?: unknown; status?: string }>) {
  const domain = row.domain && typeof row.domain === 'object' ? row.domain as { id?: number | string; ownerUser?: unknown } : null
  const domainOwnerId = domain ? idOf(domain.ownerUser) : null
  const userId = idOf(row.user)
  const duplicateOfOwner = domainOwnerId != null && userId != null && domainOwnerId === userId
  if (duplicateOfOwner) ownerDuplicates += 1
  else {
    foreignAdmins += 1
    payload.logger.warn(`Legacy domain-admins row ${row.id} covers Domain ${String(domain?.id ?? row.domain)} for User ${String(userId ?? row.user)} who is not the Domain owner; incompatible with the one-owner rule — reported, not promoted.`)
  }
}

if (dryRun) {
  payload.logger.info(`[dry-run] would backfill ${backfilled} characters to player, mark ${npcMarked} NPC, provision ${platformProvisioned} platform_admin and ${domainProvisioned} domain_admin identities.`)
} else {
  payload.logger.info(`P07X-T01 kind migration complete: backfilled=${backfilled} npc=${npcMarked} alreadyValid=${alreadyValid} platformProvisioned=${platformProvisioned} platformSkipped=${platformSkipped} domainProvisioned=${domainProvisioned} ownerless=${ownerless} legacyDomainAdminRows=${adminRows.docs.length} (ownerDuplicates=${ownerDuplicates} foreign=${foreignAdmins})`)
}

if (foreignAdmins > 0) {
  payload.logger.warn('Foreign legacy domain-admins rows remain. They no longer authorize anything after P07X-T02; remove them manually or via a later cleanup ticket.')
}

export {}

void CHARACTER_KINDS