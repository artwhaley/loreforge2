import assert from 'node:assert/strict'
import test from 'node:test'

import { getPayload } from 'payload'
import config from '@/payload.config'

import { applyLifecycleStageConfig, lifecycleStageRowsForType, stageFolderId, stageRoleIds } from './lifecycleStages'
import { duplicateDocumentType } from './typeDuplicate'
import { resolveTypeTree } from './typeTree'

if (!/^file:.*p08x-t05-/.test(process.env.DATABASE_URI ?? '')) throw new Error('Use a fresh p08x-t05-*.db; never the working DB.')

const payload = await getPayload({ config })

async function user(email: string): Promise<number> {
  const existing = await payload.find({ collection: 'users', where: { email: { equals: email } }, depth: 0, limit: 1, overrideAccess: true })
  const row = existing.docs[0] ?? await payload.create({ collection: 'users', overrideAccess: true, data: { email, password: 'test-password-123', name: email, slVerificationState: 'unlinked' } })
  return Number(row.id)
}

async function communityDomain(slug: string, ownerUserId: number): Promise<number> {
  const existing = await payload.find({ collection: 'domains', where: { slug: { equals: slug } }, depth: 0, limit: 1, overrideAccess: true })
  const row = existing.docs[0] ?? await payload.create({ collection: 'domains', overrideAccess: true, data: { slug, name: slug, ownerUser: ownerUserId, kind: 'community', lifecycle: 'active', defaultFilingPolicy: 'direct-file', publicEnabled: false, preset: 'heritage', primaryColor: '#243145', secondaryColor: '#8A6A3C', accentColor: '#B9975B', backgroundColor: '#F3EFE6', headingFontKey: 'georgia', bodyFontKey: 'verdana' } })
  return Number(row.id)
}

async function department(domainId: number, name: string): Promise<number> {
  const slug = name.toLocaleLowerCase().replace(/[^a-z0-9]+/g, '-')
  const existing = await payload.find({ collection: 'subdomains', where: { and: [{ domain: { equals: domainId } }, { slug: { equals: slug } }] }, depth: 0, limit: 1, overrideAccess: true })
  const row = existing.docs[0] ?? await payload.create({ collection: 'subdomains', overrideAccess: true, data: { domain: domainId, name, slug, publicListing: true } })
  return Number(row.id)
}

async function folder(domainId: number, name: string): Promise<number> {
  const existing = await payload.find({ collection: 'folders', where: { and: [{ domain: { equals: domainId } }, { name: { equals: name } }] }, depth: 0, limit: 1, overrideAccess: true })
  const row = existing.docs[0] ?? await payload.create({ collection: 'folders', overrideAccess: true, data: { domain: domainId, name, parent: null, systemManaged: true, filingPolicy: 'inherit', publicAccess: 'inherit' } })
  return Number(row.id)
}

async function role(domainId: number, departmentId: number, name: string): Promise<number> {
  const existing = await payload.find({ collection: 'roles', where: { and: [{ domain: { equals: domainId } }, { name: { equals: name } }] }, depth: 0, limit: 1, overrideAccess: true })
  const row = existing.docs[0] ?? await payload.create({ collection: 'roles', overrideAccess: true, data: { domain: domainId, subdomain: departmentId, name, active: true, system: false, parentRole: null } })
  return Number(row.id)
}

async function documentType(domainId: number, name: string, departmentId: number, selection: 'blank' | 'markdown' | 'form' = 'blank'): Promise<number> {
  const existing = await payload.find({ collection: 'document-types', where: { and: [{ domain: { equals: domainId } }, { name: { equals: name } }] }, depth: 0, limit: 1, overrideAccess: true })
  if (existing.docs[0]) return Number(existing.docs[0].id)
  const row = await payload.create({
    collection: 'document-types',
    overrideAccess: true,
    data: { domain: domainId, name, active: true, templateSelection: selection, allowBlank: selection === 'blank', allowTemplate: selection === 'markdown', allowForm: selection === 'form', defaultFilingPolicy: 'direct-file', templateFilingPolicy: 'inherit', department: departmentId, typeFolder: null } as never,
  })
  return Number(row.id)
}

