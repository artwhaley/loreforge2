import { getPayload } from 'payload'

import config from '@/payload.config'
import { CAPABILITIES, isRecordCapability, isCapability } from '@/lib/permissions/capabilities'

const idOf = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'object' && value !== null) {
    const row = value as Record<string, unknown>
    // Polymorphic relations at depth>0 arrive as { relationTo, value }.
    if ('value' in row && 'relationTo' in row) return idOf(row.value)
    if ('id' in row) return Number((row as { id: number | string }).id)
  }
  return Number(value)
}

/**
 * P07X-T03 — Document-Type record-permission pivot report/translation.
 *
 * P07X-T03 makes Document Type the primary ordinary record-authorization unit:
 * Folder GRANTS no longer create a missing record capability (Folder denies
 * still narrow a Type grant, so they need no translation). This tool:
 *
 * - reports every existing Folder rule that carries a record capability;
 * - translates ONLY the deterministic case: a Folder grant whose Folder
 *   contains Documents of exactly ONE Document Type (the safe 1:1 mapping);
 * - reports ambiguous grants (multi-Type or empty Folders) for remediation
 *   instead of guessing a broad Type grant;
 * - never deletes or edits an existing PermissionRule.
 *
 * Run: `DATABASE_URI=file:./sl-civic-archive.db PAYLOAD_PUSH=true npx payload run ./src/scripts/migrateP07XTypeRules.ts`
 * Apply: append `apply` as argv[2] (default is dry-run / report only).
 */

const apply = process.argv.includes('apply')
const payload = await getPayload({ config })

const recordCapabilities = CAPABILITIES.filter(isRecordCapability)

const rules = await payload.find({
  collection: 'permission-rules',
  where: { and: [{ resourceType: { equals: 'Folder' } }, { capability: { in: recordCapabilities } }] },
  depth: 1,
  limit: 0,
  pagination: false,
  overrideAccess: true,
})

const folders = await payload.find({ collection: 'folders', depth: 0, limit: 0, pagination: false, overrideAccess: true })
const folderById = new Map(folders.docs.map((folder) => [Number(folder.id), folder as unknown as { id: number | string; name?: string; domain?: unknown }]))

let translated = 0
let ambiguous = 0
let narrowingDenies = 0
let skipped = 0
const byDomain = new Map<number, { types: Array<{ id: number; name: string }>; typeById: Map<number, { id: number; name: string }> }>()
const typesForDomain = async (domainId: number) => {
  let entry = byDomain.get(domainId)
  if (!entry) {
    const result = await payload.find({ collection: 'document-types', where: { domain: { equals: domainId } }, depth: 0, limit: 0, pagination: false, overrideAccess: true })
    const types = result.docs.map((type) => ({ id: Number(type.id), name: String(type.name ?? '') }))
    entry = { types, typeById: new Map(types.map((type) => [type.id, type])) }
    byDomain.set(domainId, entry)
  }
  return entry
}

for (const raw of rules.docs as unknown as Array<Record<string, unknown> & { id: number | string; capability: string; effect: string; resource?: unknown; resourceType?: unknown; domain?: unknown; principalType?: unknown; principal?: unknown; active?: unknown }>) {
  const capability = String(raw.capability)
  if (!isCapability(capability) || !isRecordCapability(capability)) continue
  const effect = String(raw.effect ?? 'grant')
  const domainId = idOf(raw.domain)
  const folderId = idOf(raw.resource)
  if (domainId == null || folderId == null) {
    skipped += 1
    payload.logger.warn(`Rule ${raw.id} has no resolvable Domain/Folder; left untouched.`)
    continue
  }
  const folder = folderById.get(folderId)
  const folderName = folder?.name ?? `Folder ${folderId}`
  const principalText = `${String(raw.principalType ?? '?')} ${String(idOf(raw.principal) ?? raw.principal)}`
  if (effect === 'deny') {
    // Folder denies keep narrowing semantics under the two-axis model.
    narrowingDenies += 1
    payload.logger.info(`[report] Folder DENY ${principalText} ${capability} on "${folderName}" — still narrows Type grants; no translation needed.`)
    continue
  }

  // Deterministic translation: the Folder's Documents use exactly ONE Type.
  const documents = await payload.find({ collection: 'documents', where: { and: [{ domain: { equals: domainId } }, { folder: { equals: folderId } }, { or: [{ softDeletedAt: { equals: null } }, { softDeletedAt: { exists: false } }] }] }, depth: 0, limit: 0, pagination: false, overrideAccess: true })
  const typeCounts = new Map<number, number>()
  for (const document of documents.docs as unknown as Array<{ documentType?: unknown }>) {
    const typeId = idOf(document.documentType)
    if (typeId == null) continue
    typeCounts.set(typeId, (typeCounts.get(typeId) ?? 0) + 1)
  }
  if (typeCounts.size !== 1) {
    ambiguous += 1
    const candidates = [...typeCounts.keys()].map((id) => String(id)).join(', ') || '(Folder is empty — no candidate Type)'
    payload.logger.warn(`[report] AMBIGUOUS Folder GRANT ${principalText} ${capability} on "${folderName}" (Domain ${domainId}): candidate Types [${candidates}]. Translated only by hand; no broad Type grant guessed.`)
    continue
  }
  const [typeId] = [...typeCounts.keys()]
  const entry = await typesForDomain(domainId)
  const type = entry.typeById.get(typeId)
  const typeName = type?.name ?? `Type ${typeId}`
  const ruleKey = JSON.stringify([domainId, String(raw.principalType), String(raw.principalType === 'Character' ? 'characters' : raw.principalType === 'Role' ? 'roles' : raw.principalType === 'User' ? 'users' : 'domain-memberships'), idOf(raw.principal), 'DocumentType', 'document-types', typeId, capability])
  const existing = await payload.find({ collection: 'permission-rules', where: { ruleKey: { equals: ruleKey } }, depth: 0, limit: 1, overrideAccess: true })
  if (existing.docs[0]) {
    skipped += 1
    payload.logger.info(`[report] Folder GRANT ${principalText} ${capability} on "${folderName}" already has the equivalent Type rule on "${typeName}".`)
    continue
  }
  translated += 1
  payload.logger.info(`${apply ? '[apply]' : '[dry-run]'} translate Folder GRANT ${principalText} ${capability} on "${folderName}" -> ${String(raw.principalType)} ${String(idOf(raw.principal))} ${capability} on DocumentType "${typeName}" (${typeId}).`)
  if (apply) {
    await payload.create({
      collection: 'permission-rules',
      overrideAccess: true,
      data: {
        ruleKey,
        domain: domainId,
        principalType: String(raw.principalType) as 'Character' | 'User' | 'Role' | 'DomainMembership',
        principal: (raw.principal as { relationTo?: unknown; value?: unknown }) as never,
        resourceType: 'DocumentType',
        resource: { relationTo: 'document-types', value: typeId },
        capability,
        effect: 'grant',
        active: raw.active === false ? false : true,
        actorUser: idOf((raw as { actorUser?: unknown }).actorUser) ?? 0,
        actorCharacter: idOf((raw as { actorCharacter?: unknown }).actorCharacter) ?? undefined,
      },
    })
  }
}

payload.logger.info(`P07X-T03 rule report complete: translated=${translated} ambiguous=${ambiguous} narrowingDenies=${narrowingDenies} alreadyEquivalentOrUnresolvable=${skipped}${apply ? '' : ' (dry-run — rerun with `apply` to write the deterministic Type rules)'}`)

export {}