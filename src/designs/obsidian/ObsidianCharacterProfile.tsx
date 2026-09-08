"use client";
import { ArrowLeft, Building2, Focus, UserRound } from "lucide-react";
import type { DepartmentPageModel } from "@/lib/page-models/departments";
import s from "./obsidian.module.css";

/**
 * Obsidian CharacterProfile (OBSIDIAN-T10 production port).
 *
 * The incubation pass drove this from the Syncfusion org-chart's member model;
 * production has no semantic reports-to relationship, so the profile adapts to
 * the production `DepartmentPageModel`'s authorized member list. The detail
 * route that mounts it arrives with T13; the component stays presentation-only
 * and unregistered until then.
 */
export function ObsidianCharacterProfile({
  model,
  memberName,
}: {
  model: DepartmentPageModel;
  memberName: string;
}) {
  return (
    <div className={s.publicPage}>
      <a href={`${model.baseUrl}/departments/${""}`.replace(/\/$/, "")} className={s.backLink}>
        <ArrowLeft size={15} /> Back to {model.name}
      </a>
      <section className={s.characterProfileHero}>
        <div className={s.characterProfileIdentity}>
          <span className={s.characterProfileAvatar} aria-hidden="true">
            <UserRound size={26} />
          </span>
          <div>
            <p className={s.eyebrow}>
              <Focus size={14} /> {model.vocabulary.memberPlural.replace(/s$/, "")}
            </p>
            <h1>{memberName}</h1>
            <p>
              <Building2 size={14} /> {model.name}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}