async function templateRow(domainId: number, typeId: number, name: string, kind: 'document' | 'form', scopeFolderId: number, bodyTemplate: string) {
  const row = await payload.create({
    collection: 'templates',
    overrideAccess: true,
    data: {
      domain: domainId,
      documentType: typeId,
      name,
      kind,
      scopeFolder: scopeFolderId,
      destinationFolder: scopeFolderId,
      allowDestinationOverride: false,
      availableToDescendants: true,
      baseTemplate: null,
      titleTemplate: name,
      bodyTemplate,
      headerMarkdown: '',
      footerMarkdown: '',
      formSchema: kind === 'form' ? { version: 1, fields: [{ key: 'content', type: 'textarea', label: 'Content', required: true }] } : null,
      lifecyclePolicy: 'inherit',
      active: true,
      version: 1,
    } as never,
  })
  return Number(row.id)
}

const ownerId = await user('p08x-t05-owner@example.test')
const domainId = await communityDomain('p08x-t05-alpha', ownerId)
const otherDomainId = await communityDomain('p08x-t05-beta', ownerId)
const deedsId = await department(domainId, 'Property Deeds')
const draftFolderId = await folder(domainId, 'Draft Pile')
const filedFolderId = await folder(domainId, 'Archive Hall')
const headScribeRoleId = await role(domainId, deedsId, 'Head Scribe')
const clerkRoleId = await role(domainId, deedsId, 'Records Clerk')
// The test DB persists across runs; stamp type names so copy counters never
// collide with leftover state from an earlier run of the suite.
const RUN = Date.now()
const SOURCE_NAME = `Deed of Transfer ${RUN}`
const sourceTypeId = await documentType(domainId, SOURCE_NAME, deedsId, 'form')
const formTemplateId = await templateRow(domainId, sourceTypeId, `${SOURCE_NAME} Form`, 'form', filedFolderId, `# ${SOURCE_NAME} Form\n\n{{content}}`)
await applyLifecycleStageConfig(payload, {
  documentTypeId: sourceTypeId,
  domainId,
  stages: [
    { stage: 'draft', enabled: true, allowOnCreation: true, folderId: draftFolderId, privateDraftsAllowed: true, readRoleIds: [headScribeRoleId, clerkRoleId], writeRoleIds: [clerkRoleId], editOthersRoleIds: [headScribeRoleId], manageRoleIds: [headScribeRoleId] },
    { stage: 'submitted', enabled: true, allowOnCreation: true, folderId: draftFolderId, readRoleIds: [headScribeRoleId], writeRoleIds: [], editOthersRoleIds: [], manageRoleIds: [headScribeRoleId] },
    { stage: 'filed', enabled: true, allowOnCreation: true, folderId: filedFolderId, readRoleIds: [headScribeRoleId, clerkRoleId], writeRoleIds: [], editOthersRoleIds: [], manageRoleIds: [headScribeRoleId] },
    { stage: 'deprecated', enabled: false, allowOnCreation: false, folderId: filedFolderId, readRoleIds: [headScribeRoleId], writeRoleIds: [], editOthersRoleIds: [], manageRoleIds: [headScribeRoleId] },
  ],
})

test('T05 duplicate adds (copy1) to the Type name and every constructed template name', async () => {
  const result = await duplicateDocumentType(payload, { typeId: sourceTypeId, domainId })
  assert.equal(result.ok, true)
  if (!result.ok) return
  assert.equal(result.name, `${SOURCE_NAME} (copy1)`)
  const tree = await resolveTypeTree(payload, domainId)
  const copy = tree.types.find((leaf) => leaf.id === result.typeId)!
  assert.equal(copy.name, `${SOURCE_NAME} (copy1)`)
  assert.equal(copy.templateSelection, 'form')
  assert.equal(copy.templateName, `${SOURCE_NAME} Form (copy1)`)
  assert.notEqual(copy.templateId, formTemplateId)
})

