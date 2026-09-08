import { ArrowUpRight, UserRound } from 'lucide-react'

import type { MembersPageModel } from '@/lib/page-models/members'

import s from './obsidian.module.css'

/** Public member directory extension using the incubator's department-card grammar. */
export function ObsidianMembersDirectory({ model }: { model: MembersPageModel }) {
  return (
    <div className={s.publicPage}>
      <section className={s.directoryHeading}>
        <p className={s.eyebrow}>THE PEOPLE OF THE DOMAIN</p>
        <h1>Members.</h1>
        <p>The Characters who give {model.domainName} its living shape.</p>
      </section>
      {model.status ? <p className={model.status.level === 'error' ? s.formError : s.managementStatus} role={model.status.level === 'error' ? 'alert' : 'status'}>{model.status.message}</p> : null}
      <section className={s.departmentGrid} aria-label="Members">
        {model.rows.length === 0 ? <p className={s.loreEmpty}>No members are visible to you.</p> : model.rows.map((row) => {
          const displayName = row.localDisplayName || row.name
          return (
            <article className={s.departmentCard} key={row.membershipId}>
              <span className={s.departmentIcon}><UserRound size={23} strokeWidth={1.2} /></span>
              <span className={s.departmentCardTop}><span>{row.departments.join(' · ') || 'No department listed'}</span></span>
              <strong>{displayName}</strong>
              {displayName !== row.name ? <span className={s.srOnly}>{row.name}</span> : null}
              <p>{row.roles.join(' · ') || 'Member'}</p>
              <span className={s.departmentFoot}>
                <a href={`${model.baseUrl}/characters/${row.characterId}`}>View profile <ArrowUpRight size={14} /></a>
              </span>
            </article>
          )
        })}
      </section>
      {model.canSearch ? (
        <form className={s.srOnly} method="get">
          <label>Search Characters to add<input name="q" defaultValue={model.query} aria-label="Search Characters to add" /></label>
          <button type="submit">Search</button>
        </form>
      ) : null}
      {model.canSearch ? <a className={s.quietLink} href={`${model.baseUrl}/manage/people`}>Manage people <ArrowUpRight size={14} /></a> : null}
    </div>
  )
}
