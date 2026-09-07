import type { DesignVariantProps, DocumentDesignViewProps } from '@/lib/design/types'
import { DocumentPaper } from '@/components/theme/DocumentPaper'
import { getDocumentActions } from '@/lib/documents/presentation/actions'
import type { DocumentPageModel } from '@/lib/page-models/document'

// T06 owns moving this stylesheet into the Civic design folder; T02 only
// separates the action semantics from the markup.
import styles from '@/app/(frontend)/domain/[slug]/documents/[id]/document.module.scss'

/** Civic document reading preserves the current record-sheet composition exactly. */
export function CivicDocument(model: DocumentPageModel & DesignVariantProps & DocumentDesignViewProps) {
  const { workflowAction, deleteAction } = model
  const base = `${model.baseUrl}/documents/${model.recordId}`
  const actions = getDocumentActions(model, { workflow: Boolean(workflowAction), delete: Boolean(deleteAction) })
  // Civic keeps its two-region composition: lifecycle controls above the sheet,
  // supersede/delete below. Both regions consume the same shared descriptors.
  const primaryActions = actions.filter((action) => action.operation !== 'supersede' && action.operation !== 'delete')
  const bottomActions = actions.filter((action) => action.operation === 'supersede' || action.operation === 'delete')
  const labelFor = (operation: string, fallback: string) => operation === 'supersede' ? 'Create superseding document' : fallback
  return (
    <>
      {model.statusMessage ? <p className={styles.errorNotice} role="alert">{model.statusMessage.text}</p> : null}
      <article className={styles.record} data-style={model.documentStyle}>
        <div className={styles.actions} aria-label="Document controls">
          {primaryActions.map((action) => action.href ? (
            <a key={action.operation} className={styles.action} href={action.href}>{labelFor(action.operation, action.label)}</a>
          ) : (
            <form key={action.operation} action={workflowAction ?? undefined}>
              <input type="hidden" name="tenantSlug" value={model.domainSlug} />
              <input type="hidden" name="documentId" value={model.recordId} />
              <input type="hidden" name="operation" value={action.operation} />
              <button type="submit" className={styles.action}>{action.label}</button>
            </form>
          ))}
        </div>
        <DocumentPaper
          title={model.title}
          html={model.bodyHtml}
          source={model.bodySource ?? undefined}
          meta={<>{model.meta.map((entry) => <span key={entry.label}>{entry.label} {entry.value}</span>)}</>}
          before={model.supersession.supersededBy ? (
            <div className={styles.supersededNotice} role="status">
              <strong>Document superseded by:</strong>{' '}
              <a href={`${model.baseUrl}/documents/${model.supersession.supersededBy.id}`}>{model.supersession.supersededBy.title}</a>{' '}
              prepared on {model.supersession.supersededBy.createdLabel} by {model.supersession.supersededBy.preparedByLabel}
            </div>
          ) : null}
        >
          <section className={styles.concerns} aria-label="Concerns">
            <h2>Concerns</h2>
            {model.concerns.length > 0 ? (
              <ul>{model.concerns.map((concern, i) => <li key={i}>{concern.name}{concern.relationshipLabel ? ` · ${concern.relationshipLabel}` : ''}</li>)}</ul>
            ) : <p>No Members attached.</p>}
          </section>
          {model.tags.length > 0 ? (
            <section className={styles.tags} aria-label="Tags">
              <h2>Tags</h2>
              <ul>{model.tags.map((tag) => <li key={tag}>{tag}</li>)}</ul>
            </section>
          ) : null}
          {model.supersession.supersedes ? (
            <p className={styles.supersedesLine}>Supersedes <a href={`${model.baseUrl}/documents/${model.supersession.supersedes.id}`}>{model.supersession.supersedes.title}</a>.</p>
          ) : null}
        </DocumentPaper>
        <div className={styles.bottomActions}>
          {bottomActions.map((action) => action.operation === 'delete' ? (
            <form key={action.operation} action={deleteAction ?? undefined} className={styles.deleteForm}>
              <input type="hidden" name="tenantSlug" value={model.domainSlug} />
              <input type="hidden" name="documentId" value={model.recordId} />
              <button type="submit" className={styles.deleteBtn}>{action.label}</button>
            </form>
          ) : (
            <a key={action.operation} className={styles.action} href={action.href ?? undefined}>{labelFor(action.operation, action.label)}</a>
          ))}
        </div>
      </article>
    </>
  )
}