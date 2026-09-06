import assert from 'node:assert/strict'
import test from 'node:test'

import { getPayload } from 'payload'
import config from '@/payload.config'

import { applyLifecycleStageConfig, ensureLifecycleStageRows, lifecycleStageRowsForType, stageFolderId, stageRoleIds, LIFECYCLE_STAGES } from './lifecycleStages'
import { resolveInspectorData, resolveTypeTree } from './typeTree'

if (!/^file:.*p08x-t04-/.test(process.env.DATABASE_URI ?? '')) throw new Error('Use a fresh p08x-t04-*.db; never the working DB.')

const payload = await getPayload({ config })

const idOf = (value: unknown): number | null => value && typeof value === 'object' && 'id' in value ? Number((value as { id: number | string }).id) : value == null || value === '' ? null : Number(value)

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

async function documentType(domainId: number, name: string, departmentId: number): Promise<number> {
  const existing = await payload.find({ collection: 'document-types', where: { and: [{ domain: { equals: domainId } }, { name: { equals: name } }] }, depth: 0, limit: 1, overrideAccess: true })
  if (existing.docs[0]) return Number(existing.docs[0].id)
  const row = await payload.create({
    collection: 'document-types',
    overrideAccess: true,
    data: { domain: domainId, name, active: true, templateSelection: 'blank', allowBlank: true, allowTemplate: false, allowForm: false, defaultFilingPolicy: 'direct-file', templateFilingPolicy: 'inherit', department: departmentId, typeFolder: null } as never,
  })
  return Number(row.id)
}

