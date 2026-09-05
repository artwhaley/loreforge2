import type { Payload } from 'payload'

import { ensureDomainAdminIdentity, ensurePlatformAdminIdentity } from '@/lib/characters/provisioning'
import { permissionRuleKey } from '@/collections/PermissionRules'
import type { Capability, PrincipalType, ResourceType } from '@/lib/permissions/capabilities'
import type { LoreForgeFormSchema } from '@/lib/forms/schema'

type Id = number
type Row = Record<string, unknown> & { id: number | string }

const idOf = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'object' && value !== null && 'id' in value) return Number((value as { id: number | string }).id)
  return Number(value)
}

const relationId = idOf

async function ensureUser(payload: Payload, args: { email: string; name: string; isPlatformAdmin?: boolean }): Promise<Row> {
  const existing = await payload.find({ collection: 'users', where: { email: { equals: args.email } }, depth: 0, limit: 1, overrideAccess: true })
  if (existing.docs[0]) {
    const row = existing.docs[0] as unknown as Row
    const next: Record<string, unknown> = {}
    if (args.isPlatformAdmin && row.isPlatformAdmin !== true) next.isPlatformAdmin = true
    if (!row.slVerificationState) next.slVerificationState = 'unlinked'
    if (Object.keys(next).length) await payload.update({ collection: 'users', id: row.id, overrideAccess: true, data: next as never })
    return { ...row, ...next }
  }
  return payload.create({ collection: 'users', overrideAccess: true, data: { email: args.email, name: args.name, password: 'test-password-123', isPlatformAdmin: Boolean(args.isPlatformAdmin), slVerificationState: 'unlinked' } }) as unknown as Promise<Row>
}

async function ensureCharacter(payload: Payload, args: { name: string; kind: 'player' | 'npc'; controlledBy?: Id | null; bio?: string }): Promise<Row> {
  const existing = await payload.find({ collection: 'characters', where: { name: { equals: args.name } }, depth: 0, limit: 1, overrideAccess: true })
  if (existing.docs[0]) {
    const row = existing.docs[0] as unknown as Row
    const currentController = relationId(row.controlledBy)
    if (args.controlledBy != null && currentController != null && currentController !== args.controlledBy) {
      throw new Error(`Reserved P07X fixture Character "${args.name}" is controlled by another User; refusing to rebind it.`)
    }
    const next: Record<string, unknown> = {}
    if (String(row.kind ?? 'player') !== args.kind) next.kind = args.kind
    if (args.controlledBy != null && currentController == null) next.controlledBy = args.controlledBy
    if (args.bio && !row.bio) next.bio = args.bio
    if (Object.keys(next).length) await payload.update({ collection: 'characters', id: row.id, overrideAccess: true, data: next as never })
    return { ...row, ...next }
  }
  return payload.create({ collection: 'characters', overrideAccess: true, data: { name: args.name, kind: args.kind, controlledBy: args.controlledBy ?? null, status: 'active', bio: args.bio } as never }) as unknown as Promise<Row>
}

async function ensureCommunityDomain(payload: Payload, args: { slug: string; name: string; ownerUser: Id }): Promise<Row> {
  const existing = await payload.find({ collection: 'domains', where: { slug: { equals: args.slug } }, depth: 0, limit: 1, overrideAccess: true })
  if (existing.docs[0]) {
    const row = existing.docs[0] as unknown as Row
    if (relationId(row.ownerUser) !== args.ownerUser || String(row.kind ?? 'community') !== 'community') throw new Error(`Reserved P07X fixture Domain "${args.slug}" has incompatible ownership.`)
    if (!row.defaultFilingPolicy) await payload.update({ collection: 'domains', id: row.id, overrideAccess: true, data: { defaultFilingPolicy: 'direct-file' } as never })
    return row
  }
  return payload.create({
    collection: 'domains',
    overrideAccess: true,
    data: {
      slug: args.slug,
      name: args.name,
      kind: 'community',
      lifecycle: 'active',
      ownerUser: args.ownerUser,
      ownerCharacter: null,
      defaultFilingPolicy: 'direct-file',
      motto: 'Strength, Honor, Order',
      preset: 'heritage',
      primaryColor: '#2B2430',
      secondaryColor: '#8D6E4A',
      accentColor: '#C6A15B',
      backgroundColor: '#F2ECE1',
      headingFontKey: 'georgia',
      bodyFontKey: 'verdana',
      publicEnabled: false,
    },
  } as never) as unknown as Promise<Row>
}

