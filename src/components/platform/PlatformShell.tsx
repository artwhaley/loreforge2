import Link from 'next/link'
import type { ReactNode } from 'react'

import styles from './PlatformShell.module.scss'

export function PlatformShell({ children }: { children: ReactNode }) {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link href="/" className={styles.brand} aria-label="Loreforge home"><span className={styles.mark} aria-hidden="true">L</span>Loreforge</Link>
          <nav className={styles.headerNav} aria-label="Public navigation">
            <Link href="/about">About</Link><Link href="/subscriptions">Subscriptions</Link><Link href="/create-account" className={styles.secondary}>Create account</Link>
          </nav>
        </div>
      </header>
      <main className={styles.main}>{children}</main>
      <footer className={styles.footer}><div className={styles.footerInner}><Link href="/" className={styles.footerBrand}><span className={styles.mark} aria-hidden="true">L</span>Loreforge</Link><p className={styles.footerNote}>A crafted archive for worlds worth remembering.</p><nav aria-label="Footer navigation"><Link href="/about">About Loreforge</Link></nav></div></footer>
    </div>
  )
}

export { styles as platformStyles }
