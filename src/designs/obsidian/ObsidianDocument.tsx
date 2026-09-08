import {
  ArrowLeft,
  ArrowUpRight,
  GitBranch,
  LockKeyhole,
  FileText,
} from "lucide-react";
import type { DocumentPageModel } from "@/lib/page-models/document";
import type { ObsidianConfigV1 } from "@/lib/design/contracts";
import type { DesignConfigProps, DesignVariantProps, DocumentDesignViewProps } from "@/lib/design/types";
import { ReadingSurface } from "./ReadingSurface";
import { DocumentActionMenu } from "./DocumentActionMenu";
import s from "./obsidian.module.css";

/** Body is data-pure. Client tabs receive rendered content via children. */
export function ObsidianDocument(props: DocumentDesignViewProps & DesignVariantProps & DesignConfigProps<ObsidianConfigV1>) {
  const model = props;
  const { workflowAction, deleteAction } = props;
  return (
    <div className={s.documentPage}>
      <div className={s.documentBreadcrumb}>
        <a href={`${model.baseUrl}/records`}>
          <ArrowLeft size={16} />
          Records
        </a>
        <span>/</span>
        <span>Document {String(model.recordId).padStart(3, "0")}</span>
      </div>
      <div className={s.documentHeader}>
        <div>
          <p className={s.eyebrow}>
            <FileText size={14} />
            THE DOMAIN RECORD
          </p>
          <h1>{model.title}</h1>
          <p className={s.documentAuthor}>
            Prepared by <span>{model.preparedByLabel}</span>
            <span className={s.authorDivider}>/</span>
            <span className={s.status}>{model.lifecycle}</span>
            {model.locked && <LockKeyhole size={15} aria-label="Locked" />}
          </p>
        </div>
        <DocumentActionBar model={model} workflowAction={workflowAction ?? null} deleteAction={deleteAction ?? null} />
      </div>
      {model.statusMessage && (
        <div role="alert" className={s.notice}>
          {model.statusMessage.text}
        </div>
      )}
      {model.supersession.supersededBy && (
        <div className={s.notice}>
          <GitBranch size={17} />
          This document has been superseded.
          <a
            href={`${model.baseUrl}/documents/${model.supersession.supersededBy.id}`}
          >
            {model.supersession.supersededBy.title}
            <ArrowUpRight size={14} />
          </a>
        </div>
      )}
      <div className={s.documentLayout}>
        <article className={s.dossier}>
          <ReadingSurface source={model.bodySource}>
            <div
              className={s.prose}
              dangerouslySetInnerHTML={{ __html: model.bodyHtml }}
            />
          </ReadingSurface>
          <div className={s.documentEnd}>
            <span>◈</span>
            <p>End of record</p>
          </div>
        </article>
        <aside className={s.documentSidebar}>
          <section>
            <p className={s.eyebrow}>RECORD DETAILS</p>
            <dl>
              {model.meta.map((item, i) => (
                <div key={`${item.label}-${i}`}>
                  <dt>{item.label}</dt>
                  <dd>{item.value}</dd>
                </div>
              ))}
            </dl>
          </section>
          {model.supersession.supersedes && (
            <section>
              <p className={s.eyebrow}>RECORD LINEAGE</p>
              <div className={s.lineage}>
                <GitBranch size={20} />
                <span>
                  Supersedes
                  <a
                    href={`${model.baseUrl}/documents/${model.supersession.supersedes.id}`}
                  >
                    {model.supersession.supersedes.title}
                    <ArrowUpRight size={14} />
                  </a>
                </span>
              </div>
              <p className={s.lineageCurrent}>
                <span className={s.liveDot} />
                Current record
              </p>
            </section>
          )}
          {model.tags.length > 0 && (
            <section>
              <p className={s.eyebrow}>TAGS</p>
              <div className={s.tags}>
                {model.tags.map((tag) => (
                  <span key={tag}>{tag}</span>
                ))}
              </div>
            </section>
          )}
          {model.concerns.length > 0 && (
            <section>
              <p className={s.eyebrow}>CONCERNS</p>
              {model.concerns.map((concern) => (
                <p className={s.concern} key={concern.name}>
                  {concern.name}
                  {concern.relationshipLabel && (
                    <small>{concern.relationshipLabel}</small>
                  )}
                </p>
              ))}
            </section>
          )}
          {model.routes.historyUrl && (
            <>
              <a className={s.quietLink} href={model.routes.historyUrl}>
                View document history <ArrowUpRight size={14} />
              </a>
              <span className={s.srOnly}>
                <a href={model.routes.historyUrl}>History</a>
              </span>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}

function DocumentActionBar({ model, workflowAction, deleteAction }: {
  model: DocumentPageModel
  workflowAction: ((formData: FormData) => void | Promise<void>) | null
  deleteAction: ((formData: FormData) => void | Promise<void>) | null
}) {
  const workflow = (operation: string, label: string) => workflowAction ? <form action={workflowAction}><input type="hidden" name="tenantSlug" value={model.domainSlug} /><input type="hidden" name="documentId" value={model.recordId} /><input type="hidden" name="operation" value={operation} /><button type="submit">{label}</button></form> : null
  return <div className={s.pageActions}>
    <DocumentActionMenu
      domainSlug={model.domainSlug}
      recordId={model.recordId}
      lifecycle={model.lifecycle}
      locked={model.locked}
      isSuperseded={model.isSuperseded}
      capabilities={model.capabilities}
      routes={model.routes}
      workflowAction={workflowAction}
      deleteAction={deleteAction}
    />
    <span className={s.srOnly}>
      {model.capabilities.edit && !model.isSuperseded && model.routes.editUrl ? <a href={model.routes.editUrl}>Edit</a> : null}
      {model.routes.historyUrl ? <a href={model.routes.historyUrl}>History</a> : null}
      {model.lifecycle === 'draft' && model.capabilities.submit ? workflow('submit', 'Submit for review') : null}
      {model.lifecycle === 'draft' && model.capabilities.file ? workflow('file', 'File now') : null}
      {model.lifecycle === 'submitted' && model.capabilities.approve ? workflow('approve', 'Approve') : null}
      {model.lifecycle === 'filed' && model.capabilities.deprecate ? workflow('deprecate', 'Deprecate') : null}
      {model.lifecycle === 'deprecated' && model.capabilities.restore ? workflow('restore', 'Restore') : null}
      {model.capabilities.lock && !model.locked && !model.isSuperseded ? workflow('lock', 'Lock') : null}
      {model.capabilities.unlock && model.locked && !model.isSuperseded ? workflow('unlock', 'Unlock') : null}
      {model.capabilities.supersede && !model.isSuperseded && model.routes.supersedeUrl ? <a href={model.routes.supersedeUrl}>Supersede</a> : null}
      {model.capabilities.delete && deleteAction ? <form action={deleteAction}><input type="hidden" name="tenantSlug" value={model.domainSlug} /><input type="hidden" name="documentId" value={model.recordId} /><button type="submit">Delete</button></form> : null}
    </span>
  </div>
}
