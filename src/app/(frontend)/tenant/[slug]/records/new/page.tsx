import { notFound } from 'next/navigation'

import { createDocumentFromEditorAction } from '@/lib/actions/archive'
import { buildFolderTree, flattenFolderTree } from '@/lib/archive/folderTree'
import { getActiveTenant } from '@/lib/tenant/activeTenant'
import { getFoldersForTenant, getTenantsForUser } from '@/lib/tenant/queries'
import { TenantShell } from '@/components/theme/TenantShell'
import { resolveThemeTokens, themeTokensToCssVars } from '@/lib/theme/fonts'
import { getCharactersForTenant } from '@/lib/tenant/queries'
import { CharacterMultiSelect } from '@/components/characters/CharacterMultiSelect'

type Props = { params: Promise<{ slug: string }>; searchParams?: Promise<{ error?: string; folder?: string }> }
export const dynamic = 'force-dynamic'

export default async function NewDocumentPage({ params, searchParams }: Props) {
  const { slug } = await params
  const query = await searchParams
  const { tenant, role, user, activeCharacter } = await getActiveTenant()
  if (!tenant || tenant.slug !== slug || !user) notFound()
  const [folders, domains, characters] = await Promise.all([getFoldersForTenant(tenant), getTenantsForUser(user.id), getCharactersForTenant(tenant, user.id)])
  const payload = await (await import('@/lib/payload')).getLorePayload()
  const types = await payload.find({ collection: 'document-types', where: { and: [{ domain: { equals: tenant.id } }, { active: { equals: true } }] }, depth: 0, limit: 500, sort: 'name' })
  const flatFolders = flattenFolderTree(buildFolderTree(folders))
  const selectedFolder = query?.folder ?? ''
  return <TenantShell tenant={tenant} cssVars={themeTokensToCssVars(resolveThemeTokens(tenant))} role={role} switcherTenants={domains} activeCharacter={activeCharacter}>
    <section style={{ maxWidth: 860, margin: '0 auto' }}><p><a href={`/domain/${slug}/records`}>Records</a> / New document</p><h1>New document</h1><p>Choose a destination and write the first version of this record. Templates and Forms will join this entry point in the templates phase.</p>{query?.error === 'character' ? <p role="alert" style={{ color: '#8f2d21' }}>Choose an active participating Character before creating a document.</p> : query?.error === 'missing' ? <p role="alert" style={{ color: '#8f2d21' }}>A title is required.</p> : query?.error === 'type' ? <p role="alert" style={{ color: '#8f2d21' }}>Choose an active Document Type before creating a document.</p> : null}<form action={createDocumentFromEditorAction} style={{ display: 'grid', gap: '1rem', padding: '1.25rem', border: '1px solid var(--tenant-accent)', background: 'var(--tenant-surface-bg)' }}><input type="hidden" name="tenantSlug" value={slug} /><label style={{ display: 'grid', gap: '.35rem' }}><strong>Document Type</strong><select name="documentTypeId" required defaultValue={types.docs.find((item) => item.name.toLowerCase() === 'plain text')?.id ?? ''}><option value="">Choose a type</option>{types.docs.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label style={{ display: 'grid', gap: '.35rem' }}><strong>Title</strong><input name="title" required autoFocus /></label><label style={{ display: 'grid', gap: '.35rem' }}><strong>Destination folder</strong><select name="folderId" defaultValue={selectedFolder}><option value="">Domain Root</option>{flatFolders.filter(({ folder }) => !folder.systemManaged).map(({ folder, depth }) => <option key={folder.id} value={folder.id}>{'— '.repeat(depth)}{folder.name}</option>)}</select></label><CharacterMultiSelect name="preparedByIds" label="Prepared by" options={characters.map((item) => ({ id: Number(item.id), name: item.name }))} lockedId={activeCharacter?.id} help="The acting Character is required and cannot be removed; add other preparers as needed." /><CharacterMultiSelect name="concernCharacterIds" label="Concerns" options={characters.map((item) => ({ id: Number(item.id), name: item.name }))} help="Select Characters this record is about. Add a relationship label below if useful." /><label style={{ display: 'grid', gap: '.35rem' }}><strong>Concerns relationship label</strong><input name="concernsRelationship" placeholder="e.g. owner, witness, subject" /></label><label style={{ display: 'grid', gap: '.35rem' }}><strong>Tags</strong><input name="tagNames" placeholder="Comma-separated tags; existing vocabulary will autocomplete in a later pass" /></label><label style={{ display: 'grid', gap: '.35rem' }}><strong>Document</strong><textarea name="body" rows={18} placeholder="Begin writing in Markdown…" required defaultValue="" /></label><div style={{ display: 'flex', gap: '.75rem' }}><button type="submit">Create document</button><a href={`/domain/${slug}/records`}>Cancel</a></div></form></section>
  </TenantShell>
}
