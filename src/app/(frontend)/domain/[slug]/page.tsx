import { notFound } from 'next/navigation'
import { getLorePayload } from '@/lib/payload'

import { TenantShell } from '@/components/theme/TenantShell'
import { getActiveTenant } from '@/lib/tenant/activeTenant'
import { getDocumentsForTenant, getPageForTenant, getTenantsForUser } from '@/lib/tenant/queries'
import { renderMarkdown } from '@/lib/markdown/render'
import { resolveThemeTokens, themeTokensToCssVars } from '@/lib/theme/fonts'
import { loadCachedAuthorizationSession } from '@/lib/authz/sessionCache'
import { compileReadScope } from '@/lib/authz/readScope'

import styles from './home.module.scss'

type Props = {
  params: Promise<{ slug: string }>
}

export const dynamic = 'force-dynamic'

export default async function TenantHomePage({ params }: Props) {
  const { slug } = await params
  const { tenant, role, user, activeCharacter } = await getActiveTenant()

  if (!tenant || !user || tenant.slug !== slug) {
    notFound()
  }

  const base = `/domain/${tenant.slug}`
  const myTenants = user ? await getTenantsForUser(user.id) : []
  const payload = await getLorePayload()
  const candidates = await getDocumentsForTenant(tenant)
  // P07P-03: recent-records visibility is one compiled read scope (one bulk
  // metadata fetch + pure evaluation) instead of a full evaluator pipeline
  // per document.
  const session = await loadCachedAuthorizationSession(payload, Number(user.id), activeCharacter?.id ?? null, tenant.id)
  const scope = await compileReadScope(payload, session)
  // P07X-T03: two-axis visibility — the Document's Type must carry a grant
  // and its Folder must not be narrowed by an effective deny (plus direct
  // Document exceptions). Folder-read grants alone no longer expose records.
  const docs = candidates.filter((doc) => {
    const id = Number(doc.id)
    const folderId = doc.folder && typeof doc.folder === 'object' ? Number(doc.folder.id) : doc.folder != null ? Number(doc.folder) : null
    const typeId = doc.documentType && typeof doc.documentType === 'object' ? Number(doc.documentType.id) : doc.documentType != null ? Number(doc.documentType) : null
    return scope.authorityBypass || (typeId != null && scope.readableTypeIds.has(typeId) && folderId != null && !scope.denyFolderIds.has(folderId) && !scope.denyDocumentIds.has(id)) || scope.grantDocumentIds.has(id)
  })
  const homePage = await getPageForTenant(tenant, 'home')
  const tokens = resolveThemeTokens(tenant)
  const welcomeHtml = homePage ? renderMarkdown(homePage.body) : ''
  // P07P-06: recent-record metadata correction — Document Type, actual last
  // action date, and actual last action person from provenance (one bounded
  // query over the visible set + one batch names lookup). Source/origin
  // badges are removed. Unknown provenance omits the line rather than
  // inventing attribution; Prepared-by never impersonates the last editor.
  const docIds = docs.map((doc) => Number(doc.id))
  const [provenanceEvents, documentTypes] = await Promise.all([
    docIds.length === 0 ? { docs: [] } : payload.find({ collection: 'document-provenance-events', where: { and: [{ domain: { equals: tenant.id } }, { document: { in: docIds } }] }, depth: 0, limit: 0, pagination: false, sort: '-occurredAt', overrideAccess: true }),
    payload.find({ collection: 'document-types', where: { domain: { equals: tenant.id } }, depth: 0, limit: 0, pagination: false, overrideAccess: true }),
  ])
  const typeName = new Map(documentTypes.docs.map((type) => [Number(type.id), type.name]))
  const latestEventByDoc = new Map<number, { eventType: string; occurredAt: string; actorCharacterId: number | null; actorUserId: number | null }>()
  for (const event of provenanceEvents.docs) {
    const documentId = event.document && typeof event.document === 'object' ? Number((event.document as { id: number }).id) : event.document != null ? Number(event.document) : null
    if (documentId === null || latestEventByDoc.has(documentId)) continue
    latestEventByDoc.set(documentId, {
      eventType: String(event.eventType),
      occurredAt: String(event.occurredAt),
      actorCharacterId: event.actorCharacter && typeof event.actorCharacter === 'object' ? Number((event.actorCharacter as { id: number }).id) : event.actorCharacter != null ? Number(event.actorCharacter) : null,
      actorUserId: event.actorUser && typeof event.actorUser === 'object' ? Number((event.actorUser as { id: number }).id) : event.actorUser != null ? Number(event.actorUser) : null,
    })
  }
  const actorIds = [...new Set([...latestEventByDoc.values()].flatMap((event) => [event.actorCharacterId, event.actorUserId]).filter((id): id is number => id !== null))]
  const [charactersBatch, usersBatch] = await Promise.all([
    actorIds.length === 0 ? { docs: [] } : payload.find({ collection: 'characters', where: { id: { in: actorIds } }, depth: 0, limit: 0, pagination: false, overrideAccess: true }),
    actorIds.length === 0 ? { docs: [] } : payload.find({ collection: 'users', where: { id: { in: actorIds } }, depth: 0, limit: 0, pagination: false, overrideAccess: true }),
  ])
  const displayName = new Map<number, string>()
  for (const character of charactersBatch.docs) displayName.set(Number(character.id), String(character.name))
  for (const user of usersBatch.docs) if (!displayName.has(Number(user.id))) displayName.set(Number(user.id), String(user.name ?? user.email ?? ''))
  const describeAction = (eventType: string): string => {
    const labels: Record<string, string> = { created: 'created', edited: 'edited', submitted: 'submitted', withdrawn: 'withdrew', approved: 'approved', rejected: 'rejected', filed: 'filed', locked: 'locked', unlocked: 'unlocked', soft_deleted: 'deleted', restored: 'restored', superseded: 'was superseded', relationship_added: 'updated links', relationship_removed: 'corrected links', tag_changed: 'updated tags', character_link_changed: 'updated credits', imported: 'imported', exported: 'exported', sl_transfer: 'transferred' }
    return labels[eventType] ?? 'updated'
  }

  return (
    <TenantShell
      tenant={tenant}
      cssVars={themeTokensToCssVars(tokens)}
      role={role}
      switcherTenants={myTenants}
    >
      <section className={styles.welcome}>
        <h1 className={styles.welcomeTitle}>Welcome to {tenant.name}</h1>
        {tenant.motto ? <p className={styles.mottoLine}>{tenant.motto}</p> : null}
        {welcomeHtml ? (
          <div className={styles.intro} dangerouslySetInnerHTML={{ __html: welcomeHtml }} />
        ) : (
          <p className={styles.intro}>Public records and civic material for {tenant.name}.</p>
        )}
        {user && homePage ? (
          <a className={styles.editLink} href={`${base}/pages/home/edit`}>
            Edit welcome
          </a>
        ) : null}
      </section>

      <nav className={styles.modulesRow} aria-label="Quick links">
        <a className={styles.module} href={`${base}/about`}>
          <span className={styles.moduleLabel}>About</span>
          <span className={styles.moduleHint}>Who we are and what we do</span>
        </a>
        <a className={styles.module} href={`${base}/departments`}>
          <span className={styles.moduleLabel}>Departments</span>
          <span className={styles.moduleHint}>Offices and services</span>
        </a>
        <a className={styles.module} href={`${base}/records`}>
          <span className={styles.moduleLabel}>Records</span>
          <span className={styles.moduleHint}>Public archive</span>
        </a>
      </nav>

      <section className={styles.recent}>
        <h2 className={styles.sectionTitle}>Recent records</h2>
        {docs.length === 0 ? (
          <p className={styles.empty}>No records filed yet.</p>
        ) : (
          <ul className={styles.docList}>
            {docs.map((doc) => {
              const docTypeId = doc.documentType && typeof doc.documentType === 'object' ? Number(doc.documentType.id) : doc.documentType != null ? Number(doc.documentType) : null
              const latest = latestEventByDoc.get(Number(doc.id))
              const actorName = latest ? (latest.actorCharacterId != null && displayName.has(latest.actorCharacterId) ? displayName.get(latest.actorCharacterId) : latest.actorUserId != null ? displayName.get(latest.actorUserId) : null) : null
              return (
                <li key={doc.id} className={styles.docItem}>
                  <a className={styles.docLink} href={`/domain/${tenant.slug}/documents/${doc.id}`}>
                    {doc.title}
                  </a>
                  <span className={styles.docOrigin}>{docTypeId != null ? typeName.get(docTypeId) ?? null : null}</span>
                  {latest ? <span className={styles.docOrigin}>{actorName ? `${actorName} ${describeAction(latest.eventType)}` : describeAction(latest.eventType)} · {new Date(latest.occurredAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</span> : null}
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </TenantShell>
  )
}
