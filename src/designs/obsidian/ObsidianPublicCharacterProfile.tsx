import { ArrowLeft, Building2, Focus, UserRound } from "lucide-react";
import s from "./obsidian.module.css";

export type ObsidianPublicCharacterProfileProps = {
  departmentHref: string;
  departmentName: string;
  name: string;
  role: string;
  focus: string;
  description: string | null;
};

/** Public character surface ported from the incubator profile composition. */
export function ObsidianPublicCharacterProfile({
  departmentHref,
  departmentName,
  name,
  role,
  focus,
  description,
}: ObsidianPublicCharacterProfileProps) {
  const normalizedFocus = focus.trim() || "the shared work of the Domain";
  return (
    <div className={s.publicPage}>
      <a href={departmentHref} className={s.backLink}>
        <ArrowLeft size={15} /> Back to {departmentName}
      </a>
      <section className={s.characterProfileHero}>
        <div className={s.characterProfileIdentity}>
          <span className={s.characterProfileMark} aria-hidden="true">
            <UserRound size={31} strokeWidth={1.1} />
          </span>
          <div>
            <p className={s.eyebrow}>CHARACTER PROFILE</p>
            <h1>{name}</h1>
            <p className={s.characterProfileRole}>{role}</p>
          </div>
        </div>
        <span className={s.characterProfileDepartment}>
          <Building2 size={15} /> {departmentName}
        </span>
      </section>
      <section className={s.characterProfileBody}>
        <aside className={s.characterProfileFacts}>
          <p className={s.eyebrow}>AT A GLANCE</p>
          <dl>
            <div>
              <dt>Role</dt>
              <dd>{role}</dd>
            </div>
            <div>
              <dt>Department</dt>
              <dd>{departmentName}</dd>
            </div>
            <div>
              <dt>Focus</dt>
              <dd>{normalizedFocus}</dd>
            </div>
          </dl>
        </aside>
        <article className={s.characterProfileCopy}>
          <p className={s.eyebrow}><Focus size={14} /> IN THE REACH</p>
          <h2>{name} keeps {normalizedFocus.toLowerCase()} in motion.</h2>
          <p>
            As {role.toLowerCase()} within {departmentName}, {name} helps
            shape the work described by the department: {description?.toLowerCase() ?? "the shared work of the department"}.
          </p>
          <p>
            This profile is the public-facing place for a character’s role,
            current focus, and the details a community chooses to share.
          </p>
        </article>
      </section>
    </div>
  );
}
