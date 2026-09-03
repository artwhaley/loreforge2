import Link from 'next/link'

import { PlatformShell, platformStyles as styles } from '@/components/platform/PlatformShell'

export default function SubscriptionsPage() {
  return <PlatformShell><section className={styles.panel}><p className={styles.eyebrow}>Subscriptions</p><h1 className={styles.sectionTitle}>Plans for the archive you’re building.</h1><p className={styles.sectionLead}>Subscription plans and billing are still being prepared. This page is the honest place to learn what will be available without starting a checkout flow that is not ready.</p><div className={styles.cards}><article className={styles.card}><h3>Community</h3><p>For a shared Domain with characters, departments, and records. Plan details coming soon.</p></article><article className={styles.card}><h3>Personal</h3><p>For a private archive and a character’s own working space. Plan details coming soon.</p></article><article className={styles.card}><h3>Platform</h3><p>For operators supporting many communities. Contact and entitlement details are not available yet.</p></article></div><p style={{ marginTop: '1.6rem' }}><Link href="/" className={styles.secondary}>Return home</Link></p></section></PlatformShell>
}
