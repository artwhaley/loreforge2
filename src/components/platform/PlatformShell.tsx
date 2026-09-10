import Link from 'next/link'
import type { ReactNode } from 'react'

import styles from './PlatformShell.module.scss'
import { PlatformMotion } from './PlatformMotion'
import { PencilPointer } from './PencilPointer'

function NavLabel({ children }: { children: string }) {
  return <span className={styles.navLabel}><span>{children}</span><span aria-hidden="true">{children}</span></span>
}

export function PlatformShell({ children }: { children: ReactNode }) {
  return (
    <PlatformMotion className={styles.page}>
      <div className={styles.smokeVeil} data-route-smoke aria-hidden="true" />
      <PencilPointer />
      <a href="#platform-main" className={styles.skipLink}>Skip to content</a>
      <div className={styles.registrationMarks} aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
      </div>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <span className={styles.headerHatch} aria-hidden="true" />
          <Link href="/" className={styles.brand} aria-label="Loreforge home">
            <span className={styles.mark} aria-hidden="true"><span>LF</span></span>
            <span className={styles.wordmark}>Loreforge</span>
          </Link>
          <span className={styles.headerRail} aria-hidden="true" />
          <nav className={styles.headerNav} aria-label="Public navigation">
            <Link href="/about"><NavLabel>About</NavLabel></Link><Link href="/subscriptions"><NavLabel>Subscriptions</NavLabel></Link><Link href="/create-account" className={styles.secondary}><NavLabel>Create account</NavLabel></Link>
          </nav>
        </div>
      </header>
      <main className={styles.main} id="platform-main" tabIndex={-1}>{children}</main>
      <footer className={styles.footer}>
        <div className={styles.footerStatement} data-reveal aria-hidden="true"><span>Loreforge</span></div>
        <div className={styles.footerInner}><Link href="/" className={styles.footerBrand}><span className={styles.mark} aria-hidden="true"><span>LF</span></span><span className={styles.wordmark}>Loreforge</span></Link><p className={styles.footerNote}>A crafted archive for worlds worth remembering.</p><nav aria-label="Footer navigation"><Link href="/about">About Loreforge</Link></nav></div>
      </footer>
    </PlatformMotion>
  )
}

export { styles as platformStyles }