async function ensureMembership(payload: Payload, domainId: Id, characterId: Id, addedBy: Id): Promise<Row> {
  const existing = await payload.find({ collection: 'domain-memberships', where: { and: [{ domain: { equals: domainId } }, { character: { equals: characterId } }] }, depth: 0, limit: 1, overrideAccess: true })
  if (existing.docs[0]) {
    const row = existing.docs[0] as unknown as Row
    if (row.status !== 'active') await payload.update({ collection: 'domain-memberships', id: row.id, overrideAccess: true, data: { status: 'active', addedBy } as never })
    return row
  }
  return payload.create({ collection: 'domain-memberships', overrideAccess: true, data: { domain: domainId, character: characterId, status: 'active', addedBy, note: 'P07X integrated acceptance fixture.' } as never }) as unknown as Promise<Row>
}

async function ensureDepartment(payload: Payload, domainId: Id, slug: string, name: string): Promise<Row> {
  const existing = await payload.find({ collection: 'subdomains', where: { and: [{ domain: { equals: domainId } }, { slug: { equals: slug } }] }, depth: 0, limit: 1, overrideAccess: true })
  if (existing.docs[0]) return existing.docs[0] as unknown as Row
  return payload.create({ collection: 'subdomains', overrideAccess: true, data: { domain: domainId, slug, name, description: `${name} acceptance fixture department.`, publicListing: true } as never }) as unknown as Promise<Row>
}

async function ensureRole(payload: Payload, args: { domainId: Id; departmentId: Id; name: string; parentRoleId?: Id | null }): Promise<Row> {
  const existing = await payload.find({ collection: 'roles', where: { and: [{ domain: { equals: args.domainId } }, { name: { equals: args.name } }] }, depth: 0, limit: 1, overrideAccess: true })
  if (existing.docs[0]) return existing.docs[0] as unknown as Row
  return payload.create({ collection: 'roles', overrideAccess: true, data: { domain: args.domainId, subdomain: args.departmentId, name: args.name, parentRole: args.parentRoleId ?? null, active: true, system: false } as never }) as unknown as Promise<Row>
}

async function ensureAssignment(payload: Payload, characterId: Id, roleId: Id, assignedBy: Id): Promise<Row> {
  const existing = await payload.find({ collection: 'role-assignments', where: { and: [{ character: { equals: characterId } }, { role: { equals: roleId } }] }, depth: 0, limit: 1, overrideAccess: true })
  if (existing.docs[0]) return existing.docs[0] as unknown as Row
  return payload.create({ collection: 'role-assignments', overrideAccess: true, data: { character: characterId, role: roleId, status: 'active', assignedBy } as never }) as unknown as Promise<Row>
}

async function ensureFolder(payload: Payload, args: { domainId: Id; name: string; parentId: Id | null; subdomainId?: Id | null; systemManaged?: boolean }): Promise<Row> {
  const existing = await payload.find({ collection: 'folders', where: { and: [{ domain: { equals: args.domainId } }, { name: { equals: args.name } }, { parent: { equals: args.parentId } }] }, depth: 0, limit: 1, overrideAccess: true })
  if (existing.docs[0]) return existing.docs[0] as unknown as Row
  return payload.create({
    collection: 'folders',
    draft: false,
    overrideAccess: true,
    data: { domain: args.domainId, name: args.name, parent: args.parentId, subdomain: args.subdomainId ?? null, systemManaged: Boolean(args.systemManaged), filingPolicy: 'inherit', publicAccess: 'inherit' },
  } as never) as unknown as Promise<Row>
}

