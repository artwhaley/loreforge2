import styles from './DomainHome.module.scss'

export type HomeRecord = { id: number | string; title: string; type: string; activity: string }
export type DomainHomeProps = { name: string; motto: string; base: string; welcomeHtml: string; editHref?: string; records: HomeRecord[] }

/** The homepage and the Studio render this exact content composition. */
export function DomainHome({ name, motto, base, welcomeHtml, editHref, records }: DomainHomeProps) {
  return <div className={styles.home}>
    <section className={styles.welcome}>
      <h1 className={styles.title}><span className={styles.salutation}>Welcome to</span>{name}</h1>
      {motto ? <p className={styles.motto}>{motto}</p> : null}
      {welcomeHtml ? <div className={styles.intro} dangerouslySetInnerHTML={{ __html: welcomeHtml }} /> : null}
      {editHref ? <a className={styles.edit} href={editHref}>Edit welcome</a> : null}
    </section>
    <nav className={styles.destinations} aria-label="Quick links">
      {['About', 'Lore', 'Departments', 'Records'].map((label, i) => <a key={label} href={`${base}/${label.toLowerCase()}`} className={styles.destination}>
        <span className={styles.ordinal} aria-hidden="true">0{i + 1}</span><span>{label}</span><span className={styles.arrow} aria-hidden="true">↗</span>
      </a>)}
    </nav>
    <section className={styles.recent}>
      <h2 className={styles.sectionTitle}>Recent Records</h2>
      {records.length ? <ul className={styles.records}>{records.map(record => <li key={record.id} className={styles.record}>
        <a className={styles.recordTitle} href={`${base}/documents/${record.id}`}>{record.title}</a>
        {record.type ? <span className={styles.recordType}>{record.type}</span> : null}
        {record.activity ? <span className={styles.activity}>{record.activity}</span> : null}
      </li>)}</ul> : <p className={styles.empty}>No records filed yet.</p>}
    </section>
  </div>
}
