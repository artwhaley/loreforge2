import type { LedgerConfigV1 } from '@/lib/design/contracts'
import type { DesignConfigProps, DesignVariantProps, DocumentDesignViewProps } from '@/lib/design/types'
import { getDocumentActions } from '@/lib/documents/presentation/actions'
import type { DocumentPageModel } from '@/lib/page-models/document'

import styles from './ledger-document.module.scss'

/** Ledger's own treatment label for the sheet (register vs docket). The legacy
 *  documentStyle prop is the T06/T07-era projection; Ledger maps it back to its
 *  own vocabulary so no shared axis name leaks into Ledger's DOM. */
function ledgerTreatment(documentStyle: string): 'register' | 'docket' {
  return documentStyle === 'modern' ? 'docket' : 'register'
}

/** Official status word for the docket (Ledger's own presentation). */
function ledgerStatus(model: DocumentPageModel): string {
  if (model.isSuperseded) return 'Superseded'
  if (model.locked) return 'Locked'
  switch (model.lifecycle) {
    case 'draft': return 'Draft'
    case 'submitted': return 'Submitted'
    case 'filed': return 'Filed'
    case 'deprecated': return 'Deprecated'
    default: return 'Filed'
  }
}

/** Ledger document: typeset page with a marginalia rail for credits/tags/concerns. */
export function LedgerDocument(model: DocumentPageModel & DesignVariantProps & DocumentDesignViewProps & DesignConfigProps<LedgerConfigV1>) {
  const { workflowAction, deleteAction } = model
  const actions = getDocumentActions(model, { workflow: Boolean(workflowAction), delete: Boolean(deleteAction) })
  const treatment = ledgerTreatment(model.documentStyle)
  const status = ledgerStatus(model)
  return (
    <article className={styles.ledgerDoc} data-treatment={treatment}>
      {model.statusMessage ? <p className={styles.notice} role="alert">{model.statusMessage.text}</p> : null}
      <div className={styles.statusBadge} role="status" data-state={model.isSuperseded ? 'superseded' : model.locked ? 'locked' : model.lifecycle}>
        <span>{status}</span>
      </div>
      <header className={styles.head}>
        <div>
          <h1 className={styles.title}>{model.title}</h1>
          <div className={styles.actions}>
            {actions.map((action) => action.href ? (
              <a key={action.operation} href={action.href}>{action.label}</a>
            ) : action.operation === 'delete' ? (
              <form key={action.operation} action={deleteAction ?? undefined}>
                <input type="hidden" name="tenantSlug" value={model.domainSlug} />
                <input type="hidden" name="documentId" value={model.recordId} />
                <button type="submit">{action.label}</button>
              </form>
            ) : (
              <form key={action.operation} action={workflowAction ?? undefined}>
                <input type="hidden" name="tenantSlug" value={model.domainSlug} />
                <input type="hidden" name="documentId" value={model.recordId} />
                <input type="hidden" name="operation" value={action.operation} />
                <button type="submit">{action.label}</button>
              </form>
            ))}
          </div>
        </div>
        <div className={styles.meta}>{model.meta.map((entry) => <span key={entry.label}>{entry.label}: {entry.value}</span>)}</div>
      </header>
      <aside className={styles.rail} aria-label="Record details">
        <section><h2>Credits</h2><p>{model.preparedByLabel}</p></section>
        {model.concerns.length > 0 ? <section><h2>Concerns</h2><ul>{model.concerns.map((c, i) => <li key={i}>{c.name}</li>)}</ul></section> : null}
        {model.tags.length > 0 ? <section><h2>Tags</h2><ul>{model.tags.map((tag) => <li key={tag}>{tag}</li>)}</ul></section> : null}
        {model.supersession.supersededBy ? <section><h2>Superseded by</h2><p><a href={`${model.baseUrl}/documents/${model.supersession.supersededBy.id}`}>{model.supersession.supersededBy.title}</a></p></section> : null}
      </aside>
      {model.bodySource !== null ? <pre className={styles.source}>{model.bodySource}</pre> : <div className={styles.body} dangerouslySetInnerHTML={{ __html: model.bodyHtml }} />}
      {model.supersession.supersedes ? <p className={styles.supersedesLine}>Supersedes <a href={`${model.baseUrl}/documents/${model.supersession.supersedes.id}`}>{model.supersession.supersedes.title}</a>.</p> : null}
    </article>
  )
}