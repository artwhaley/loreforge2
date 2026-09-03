import { notFound } from 'next/navigation'

import { CopyMarkdownButton } from '@/components/archive/CopyMarkdownButton'
import { TenantShell } from '@/components/theme/TenantShell'
import { copyDocumentAction, moveDocumentAction } from '@/lib/actions/archive'
import { documentWorkflowAction, softDeleteDocumentAction } from '@/lib/actions/documentWorkflow'
import { buildFolderTree, flattenFolderTree } from '@/lib/archive/folderTree'
import { originLabel } from '@/lib/origin'
import { getActiveTenant } from '@/lib/tenant/activeTenant'
import { getDocumentForTenant, getFoldersForTenant, getTenantsForUser } from '@/lib/tenant/queries'
import { renderMarkdown } from '@/lib/markdown/render'
import { resolveThemeTokens, themeTokensToCssVars } from '@/lib/theme/fonts'
import { getDocumentCharacterLinks, getDocumentTags } from '@/lib/documents/links'
import { getDocumentRelationships } from '@/lib/documents/relationships'
import { resolveCrossDomainType } from '@/lib/documents/operationInvariants'

import styles from './document.module.scss'

type Props = {
  params: Promise<{ slug: string; id: string }>
  searchParams: Promise<{ source?: string }>
}

export const dynamic = 'force-dynamic'

