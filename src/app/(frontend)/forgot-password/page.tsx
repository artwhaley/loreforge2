import Link from 'next/link'

import { PlatformShell, platformStyles as styles } from '@/components/platform/PlatformShell'

export default function ForgotPasswordPage() {
  return <PlatformShell><section className={styles.panel}><p className={styles.eyebrow}>Account recovery</p><h1 className={styles.sectionTitle}>Password recovery is coming soon.</h1><p className={styles.sectionLead}>Recovery delivery is not connected yet, so Loreforge will not pretend to send an email. Contact your administrator for help while the provider and recovery policy are being finalized.</p><div className={styles.emptyCard}>No recovery email was sent and no account state changed.</div><p style={{ marginTop: '1.6rem' }}><Link href="/" className={styles.primary}>Return to sign in</Link></p></section></PlatformShell>
}
