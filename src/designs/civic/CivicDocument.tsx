import { useRecordActions } from '@/components/functional/records/recordActions'
import type { DesignVariantProps } from '@/lib/design/types'
import { DocumentPaper } from '@/components/theme/DocumentPaper'
import type { DocumentPageModel } from '@/lib/page-models/document'

import styles from '@/app/(frontend)/domain/[slug]/documents/[id]/document.module.scss'

/** Civic document reading preserves the current record-sheet composition exactly. */
export function CivicDocument(model: DocumentPageModel & DesignVariantProps) {
  const { capabilities: can } = model
  const { workflowAction, deleteAction } = useRecordActions()
  const base = `${model.baseUrl}/documents/${model.recordId}`
  const workflow = (operation: string) => (
    <form action={workflowAction ?? undefined}>
      <input type="hidden" name="tenantSlug" value={model.domainSlug} />
      <input type="hidden" name="documentId" value={model.recordId} />
      <input type="hidden" name="operation" value={operation} />
      <button type="submit" className={styles.action}>{operationLabel(operation)}</button>
    </form>
  )
  return (
    <>
      {model.statusMessage ? <p className={styles.errorNotice} role="alert">{model.statusMessage.text}</p> : null}
      <article className={styles.record} data-style={model.documentStyle}>
        <div className={styles.actions} aria-label="Document controls">
          {can.edit && !model.isSuperseded ? <a className={styles.action} href={model.routes.editUrl ?? undefined}>Edit</a> : null}
          <a className={styles.action} href={model.routes.historyUrl ?? undefined}>History</a>
          {workflowAction && model.lifecycle === 'draft' && can.submit ? workflow('submit') : null}
          {workflowAction && can.file && model.lifecycle === 'draft' ? workflow('file') : null}
          {workflowAction && model.lifecycle === 'submitted' && can.approve ? workflow('approve') : null}
          {workflowAction && model.lifecycle === 'filed' && can.deprecate ? workflow('deprecate') : null}
          {workflowAction && model.lifecycle === 'deprecated' && can.restore ? workflow('restore') : null}
          {workflowAction && can.lock && !model.locked && !model.isSuperseded ? workflow('lock') : null}
          {workflowAction && can.unlock && model.locked && !model.isSuperseded ? workflow('unlock') : null}
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
          {can.supersede && !model.isSuperseded ? <a className={styles.action} href={model.routes.supersedeUrl ?? undefined}>Create superseding document</a> : null}
          {can.delete && deleteAction ? (
            <form action={deleteAction} className={styles.deleteForm}>
              <input type="hidden" name="tenantSlug" value={model.domainSlug} />
              <input type="hidden" name="documentId" value={model.recordId} />
              <button type="submit" className={styles.deleteBtn}>Delete</button>
            </form>
          ) : null}
        </div>
      </article>
    </>
  )
}

function operationLabel(operation: string): string {
  switch (operation) {
    case 'submit': return 'Submit for review'
    case 'file': return 'File now'
    case 'approve': return 'Approve'
    case 'deprecate': return 'Deprecate'
    case 'restore': return 'Restore'
    case 'lock': return 'Lock'
    case 'unlock': return 'Unlock'
    default: return operation
  }
}