test('T05 the copy carries its own copied stage configuration wholesale', async () => {
  const result = await duplicateDocumentType(payload, { typeId: sourceTypeId, domainId })
  assert.equal(result.ok, true)
  if (!result.ok) return
  const sourceRows = await lifecycleStageRowsForType(payload, sourceTypeId)
  const copyRows = await lifecycleStageRowsForType(payload, result.typeId)
  for (const stage of ['draft', 'submitted', 'filed', 'deprecated'] as const) {
    assert.equal(Boolean(copyRows[stage]!.enabled), Boolean(sourceRows[stage]!.enabled), `${stage} enabled`)
    assert.equal(Boolean(copyRows[stage]!.allowOnCreation), Boolean(sourceRows[stage]!.allowOnCreation), `${stage} allowOnCreation`)
    assert.equal(Boolean(copyRows[stage]!.privateDraftsAllowed), Boolean(sourceRows[stage]!.privateDraftsAllowed), `${stage} privateDrafts`)
    assert.equal(stageFolderId(copyRows[stage]), stageFolderId(sourceRows[stage]), `${stage} folder`)
    for (const field of ['readRoles', 'writeRoles', 'editOthersRoles', 'manageRoles'] as const) {
      assert.deepEqual(stageRoleIds(copyRows[stage], field), stageRoleIds(sourceRows[stage], field), `${stage} ${field}`)
    }
  }
})

test('T05 deep copies are independent rows — editing one never touches the other', async () => {
  const result = await duplicateDocumentType(payload, { typeId: sourceTypeId, domainId })
  assert.equal(result.ok, true)
  if (!result.ok) return
  const copyForm = await payload.find({ collection: 'templates', where: { and: [{ documentType: { equals: result.typeId } }, { kind: { equals: 'form' } }] }, depth: 0, limit: 1, overrideAccess: true })
  const copyFormId = Number(copyForm.docs[0].id)
  const original = await payload.findByID({ collection: 'templates', id: formTemplateId, depth: 0, overrideAccess: true })
  assert.equal(String(original.bodyTemplate), `# ${SOURCE_NAME} Form\n\n{{content}}`)
  // Edit the copy — the original must stay byte-identical.
  await payload.update({ collection: 'templates', id: copyFormId, overrideAccess: true, data: { bodyTemplate: '# EDITED COPY\n\n{{content}}', version: 2 } as never })
  const originalAfter = await payload.findByID({ collection: 'templates', id: formTemplateId, depth: 0, overrideAccess: true })
  assert.equal(String(originalAfter.bodyTemplate), `# ${SOURCE_NAME} Form\n\n{{content}}`)
  // Edit the original — the copy must stay untouched.
  await payload.update({ collection: 'templates', id: formTemplateId, overrideAccess: true, data: { bodyTemplate: '# EDITED ORIGINAL\n\n{{content}}', version: 2 } as never })
  const copyAfter = await payload.findByID({ collection: 'templates', id: copyFormId, depth: 0, overrideAccess: true })
  assert.equal(String(copyAfter.bodyTemplate), '# EDITED COPY\n\n{{content}}')
  // Restore the original for the magic-pops-up test.
  await payload.update({ collection: 'templates', id: formTemplateId, overrideAccess: true, data: { bodyTemplate: `# ${SOURCE_NAME} Form\n\n{{content}}`, version: 3 } as never })
})

