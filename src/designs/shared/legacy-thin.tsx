import type { AboutPageModel, LorePageModel } from '@/lib/page-models/info'
import type { DepartmentPageModel, DepartmentsPageModel } from '@/lib/page-models/departments'
import type { DesignConfigProps } from '@/lib/design/types'

import styles from './legacy-thin.module.scss'

/**
 * LEGACY thin-page views (P08D-T08). Pre-isolation shared presentation for
 * About/Departments/Department/Lore. Only the Poster compatibility Design
 * still uses these — first-class Designs own their thin pages and must NOT
 * import this module.
 */
export function LegacyDepartmentsView(model: DepartmentsPageModel & DesignConfigProps<object>) {
  return (
    <section className={styles.thin}>
      <h1 className={styles.title}>{model.vocabulary.subdomainPlural}</h1>
      <p className={styles.intro}>The offices and working groups inside {model.domainName}. Choose a {model.vocabulary.subdomainSingular} to see its people and archive branches.</p>
      {model.manageHref ? <p className={styles.manage}><a href={model.manageHref}>Manage People</a></p> : null}
      {model.departments.length === 0 ? <p className={styles.empty}>No {model.vocabulary.subdomainPlural} have been configured.</p> : (
        <ul className={styles.grid}>
          {model.departments.map((department) => <li key={department.id} className={styles.card}>
            <h2 className={styles.cardTitle}><a href={`${model.baseUrl}/departments/${department.slug}`}>{department.name}</a></h2>
            <p className={styles.cardDesc}>{department.description || `A ${model.vocabulary.subdomainSingular} within this Domain.`}</p>
            <p className={styles.cardMeta}>{department.memberCount} active participant{department.memberCount === 1 ? '' : 's'}</p>
          </li>)}
        </ul>
      )}
    </section>
  )
}

export function LegacyDepartmentView(model: DepartmentPageModel & DesignConfigProps<object>) {
  return (
    <div className={styles.thin}>
      <p className={styles.crumb}><a href={`${model.baseUrl}/departments`}>{model.vocabulary.subdomainPlural}</a> / {model.name}</p>
      <section>
        <h1 className={styles.title}>{model.name}</h1>
        <p className={styles.intro}>{model.description || `A ${model.vocabulary.subdomainSingular} within this Domain.`}</p>
        <h2 className={styles.title} style={{ fontSize: '1.4rem' }}>{model.vocabulary.folderPlural}</h2>
        {model.folderNames.length ? <ul className={styles.list}>{model.folderNames.map((name) => <li key={name}>{name}</li>)}</ul> : <p className={styles.empty}>No {model.vocabulary.folderPlural.toLowerCase()} are visible yet.</p>}
        <h2 className={styles.title} style={{ fontSize: '1.4rem' }}>{model.vocabulary.memberPlural}</h2>
        {model.members.length ? <ul className={styles.list}>{model.members.map((member) => <li key={member.id}>{member.name}</li>)}</ul> : <p className={styles.empty}>No active {model.vocabulary.memberPlural.toLowerCase()} yet.</p>}
        {model.manageHref ? <p className={styles.manage}><a href={model.manageHref}>Manage {model.vocabulary.subdomainSingular} people</a></p> : null}
      </section>
    </div>
  )
}

export function LegacyAboutView(model: AboutPageModel & DesignConfigProps<object>) {
  return (
    <article className={styles.thin}>
      {model.editHref ? <p className={styles.manage}><a href={model.editHref}>Edit</a></p> : null}
      <div className={styles.body} dangerouslySetInnerHTML={{ __html: model.bodyHtml }} />
    </article>
  )
}

export function LegacyLoreView(_model: LorePageModel & DesignConfigProps<object>) {
  return (
    <article className={styles.thin}>
      <h1 className={styles.title}>Lore</h1>
    </article>
  )
}
