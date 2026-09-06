import assert from 'node:assert/strict'
import test from 'node:test'

import { getPayload } from 'payload'
import config from '@/payload.config'

import { resolveTypeTree, type TypeTreeData, type TypeTreeNode } from './typeTree'

if (!/^file:.*p08x-t03-/.test(process.env.DATABASE_URI ?? '')) throw new Error('Use a fresh p08x-t03-*.db; never the working DB.')

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

async function department(domainId: number, name: string, publicListing = true): Promise<number> {
  const slug = name.toLocaleLowerCase().replace(/[^a-z0-9]+/g, '-')
  const existing = await payload.find({ collection: 'subdomains', where: { and: [{ domain: { equals: domainId } }, { slug: { equals: slug } }] }, depth: 0, limit: 1, overrideAccess: true })
  const row = existing.docs[0] ?? await payload.create({ collection: 'subdomains', overrideAccess: true, data: { domain: domainId, name, slug, publicListing } })
  return Number(row.id)
}

async function folder(domainId: number, name: string, parentId: number | null = null): Promise<number> {
  const existing = await payload.find({ collection: 'folders', where: { and: [{ domain: { equals: domainId } }, { name: { equals: name } }] }, depth: 0, limit: 1, overrideAccess: true })
  const row = existing.docs[0] ?? await payload.create({ collection: 'folders', overrideAccess: true, data: { domain: domainId, name, parent: parentId, systemManaged: parentId === null, filingPolicy: 'inherit', publicAccess: 'inherit' } })
  return Number(row.id)
}

async function typeFolder(domainId: number, name: string, departmentId: number | null, parentId: number | null = null): Promise<number> {
  const row = await payload.create({ collection: 'type-folders', overrideAccess: true, data: { domain: domainId, name, department: departmentId, parent: parentId } })
  return Number(row.id)
}

async function documentType(domainId: number, name: string, opts: { departmentId?: number | null; typeFolderId?: number | null; templateSelection?: 'blank' | 'markdown' | 'form'; active?: boolean } = {}): Promise<number> {
  const existing = await payload.find({ collection: 'document-types', where: { and: [{ domain: { equals: domainId } }, { name: { equals: name } }] }, depth: 0, limit: 1, overrideAccess: true })
  const data = {
    domain: domainId,
    name,
    active: opts.active ?? true,
    templateSelection: opts.templateSelection ?? 'blank',
    allowBlank: (opts.templateSelection ?? 'blank') === 'blank',
    allowTemplate: opts.templateSelection === 'markdown',
    allowForm: opts.templateSelection === 'form',
    defaultFilingPolicy: 'direct-file',
    templateFilingPolicy: 'inherit',
    department: opts.departmentId ?? null,
    typeFolder: opts.typeFolderId ?? null,
  } as never
  if (existing.docs[0]) return Number(existing.docs[0].id)
  const row = await payload.create({ collection: 'document-types', overrideAccess: true, data })
  return Number(row.id)
}

async function templateRow(domainId: number, typeId: number, name: string, kind: 'document' | 'form', scopeFolderId: number, opts: { active?: boolean } = {}) {
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
      active: opts.active ?? true,
      version: 1,
    } as never,
  })
  return Number(row.id)
}

const findType = (tree: TypeTreeData, id: number): TypeTreeNode | null => {
  const walk = (nodes: TypeTreeNode[]): TypeTreeNode | null => {
    for (const node of nodes) {
      if (node.kind === 'type' && node.leaf?.id === id) return node
      const found = walk(node.children)
      if (found) return found
    }
    return null
  }
  return walk(tree.roots)
}

const leafIds = (node: TypeTreeNode | null): number[] => (node?.children ?? []).filter((child) => child.kind === 'type').map((child) => child.leaf!.id)

const ownerId = await user('p08x-t03-owner@example.test')
const domainId = await communityDomain('p08x-t03-alpha', ownerId)
// Sequential only: concurrent payload.create calls share one SQLite connection.
const scribesId = await department(domainId, 'Scribes')
const deedsId = await department(domainId, 'Property Deeds')
const emptyId = await department(domainId, 'Empty Hall')
const rootFolderId = await folder(domainId, 'Domain Root')

test('T03 every active Department renders as a root, whether or not it owns content', async () => {
  const tree = await resolveTypeTree(payload, domainId)
  const rootNames = tree.roots.filter((root) => root.kind === 'department').map((root) => root.name)
  assert.deepEqual(rootNames, ['Empty Hall', 'Property Deeds', 'Scribes'])
  assert.equal(tree.hasUnassigned, false)
})

test('T03 types without a manual folder hang under their Department root; Unassigned stays hidden', async () => {
  const deedTypeId = await documentType(domainId, 'Deed of Transfer', { departmentId: deedsId })
  const tree = await resolveTypeTree(payload, domainId)
  const deeds = tree.roots.find((root) => root.kind === 'department' && root.name === 'Property Deeds')!
  assert.deepEqual(leafIds(deeds), [deedTypeId])
  assert.equal(tree.hasUnassigned, false)
})

