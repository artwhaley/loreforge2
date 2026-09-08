import type { HomePageModel } from '@/lib/page-models/home'
import type { LedgerConfigV1 } from './config'
import type { DesignConfigProps, DesignVariantProps } from '@/lib/design/types'

import styles from './ledger-home.module.scss'

/** Ledger home: single-column editorial spread with a numbered index and ruled register. */
export function LedgerHome({ baseUrl, domain, welcome, destinations, recentRecords }: HomePageModel & DesignVariantProps & DesignConfigProps<LedgerConfigV1>) {
  return (
    <div className={styles.ledgerHome}>
      <section className={styles.welcome}>
        <h1 className={styles.title}>{domain.name}</h1>
        {domain.motto ? <p className={styles.motto}>{domain.motto}</p> : null}
        {welcome.html ? <div className={styles.intro} dangerouslySetInnerHTML={{ __html: welcome.html }} /> : null}
        {welcome.editHref ? <a className={styles.edit} href={welcome.editHref}>Edit welcome</a> : null}
      </section>
      <nav className={styles.index} aria-label="Domain index">
        <h2 className={styles.indexTitle}>Index</h2>
        <ol className={styles.indexList}>
          {destinations.map((item) => <li key={item.segment}><a href={item.href}>{item.label}</a></li>)}
        </ol>
      </nav>
      <section className={styles.register} aria-label="Recent records">
        <h2 className={styles.registerTitle}>Recent Records</h2>
        {recentRecords.length ? (
          <ul className={styles.registerList}>
            {recentRecords.map((record) => <li key={record.id}>
              <a className={styles.registerTitle2} href={`${baseUrl}/documents/${record.id}`}>{record.title}</a>
              <span className={styles.registerMeta}>{record.type}{record.type && record.activity ? ' · ' : ''}{record.activity}</span>
            </li>)}
          </ul>
        ) : <p className={styles.empty}>No records filed yet.</p>}
      </section>
    </div>
  )
}
