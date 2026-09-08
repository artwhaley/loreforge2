import type { HomePageModel } from '@/lib/page-models/home'
import type { PosterConfigV1 } from '@/lib/design/contracts'
import type { DesignConfigProps, DesignVariantProps } from '@/lib/design/types'

import styles from './poster-home.module.scss'

/** Poster home: monumental hero, destination tiles, spotlight record stack. */
export function PosterHome({ baseUrl, domain, welcome, destinations, recentRecords }: HomePageModel & DesignVariantProps & DesignConfigProps<PosterConfigV1>) {
  return (
    <div className={styles.posterHome}>
      <section className={styles.hero}>
        <h1 className={styles.title}>{domain.name}</h1>
        {domain.motto ? <p className={styles.motto}>{domain.motto}</p> : null}
        {welcome.html ? <div className={styles.intro} dangerouslySetInnerHTML={{ __html: welcome.html }} /> : null}
        {welcome.editHref ? <a className={styles.edit} href={welcome.editHref}>Edit welcome</a> : null}
      </section>
      <ul className={styles.tiles} aria-label="Destinations">
        {destinations.map((item, i) => <li key={item.segment} className={styles.tile}><span className={styles.tileNum} aria-hidden="true">0{i + 1}</span><a href={item.href}>{item.label}</a></li>)}
      </ul>
      <section className={styles.spotlight} aria-label="Recent records">
        <h2 className={styles.spotlightTitle}>Recent Records</h2>
        {recentRecords.length ? (
          <ul className={styles.spotlightList}>
            {recentRecords.map((record) => <li key={record.id}>
              <a className={styles.spotlightLink} href={`${baseUrl}/documents/${record.id}`}>{record.title}</a>
              <span className={styles.spotlightMeta}>{record.type}{record.type && record.activity ? ' · ' : ''}{record.activity}</span>
            </li>)}
          </ul>
        ) : <p className={styles.empty}>No records filed yet.</p>}
      </section>
    </div>
  )
}