test('T03 manual subfolders nest under Departments and carry their types', async () => {
  const crownFolderId = await typeFolder(domainId, 'Crown Lands', deedsId)
  const innerFolderId = await typeFolder(domainId, 'Inner Crown', deedsId, crownFolderId)
  const crownTypeId = await documentType(domainId, 'Crown Grant', { departmentId: deedsId, typeFolderId: crownFolderId })
  const innerTypeId = await documentType(domainId, 'Inner Grant', { departmentId: deedsId, typeFolderId: innerFolderId })
  const tree = await resolveTypeTree(payload, domainId)
  const deeds = tree.roots.find((root) => root.kind === 'department' && root.name === 'Property Deeds')!
  const crown = deeds.children.find((node) => node.kind === 'folder' && node.name === 'Crown Lands')!
  assert.deepEqual(leafIds(crown), [crownTypeId])
  const inner = crown.children.find((node) => node.kind === 'folder' && node.name === 'Inner Crown')!
  assert.deepEqual(leafIds(inner), [innerTypeId])
})

test('T03 line-card template derivation: selection maps to the active child of that kind', async () => {
  const reportId = await documentType(domainId, 'Incident Report', { departmentId: scribesId, templateSelection: 'markdown' })
  const scopeId = await folder(domainId, 'Scope Root')
  await templateRow(domainId, reportId, 'Incident Report Template', 'document', scopeId)
  const tree = await resolveTypeTree(payload, domainId)
  const report = findType(tree, reportId)!
  assert.equal(report.leaf!.templateSelection, 'markdown')
  assert.equal(report.leaf!.templateKind, 'document')
  assert.equal(report.leaf!.templateName, 'Incident Report Template')
  assert.ok(report.leaf!.templateId != null)
  // Blank selection never derives a template, even if children exist.
  const deedTypeId = (await resolveTypeTree(payload, domainId)).types.find((leaf) => leaf.name === 'Deed of Transfer')!.id
  const blank = findType(await resolveTypeTree(payload, domainId), deedTypeId)!
  assert.equal(blank.leaf!.templateSelection, 'blank')
  assert.equal(blank.leaf!.templateId, null)
})

test('T03 form selection derives the form child; inactive templates are ignored', async () => {
  const claimId = await documentType(domainId, 'Land Claim', { departmentId: deedsId, templateSelection: 'form' })
  const scopeId = await folder(domainId, 'Claim Scope')
  const dormantId = await templateRow(domainId, claimId, 'Old Land Claim Form', 'form', scopeId, { active: false })
  const activeId = await templateRow(domainId, claimId, 'Land Claim Form', 'form', scopeId)
  const tree = await resolveTypeTree(payload, domainId)
  const claim = findType(tree, claimId)!
  assert.equal(claim.leaf!.templateKind, 'form')
  assert.equal(claim.leaf!.templateId, activeId)
  assert.notEqual(claim.leaf!.templateId, dormantId)
  assert.equal(claim.leaf!.templateName, 'Land Claim Form')
})

test('T03 archived-Department types surface under Unassigned; restore returns them', async () => {
  // Isolated Department so the Unassigned population is deterministic.
  const ledgerHallId = await department(domainId, 'Ledger Hall')
  const orphanTypeId = await documentType(domainId, 'Ancient Ledger', { departmentId: ledgerHallId })
  await payload.update({ collection: 'subdomains', id: ledgerHallId, overrideAccess: true, data: { publicListing: false } })
  let tree = await resolveTypeTree(payload, domainId)
  assert.equal(tree.hasUnassigned, true)
  const unassigned = tree.roots.find((root) => root.kind === 'unassigned')!
  assert.deepEqual(leafIds(unassigned), [orphanTypeId])
  // The archived root is gone while archived.
  assert.equal(tree.roots.some((root) => root.kind === 'department' && root.name === 'Ledger Hall'), false)
  // Archived Departments stay available to pickers (for the restore flow).
  const ledger = tree.departments.find((dept) => dept.name === 'Ledger Hall')
  assert.equal(ledger?.archived, true)
  // Restore (P08X-T03 unarchive): back to a normal root, Unassigned hides again.
  await payload.update({ collection: 'subdomains', id: ledgerHallId, overrideAccess: true, data: { publicListing: true } })
  tree = await resolveTypeTree(payload, domainId)
  assert.equal(tree.hasUnassigned, false)
  const restored = tree.roots.find((root) => root.kind === 'department' && root.name === 'Ledger Hall')!
  assert.deepEqual(leafIds(restored), [orphanTypeId])
})

test('T03 type-folders under an archived Department ride into Unassigned with their types', async () => {
  await payload.update({ collection: 'subdomains', id: deedsId, overrideAccess: true, data: { publicListing: false } })
  const tree = await resolveTypeTree(payload, domainId)
  const unassigned = tree.roots.find((root) => root.kind === 'unassigned')!
  const crown = unassigned.children.find((node) => node.kind === 'folder' && node.name === 'Crown Lands')!
  assert.ok(crown.children.length >= 2)
  await payload.update({ collection: 'subdomains', id: deedsId, overrideAccess: true, data: { publicListing: true } })
})

test('T03 a type with no Department degrades to Unassigned instead of breaking', async () => {
  const strayId = await documentType(domainId, 'No Department Type')
  const tree = await resolveTypeTree(payload, domainId)
  assert.equal(tree.hasUnassigned, true)
  const unassigned = tree.roots.find((root) => root.kind === 'unassigned')!
  assert.ok(leafIds(unassigned).includes(strayId))
})

test('T03 inactive types render with the inactive leaf flag and stay placed', async () => {
  const inactiveId = await documentType(domainId, 'Retired Form', { departmentId: scribesId, active: false })
  const tree = await resolveTypeTree(payload, domainId)
  const node = findType(tree, inactiveId)!
  assert.equal(node.leaf!.active, false)
  const scribes = tree.roots.find((root) => root.kind === 'department' && root.name === 'Scribes')!
  assert.ok(leafIds(scribes).includes(inactiveId))
})