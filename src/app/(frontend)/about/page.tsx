import Link from 'next/link'
import { BookOpen, Network, Sprout } from 'lucide-react'

import { BlueprintArtwork } from '@/components/platform/BlueprintArtwork'
import { PlatformShell, platformStyles as styles } from '@/components/platform/PlatformShell'

export default function AboutPage() {
  return (
    <PlatformShell>
      <section className={styles.aboutHero}>
        <div className={styles.aboutIntro}>
          <p className={styles.eyebrow} data-reveal>About Loreforge</p>
          <h1 className={styles.sectionTitle} data-reveal>A home for worlds worth remembering.</h1>
          <p className={styles.sectionLead} data-reveal data-reveal-delay="100">Loreforge gives communities a durable, welcoming place to connect their characters, organize their Domains, and keep the records that make shared worlds coherent.</p>
        </div>
        <BlueprintArtwork />
      </section>
      <div className={styles.cards}>
        <article className={styles.card} data-reveal><Network className={styles.cardGlyph} aria-hidden="true" /><h3>Clear relationships</h3><p>Users control Characters. Characters belong to Domains and Departments. Every relationship stays visible and understandable.</p></article>
        <article className={styles.card} data-reveal data-reveal-delay="80"><BookOpen className={styles.cardGlyph} aria-hidden="true" /><h3>Thoughtful archives</h3><p>Records can be written, organized, reviewed, and revisited without losing their history.</p></article>
        <article className={styles.card} data-reveal data-reveal-delay="160"><Sprout className={styles.cardGlyph} aria-hidden="true" /><h3>Room to grow</h3><p>Start with a calm, useful workspace. Add richer forms, permissions, notices, and integrations as your community needs them.</p></article>
      </div>
      <section className={styles.aboutStatement} data-reveal>
        <p>The world is yours.<br />Give its stories somewhere to live.</p>
        <div className={styles.actions}><Link href="/" className={styles.secondary}>Back to Loreforge</Link></div>
      </section>
    </PlatformShell>
  )
}
