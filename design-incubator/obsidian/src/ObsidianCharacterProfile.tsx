import { ArrowLeft, Building2, Focus, UserRound } from "lucide-react";
import type { DepartmentDetailModel, OrgChartMember } from "./ObsidianDepartmentDetail";
import s from "./obsidian.module.css";

export function ObsidianCharacterProfile({
  baseUrl,
  department,
  person,
}: {
  baseUrl: string;
  department: DepartmentDetailModel;
  person: OrgChartMember;
}) {
  return (
    <div className={s.publicPage}>
      <a href={`${baseUrl}/departments/${department.department.slug}`} className={s.backLink}>
        <ArrowLeft size={15} /> Back to {department.department.name}
      </a>
      <section className={s.characterProfileHero}>
        <div className={s.characterProfileIdentity}>
          <span className={s.characterProfileMark} aria-hidden="true">
            <UserRound size={31} strokeWidth={1.1} />
          </span>
          <div>
            <p className={s.eyebrow}>CHARACTER PROFILE</p>
            <h1>{person.name}</h1>
            <p className={s.characterProfileRole}>{person.role}</p>
          </div>
        </div>
        <span className={s.characterProfileDepartment}>
          <Building2 size={15} /> {department.department.name}
        </span>
      </section>
      <section className={s.characterProfileBody}>
        <aside className={s.characterProfileFacts}>
          <p className={s.eyebrow}>AT A GLANCE</p>
          <dl>
            <div>
              <dt>Role</dt>
              <dd>{person.role}</dd>
            </div>
            <div>
              <dt>Department</dt>
              <dd>{department.department.name}</dd>
            </div>
            <div>
              <dt>Focus</dt>
              <dd>{person.detail}</dd>
            </div>
          </dl>
        </aside>
        <article className={s.characterProfileCopy}>
          <p className={s.eyebrow}><Focus size={14} /> IN THE REACH</p>
          <h2>{person.name} keeps {person.detail.toLowerCase()} in motion.</h2>
          <p>
            As {person.role.toLowerCase()} within {department.department.name}, {person.name} helps
            shape the work described by the department: {department.department.description?.toLowerCase() ?? "the shared work of the department"}.
          </p>
          <p>
            This profile is the public-facing place for a character’s role, current focus, and the
            details a community chooses to share.
          </p>
        </article>
      </section>
    </div>
  );
}
