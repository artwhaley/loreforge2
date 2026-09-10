import type { HomePageModel } from '@/lib/page-models/home'
import type { CivicConfigV1 } from './config'
import type { DesignConfigProps, DesignVariantProps } from '@/lib/design/types'

import styles from './home.module.css'

/** Civic home preserves the current universal composition exactly. */
export function CivicHome({ baseUrl, domain, welcome, destinations, recentRecords }: HomePageModel & DesignVariantProps & DesignConfigProps<CivicConfigV1>) {
  return (
    <div className={styles.home}>
      <section className={styles.welcome}>
        <h1 className={styles.title}><span className={styles.salutation}>Welcome to</span>{domain.name}</h1>
        {domain.motto ? <p className={styles.motto}>{domain.motto}</p> : null}
        {welcome.html ? <div className={styles.intro} dangerouslySetInnerHTML={{ __html: welcome.html }} /> : null}
        {welcome.editHref ? <a className={styles.edit} href={welcome.editHref}>Edit welcome</a> : null}
      </section>
      <nav className={styles.destinations} aria-label="Quick links">
        {destinations.map((item) => <a key={item.segment} href={item.href} className={styles.destination}>
          <span>{item.label}</span>
        </a>)}
      </nav>
      <section className={styles.recent}>
        <h2 className={styles.sectionTitle}>Recent Records</h2>
        {recentRecords.length ? <ul className={styles.records}>{recentRecords.map((record) => <li key={record.id} className={styles.record}>
          <a className={styles.recordTitle} href={`${baseUrl}/documents/${record.id}`}>{record.title}</a>
          {record.type ? <span className={styles.recordType}>{record.type}</span> : null}
          {record.activity ? <span className={styles.activity}>{record.activity}</span> : null}
        </li>)}</ul> : <p className={styles.empty}>No records filed yet.</p>}
      </section>
    </div>
  )
}