async function ensureDocumentType(payload: Payload, args: { domainId: Id; name: string; description: string; defaultFilingPolicy: 'direct-file' | 'review-required'; defaultFolder: Id; draftFolder: Id; pendingReviewFolder?: Id | null; filedFolder?: Id | null; lockedFolder?: Id | null; allowBlank: boolean; allowTemplate: boolean; allowForm: boolean }): Promise<Row> {
  const existing = await payload.find({ collection: 'document-types', where: { and: [{ domain: { equals: args.domainId } }, { name: { equals: args.name } }] }, depth: 0, limit: 1, overrideAccess: true })
  const data = {
    domain: args.domainId,
    name: args.name,
    description: args.description,
    active: true,
    allowBlank: args.allowBlank,
    allowTemplate: args.allowTemplate,
    allowForm: args.allowForm,
    defaultFilingPolicy: args.defaultFilingPolicy,
    templateFilingPolicy: args.defaultFilingPolicy,
    defaultFolder: args.defaultFolder,
    draftFolder: args.draftFolder,
    pendingReviewFolder: args.pendingReviewFolder ?? null,
    filedFolder: args.filedFolder ?? null,
    lockedFolder: args.lockedFolder ?? null,
  }
  if (existing.docs[0]) {
    return payload.update({ collection: 'document-types', id: existing.docs[0].id, overrideAccess: true, data: data as never }) as unknown as Promise<Row>
  }
  return payload.create({ collection: 'document-types', overrideAccess: true, data: data as never }) as unknown as Promise<Row>
}

async function ensureTemplate(payload: Payload, args: { domainId: Id; typeId: Id; name: string; kind: 'document' | 'form'; scopeFolder: Id; destinationFolder: Id; titleTemplate: string; bodyTemplate: string; formSchema?: LoreForgeFormSchema; headerMarkdown?: string; footerMarkdown?: string; lifecyclePolicy: 'inherit' | 'direct-file' | 'review-required' }): Promise<Row> {
  const existing = await payload.find({ collection: 'templates', where: { and: [{ domain: { equals: args.domainId } }, { name: { equals: args.name } }, { kind: { equals: args.kind } }] }, depth: 0, limit: 1, overrideAccess: true })
  const data = {
    domain: args.domainId,
    documentType: args.typeId,
    name: args.name,
    kind: args.kind,
    scopeFolder: args.scopeFolder,
    destinationFolder: args.destinationFolder,
    allowDestinationOverride: false,
    availableToDescendants: true,
    baseTemplate: null,
    titleTemplate: args.titleTemplate,
    bodyTemplate: args.bodyTemplate,
    headerMarkdown: args.headerMarkdown ?? '',
    footerMarkdown: args.footerMarkdown ?? '',
    formSchema: args.formSchema ?? null,
    lifecyclePolicy: args.lifecyclePolicy,
    active: true,
    version: Number(existing.docs[0]?.version ?? 1),
  }
  if (existing.docs[0]) return payload.update({ collection: 'templates', id: existing.docs[0].id, overrideAccess: true, data: data as never }) as unknown as Promise<Row>
  return payload.create({ collection: 'templates', overrideAccess: true, data: data as never }) as unknown as Promise<Row>
}

const relationCollection = (type: PrincipalType | ResourceType): string => ({
  Character: 'characters', User: 'users', Role: 'roles', DomainMembership: 'domain-memberships',
  Domain: 'domains', Subdomain: 'subdomains', Folder: 'folders', Document: 'documents', DocumentType: 'document-types',
} as Record<string, string>)[type]

async function ensureRule(payload: Payload, args: { domainId: Id; principalType: PrincipalType; principalId: Id; resourceType: ResourceType; resourceId: Id; capability: Capability; actorUser: Id; actorCharacter?: Id | null; effect?: 'grant' | 'deny' }): Promise<Row> {
  const principalRelation = relationCollection(args.principalType)
  const resourceRelation = relationCollection(args.resourceType)
  const ruleKey = permissionRuleKey({ domainId: args.domainId, principalType: args.principalType, principalRelation, principalId: args.principalId, resourceType: args.resourceType, resourceRelation, resourceId: args.resourceId, capability: args.capability })
  const existing = await payload.find({ collection: 'permission-rules', where: { ruleKey: { equals: ruleKey } }, depth: 0, limit: 1, overrideAccess: true })
  if (existing.docs[0]) return existing.docs[0] as unknown as Row
  return payload.create({
    collection: 'permission-rules',
    overrideAccess: true,
    data: {
      ruleKey,
      domain: args.domainId,
      principalType: args.principalType,
      principal: { relationTo: principalRelation, value: args.principalId },
      resourceType: args.resourceType,
      resource: { relationTo: resourceRelation, value: args.resourceId },
      capability: args.capability,
      effect: args.effect ?? 'grant',
      active: true,
      actorUser: args.actorUser,
      actorCharacter: args.actorCharacter ?? undefined,
    } as never,
  }) as unknown as Promise<Row>
}