export default async function DocumentViewPage({ params, searchParams }: Props) {
  const { slug, id } = await params
  const { source } = await searchParams
  const { tenant, role, user } = await getActiveTenant()

  if (!tenant || tenant.slug !== slug) {
    notFound()
  }

  const doc = await getDocumentForTenant(tenant, id)
  if (!doc) {
    notFound()
  }

  const folders = await getFoldersForTenant(tenant)
  const domains = user ? await getTenantsForUser(user.id) : []
  const payload = await (await import('@/lib/payload')).getLorePayload()
  const [characterLinks, tagLinks, relationshipLinks, shareRules] = await Promise.all([getDocumentCharacterLinks(payload, doc.id), getDocumentTags(payload, doc.id), getDocumentRelationships(payload, doc.id).catch(() => ({ docs: [] })), payload.find({ collection: 'permission-rules', where: { and: [{ resourceType: { equals: 'Document' } }, { resource: { equals: doc.id } }, { active: { equals: true } }] }, depth: 1, limit: 100, overrideAccess: true }).catch(() => ({ docs: [] }))])
  const flatFolders = flattenFolderTree(buildFolderTree(folders))
  const folderIdValue = typeof doc.folder === 'object' ? doc.folder?.id ?? '' : doc.folder ?? ''
  const sourceType = typeof doc.documentType === 'object' ? doc.documentType : await payload.findByID({ collection: 'document-types', id: doc.documentType, depth: 0, overrideAccess: true }).catch(() => null)
  const destinationDomainIds = domains.filter((item) => Number(item.id) !== Number(tenant.id)).map((item) => Number(item.id))
  const [destinationTypeRows, destinationTagRows] = destinationDomainIds.length > 0
    ? await Promise.all([
        payload.find({ collection: 'document-types', where: { and: [{ domain: { in: destinationDomainIds } }, { active: { equals: true } }] }, depth: 0, limit: 5000, overrideAccess: true }),
        payload.find({ collection: 'tags', where: { domain: { in: destinationDomainIds } }, depth: 0, limit: 5000, overrideAccess: true }).catch(() => ({ docs: [] })),
      ])
    : [{ docs: [] }, { docs: [] }]
  const sourceTagNames = tagLinks.docs.map((link) => typeof link.tag === 'object' ? link.tag.name : '').filter(Boolean)
  const mappingPreview = domains.filter((item) => Number(item.id) !== Number(tenant.id)).map((destination) => {
    const types = destinationTypeRows.docs.filter((type) => Number(typeof type.domain === 'object' ? type.domain.id : type.domain) === Number(destination.id))
    const plain = types.find((type) => type.name.toLocaleLowerCase() === 'plain text')?.id ?? null
    const mappedTypeId = sourceType?.name ? resolveCrossDomainType(sourceType.name, types.map((type) => ({ id: Number(type.id), name: type.name, active: type.active })), plain) : null
    const mappedType = types.find((type) => Number(type.id) === Number(mappedTypeId))
    const tags = destinationTagRows.docs.filter((tag) => Number(typeof tag.domain === 'object' ? tag.domain.id : tag.domain) === Number(destination.id))
    return { destination, typeLabel: mappedType ? `${mappedType.name}${Number(mappedType.id) === Number(plain) && sourceType?.name.toLocaleLowerCase() !== 'plain text' ? ' (Plain Text fallback)' : ' (exact name)'}` : 'No compatible active Type', tagRows: sourceTagNames.map((name) => ({ name, match: tags.find((tag) => tag.name.toLocaleLowerCase() === name.toLocaleLowerCase())?.name ?? null })) }
  })

  const tokens = resolveThemeTokens(tenant)
  const html = renderMarkdown(doc.body)
  const base = `/domain/${tenant.slug}/documents/${doc.id}`

  return (
    <TenantShell tenant={tenant} cssVars={themeTokensToCssVars(tokens)} role={role}>
      <article className={styles.record}>
        <div className={styles.actions}>
          <p><strong>Document actions</strong> — Share keeps this same record and revision history; Copy creates an independent record; Move keeps this record and changes its canonical Folder.</p>
          {user ? (
            <a className={styles.action} href={`${base}/edit`}>
              Edit
            </a>
          ) : null}

          <a className={styles.action} href={`${base}/history`}>
            History
          </a>

          {doc.lifecycle === 'draft' ? (
            <form action={documentWorkflowAction}>
              <input type="hidden" name="tenantSlug" value={tenant.slug} />
              <input type="hidden" name="documentId" value={doc.id} />
              <input type="hidden" name="operation" value="submit" />
              <button type="submit" className={styles.action}>Submit for review</button>
            </form>
          ) : null}
          {role === 'admin' && doc.lifecycle === 'draft' ? (
            <form action={documentWorkflowAction}>
              <input type="hidden" name="tenantSlug" value={tenant.slug} />
              <input type="hidden" name="documentId" value={doc.id} />
              <input type="hidden" name="operation" value="file" />
              <button type="submit" className={styles.action}>File now</button>
            </form>
          ) : null}
          {role === 'admin' && doc.lifecycle === 'filed' ? (
            <form action={documentWorkflowAction}>
              <input type="hidden" name="tenantSlug" value={tenant.slug} />
              <input type="hidden" name="documentId" value={doc.id} />
              <input type="hidden" name="operation" value="lock" />
              <button type="submit" className={styles.action}>Lock</button>
            </form>
          ) : null}
          {role === 'admin' && doc.lifecycle === 'locked' ? (
            <form action={documentWorkflowAction}>
              <input type="hidden" name="tenantSlug" value={tenant.slug} />
              <input type="hidden" name="documentId" value={doc.id} />
              <input type="hidden" name="operation" value="unlock" />
              <button type="submit" className={styles.action}>Unlock</button>
            </form>
          ) : null}

          <form action={moveDocumentAction} className={styles.moveForm}>
            <input type="hidden" name="tenantSlug" value={tenant.slug} />
            <input type="hidden" name="documentId" value={doc.id} />
            <label className={styles.moveLabel} htmlFor="move-domain">Move to Domain:</label>
            <select id="move-domain" name="destinationDomainSlug" className={styles.moveSelect} defaultValue={tenant.slug}>{domains.map((item) => <option key={item.id} value={item.slug}>{item.name}</option>)}</select>
            <label className={styles.moveLabel} htmlFor="move-folder">
              Move to:
            </label>
            <select
              id="move-folder"
              name="folderId"
              defaultValue={String(folderIdValue)}
              className={styles.moveSelect}
            >
              <option value="">Domain Root (default)</option>
              {flatFolders.map(({ folder, depth }) => (
                <option key={folder.id} value={folder.id}>
                  {'\u00A0'.repeat(depth * 2)}
                  {folder.name}
                </option>
              ))}
            </select>
            <label><input type="checkbox" name="confirmCrossDomain" value="1" /> Confirm if another Domain</label>
            <button type="submit" className={styles.action}>
              Move
            </button>
          </form>

          {mappingPreview.length > 0 ? <details className={styles.moveForm}><summary>Cross-Domain mapping preview</summary><p>Review the selected destination's Type and Tag mapping before confirming Copy or Move. Unmatched Tags are dropped; Domain-local shares are not carried over.</p>{mappingPreview.map(({ destination, typeLabel, tagRows }) => <section key={destination.id}><strong>{destination.name}</strong><div>Type: {sourceType?.name ?? 'Source Type'} → {typeLabel}</div>{tagRows.length > 0 ? <ul>{tagRows.map((tag) => <li key={`${destination.id}-${tag.name}`}>Tag {tag.name} → {tag.match ?? 'dropped (no exact match)'}</li>)}</ul> : <div>Tags: none</div>}</section>)}</details> : null}

          {user ? <form action={copyDocumentAction} className={styles.moveForm}><input type="hidden" name="tenantSlug" value={tenant.slug} /><input type="hidden" name="documentId" value={doc.id} /><label className={styles.moveLabel} htmlFor="copy-domain">Copy to:</label><select id="copy-domain" name="destinationDomainSlug" className={styles.moveSelect} defaultValue={tenant.slug}>{domains.map((item) => <option key={item.id} value={item.slug}>{item.name}</option>)}</select><label><input type="checkbox" name="confirmCrossDomain" value="1" /> Confirm if another Domain</label><button type="submit" className={styles.action}>Create independent copy</button></form> : null}

          {role === 'admin' ? <form action="/api/document-shares" method="post" className={styles.moveForm}><input type="hidden" name="domainSlug" value={tenant.slug} /><input type="hidden" name="documentId" value={doc.id} /><span><strong>Share existing record</strong> (same ID and revision stream)</span><select name="principalType" defaultValue="Character"><option value="Character">Character</option><option value="User">User</option></select><input name="principalId" type="number" min="1" required placeholder="Recipient ID" /><select name="capability" defaultValue="read"><option value="read">Read</option><option value="edit_document">Edit</option></select><button type="submit" className={styles.action}>Share</button></form> : null}

          <form action={softDeleteDocumentAction} className={styles.deleteForm}>
            <input type="hidden" name="tenantSlug" value={tenant.slug} />
            <input type="hidden" name="documentId" value={doc.id} />
            <button type="submit" className={styles.deleteBtn}>
              Delete
            </button>
          </form>

          <CopyMarkdownButton text={doc.body} />

          <a
            className={styles.action}
            href={source === '1' ? base : `${base}?source=1`}
          >
            {source === '1' ? 'Rendered view' : 'Markdown source'}
          </a>
        </div>

        <header className={styles.recordHeader}>
          <h1 className={styles.title}>{doc.title}</h1>
          <div className={styles.meta}>
            {typeof doc.createdAt === 'string' && (
              <span>
                Created{' '}
                {new Date(doc.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </span>
            )}
            {typeof doc.updatedAt === 'string' && doc.updatedAt !== doc.createdAt && (
              <span>
                Updated{' '}
                {new Date(doc.updatedAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </span>
            )}
            <span className={styles.origin}>{originLabel(doc.origin)}</span>
            <span className={styles.origin}>{typeof doc.documentType === 'object' ? doc.documentType.name : 'Document'}</span>
            <span className={styles.origin}>{doc.lifecycle.replace('_', ' ')}</span>
          </div>
        </header>

        <section className={styles.metadata} aria-label="Record relationships and tags">
          <div><h2>Prepared by</h2><ul>{characterLinks.docs.filter((link) => link.kind === 'prepared_by').map((link) => <li key={link.id}>{typeof link.character === 'object' ? link.character.name : `Character ${link.character}`}{link.requiredByCreate ? ' (required)' : ''}{role === 'admin' ? <form action="/api/document-links" method="post" style={{ display: 'inline' }}><input type="hidden" name="domainSlug" value={tenant.slug} /><input type="hidden" name="documentId" value={doc.id} /><input type="hidden" name="characterId" value={typeof link.character === 'object' ? link.character.id : link.character} /><input type="hidden" name="kind" value="prepared_by" /><input type="hidden" name="action" value="remove" /><button type="submit" disabled={Boolean(link.requiredByCreate)}>Remove</button></form> : null}</li>)}</ul>{characterLinks.docs.every((link) => link.kind !== 'prepared_by') ? <p>No preparation credit recorded.</p> : null}</div>
          <div><h2>Concerns</h2><ul>{characterLinks.docs.filter((link) => link.kind === 'concerns').map((link) => <li key={link.id}>{typeof link.character === 'object' ? link.character.name : `Character ${link.character}`}{link.relationshipLabel ? ` · ${link.relationshipLabel}` : ''}{role === 'admin' ? <form action="/api/document-links" method="post" style={{ display: 'inline' }}><input type="hidden" name="domainSlug" value={tenant.slug} /><input type="hidden" name="documentId" value={doc.id} /><input type="hidden" name="characterId" value={typeof link.character === 'object' ? link.character.id : link.character} /><input type="hidden" name="kind" value="concerns" /><input type="hidden" name="action" value="remove" /><button type="submit">Remove</button></form> : null}</li>)}</ul>{role === 'admin' ? <form action="/api/document-links" method="post"><input type="hidden" name="domainSlug" value={tenant.slug} /><input type="hidden" name="documentId" value={doc.id} /><input type="hidden" name="kind" value="concerns" /><input name="characterId" type="number" min="1" required placeholder="Character ID" /><input name="relationshipLabel" placeholder="Relationship (optional)" /><button type="submit">Add concern</button></form> : null}</div>
          <div><h2>Tags</h2><ul>{tagLinks.docs.map((link) => <li key={link.id}>{typeof link.tag === 'object' ? link.tag.name : `Tag ${link.tag}`}{role === 'admin' ? <form action="/api/document-tags" method="post" style={{ display: 'inline' }}><input type="hidden" name="domainSlug" value={tenant.slug} /><input type="hidden" name="documentId" value={doc.id} /><input type="hidden" name="tagId" value={typeof link.tag === 'object' ? link.tag.id : link.tag} /><input type="hidden" name="action" value="remove" /><button type="submit">Remove</button></form> : null}</li>)}</ul>{role === 'admin' ? <form action="/api/document-tags" method="post"><input type="hidden" name="domainSlug" value={tenant.slug} /><input type="hidden" name="documentId" value={doc.id} /><input name="tagName" required placeholder="Add tag" /><button type="submit">Add tag</button></form> : null}</div>
        </section>

        {role === 'admin' ? <section className={styles.metadata} aria-label="Current shares"><div><h2>Shared with</h2>{shareRules.docs.length ? <ul>{shareRules.docs.map((rule) => <li key={rule.id}>{typeof rule.principal === 'object' && 'name' in rule.principal ? String(rule.principal.name) : `${rule.principalType} ${rule.principal}`} · {rule.capability === 'edit_document' ? 'Edit' : 'Read'} <form action="/api/document-shares" method="post" style={{ display: 'inline' }}><input type="hidden" name="domainSlug" value={tenant.slug} /><input type="hidden" name="documentId" value={doc.id} /><input type="hidden" name="principalType" value={rule.principalType} /><input type="hidden" name="principalId" value={typeof rule.principal === 'object' && 'id' in rule.principal ? String(rule.principal.id) : String(rule.principal)} /><input type="hidden" name="capability" value={rule.capability} /><input type="hidden" name="action" value="revoke" /><button type="submit">Revoke</button></form></li>)}</ul> : <p>No active shares.</p>}</div></section> : null}

        <section className={styles.metadata} aria-label="Document relationships"><div><h2>Grouped and supersedes</h2><ul>{relationshipLinks.docs.map((link) => { const other = String(link.source) === String(doc.id) ? link.target : link.source; const otherName = typeof other === 'object' ? other.title : `Document ${other}`; return <li key={link.id}>{link.kind === 'grouped' ? `Grouped${link.label ? ` · ${link.label}` : ''}` : String(link.source) === String(doc.id) ? 'Supersedes' : 'Superseded by'} · {otherName}{role === 'admin' ? <form action="/api/document-relationships" method="post" style={{ display: 'inline' }}><input type="hidden" name="domainSlug" value={tenant.slug} /><input type="hidden" name="documentId" value={doc.id} /><input type="hidden" name="relationshipId" value={link.id} /><input type="hidden" name="action" value="remove" /><button type="submit">Remove</button></form> : null}</li> })}</ul>{role === 'admin' ? <form action="/api/document-relationships" method="post"><input type="hidden" name="domainSlug" value={tenant.slug} /><input type="hidden" name="documentId" value={doc.id} /><input name="targetId" type="number" min="1" required placeholder="Related Document ID" /><select name="kind" defaultValue="grouped"><option value="grouped">Grouped</option><option value="supersedes">This record supersedes it</option></select><input name="label" placeholder="Grouped label (required for Grouped)" /><button type="submit">Add relationship</button></form> : null}</div></section>

        {source === '1' ? (
          <pre className={styles.source}>{doc.body}</pre>
        ) : (
          <div
            className={styles.body}
            // Rendered from tenant-owned canonical Markdown. HTML is not part of
            // the supported dialect; marked escapes HTML in source by default.
            dangerouslySetInnerHTML={{ __html: html }}
          />
        )}
      </article>
    </TenantShell>
  )
}
