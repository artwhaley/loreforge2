import { notFound } from 'next/navigation'

import { buildFolderTree, flattenFolderTree } from '@/lib/archive/folderTree'
import { getActiveTenant } from '@/lib/tenant/activeTenant'
import { getDocumentForTenant, getFoldersForTenant, getTenantsForUser } from '@/lib/tenant/queries'
import { TenantShell } from '@/components/theme/TenantShell'
import { resolveThemeTokens, themeTokensToCssVars } from '@/lib/theme/fonts'
import { NewDocumentForm } from '@/components/documents/NewDocumentForm'
import { getDocumentCharacterLinks } from '@/lib/documents/links'
import { isAllowed } from '@/lib/authz/evaluate'
import { resolveTemplateDestinations } from '@/lib/templates/resolve'

type Props = { params: Promise<{ slug: string }>; searchParams?: Promise<{ error?: string; folder?: string; supersedes?: string }> }
export const dynamic = 'force-dynamic'

export default async function NewDocumentPage({ params, searchParams }: Props) {
  const { slug } = await params
  const query = await searchParams
  const { tenant, role, user, activeCharacter } = await getActiveTenant()
  if (!tenant || tenant.slug !== slug || !user) notFound()
  const [folders, domains] = await Promise.all([getFoldersForTenant(tenant), getTenantsForUser(user.id)])
  const payload = await (await import('@/lib/payload')).getLorePayload()
  const [types, templates] = await Promise.all([
    payload.find({ collection: 'document-types', where: { and: [{ domain: { equals: tenant.id } }, { active: { equals: true } }] }, depth: 0, limit: 500, sort: 'name' }),
    payload.find({ collection: 'templates', where: { and: [{ domain: { equals: tenant.id } }, { active: { equals: true } }] }, depth: 1, limit: 500, sort: 'name', overrideAccess: true }),
  ])
  const flatFolders = flattenFolderTree(buildFolderTree(folders))
  const typeIds = new Set(types.docs.map((item) => Number(item.id)))
  const folderById = new Map(folders.map((folder) => [Number(folder.id), folder]))
  const actor = { userId: user.id, activeCharacterId: activeCharacter?.id ?? null }
  // The chooser only receives Template/destination pairs the current actor
  // can actually use. This keeps a forged or merely visible Template from
  // becoming a confusing submit-time failure.
  const templateOptions = (await Promise.all(templates.docs.map(async (template) => {
    const typeId = Number(typeof template.documentType === 'object' ? template.documentType.id : template.documentType)
    const normalDestinationId = Number(typeof template.destinationFolder === 'object' ? template.destinationFolder.id : template.destinationFolder)
    if (!typeIds.has(typeId) || !normalDestinationId) return null
    // P07X-T03: create_document gates on the Template's Document Type (the
    // single authorization unit for the create act). Destination availability
    // stays a Template-UI concern via resolveTemplateDestinations.
    const createAllowed = await isAllowed({ payload, actor, domainId: tenant.id, capability: 'create_document', resource: { type: 'DocumentType', id: typeId } })
    if (!createAllowed) return null
    const available = await resolveTemplateDestinations(payload, template)
    const normal = available.find((folder) => Number(folder.id) === normalDestinationId)
    if (!normal) return null
    const destinationIds = template.allowDestinationOverride ? available.map((folder) => Number(folder.id)) : [normalDestinationId]
    return {
      id: Number(template.id),
      name: template.name,
      kind: template.kind,
      documentTypeId: typeId,
      destinationFolderId: normalDestinationId,
      allowDestinationOverride: Boolean(template.allowDestinationOverride),
      destinations: destinationIds.map((id) => {
        const folder = folderById.get(id)
        return folder ? { id, name: folder.name, systemManaged: Boolean(folder.systemManaged), depth: flatFolders.find((entry) => Number(entry.folder.id) === id)?.depth ?? 0 } : null
      }).filter((folder): folder is { id: number; name: string; systemManaged: boolean; depth: number } => folder !== null),
      formSchema: template.formSchema && typeof template.formSchema === 'object' ? template.formSchema as never : null,
    }
  }))).filter((template): template is NonNullable<typeof template> => template !== null)
  const selectedFolder = query?.folder ?? ''
  const supersedesId = Number(query?.supersedes ?? '')
  const supersededDocument = Number.isFinite(supersedesId) && supersedesId > 0 ? await getDocumentForTenant(tenant, supersedesId) : null
  const supersededLinks = supersededDocument ? await getDocumentCharacterLinks(payload, supersededDocument.id) : null
  const supersededConcerns = supersededLinks?.docs
    .filter((link) => link.kind === 'concerns')
    .flatMap((link) => {
      const character = link.character
      if (!character || typeof character !== 'object') return []
      return [{ characterId: Number(character.id), name: character.name, relationshipLabel: link.relationshipLabel ?? '' }]
    }) ?? []
  const supersessionNote = supersededDocument
    ? `*Document Supersedes ${supersededDocument.title} prepared on ${new Date(supersededDocument.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} by ${(() => { const prepared = supersededLinks?.docs.find((link) => link.kind === 'prepared_by')?.character; return prepared && typeof prepared === 'object' ? prepared.name : 'unknown Character' })()}.*`
    : ''
  const supersedingInitialState = supersededDocument ? {
    values: {
      title: supersededDocument.title,
      body: `${supersededDocument.body.trimEnd()}\n\n${supersessionNote}`,
      documentTypeId: String(typeof supersededDocument.documentType === 'object' ? supersededDocument.documentType.id : supersededDocument.documentType),
      folderId: String(typeof supersededDocument.folder === 'object' ? supersededDocument.folder?.id ?? '' : supersededDocument.folder ?? ''),
      concernLinks: JSON.stringify(supersededConcerns),
      tagNames: '',
      preparedByCharacterIds: '',
      templateId: '',
      formAnswers: '',
    },
  } : selectedFolder ? { values: { title: '', body: '', documentTypeId: '', folderId: selectedFolder, concernLinks: '', tagNames: '', preparedByCharacterIds: '', templateId: '', formAnswers: '' } } : undefined

  return <TenantShell tenant={tenant} cssVars={themeTokensToCssVars(resolveThemeTokens(tenant))} role={role} switcherTenants={domains} activeCharacter={activeCharacter}>
    <section style={{ maxWidth: 1100, margin: '0 auto' }}><p><a href={`/domain/${slug}/records`}>Records</a> / New document</p><h1>{supersededDocument ? 'Create superseding document' : 'New document'}</h1><p>{supersededDocument ? `Start a new version of “${supersededDocument.title}”.` : 'Choose a Template, complete the document, and file it in the declared destination.'}</p>{query?.error === 'character' ? <p role="alert" style={{ color: '#8f2d21' }}>Choose an acting Character from the selector above — members must create through an acting Character, which becomes the non-removable Prepared-by credit (CC-2026-09-03-05).</p> : query?.error === 'missing' ? <p role="alert" style={{ color: '#8f2d21' }}>A title is required.</p> : query?.error === 'type' ? <p role="alert" style={{ color: '#8f2d21' }}>Choose an active Document Type before creating a document.</p> : null}<NewDocumentForm tenantSlug={slug} types={types.docs.map((item) => ({ id: Number(item.id), name: item.name }))} templates={templateOptions} folders={flatFolders.map(({ folder, depth }) => ({ id: Number(folder.id), name: folder.name, systemManaged: Boolean(folder.systemManaged), depth }))} activeCharacter={activeCharacter ? { id: Number(activeCharacter.id), name: activeCharacter.name } : null} initialState={supersedingInitialState} supersedesDocumentId={supersededDocument?.id} /></section>
  </TenantShell>
}
