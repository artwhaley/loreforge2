import Link from 'next/link'
import { notFound } from 'next/navigation'

import { TenantShell } from '@/components/theme/TenantShell'
import { getLorePayload } from '@/lib/payload'
import { getActiveTenant } from '@/lib/tenant/activeTenant'
import { getTenantsForUser } from '@/lib/tenant/queries'
import { resolveThemeTokens, themeTokensToCssVars } from '@/lib/theme/fonts'
import { effectiveCreationMethods } from '@/lib/documents/creation'
import { isAllowed } from '@/lib/authz/evaluate'
import { buildFolderTree, flattenFolderTree, type FlatFolder } from '@/lib/archive/folderTree'
import type { DocumentType } from '@/payload-types'

type Props = { params: Promise<{ slug: string }>; searchParams?: Promise<{ error?: string }> }

export const dynamic = 'force-dynamic'

function DocumentTypeEditor({ domainSlug, folders, type }: { domainSlug: string; folders: FlatFolder[]; type?: DocumentType }) {
  const isEdit = Boolean(type)
  const relationValue = (value: unknown): string => value == null || value === '' ? '' : typeof value === 'object' ? String((value as { id: number | string }).id) : String(value)
  const folderSelect = (name: string, label: string, selected: string) => (
    <label>{label}<select name={name} defaultValue={selected}><option value="">— No folder —</option>{folders.map(({ folder, depth }) => <option key={folder.id} value={folder.id}>{'—'.repeat(depth)} {folder.name}</option>)}</select></label>
  )
  return (
    <form action="/api/document-types" method="post" style={{ display: 'grid', gap: '.55rem', padding: '1rem', border: '1px solid var(--tenant-border, #ddd)' }}>
      <input type="hidden" name="domainSlug" value={domainSlug} />
      <input type="hidden" name="action" value={isEdit ? 'update' : 'create'} />
      {isEdit ? <input type="hidden" name="typeId" value={type!.id} /> : null}
      <label>Name<input name="name" defaultValue={type?.name ?? ''} required /></label>
      <label>Description<textarea name="description" defaultValue={type?.description ?? ''} /></label>
      <label style={{ display: 'flex', gap: '.4rem' }}><input type="checkbox" name="active" defaultChecked={type?.active ?? true} />Active</label>
      <p><strong>Methods</strong></p>
      <label style={{ display: 'flex', gap: '.4rem' }}><input type="checkbox" name="allowBlank" defaultChecked={type?.allowBlank ?? true} />Allow blank documents</label>
      <label style={{ display: 'flex', gap: '.4rem' }}><input type="checkbox" name="allowTemplate" defaultChecked={type?.allowTemplate === true} />Allow document Templates</label>
      <label style={{ display: 'flex', gap: '.4rem' }}><input type="checkbox" name="allowForm" defaultChecked={type?.allowForm === true} />Allow Forms</label>
      <label>Default filing policy<select name="defaultFilingPolicy" defaultValue={type?.defaultFilingPolicy ?? 'direct-file'}><option value="direct-file">Direct file</option><option value="review-required">Review required</option></select></label>
      <label>Template-compatible filing policy<select name="templateFilingPolicy" defaultValue={type?.templateFilingPolicy ?? 'inherit'}><option value="inherit">Inherit</option><option value="direct-file">Direct file</option><option value="review-required">Review required</option></select></label>
      {folderSelect('defaultFolder', 'Default folder', isEdit ? relationValue(type!.defaultFolder) : '')}
      {folderSelect('draftFolder', 'Draft folder', isEdit ? relationValue(type!.draftFolder) : '')}
      {folderSelect('pendingReviewFolder', 'Pending review folder', isEdit ? relationValue(type!.pendingReviewFolder) : '')}
      {folderSelect('filedFolder', 'Filed folder', isEdit ? relationValue(type!.filedFolder) : '')}
      {folderSelect('lockedFolder', 'Locked folder', isEdit ? relationValue(type!.lockedFolder) : '')}
      <button type="submit">{isEdit ? 'Save Type' : 'Create Type'}</button>
    </form>
  )
}

export default async function DocumentTypesPage({ params, searchParams }: Props) {
  const { slug } = await params
  const query = await searchParams
  const { tenant, role, user, activeCharacter } = await getActiveTenant()
  if (!tenant || tenant.slug !== slug || !user) notFound()
  const payload = await getLorePayload()
  const [types, templates, domains, canManage, folderRows] = await Promise.all([
    payload.find({ collection: 'document-types', where: { domain: { equals: tenant.id } }, depth: 0, limit: 500, sort: 'name', overrideAccess: true }),
    payload.find({ collection: 'templates', where: { and: [{ domain: { equals: tenant.id } }, { active: { equals: true } }] }, depth: 1, limit: 500, overrideAccess: true }),
    getTenantsForUser(user.id),
    isAllowed({ payload, actor: { userId: user.id, activeCharacterId: activeCharacter?.id ?? null }, domainId: tenant.id, capability: 'manage_types_tags', resource: { type: 'Domain', id: tenant.id } }),
    payload.find({ collection: 'folders', where: { domain: { equals: tenant.id } }, depth: 0, limit: 0, pagination: false, sort: 'name' }),
  ])
  const flatFolders = flattenFolderTree(buildFolderTree(folderRows.docs))
  return <TenantShell tenant={tenant} cssVars={themeTokensToCssVars(resolveThemeTokens(tenant))} role={role} switcherTenants={domains} activeCharacter={activeCharacter}>
    <section style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gap: '1.2rem' }}><nav aria-label="Templates and Forms"><Link href={`/domain/${slug}/forms`}>Forms</Link> · <Link href={`/domain/${slug}/templates`}>Templates</Link> · <Link href={`/domain/${slug}/document-types`} aria-current="page">Document Types</Link></nav><div><h1>Document Types</h1><p>Creation methods are configured on each Type. Template and Form methods become available only when an active child is attached.</p></div>{query?.error ? <p role="alert">That Type change could not be saved.</p> : null}
      <ul style={{ display: 'grid', gap: '.55rem', listStyle: 'none', padding: 0 }}>{types.docs.map((type) => { const children = templates.docs.filter((template) => { const typeId = typeof template.documentType === 'object' ? template.documentType.id : template.documentType; return Number(typeId) === Number(type.id) }); const methods = effectiveCreationMethods(type, children); return <li key={type.id} style={{ padding: '.8rem', border: '1px solid var(--tenant-border, #ddd)' }}>{type.name} · {type.active ? 'Active' : 'Inactive'} · {methods.length > 0 ? methods.map((method) => method === 'blank' ? 'Blank' : method === 'template' ? 'Template' : 'Form').join(', ') : 'No effective creation methods'}{canManage ? <details><summary>Edit</summary><DocumentTypeEditor domainSlug={slug} folders={flatFolders} type={type} /></details> : null}</li> })}</ul>
      {canManage ? <div style={{ display: 'grid', gap: '.6rem' }}><h2>Create Document Type</h2><DocumentTypeEditor domainSlug={slug} folders={flatFolders} /></div> : null}
    </section>
  </TenantShell>
}