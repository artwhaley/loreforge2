import Link from 'next/link'

import { PlatformShell, platformStyles as styles } from '@/components/platform/PlatformShell'

export default function AboutPage() {
  return <PlatformShell><section className={styles.panel}><p className={styles.eyebrow}>About Loreforge</p><h1 className={styles.sectionTitle}>A home for worlds worth remembering.</h1><p className={styles.sectionLead}>Loreforge gives communities a durable, welcoming place to connect their characters, organize their Domains, and keep the records that make shared worlds coherent.</p><div className={styles.cards}><article className={styles.card}><h3>Clear relationships</h3><p>Users control Characters. Characters belong to Domains and Departments. Every relationship stays visible and understandable.</p></article><article className={styles.card}><h3>Thoughtful archives</h3><p>Records can be written, organized, reviewed, and revisited without losing their history.</p></article><article className={styles.card}><h3>Room to grow</h3><p>Start with a calm, useful workspace. Add richer forms, permissions, notices, and integrations as your community needs them.</p></article></div><p style={{ marginTop: '1.6rem' }}><Link href="/" className={styles.primary}>Back to Loreforge</Link></p></section></PlatformShell>
}
