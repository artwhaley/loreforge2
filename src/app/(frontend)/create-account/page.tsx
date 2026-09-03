import Link from 'next/link'

import { PlatformShell, platformStyles as styles } from '@/components/platform/PlatformShell'

export default function CreateAccountPage() {
  return <PlatformShell><section className={styles.panel}><p className={styles.eyebrow}>Create an account</p><h1 className={styles.sectionTitle}>Your Loreforge invitation starts here.</h1><p className={styles.sectionLead}>Open registration is not enabled yet. Ask your Domain or platform administrator for an invitation; this page will become the account-creation flow when that policy and email provider are approved.</p><div className={styles.emptyCard}>No account was created. Nothing was submitted.</div><p style={{ marginTop: '1.6rem' }}><Link href="/" className={styles.primary}>Return to sign in</Link></p></section></PlatformShell>
}
