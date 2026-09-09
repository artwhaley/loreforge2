import { ArrowLeft, Building2, Focus, UserRound } from "lucide-react";
import type { CharacterProfilePageModel } from "@/lib/page-models/characterProfile";
import type { ObsidianConfigV1 } from "./config";
import type { DesignConfigProps, DesignVariantProps } from "@/lib/design/types";
import s from "./obsidian.module.css";

/** Public character surface — the Design-owned implementation of the optional `characterProfile` slot. */
export function ObsidianPublicCharacterProfile(
  props: CharacterProfilePageModel & DesignVariantProps & DesignConfigProps<ObsidianConfigV1>,
) {
  const { character, departmentHref, departmentName, departmentDescription, roleName, focus, backHref } = props;
  const normalizedFocus = focus.trim() || "the shared work of the Domain";
  return (
    <div className={s.publicPage}>
      <a href={backHref} className={s.backLink}>
        <ArrowLeft size={15} /> Back to members
      </a>
      <section className={s.characterProfileHero}>
        <div className={s.characterProfileIdentity}>
          <span className={s.characterProfileMark} aria-hidden="true">
            <UserRound size={31} strokeWidth={1.1} />
          </span>
          <div>
            <p className={s.eyebrow}>CHARACTER PROFILE</p>
            <h1>{character.name}</h1>
            <p className={s.characterProfileRole}>{roleName}</p>
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
              <dd>{roleName}</dd>
            </div>
            <div>
              <dt>Department</dt>
              <dd><a href={departmentHref}>{departmentName}</a></dd>
            </div>
            <div>
              <dt>Focus</dt>
              <dd>{normalizedFocus}</dd>
            </div>
          </dl>
        </aside>
        <article className={s.characterProfileCopy}>
          <p className={s.eyebrow}><Focus size={14} /> IN THE REACH</p>
          <h2>{character.name} keeps {normalizedFocus.toLowerCase()} in motion.</h2>
          <p>
            As {roleName.toLowerCase()} within {departmentName}, {character.name} helps
            shape the work described by the department: {departmentDescription?.toLowerCase() ?? "the shared work of the department"}.
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