/**
 * Additive, idempotent fixtures for the P07X integrated acceptance contract.
 * This deliberately uses the normal Payload collections and existing
 * provisioning/rule seams; it does not create a second queue or fixture-only
 * authorization path.
 */
export async function seedP07XIntegrated(payload: Payload) {
  const admin = await ensureUser(payload, { email: 'admin@example.test', name: 'Morgan Vale', isPlatformAdmin: true })
  const tarlUser = await ensureUser(payload, { email: 'tarl@example.test', name: 'Tarl' })
  const marlenUser = await ensureUser(payload, { email: 'marlen@example.test', name: 'Marlen' })
  const cassiusUser = await ensureUser(payload, { email: 'cassius@example.test', name: 'Cassius' })
  const ar = await ensureCommunityDomain(payload, { slug: 'ar', name: 'Ar', ownerUser: Number(admin.id) })
  const platform = await ensurePlatformAdminIdentity(payload, Number(admin.id))
  const domainAdmin = await ensureDomainAdminIdentity(payload, Number(ar.id))
  if (platform.characterId == null || domainAdmin.characterId == null) throw new Error('P07X integrated fixture could not provision administrative identities.')

  const lucan = await ensureCharacter(payload, { name: 'Lucan', kind: 'player', controlledBy: Number(admin.id), bio: 'Primary ordinary acting identity for the integrated acceptance run.' })
  const tarl = await ensureCharacter(payload, { name: 'Tarl', kind: 'player', controlledBy: Number(tarlUser.id), bio: 'Warrior fixture for Incident Report workflow work.' })
  const marlen = await ensureCharacter(payload, { name: 'Marlen', kind: 'player', controlledBy: Number(marlenUser.id), bio: 'Sergeant fixture for approval and lock work.' })
  const cassius = await ensureCharacter(payload, { name: 'Cassius', kind: 'player', controlledBy: Number(cassiusUser.id), bio: 'Scribe fixture for Property Deed access.' })
  const npc = await ensureCharacter(payload, { name: 'NPC Villager', kind: 'npc', bio: 'Ordinary NPC fixture; never an administrative identity.' })
  const unclaimed = await ensureCharacter(payload, { name: 'Unclaimed Archivist', kind: 'player', bio: 'Unclaimed ordinary Character for Character invitation acceptance.' })
  for (const character of [lucan, tarl, marlen, cassius, npc, unclaimed]) await ensureMembership(payload, Number(ar.id), Number(character.id), Number(admin.id))

  const scribes = await ensureDepartment(payload, Number(ar.id), 'scribes', 'Scribes')
  const warriors = await ensureDepartment(payload, Number(ar.id), 'warriors', 'Warriors')
  const magistrates = await ensureDepartment(payload, Number(ar.id), 'magistrates', 'Magistrates')
  const existingWarrior = await payload.find({ collection: 'roles', where: { and: [{ domain: { equals: ar.id } }, { name: { equals: 'Warrior' } }] }, depth: 0, limit: 1, overrideAccess: true })
  const warrior = (existingWarrior.docs[0] as unknown as Row | undefined) ?? await ensureRole(payload, { domainId: Number(ar.id), departmentId: Number(warriors.id), name: 'Warrior' })
  const sergeant = await ensureRole(payload, { domainId: Number(ar.id), departmentId: Number(warriors.id), name: 'Sergeant', parentRoleId: Number(warrior.id) })
  const scribe = await ensureRole(payload, { domainId: Number(ar.id), departmentId: Number(scribes.id), name: 'Scribe' })
  const merchant = await ensureRole(payload, { domainId: Number(ar.id), departmentId: Number(magistrates.id), name: 'Merchant' })
  await ensureAssignment(payload, Number(tarl.id), Number(warrior.id), Number(admin.id))
  await ensureAssignment(payload, Number(marlen.id), Number(sergeant.id), Number(admin.id))
  await ensureAssignment(payload, Number(cassius.id), Number(scribe.id), Number(admin.id))
  await ensureAssignment(payload, Number(lucan.id), Number(merchant.id), Number(admin.id))

  const existingRoot = await payload.find({ collection: 'folders', where: { and: [{ domain: { equals: ar.id } }, { systemManaged: { equals: true } }, { parent: { equals: null } }] }, depth: 0, limit: 1, overrideAccess: true })
  const root = (existingRoot.docs[0] as unknown as Row | undefined) ?? await ensureFolder(payload, { domainId: Number(ar.id), name: 'Domain Root', parentId: null, systemManaged: true })
  const scribesFolder = await ensureFolder(payload, { domainId: Number(ar.id), name: 'Scribes', parentId: Number(root.id), subdomainId: Number(scribes.id) })
  const incidentRoot = await ensureFolder(payload, { domainId: Number(ar.id), name: 'Incident Reports', parentId: Number(root.id), subdomainId: Number(warriors.id) })
  const pendingIncident = await ensureFolder(payload, { domainId: Number(ar.id), name: 'Pending Incident Reports', parentId: Number(incidentRoot.id), subdomainId: Number(warriors.id) })
  const investigatingIncident = await ensureFolder(payload, { domainId: Number(ar.id), name: 'Investigating Incident Reports', parentId: Number(incidentRoot.id), subdomainId: Number(warriors.id) })
  const closedIncident = await ensureFolder(payload, { domainId: Number(ar.id), name: 'Closed Incident Reports', parentId: Number(incidentRoot.id), subdomainId: Number(warriors.id) })
  const propertyFolder = await ensureFolder(payload, { domainId: Number(ar.id), name: 'Property Deeds', parentId: Number(scribesFolder.id), subdomainId: Number(scribes.id) })
  const tradeFolder = await ensureFolder(payload, { domainId: Number(ar.id), name: 'Trade Licenses', parentId: Number(root.id), subdomainId: Number(magistrates.id) })

  const incidentType = await ensureDocumentType(payload, { domainId: Number(ar.id), name: 'Incident Report', description: 'Incident records used by the integrated workflow acceptance.', defaultFilingPolicy: 'review-required', defaultFolder: Number(incidentRoot.id), draftFolder: Number(incidentRoot.id), pendingReviewFolder: Number(pendingIncident.id), filedFolder: Number(investigatingIncident.id), lockedFolder: Number(closedIncident.id), allowBlank: true, allowTemplate: true, allowForm: true })
  const propertyType = await ensureDocumentType(payload, { domainId: Number(ar.id), name: 'Property Deed', description: 'Scribe-only property records.', defaultFilingPolicy: 'direct-file', defaultFolder: Number(propertyFolder.id), draftFolder: Number(propertyFolder.id), allowBlank: true, allowTemplate: false, allowForm: false })
  const tradeType = await ensureDocumentType(payload, { domainId: Number(ar.id), name: 'Trade License', description: 'Merchant and Lucan trade records.', defaultFilingPolicy: 'direct-file', defaultFolder: Number(tradeFolder.id), draftFolder: Number(tradeFolder.id), allowBlank: true, allowTemplate: false, allowForm: false })

  const incidentSchema: LoreForgeFormSchema = { version: 1, fields: [
    { key: 'incident_date', type: 'date', label: 'Incident date', required: true },
    { key: 'location', type: 'text', label: 'Location', required: true },
    { key: 'narrative', type: 'textarea', label: 'Narrative', required: true, rows: 8 },
  ] }
  const documentTemplate = await ensureTemplate(payload, { domainId: Number(ar.id), typeId: Number(incidentType.id), name: 'Incident Report Template', kind: 'document', scopeFolder: Number(incidentRoot.id), destinationFolder: Number(incidentRoot.id), titleTemplate: 'Incident Report', bodyTemplate: '# Incident Report\n\n{{content}}', lifecyclePolicy: 'review-required' })
  const formTemplate = await ensureTemplate(payload, { domainId: Number(ar.id), typeId: Number(incidentType.id), name: 'Incident Report Form', kind: 'form', scopeFolder: Number(incidentRoot.id), destinationFolder: Number(incidentRoot.id), titleTemplate: 'Incident Report - {{incident_date}}', bodyTemplate: '## Incident details\n\n**Date:** {{incident_date}}\n\n**Location:** {{location}}\n\n## Narrative\n\n{{narrative}}', formSchema: incidentSchema, headerMarkdown: '# Ar Civic Archive\n\n## Incident Report', footerMarkdown: '---\n\n*Filed through the Ar civic archive.*', lifecyclePolicy: 'review-required' })

  const incidentCapabilities: Capability[] = ['read', 'create_document', 'edit_document', 'submit_document', 'delete_document']
  const approvalCapabilities: Capability[] = [...incidentCapabilities, 'approve_document', 'file_document', 'lock_document', 'unlock_document']
  for (const capability of incidentCapabilities) await ensureRule(payload, { domainId: Number(ar.id), principalType: 'Role', principalId: Number(warrior.id), resourceType: 'DocumentType', resourceId: Number(incidentType.id), capability, actorUser: Number(admin.id), actorCharacter: Number(domainAdmin.characterId) })
  for (const capability of approvalCapabilities) await ensureRule(payload, { domainId: Number(ar.id), principalType: 'Role', principalId: Number(sergeant.id), resourceType: 'DocumentType', resourceId: Number(incidentType.id), capability, actorUser: Number(admin.id), actorCharacter: Number(domainAdmin.characterId) })
  for (const capability of ['read', 'create_document', 'edit_document'] as Capability[]) await ensureRule(payload, { domainId: Number(ar.id), principalType: 'Role', principalId: Number(scribe.id), resourceType: 'DocumentType', resourceId: Number(propertyType.id), capability, actorUser: Number(admin.id), actorCharacter: Number(domainAdmin.characterId) })
  for (const capability of ['read', 'create_document', 'edit_document', 'submit_document'] as Capability[]) await ensureRule(payload, { domainId: Number(ar.id), principalType: 'Role', principalId: Number(merchant.id), resourceType: 'DocumentType', resourceId: Number(tradeType.id), capability, actorUser: Number(admin.id), actorCharacter: Number(domainAdmin.characterId) })
  await ensureRule(payload, { domainId: Number(ar.id), principalType: 'Character', principalId: Number(lucan.id), resourceType: 'DocumentType', resourceId: Number(tradeType.id), capability: 'read', actorUser: Number(admin.id), actorCharacter: Number(domainAdmin.characterId) })

  return {
    users: { admin: Number(admin.id), tarl: Number(tarlUser.id), marlen: Number(marlenUser.id), cassius: Number(cassiusUser.id) },
    characters: { platformAdmin: Number(platform.characterId), domainAdmin: Number(domainAdmin.characterId), lucan: Number(lucan.id), tarl: Number(tarl.id), marlen: Number(marlen.id), cassius: Number(cassius.id), npc: Number(npc.id), unclaimed: Number(unclaimed.id) },
    domain: Number(ar.id),
    roles: { warrior: Number(warrior.id), sergeant: Number(sergeant.id), scribe: Number(scribe.id), merchant: Number(merchant.id) },
    types: { incident: Number(incidentType.id), property: Number(propertyType.id), trade: Number(tradeType.id) },
    folders: { root: Number(root.id), incident: Number(incidentRoot.id), pendingIncident: Number(pendingIncident.id), investigatingIncident: Number(investigatingIncident.id), closedIncident: Number(closedIncident.id), property: Number(propertyFolder.id), trade: Number(tradeFolder.id) },
    templates: { document: Number(documentTemplate.id), form: Number(formTemplate.id) },
  }
}
