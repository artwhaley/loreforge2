import type { ReactNode } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  GitBranch,
  LockKeyhole,
  FileText,
} from "lucide-react";
import type { DocumentPageModel } from "@/lib/page-models/document";
import { ReadingSurface } from "./ReadingSurface";
import s from "./obsidian.module.css";

/** Body is data-pure. Client tabs receive rendered content via children. */
export function ObsidianDocument({
  model,
  actions,
}: {
  model: DocumentPageModel;
  actions: ReactNode;
}) {
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
        {actions}
      </div>
      {model.statusMessage && (
        <div role="status" className={s.notice}>
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
            <a className={s.quietLink} href={model.routes.historyUrl}>
              View document history <ArrowUpRight size={14} />
            </a>
          )}
        </aside>
      </div>
    </div>
  );
}
