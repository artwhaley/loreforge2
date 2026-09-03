import { notFound } from 'next/navigation'

import { buildFolderTree, flattenFolderTree } from '@/lib/archive/folderTree'
import { getActiveTenant } from '@/lib/tenant/activeTenant'
import { getFoldersForTenant, getTenantsForUser } from '@/lib/tenant/queries'
import { TenantShell } from '@/components/theme/TenantShell'
import { resolveThemeTokens, themeTokensToCssVars } from '@/lib/theme/fonts'
import { NewDocumentForm } from '@/components/documents/NewDocumentForm'

type Props = { params: Promise<{ slug: string }>; searchParams?: Promise<{ error?: string; folder?: string }> }
export const dynamic = 'force-dynamic'

export default async function NewDocumentPage({ params, searchParams }: Props) {
  const { slug } = await params
  const query = await searchParams
  const { tenant, role, user, activeCharacter } = await getActiveTenant()
  if (!tenant || tenant.slug !== slug || !user) notFound()
  const [folders, domains] = await Promise.all([getFoldersForTenant(tenant), getTenantsForUser(user.id)])
  const payload = await (await import('@/lib/payload')).getLorePayload()
  const types = await payload.find({ collection: 'document-types', where: { and: [{ domain: { equals: tenant.id } }, { active: { equals: true } }] }, depth: 0, limit: 500, sort: 'name' })
  const flatFolders = flattenFolderTree(buildFolderTree(folders))
  const selectedFolder = query?.folder ?? ''
  return <TenantShell tenant={tenant} cssVars={themeTokensToCssVars(resolveThemeTokens(tenant))} role={role} switcherTenants={domains} activeCharacter={activeCharacter}>
    <section style={{ maxWidth: 860, margin: '0 auto' }}><p><a href={`/domain/${slug}/records`}>Records</a> / New document</p><h1>New document</h1><p>Choose a destination and write the first version of this record. Templates and Forms will join this entry point in the templates phase.</p>{query?.error === 'character' ? <p role="alert" style={{ color: '#8f2d21' }}>No active Character credit was supplied; you may continue without one.</p> : query?.error === 'missing' ? <p role="alert" style={{ color: '#8f2d21' }}>A title is required.</p> : query?.error === 'type' ? <p role="alert" style={{ color: '#8f2d21' }}>Choose an active Document Type before creating a document.</p> : null}<NewDocumentForm tenantSlug={slug} types={types.docs.map((item) => ({ id: Number(item.id), name: item.name }))} folders={flatFolders.map(({ folder, depth }) => ({ id: Number(folder.id), name: folder.name, systemManaged: Boolean(folder.systemManaged), depth }))} activeCharacter={activeCharacter ? { id: Number(activeCharacter.id), name: activeCharacter.name } : null} initialState={selectedFolder ? { values: { title: '', body: '', documentTypeId: '', folderId: selectedFolder, concernLinks: '', tagNames: '' } } : undefined} /></section>
  </TenantShell>
}
