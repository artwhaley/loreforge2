import assert from 'node:assert/strict'
import { existsSync, rmSync } from 'node:fs'
import test from 'node:test'
import { getPayload, type Payload } from 'payload'

import config from '@/payload.config'
import { permissionRuleKey } from '@/collections/PermissionRules'
import { ensureDomainAdminIdentity, ensurePlatformAdminIdentity } from '@/lib/characters/provisioning'
import { isAllowed } from '@/lib/authz/evaluate'
import { prepareDocumentCreation } from '@/lib/documents/creation'
import { transitionDocument } from '@/lib/documents/workflow'
import { generateDocumentFromSubmission } from '@/lib/forms/generateDocument'
import { attachDocumentTag, detachDocumentTag, attachDocumentCharacterLink, detachDocumentCharacterLink } from '@/lib/documents/links'
import {
  createSetupPendingDomain,
  issueDomainBootstrapInvitation,
  acceptDomainBootstrapInvitation,
  decideDomainBootstrapRequest,
  issueDomainJoinInvitation,
  acceptDomainJoinInvitation,
  decideDomainJoinRequest,
} from '@/lib/invitations/workflows'

if (!/^file:.*p08-gate-/.test(process.env.DATABASE_URI ?? '')) throw new Error('Use a fresh p08-gate-*.db; never the working DB.')

const dbPath = String(process.env.DATABASE_URI ?? '').replace(/^file:/, '')
for (const suffix of ['', '-wal', '-shm', '-journal']) {
  const path = `${dbPath}${suffix}`
  if (dbPath && existsSync(path)) rmSync(path)
}

const payload = await getPayload({ config })
const actor = (userId: number, activeCharacterId: number | null) => ({ userId, activeCharacterId })
const idOf = (v: unknown): number | null => (v && typeof v === 'object' && 'id' in v ? Number((v as { id: number | string }).id) : v == null || v === '' ? null : Number(v))

async function ensureUser(email: string, name: string, isPlatformAdmin = false) {
  const existing = await payload.find({ collection: 'users', where: { email: { equals: email } }, depth: 0, limit: 1, overrideAccess: true })
  if (existing.docs[0]) return existing.docs[0] as unknown as { id: number }
  return (await payload.create({ collection: 'users', overrideAccess: true, data: { email, name, password: 'test-password-123', isPlatformAdmin, slVerificationState: 'unlinked' } as never })) as unknown as { id: number }
}

async function grantRule(domainId: number, principalType: 'Role' | 'Character', principalId: number, resourceType: 'DocumentType' | 'Folder' | 'Domain', resourceId: number, capability: string, effect: 'grant' | 'deny', actorUser: number, actorCharacter: number | null) {
  const rel = (t: string): string => ({ Role: 'roles', Character: 'characters', DocumentType: 'document-types', Folder: 'folders', Domain: 'domains' })[t] ?? ''
  const ruleKey = permissionRuleKey({ domainId, principalType: principalType as never, principalRelation: rel(principalType) as never, principalId, resourceType: resourceType as never, resourceRelation: rel(resourceType) as never, resourceId, capability: capability as never })
  const existing = await payload.find({ collection: 'permission-rules', where: { ruleKey: { equals: ruleKey } }, depth: 0, limit: 1, overrideAccess: true })
  if (existing.docs[0]) return existing.docs[0]
  return payload.create({
    collection: 'permission-rules', overrideAccess: true,
    data: { ruleKey, domain: domainId, principalType, principal: { relationTo: rel(principalType), value: principalId }, resourceType, resource: { relationTo: rel(resourceType), value: resourceId }, capability, effect, active: true, actorUser, actorCharacter: actorCharacter ?? undefined } as never,
  })
}

