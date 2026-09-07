import type { DesignVariantProps, DocumentDesignViewProps } from '@/lib/design/types'
import type { DocumentPageModel } from '@/lib/page-models/document'

import styles from './ledger-document.module.scss'

/** Ledger document: typeset page with a marginalia rail for credits/tags/concerns. */
export function LedgerDocument(model: DocumentPageModel & DesignVariantProps & DocumentDesignViewProps) {
  const { capabilities: can } = model
  const { workflowAction, deleteAction } = model
  const workflow = (operation: string, label: string) => workflowAction ? (
    <form action={workflowAction}>
      <input type="hidden" name="tenantSlug" value={model.domainSlug} />
      <input type="hidden" name="documentId" value={model.recordId} />
      <input type="hidden" name="operation" value={operation} />
      <button type="submit">{label}</button>
    </form>
  ) : null
  return (
    <article className={styles.ledgerDoc}>
      {model.statusMessage ? <p className={styles.notice} role="alert">{model.statusMessage.text}</p> : null}
      <header className={styles.head}>
        <div>
          <h1 className={styles.title}>{model.title}</h1>
          <div className={styles.actions}>
            {can.edit && !model.isSuperseded && model.routes.editUrl ? <a href={model.routes.editUrl}>Edit</a> : null}
            {model.routes.historyUrl ? <a href={model.routes.historyUrl}>History</a> : null}
            {can.supersede && !model.isSuperseded && model.routes.supersedeUrl ? <a href={model.routes.supersedeUrl}>Supersede</a> : null}
            {model.lifecycle === 'draft' && can.submit ? workflow('submit', 'Submit for review') : null}
            {can.file && model.lifecycle === 'draft' ? workflow('file', 'File now') : null}
            {model.lifecycle === 'submitted' && can.approve ? workflow('approve', 'Approve') : null}
            {model.lifecycle === 'filed' && can.deprecate ? workflow('deprecate', 'Deprecate') : null}
            {model.lifecycle === 'deprecated' && can.restore ? workflow('restore', 'Restore') : null}
            {can.lock && !model.locked && !model.isSuperseded ? workflow('lock', 'Lock') : null}
            {can.unlock && model.locked && !model.isSuperseded ? workflow('unlock', 'Unlock') : null}
            {can.delete && deleteAction ? (
              <form action={deleteAction}>
                <input type="hidden" name="tenantSlug" value={model.domainSlug} />
                <input type="hidden" name="documentId" value={model.recordId} />
                <button type="submit">Delete</button>
              </form>
            ) : null}
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
      <div className={styles.body} dangerouslySetInnerHTML={{ __html: model.bodyHtml }} />
    </article>
  )
}
