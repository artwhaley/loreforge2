import Link from 'next/link'

import { PlatformShell, platformStyles as styles } from '@/components/platform/PlatformShell'
import { getActiveContext } from '@/lib/tenant/activeTenant'

export const dynamic = 'force-dynamic'

export default async function AccountPage() {
  const { user } = await getActiveContext()
  if (!user) return <PlatformShell><section className={styles.panel}><h1 className={styles.sectionTitle}>Sign in to manage your account.</h1><p><Link href="/" className={styles.primary}>Go to sign in</Link></p></section></PlatformShell>
  return <PlatformShell><section className={styles.panel}><p className={styles.eyebrow}>Account</p><h1 className={styles.sectionTitle}>{user.name ?? 'Your account'}</h1><p className={styles.sectionLead}>Manage your profile and security settings here. Private platform flags and internal records stay out of the customer surface.</p><div className={styles.cards}><article className={styles.card}><h3>Profile</h3><p>{user.email}</p><p>Profile editing will be available here.</p></article><article className={styles.card}><h3>Security</h3><p>Password and recovery settings will be available here.</p></article><article className={styles.card}><h3>Characters</h3><p><Link href="/account/characters">View your Characters</Link></p></article></div><p style={{ marginTop: '1.6rem' }}><Link href="/" className={styles.secondary}>Back to dashboard</Link></p></section></PlatformShell>
}
