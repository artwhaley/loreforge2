import Link from 'next/link'

import { PlatformShell, platformStyles as styles } from '@/components/platform/PlatformShell'
import { getActiveContext } from '@/lib/tenant/activeTenant'

export const dynamic = 'force-dynamic'

export default async function AccountCharactersPage() {
  const context = await getActiveContext()
  if (!context.user) return <PlatformShell><section className={styles.panel}><h1 className={styles.sectionTitle}>Sign in to view your Characters.</h1><p><Link href="/" className={styles.primary}>Go to sign in</Link></p></section></PlatformShell>
  return <PlatformShell><section className={styles.panel}><p className={styles.eyebrow}>Account · Characters</p><h1 className={styles.sectionTitle}>Your Characters</h1><p className={styles.sectionLead}>A Character is your roleplay identity. Domain membership, Department membership, and Roles are separate relationships managed inside each Domain.</p>{context.characters.length ? <ul className={styles.domainList}>{context.characters.map((character) => <li key={character.id}><Link className={styles.domainLink} href={`/characters/${character.id}`}><span>{character.name}</span><span className={styles.badge}>{character.status === 'active' ? 'Active' : character.status}</span></Link></li>)}</ul> : <div className={styles.emptyCard}>No active Characters are connected to this account yet.</div>}<p style={{ marginTop: '1.6rem' }}><Link href="/account" className={styles.secondary}>Back to account</Link></p></section></PlatformShell>
}
