import Link from 'next/link'

import { PlatformShell, platformStyles as styles } from '@/components/platform/PlatformShell'

export default function SubscriptionsPage() {
  return (
    <PlatformShell>
      <section className={styles.panel}>
        <p className={styles.eyebrow}>Subscriptions</p>
        <h1 className={styles.sectionTitle}>Free for players affordable for communities.</h1>
        <div className={styles.cards}>
          <article className={styles.card} data-index="01 / Player">
            <h3>Player</h3>
            <p className={styles.planPrice}>$0.00 per month</p>
            <p>Player accounts are free and allow unlimited character creation. Want to start filing documents, submitting reports, or stay informed on what's happening - make a free account and it's yours forever.</p>
          </article>
          <article className={styles.card} data-index="2 / Community">
            <h3>Community</h3>
            <p className={styles.planPrice}>$37.50 per month</p>
            <p>Get your Role Play Community set up - organize departments, delegate authority, and enjoy unlimited document creation and storage.</p>
          </article>
          <article className={styles.card} data-index="3 / Private Library">
            <h3>Private Library</h3>
            <p className={styles.planPrice}>$9.99 per month</p>
            <p>Want to maintain your own records separate from the communities you play in? A Private Library allows you to create a personal repository of documents and personal writings connected to your roleplay worlds, but yours to keep wherever you play.</p>
          </article>
        </div>
        <p style={{ marginTop: '1.6rem' }}><Link href="/" className={styles.secondary}>Return home</Link></p>
      </section>
    </PlatformShell>
  )
}