test('P08 empty-domain authoring gate: bootstrap, author, create, review, isolate', async () => {
  // --- Bootstrap (steps 1-5) ---
  const platformUser = await ensureUser('p08-platform@example.test', 'P08 Platform', true)
  const platformIdentity = await ensurePlatformAdminIdentity(payload, Number(platformUser.id))
  assert.ok(platformIdentity.characterId != null)
  const platformActor = actor(Number(platformUser.id), Number(platformIdentity.characterId))

  const setup = await createSetupPendingDomain(payload as never, { actor: platformActor as never, name: 'P08 Gate City', slug: 'p08-gate-city' } as never)
  assert.equal(setup.ok, true)
  if (!setup.ok) return
  const domainId = Number((setup.domain as { id: number }).id)

  const issued = await issueDomainBootstrapInvitation(payload as never, { actor: platformActor as never, domainId } as never)
  assert.equal(issued.ok, true)
  if (!issued.ok) return
  // DB contains only hash: no raw token column on the row.
  const inviteRows = await payload.find({ collection: 'invitations', where: { domain: { equals: domainId } }, depth: 0, limit: 5, overrideAccess: true })
  assert.ok(inviteRows.docs.length >= 1)
  assert.ok(!('token' in (inviteRows.docs[0] as unknown as object)) || (inviteRows.docs[0] as unknown as Record<string, unknown>).token == null)
  assert.ok(String((inviteRows.docs[0] as unknown as Record<string, unknown>).tokenHash ?? '').length >= 32)

  const customerUser = await ensureUser('p08-owner@example.test', 'P08 Owner')
  const accepted = await acceptDomainBootstrapInvitation(payload as never, { userId: Number(customerUser.id), token: issued.token } as never)
  assert.equal(accepted.ok, true)
  if (!accepted.ok) return
  const decided = await decideDomainBootstrapRequest(payload as never, { actor: platformActor as never, requestId: (accepted.request as { id: number }).id, decision: 'approved' } as never)
  assert.equal(decided.ok, true)

  const admins = await payload.find({ collection: 'characters', where: { and: [{ kind: { equals: 'domain_admin' } }, { administrativeDomain: { equals: domainId } }, { status: { equals: 'active' } }] }, depth: 0, limit: 0, pagination: false, overrideAccess: true })
  assert.equal(admins.docs.length, 1)
  const domainAdmin = admins.docs[0] as unknown as { id: number }
  assert.equal(idOf((admins.docs[0] as unknown as Record<string, unknown>).controlledBy), Number(customerUser.id))
  const adminActor = actor(Number(customerUser.id), Number(domainAdmin.id))

  // --- Authoring as domain_admin (steps 6-14) ---
  // 6. Department through the same seam as /api/departments (manage_subdomain).
  assert.equal(await isAllowed({ payload, actor: adminActor, domainId, capability: 'manage_subdomain', resource: { type: 'Domain', id: domainId } }), true)
  const department = await payload.create({ collection: 'subdomains', overrideAccess: true, data: { domain: domainId, slug: 'watch', name: 'Watch', description: 'Gate department.', publicListing: true } as never }) as unknown as { id: number }

  // 7. Folder hierarchy.
  const root = await payload.create({ collection: 'folders', overrideAccess: true, data: { domain: domainId, name: 'Gate Root', parent: null, systemManaged: true, filingPolicy: 'inherit', publicAccess: 'inherit' } as never }) as unknown as { id: number }
  const drafts = await payload.create({ collection: 'folders', overrideAccess: true, data: { domain: domainId, name: 'Drafts', parent: root.id, filingPolicy: 'inherit', publicAccess: 'inherit' } as never }) as unknown as { id: number }
  const pending = await payload.create({ collection: 'folders', overrideAccess: true, data: { domain: domainId, name: 'Pending', parent: root.id, filingPolicy: 'inherit', publicAccess: 'inherit' } as never }) as unknown as { id: number }
  const filed = await payload.create({ collection: 'folders', overrideAccess: true, data: { domain: domainId, name: 'Filed', parent: root.id, filingPolicy: 'inherit', publicAccess: 'inherit' } as never }) as unknown as { id: number }
  const locked = await payload.create({ collection: 'folders', overrideAccess: true, data: { domain: domainId, name: 'Locked', parent: root.id, filingPolicy: 'inherit', publicAccess: 'inherit' } as never }) as unknown as { id: number }

  // 8. Two Document Types with different lifecycle routes.
  const reportType = await payload.create({
    collection: 'document-types', overrideAccess: true,
    data: { domain: domainId, name: 'Gate Report', description: 'Review-required gate type.', active: true, templateSelection: 'blank', allowBlank: true, allowTemplate: true, allowForm: true, defaultFilingPolicy: 'review-required', templateFilingPolicy: 'review-required', defaultFolder: drafts.id, draftFolder: drafts.id, pendingReviewFolder: pending.id, filedFolder: filed.id, lockedFolder: locked.id } as never,
  }) as unknown as { id: number }
  const noteType = await payload.create({
    collection: 'document-types', overrideAccess: true,
    data: { domain: domainId, name: 'Gate Note', description: 'Direct-file gate type.', active: true, templateSelection: 'blank', allowBlank: true, allowTemplate: false, allowForm: false, defaultFilingPolicy: 'direct-file', templateFilingPolicy: 'direct-file', defaultFolder: filed.id, draftFolder: drafts.id } as never,
  }) as unknown as { id: number }

  // 9. Form with header and footer.
  const formTemplate = await payload.create({
    collection: 'templates', overrideAccess: true,
    data: {
      domain: domainId, documentType: reportType.id, name: 'Gate Form', kind: 'form', scopeFolder: drafts.id, destinationFolder: drafts.id,
      allowDestinationOverride: false, availableToDescendants: true, baseTemplate: null,
      titleTemplate: 'Gate Report - {{subject}}', bodyTemplate: '## Details\n\n{{details}}',
      headerMarkdown: '# Gate Archive', footerMarkdown: '---\n\n*Gate footer.*',
      formSchema: { version: 1, fields: [{ key: 'subject', type: 'text', label: 'Subject', required: true }, { key: 'details', type: 'textarea', label: 'Details', required: true }] },
      lifecyclePolicy: 'review-required', active: true, version: 1,
    } as never,
  }) as unknown as { id: number }

  // 9b. Document Template with the same placement contract the customer
  // create surface enforces (same-Domain Type + availability Folder).
  const documentTemplate = await payload.create({
    collection: 'templates', overrideAccess: true,
    data: {
      domain: domainId, documentType: reportType.id, name: 'Gate Doc Template', kind: 'document',
      scopeFolder: drafts.id, destinationFolder: drafts.id,
      allowDestinationOverride: false, availableToDescendants: true, baseTemplate: null,
      titleTemplate: 'Gate Report', bodyTemplate: '# Gate Report\n\n{{content}}',
      lifecyclePolicy: 'inherit', active: true, version: 1,
    } as never,
  }) as unknown as { id: number }

  // 10-11. Role + Type grants.
  const role = await payload.create({ collection: 'roles', overrideAccess: true, data: { domain: domainId, subdomain: department.id, name: 'Gatekeeper', parentRole: null, active: true, system: false } as never }) as unknown as { id: number }
  for (const capability of ['read', 'create_document', 'edit_document', 'submit_document', 'approve_document', 'file_document', 'lock_document', 'unlock_document']) {
    await grantRule(domainId, 'Role', role.id, 'DocumentType', reportType.id, capability, 'grant', Number(customerUser.id), Number(domainAdmin.id))
  }

  // 12. Folder narrowing deny on the routed pending folder.
  // 13-14. Invite/join ordinary character + assign role.
  const joinInvite = await issueDomainJoinInvitation(payload as never, { actor: adminActor as never, domainId } as never)
  assert.equal(joinInvite.ok, true)
  if (!joinInvite.ok) return
  const joinerUser = await ensureUser('p08-joiner@example.test', 'P08 Joiner')
  const joined = await acceptDomainJoinInvitation(payload as never, { userId: Number(joinerUser.id), token: joinInvite.token, requestedName: 'P08 Resident' } as never)
  assert.equal(joined.ok, true)
  if (!joined.ok) return
  const joinDecision = await decideDomainJoinRequest(payload as never, { actor: adminActor as never, requestId: (joined.request as { id: number }).id, decision: 'approved' } as never)
  assert.equal(joinDecision.ok, true)
  if (!joinDecision.ok || (joinDecision as { characterId?: number }).characterId == null) return
  const residentCharacterId = Number((joinDecision as { characterId: number }).characterId)
  await payload.create({ collection: 'role-assignments', overrideAccess: true, data: { character: residentCharacterId, role: role.id, status: 'active', assignedBy: Number(customerUser.id) } as never })
  const residentActor = actor(Number(joinerUser.id), residentCharacterId)

  // Deny AFTER grants so narrowing is the only difference (step 21 setup).
  const deniedFolder = await payload.create({ collection: 'folders', overrideAccess: true, data: { domain: domainId, name: 'Sealed', parent: root.id, filingPolicy: 'inherit', publicAccess: 'inherit' } as never }) as unknown as { id: number }
  const sealedType = await payload.create({
    collection: 'document-types', overrideAccess: true,
    data: { domain: domainId, name: 'Sealed Report', description: 'Routed into a denied folder.', active: true, templateSelection: 'blank', allowBlank: true, allowTemplate: false, allowForm: false, defaultFilingPolicy: 'direct-file', templateFilingPolicy: 'direct-file', defaultFolder: deniedFolder.id, draftFolder: deniedFolder.id } as never,
  }) as unknown as { id: number }
  for (const capability of ['read', 'create_document', 'edit_document']) {
    await grantRule(domainId, 'Role', role.id, 'DocumentType', sealedType.id, capability, 'grant', Number(customerUser.id), Number(domainAdmin.id))
  }
  await grantRule(domainId, 'Role', role.id, 'Folder', deniedFolder.id, 'create_document', 'deny', Number(customerUser.id), Number(domainAdmin.id))

  // --- Document behavior as ordinary character ---
  // 15. Only allowed creation types.
  assert.equal(await isAllowed({ payload, actor: residentActor, domainId, capability: 'create_document', resource: { type: 'DocumentType', id: reportType.id } }), true)
  assert.equal(await isAllowed({ payload, actor: residentActor, domainId, capability: 'create_document', resource: { type: 'DocumentType', id: noteType.id } }), false)

  // 16. Blank record via canonical primitive (forged folder ignored by construction).
  const blankPlan = await prepareDocumentCreation({ payload, actor: residentActor, domainId, documentTypeId: reportType.id, method: 'blank', lifecycle: 'draft' })
  assert.equal(blankPlan.folderId, drafts.id)
  const blank = await payload.create({
    collection: 'documents', context: { preparedByCharacterId: residentCharacterId, actorUserId: Number(joinerUser.id) },
    data: { domain: domainId, title: 'Gate blank', body: '# Gate blank\n', origin: 'web-editor', sourceKind: 'web', documentType: reportType.id, lifecycle: blankPlan.lifecycle, publicAccess: 'inherit', createdBy: Number(joinerUser.id), folder: blankPlan.folderId },
  }) as unknown as { id: number }
  // 20. Prepared-by attribution.
  const { ensurePreparedBy } = await import('@/lib/documents/links')
  await ensurePreparedBy({ payload, domainId, documentId: blank.id, characterId: residentCharacterId, actor: { userId: Number(joinerUser.id), characterId: residentCharacterId }, skipAuthorization: true })
  const credits = await payload.find({ collection: 'document-character-links', where: { and: [{ document: { equals: blank.id } }, { kind: { equals: 'prepared_by' } }] }, depth: 0, limit: 5, overrideAccess: true })
  assert.ok(credits.docs.length >= 1)

  // 16b. Template method: same rule as blank/form, cross-Type rejected.
  const { assertEffectiveCreationMethod } = await import('@/lib/documents/creation')
  const templateChildren = await payload.find({ collection: 'templates', where: { and: [{ documentType: { equals: reportType.id } }, { kind: { equals: 'document' } }, { active: { equals: true } }] }, depth: 0, limit: 50, overrideAccess: true })
  assertEffectiveCreationMethod({ id: reportType.id, allowBlank: true, allowTemplate: true, allowForm: true }, 'template', templateChildren.docs)
  const templatePlan = await prepareDocumentCreation({ payload, actor: residentActor, domainId, documentTypeId: reportType.id, method: 'template', templateId: documentTemplate.id, lifecycle: 'submitted' })
  assert.equal(templatePlan.folderId, pending.id)
  await assert.rejects(prepareDocumentCreation({ payload, actor: residentActor, domainId, documentTypeId: sealedType.id, method: 'template', templateId: documentTemplate.id, lifecycle: 'draft' }), /method/)
  // Cross-Type template: noteType offers no template method either, so use a
  // dedicated Type that does and prove a foreign template is rejected.
  const otherType = await payload.create({
    collection: 'document-types', overrideAccess: true,
    data: { domain: domainId, name: 'Other Report', description: 'Cross-type guard.', active: true, templateSelection: 'markdown', allowBlank: true, allowTemplate: true, allowForm: false, defaultFilingPolicy: 'direct-file', templateFilingPolicy: 'direct-file', defaultFolder: filed.id, draftFolder: drafts.id } as never,
  }) as unknown as { id: number }
  await assert.rejects(prepareDocumentCreation({ payload, actor: residentActor, domainId, documentTypeId: otherType.id, method: 'template', templateId: documentTemplate.id, lifecycle: 'draft' }), /template-type/)

  // 17-19. Form record: header/body/footer composition + lifecycle folder.
  const generated = await generateDocumentFromSubmission({
    payload, tenant: { id: domainId, slug: 'p08-gate-city' }, user: { id: Number(joinerUser.id) }, actorCharacterId: residentCharacterId,
    form: { id: formTemplate.id, name: 'Gate Form', kind: 'form', titleTemplate: 'Gate Report - {{subject}}', bodyTemplate: '## Details\n\n{{details}}', headerMarkdown: '# Gate Archive', footerMarkdown: '---\n\n*Gate footer.*', formSchema: { version: 1, fields: [{ key: 'subject', type: 'text', label: 'Subject', required: true }, { key: 'details', type: 'textarea', label: 'Details', required: true }] }, documentType: reportType.id, lifecyclePolicy: 'review-required' },
    answers: { subject: 'Fence', details: 'A broken fence was documented.' },
  })
  const formDoc = await payload.findByID({ collection: 'documents', id: generated.id, depth: 0, overrideAccess: true }) as unknown as { body: string; lifecycle: string; folder: unknown }
  assert.match(formDoc.body, /^# Gate Archive/)
  assert.match(formDoc.body, /A broken fence was documented/)
  assert.match(formDoc.body, /Gate footer/)
  assert.equal(formDoc.lifecycle, 'submitted')
  assert.equal(idOf(formDoc.folder), pending.id)

  // 21. Denied routed folder blocks creation despite Type grant.
  await assert.rejects(prepareDocumentCreation({ payload, actor: residentActor, domainId, documentTypeId: sealedType.id, method: 'blank', lifecycle: 'draft' }), /folder-narrowed/)

  // 22. Tags + concern links after creation.
  const { findOrCreateDomainTag } = await import('@/lib/documents/links')
  const tag = await findOrCreateDomainTag({ payload, domainId, name: 'gate-tag', actor: { userId: Number(joinerUser.id), characterId: residentCharacterId }, skipAuthorization: true })
  await attachDocumentTag({ payload, domainId, documentId: blank.id, tagId: (tag as { id: number }).id, actor: { userId: Number(joinerUser.id), characterId: residentCharacterId }, skipAuthorization: true })
  await detachDocumentTag({ payload, domainId, documentId: blank.id, tagId: (tag as { id: number }).id, actor: { userId: Number(joinerUser.id), characterId: residentCharacterId }, skipAuthorization: true })
  await attachDocumentCharacterLink({ payload, domainId, documentId: blank.id, characterId: residentCharacterId, kind: 'concerns', actor: { userId: Number(joinerUser.id), characterId: residentCharacterId }, skipAuthorization: true })
  await detachDocumentCharacterLink({ payload, domainId, documentId: blank.id, characterId: residentCharacterId, kind: 'concerns', actor: { userId: Number(joinerUser.id), characterId: residentCharacterId }, skipAuthorization: true })

  // 23. Submit for review (draft -> submitted routes to Pending).
  await transitionDocument({ payload, userId: Number(joinerUser.id), domainId, documentId: blank.id, actorCharacterId: residentCharacterId, operation: 'submit' })
  const submitted = await payload.findByID({ collection: 'documents', id: blank.id, depth: 0, overrideAccess: true }) as unknown as { lifecycle: string; folder: unknown }
  assert.equal(submitted.lifecycle, 'submitted')
  assert.equal(idOf(submitted.folder), pending.id)

  // --- Reviewer / domain_admin (steps 24-28) ---
  // 24-25. Approve as domain_admin despite no membership; verify move + provenance.
  await transitionDocument({ payload, userId: Number(customerUser.id), domainId, documentId: blank.id, actorCharacterId: Number(domainAdmin.id), operation: 'approve' })
  const approvedDoc = await payload.findByID({ collection: 'documents', id: blank.id, depth: 0, overrideAccess: true }) as unknown as { lifecycle: string; folder: unknown }
  assert.equal(approvedDoc.lifecycle, 'filed')
  assert.equal(idOf(approvedDoc.folder), filed.id)
  const provenance = await payload.find({ collection: 'document-provenance-events', where: { and: [{ domain: { equals: domainId } }, { document: { equals: blank.id } }] }, depth: 0, limit: 0, pagination: false, overrideAccess: true })
  assert.ok(provenance.docs.some((e) => (e as { eventType: string }).eventType === 'approved'))

  // 26. Lock/unlock: P08X-T02 boolean toggle — never a stage or Folder move.
  await transitionDocument({ payload, userId: Number(customerUser.id), domainId, documentId: blank.id, actorCharacterId: Number(domainAdmin.id), operation: 'lock' })
  const lockedDoc = await payload.findByID({ collection: 'documents', id: blank.id, depth: 0, overrideAccess: true }) as unknown as { lifecycle: string; folder: unknown; locked: boolean }
  assert.equal(lockedDoc.lifecycle, 'filed')
  assert.equal(lockedDoc.locked, true)
  assert.equal(idOf(lockedDoc.folder), filed.id)
  await transitionDocument({ payload, userId: Number(customerUser.id), domainId, documentId: blank.id, actorCharacterId: Number(domainAdmin.id), operation: 'unlock' })
  const unlockedDoc = await payload.findByID({ collection: 'documents', id: blank.id, depth: 0, overrideAccess: true }) as unknown as { lifecycle: string; locked: boolean }
  assert.equal(unlockedDoc.lifecycle, 'filed')
  assert.equal(unlockedDoc.locked, false)

  // --- Identity isolation (steps 29-34) ---
  // 29-30. Owner User as ordinary player: no Domain-admin authority.
  const ownerPlayer = await payload.create({ collection: 'characters', overrideAccess: true, data: { name: 'P08 Owner Player', kind: 'player', controlledBy: Number(customerUser.id), status: 'active' } as never }) as unknown as { id: number }
  const ownerPlayerActor = actor(Number(customerUser.id), Number(ownerPlayer.id))
  assert.equal(await isAllowed({ payload, actor: ownerPlayerActor, domainId, capability: 'manage_subdomain', resource: { type: 'Domain', id: domainId } }), false)
  // 31-32. platform_admin: no Domain record/admin authority.
  assert.equal(await isAllowed({ payload, actor: platformActor, domainId, capability: 'create_document', resource: { type: 'DocumentType', id: reportType.id } }), false)
  assert.equal(await isAllowed({ payload, actor: platformActor, domainId, capability: 'manage_subdomain', resource: { type: 'Domain', id: domainId } }), false)
  // 33-34. Back to domain_admin: authority returns.
  assert.equal(await isAllowed({ payload, actor: adminActor, domainId, capability: 'manage_subdomain', resource: { type: 'Domain', id: domainId } }), true)

  // Single-use bootstrap invite cannot be reused.
  const secondAccept = await acceptDomainBootstrapInvitation(payload as never, { userId: Number(joinerUser.id), token: issued.token } as never)
  assert.equal(secondAccept.ok, false)

  // Legacy domain-admins rows grant nothing.
  await payload.create({ collection: 'domain-admins', overrideAccess: true, data: { domain: domainId, user: Number(joinerUser.id), status: 'active' } as never })
  assert.equal(await isAllowed({ payload, actor: residentActor, domainId, capability: 'manage_subdomain', resource: { type: 'Domain', id: domainId } }), false)

  // No universal queue persistence.
  const cfg = await config
  const collections = ((cfg as unknown as { collections?: Array<{ slug: string }> }).collections ?? []).map((c) => c.slug)
  assert.ok(!collections.includes('queue_items'))
})