async function templateRow(domainId: number, typeId: number, name: string, kind: 'document' | 'form', scopeFolderId: number) {
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
      bodyTemplate: `# ${name}\n\n{{content}}`,
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

const ownerId = await user('p08x-t04-owner@example.test')
const domainId = await communityDomain('p08x-t04-alpha', ownerId)
const scribesId = await department(domainId, 'Scribes')
const deedsId = await department(domainId, 'Property Deeds')
const draftFolderId = await folder(domainId, 'Draft Pile')
const filedFolderId = await folder(domainId, 'Archive Hall')
const otherDomainId = await communityDomain('p08x-t04-beta', ownerId)
const otherFolderId = await folder(otherDomainId, 'Foreign Vault')
const headScribeRoleId = await role(domainId, scribesId, 'Head Scribe')
const clerkRoleId = await role(domainId, deedsId, 'Records Clerk')
const foreignRoleId = await role(otherDomainId, await department(otherDomainId, 'Foreign Hall'), 'Foreign Scribe')
const typeId = await documentType(domainId, 'Deed of Transfer', deedsId)

test('T04 fresh Type seeds all four stage rows with the T02 defaults', async () => {
  await ensureLifecycleStageRows(payload, typeId)
  const rows = await lifecycleStageRowsForType(payload, typeId)
  for (const stage of LIFECYCLE_STAGES) assert.ok(rows[stage], `${stage} row exists`)
  assert.equal(Boolean(rows.draft!.enabled), true)
  assert.equal(Boolean(rows.draft!.allowOnCreation), true)
  assert.equal(Boolean(rows.draft!.privateDraftsAllowed), true)
  assert.equal(Boolean(rows.filed!.enabled), true)
  assert.equal(Boolean(rows.filed!.allowOnCreation), false)
  assert.equal(Boolean(rows.submitted!.enabled), false)
  assert.equal(Boolean(rows.deprecated!.enabled), false)
  assert.equal(stageFolderId(rows.filed), null)
})

test('T04 lifecycle table save/load round trip incl. role lists and folders', async () => {
  await applyLifecycleStageConfig(payload, {
    documentTypeId: typeId,
    domainId,
    stages: [
      { stage: 'draft', enabled: true, allowOnCreation: true, folderId: draftFolderId, privateDraftsAllowed: true, readRoleIds: [headScribeRoleId, clerkRoleId], writeRoleIds: [clerkRoleId], editOthersRoleIds: [headScribeRoleId], manageRoleIds: [headScribeRoleId] },
      { stage: 'submitted', enabled: true, allowOnCreation: true, folderId: draftFolderId, readRoleIds: [headScribeRoleId], writeRoleIds: [], editOthersRoleIds: [], manageRoleIds: [headScribeRoleId] },
      { stage: 'filed', enabled: true, allowOnCreation: true, folderId: filedFolderId, readRoleIds: [headScribeRoleId, clerkRoleId], writeRoleIds: [], editOthersRoleIds: [], manageRoleIds: [headScribeRoleId] },
      { stage: 'deprecated', enabled: false, allowOnCreation: false, folderId: filedFolderId, readRoleIds: [headScribeRoleId], writeRoleIds: [], editOthersRoleIds: [], manageRoleIds: [headScribeRoleId] },
    ],
  })
  const rows = await lifecycleStageRowsForType(payload, typeId)
  assert.equal(Boolean(rows.draft!.enabled), true)
  assert.equal(stageFolderId(rows.draft), draftFolderId)
  assert.equal(stageFolderId(rows.filed), filedFolderId)
  assert.equal(Boolean(rows.deprecated!.enabled), false)
  assert.deepEqual(stageRoleIds(rows.draft, 'readRoles'), [headScribeRoleId, clerkRoleId])
  assert.deepEqual(stageRoleIds(rows.draft, 'writeRoles'), [clerkRoleId])
  assert.deepEqual(stageRoleIds(rows.draft, 'editOthersRoles'), [headScribeRoleId])
  assert.deepEqual(stageRoleIds(rows.draft, 'manageRoles'), [headScribeRoleId])
  assert.deepEqual(stageRoleIds(rows.submitted, 'readRoles'), [headScribeRoleId])
  assert.deepEqual(stageRoleIds(rows.filed, 'manageRoles'), [headScribeRoleId])
})

test('T04 partial config updates only the touched fields', async () => {
  // Only move the filed folder; the role lists from the previous round trip must survive.
  await applyLifecycleStageConfig(payload, { documentTypeId: typeId, domainId, stages: [{ stage: 'filed', enabled: true, folderId: draftFolderId }] })
  const rows = await lifecycleStageRowsForType(payload, typeId)
  assert.equal(stageFolderId(rows.filed), draftFolderId)
  assert.deepEqual(stageRoleIds(rows.filed, 'readRoles'), [headScribeRoleId, clerkRoleId])
  assert.deepEqual(stageRoleIds(rows.filed, 'manageRoles'), [headScribeRoleId])
  // And a full save still round-trips after the partial edit.
  await applyLifecycleStageConfig(payload, { documentTypeId: typeId, domainId, stages: [{ stage: 'filed', enabled: true, folderId: filedFolderId, readRoleIds: [clerkRoleId], manageRoleIds: [headScribeRoleId] }] })
  const after = await lifecycleStageRowsForType(payload, typeId)
  assert.equal(stageFolderId(after.filed), filedFolderId)
  assert.deepEqual(stageRoleIds(after.filed, 'readRoles'), [clerkRoleId])
})

test('T04 validation failures return readable errors', async () => {
  await assert.rejects(
    applyLifecycleStageConfig(payload, { documentTypeId: typeId, domainId, stages: [{ stage: 'filed', enabled: false }] }),
    /At least one lifecycle stage must be enabled/,
  )
  await assert.rejects(
    applyLifecycleStageConfig(payload, { documentTypeId: typeId, domainId, stages: [{ stage: 'obsolete' as never, enabled: true }] }),
    /Unknown lifecycle stage/,
  )
  await assert.rejects(
    applyLifecycleStageConfig(payload, { documentTypeId: typeId, domainId, stages: [{ stage: 'filed', enabled: true, folderId: otherFolderId }] }),
    /must belong to the same Domain/,
  )
  await assert.rejects(
    applyLifecycleStageConfig(payload, { documentTypeId: typeId, domainId, stages: [{ stage: 'filed', enabled: true, readRoleIds: [foreignRoleId] }] }),
    /must belong to the same Domain/,
  )
})

test('T04 switching the template selection never loses the other kind\\u2019s constructed template', async () => {
  const scopeId = await folder(domainId, 'Deed Scope')
  const formId = await templateRow(domainId, typeId, 'Deed of Transfer Form', 'form', scopeId)
  await payload.update({ collection: 'document-types', id: typeId, overrideAccess: true, data: { templateSelection: 'form', allowForm: true, allowBlank: false, allowTemplate: false } as never })
  let tree = await resolveTypeTree(payload, domainId)
  let leaf = tree.types.find((type) => type.id === typeId)!
  assert.equal(leaf.templateId, formId)
  assert.equal(leaf.constructedTemplates.form?.id, formId)
  // Switch away to Markdown — the form child must survive in the background.
  await payload.update({ collection: 'document-types', id: typeId, overrideAccess: true, data: { templateSelection: 'markdown', allowTemplate: true, allowForm: false, allowBlank: false } as never })
  tree = await resolveTypeTree(payload, domainId)
  leaf = tree.types.find((type) => type.id === typeId)!
  assert.equal(leaf.templateSelection, 'markdown')
  assert.equal(leaf.templateId, null)
  assert.equal(leaf.constructedTemplates.form?.id, formId)
  // Switching back to Form restores the exact prior template.
  await payload.update({ collection: 'document-types', id: typeId, overrideAccess: true, data: { templateSelection: 'form', allowForm: true, allowTemplate: false, allowBlank: false } as never })
  tree = await resolveTypeTree(payload, domainId)
  leaf = tree.types.find((type) => type.id === typeId)!
  assert.equal(leaf.templateId, formId)
  // Switch back to Blank for the remaining tests.
  await payload.update({ collection: 'document-types', id: typeId, overrideAccess: true, data: { templateSelection: 'blank', allowBlank: true, allowTemplate: false, allowForm: false } as never })
})

test('T04 inspector data resolves roles, the Folder tree, and stage rows by Type', async () => {
  const inspector = await resolveInspectorData(payload, domainId, [typeId])
  const roleNames = inspector.roles.map((role) => role.name)
  assert.ok(roleNames.includes('Head Scribe'))
  assert.ok(roleNames.includes('Records Clerk'))
  const vault = inspector.folders.find((folder) => folder.name === 'Archive Hall')
  assert.ok(vault)
  const draft = inspector.stagesByType[typeId]?.draft
  assert.ok(draft)
  assert.equal(stageFolderId(draft), draftFolderId)
  assert.deepEqual(stageRoleIds(draft, 'readRoles'), [headScribeRoleId, clerkRoleId])
  const foreign = await resolveInspectorData(payload, otherDomainId, [])
  assert.equal(foreign.roles.some((role) => role.name === 'Foreign Scribe'), true)
  assert.deepEqual(Object.keys(foreign.stagesByType), [])
})