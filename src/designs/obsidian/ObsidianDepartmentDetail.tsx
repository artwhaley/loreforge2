"use client";
import { ArrowLeft, Info, UsersRound } from "lucide-react";
import type { DepartmentPageModel } from "@/lib/page-models/departments";
import s from "./obsidian.module.css";

/**
 * Obsidian department detail (OBSIDIAN-T10 production port).
 *
 * The incubation pass rendered a Syncfusion organizational chart here. Per the
 * integration policy (patch spec §12 / T11 step 7), Syncfusion is excluded
 * from the production dependency set — the Department page uses the
 * member-directory fallback below, driven by the production
 * `DepartmentPageModel` (members + folders + vocabulary). A semantic org-chart
 * relationship model does not exist in core; the chart must never infer
 * reports-to edges from membership, so none is drawn.
 */
export function ObsidianDepartmentDetail({ model }: { model: DepartmentPageModel }) {
  return (
    <div className={s.publicPage}>
      <a href={`${model.baseUrl}/departments`} className={s.backLink}>
        <ArrowLeft size={15} /> All departments
      </a>
      <div className={s.departmentTabs} role="tablist" aria-label="Departments">
        <a
          href={`${model.baseUrl}/departments`}
          role="tab"
          aria-selected={true}
        >
          {model.name}
        </a>
      </div>
      <section className={s.departmentDetailHeading}>
        <div>
          <p className={s.eyebrow}>DEPARTMENT DIRECTORY</p>
          <h1>{model.name}</h1>
          <p>{model.description}</p>
        </div>
        <span><UsersRound size={16} /> {model.members.length} people</span>
      </section>
      {model.manageHref ? (
        <p><a className={s.quietLink} href={model.manageHref}>Manage people</a></p>
      ) : null}
      <section className={s.orgChartPanel} aria-label={`${model.name} members`}>
        <div className={s.orgChartHeading}>
          <div>
            <p className={s.eyebrow}>AT A GLANCE</p>
            <h2>{model.vocabulary.memberPlural}</h2>
          </div>
          <span><Info size={15} /> Membership is derived from the Roles each Character holds.</span>
        </div>
        {model.members.length === 0 ? (
          <p className={s.managementEmpty}>No active {model.vocabulary.memberPlural.toLowerCase()} yet.</p>
        ) : (
          <ul className={s.memberDirectory}>
            {model.members.map((member) => (
              <li key={member.id}>{member.name}</li>
            ))}
          </ul>
        )}
        {model.folderNames.length > 0 ? (
          <p className={s.departmentFolders}>
            {model.vocabulary.folderPlural}: {model.folderNames.join(", ")}
          </p>
        ) : null}
      </section>
    </div>
  );
}