test('T05 the magic-pops-up scenario: form → markdown → duplicate → switch copy to form', async () => {
  // Self-contained type so the copy counter is deterministic ((copy1)).
  const magicName = `Magic Ledger ${RUN}`
  const magicId = await documentType(domainId, magicName, deedsId, 'form')
  await templateRow(domainId, magicId, `${magicName} Form`, 'form', filedFolderId, `# ${magicName} Form\n\n{{content}}`)
  await applyLifecycleStageConfig(payload, {
    documentTypeId: magicId,
    domainId,
    stages: [
      { stage: 'draft', enabled: true, allowOnCreation: true, folderId: draftFolderId, privateDraftsAllowed: true, readRoleIds: [headScribeRoleId, clerkRoleId], writeRoleIds: [clerkRoleId], editOthersRoleIds: [headScribeRoleId], manageRoleIds: [headScribeRoleId] },
      { stage: 'submitted', enabled: true, allowOnCreation: true, folderId: draftFolderId, readRoleIds: [headScribeRoleId], writeRoleIds: [], editOthersRoleIds: [], manageRoleIds: [headScribeRoleId] },
      { stage: 'filed', enabled: true, allowOnCreation: true, folderId: filedFolderId, readRoleIds: [headScribeRoleId, clerkRoleId], writeRoleIds: [], editOthersRoleIds: [], manageRoleIds: [headScribeRoleId] },
      { stage: 'deprecated', enabled: false, allowOnCreation: false, folderId: filedFolderId, readRoleIds: [headScribeRoleId], writeRoleIds: [], editOthersRoleIds: [], manageRoleIds: [headScribeRoleId] },
    ],
  })
  // 1. Switch the source to Markdown — the form template must persist in the background.
  await payload.update({ collection: 'document-types', id: magicId, overrideAccess: true, data: { templateSelection: 'markdown', allowTemplate: true, allowForm: false, allowBlank: false } as never })
  await templateRow(domainId, magicId, `${magicName} Template`, 'document', draftFolderId, `# ${magicName}\n\n{{content}}`)
  // 2. Duplicate — the copy carries the markdown selection, its own markdown template, and the hidden form.
  const result = await duplicateDocumentType(payload, { typeId: magicId, domainId })
  assert.equal(result.ok, true)
  if (!result.ok) return
  let copy = (await resolveTypeTree(payload, domainId)).types.find((leaf) => leaf.id === result.typeId)!
  assert.equal(copy.name, `${magicName} (copy1)`)
  assert.equal(copy.templateSelection, 'markdown')
  assert.equal(copy.templateName, `${magicName} Template (copy1)`)
  assert.ok(copy.constructedTemplates.markdown)
  assert.ok(copy.constructedTemplates.form)
  // 3. Switch the copy to Form — the copied form pops up, named (copy1), with the copy's own stage config.
  await payload.update({ collection: 'document-types', id: result.typeId, overrideAccess: true, data: { templateSelection: 'form', allowForm: true, allowTemplate: false, allowBlank: false } as never })
  copy = (await resolveTypeTree(payload, domainId)).types.find((leaf) => leaf.id === result.typeId)!
  assert.equal(copy.templateSelection, 'form')
  assert.equal(copy.templateName, `${magicName} Form (copy1)`)
  const copyRows = await lifecycleStageRowsForType(payload, result.typeId)
  assert.deepEqual(stageRoleIds(copyRows.draft, 'readRoles'), [headScribeRoleId, clerkRoleId])
  assert.equal(stageFolderId(copyRows.filed), filedFolderId)
  // The original is untouched by the copy's switch.
  const original = (await resolveTypeTree(payload, domainId)).types.find((leaf) => leaf.id === magicId)!
  assert.equal(original.templateSelection, 'markdown')
  assert.equal(original.templateName, `${magicName} Template`)
})

test('T05 switching a Type to Blank hides but never deletes constructed templates; switching back restores the exact prior template', async () => {
  await templateRow(domainId, sourceTypeId, `${SOURCE_NAME} Template`, 'document', draftFolderId, `# ${SOURCE_NAME}\n\n{{content}}`)
  await payload.update({ collection: 'document-types', id: sourceTypeId, overrideAccess: true, data: { templateSelection: 'blank', allowBlank: true, allowTemplate: false, allowForm: false } as never })
  let leaf = (await resolveTypeTree(payload, domainId)).types.find((type) => type.id === sourceTypeId)!
  assert.equal(leaf.templateId, null)
  assert.ok(leaf.constructedTemplates.markdown)
  assert.ok(leaf.constructedTemplates.form)
  await payload.update({ collection: 'document-types', id: sourceTypeId, overrideAccess: true, data: { templateSelection: 'markdown', allowTemplate: true, allowBlank: false, allowForm: false } as never })
  leaf = (await resolveTypeTree(payload, domainId)).types.find((type) => type.id === sourceTypeId)!
  assert.equal(leaf.templateId, leaf.constructedTemplates.markdown?.id ?? null)
  assert.equal(leaf.templateName, `${SOURCE_NAME} Template`)
})

test('T05 a second duplicate gets (copy2); foreign-Domain Types are refused', async () => {
  const ledgerName = `Ledger Entry ${RUN}`
  const ledgerId = await documentType(domainId, ledgerName, deedsId)
  const first = await duplicateDocumentType(payload, { typeId: ledgerId, domainId })
  assert.equal(first.ok, true)
  if (first.ok) assert.equal(first.name, `${ledgerName} (copy1)`)
  const second = await duplicateDocumentType(payload, { typeId: ledgerId, domainId })
  assert.equal(second.ok, true)
  if (second.ok) assert.equal(second.name, `${ledgerName} (copy2)`)
  const foreignTypeId = await documentType(otherDomainId, 'Foreign Ledger', await department(otherDomainId, 'Foreign Hall'))
  const refused = await duplicateDocumentType(payload, { typeId: foreignTypeId, domainId })
  assert.equal(refused.ok, false)
  assert.equal(refused.error, 'not-found')
})