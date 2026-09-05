import { notFound } from 'next/navigation'

import { getActiveTenant } from '@/lib/tenant/activeTenant'
import { getDocumentForTenant, getTenantsForUser } from '@/lib/tenant/queries'
import { TenantShell } from '@/components/theme/TenantShell'
import { resolveThemeTokens, themeTokensToCssVars } from '@/lib/theme/fonts'
import { NewDocumentForm } from '@/components/documents/NewDocumentForm'
import { getDocumentCharacterLinks } from '@/lib/documents/links'
import { isAllowed } from '@/lib/authz/evaluate'
import { effectiveCreationMethods } from '@/lib/documents/creation'

type Props = { params: Promise<{ slug: string }>; searchParams?: Promise<{ error?: string; folder?: string; supersedes?: string }> }
export const dynamic = 'force-dynamic'

export default async function NewDocumentPage({ params, searchParams }: Props) {
  const { slug } = await params
  const query = await searchParams
  const { tenant, role, user, activeCharacter } = await getActiveTenant()
  if (!tenant || tenant.slug !== slug || !user) notFound()
  const domains = await getTenantsForUser(user.id)
  const payload = await (await import('@/lib/payload')).getLorePayload()
  const [types, templates] = await Promise.all([
    payload.find({ collection: 'document-types', where: { and: [{ domain: { equals: tenant.id } }, { active: { equals: true } }] }, depth: 0, limit: 500, sort: 'name' }),
    payload.find({ collection: 'templates', where: { and: [{ domain: { equals: tenant.id } }, { active: { equals: true } }] }, depth: 1, limit: 500, sort: 'name', overrideAccess: true }),
  ])
  const actor = { userId: user.id, activeCharacterId: activeCharacter?.id ?? null }
  // The first chooser contains only Types the selected acting identity can
  // create. A Type's Template/Form methods also require a live child of the
  // matching kind; the server action repeats both checks.
  const creationTypes = (await Promise.all(types.docs.map(async (item) => {
    const children = templates.docs.filter((template) => {
      const templateTypeId = Number(typeof template.documentType === 'object' ? template.documentType.id : template.documentType)
      return templateTypeId === Number(item.id)
    })
    const methods = effectiveCreationMethods(item, children)
    if (methods.length === 0 || !await isAllowed({ payload, actor, domainId: tenant.id, capability: 'create_document', resource: { type: 'DocumentType', id: item.id } })) return null
    return { id: Number(item.id), name: item.name, allowBlank: item.allowBlank !== false, allowTemplate: item.allowTemplate === true, allowForm: item.allowForm === true, methods }
  }))).filter((item): item is NonNullable<typeof item> => item !== null)
  const typeIds = new Set(creationTypes.map((item) => item.id))
  // The chooser only receives active child Templates attached to an
  // authorized Type. Legacy destination fields are deliberately absent from
  // this customer-facing projection; the create action routes by Type.
  const templateOptions = templates.docs.map((template) => {
    const typeId = Number(typeof template.documentType === 'object' ? template.documentType.id : template.documentType)
    if (!typeIds.has(typeId)) return null
    const type = creationTypes.find((item) => item.id === typeId)
    if (!type || !type.methods.includes(template.kind === 'form' ? 'form' : 'template')) return null
    return { id: Number(template.id), name: template.name, kind: template.kind, documentTypeId: typeId, creationMethod: template.kind === 'form' ? 'form' as const : 'template' as const, formSchema: template.formSchema && typeof template.formSchema === 'object' ? template.formSchema as never : null }
  }).filter((template): template is NonNullable<typeof template> => template !== null)
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
      creationMethod: 'blank',
    },
  } : undefined

  return <TenantShell tenant={tenant} cssVars={themeTokensToCssVars(resolveThemeTokens(tenant))} role={role} switcherTenants={domains} activeCharacter={activeCharacter}>
    <section style={{ maxWidth: 1100, margin: '0 auto' }}><p><a href={`/domain/${slug}/records`}>Records</a> / New document</p><h1>{supersededDocument ? 'Create superseding document' : 'New document'}</h1><p>{supersededDocument ? `Start a new version of “${supersededDocument.title}”.` : 'Choose a Document Type, then choose how to create the record. Its Folder is resolved automatically from the Type.'}</p>{query?.error === 'character' ? <p role="alert" style={{ color: '#8f2d21' }}>Choose an acting Character from the selector above — members must create through an acting Character, which becomes the non-removable Prepared-by credit (CC-2026-09-03-05).</p> : query?.error === 'missing' ? <p role="alert" style={{ color: '#8f2d21' }}>A title is required.</p> : query?.error === 'type' ? <p role="alert" style={{ color: '#8f2d21' }}>Choose an active Document Type before creating a document.</p> : null}{creationTypes.length === 0 ? <p role="status">No Document Types are available for creation under the selected acting Character.</p> : <NewDocumentForm tenantSlug={slug} types={creationTypes} templates={templateOptions} activeCharacter={activeCharacter ? { id: Number(activeCharacter.id), name: activeCharacter.name } : null} initialState={supersedingInitialState} supersedesDocumentId={supersededDocument?.id} />}</section>
  </TenantShell>
}
