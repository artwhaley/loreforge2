import type { CSSProperties } from 'react'
import Link from 'next/link'

import type { LedgerConfigV1 } from './config'
import type { DesignShellProps } from '@/lib/design/types'
import { OperatingContext } from '@/components/platform/OperatingContext'

import styles from './LedgerShell.module.scss'

/**
 * Ledger shell (P08D-T07): the editorial archive spread. Desktop is a TRUE
 * semantic side rail — an `<aside>` in the React structure owns identity,
 * primary navigation, Work, and management navigation — never Civic header
 * DOM reordered by CSS. The rail's vocabulary (width/density/masthead/rules)
 * comes from the resolved Ledger config tokens, and Design media (masthead
 * image, paper texture) comes from Ledger's own bank — never the legacy
 * global Domain banner/background fields.
 */
export function LedgerShell({ model, theme, children }: DesignShellProps<LedgerConfigV1>) {
  const { domain, primaryNavigation, managementNavigation, routes } = model
  const railWidth = theme.tokens['--ledger-rail-width'] ?? 'standard'
  const density = theme.tokens['--ledger-rail-density'] ?? 'standard'
  const masthead = theme.tokens['--ledger-masthead'] ?? 'formal'
  const rules = theme.tokens['--ledger-rules'] ?? 'standard'
  const mastheadImage = theme.tokens['--ledger-masthead-image']
  return (
    <div className={styles.root} data-template="ledger" data-rail={railWidth} data-density={density} data-masthead={masthead} data-rules={rules}
      style={{ ...theme.tokens } as CSSProperties}>
      <div className={styles.bgOverlay} aria-hidden="true" />
      <OperatingContext model={model} />
      <div className={styles.grid}>
        <aside className={styles.rail} aria-label={`${domain.name} index`}>
          <a href={routes.baseUrl} className={styles.identity} aria-label={`${domain.name} Domain home`}>
            {domain.logoUrl ? <img className={styles.seal} src={domain.logoUrl} alt="" /> : <span className={styles.sealFallback} aria-hidden="true">{domain.name.charAt(0)}</span>}
            <span className={styles.identityText}><span className={styles.domainName}>{domain.name}</span>{domain.motto ? <span className={styles.motto}>{domain.motto}</span> : null}</span>
          </a>
          {mastheadImage && mastheadImage !== 'none' ? <div className={styles.mastheadImage}><img src={mastheadImage} alt="" /></div> : null}
          <nav className={styles.nav} aria-label={`${domain.name} navigation`}>
            {primaryNavigation.map((item) => <a key={item.segment} className={styles.navLink} href={item.href}>{item.label}</a>)}
            <a className={styles.navLink} href={routes.workUrl}>Work</a>
          </nav>
          {managementNavigation.length > 0 ? (
            <nav className={styles.managementNav} aria-label={`${domain.name} management`}>
              {managementNavigation.map((item) => <Link key={item.segment} href={item.href}>{item.label}</Link>)}
            </nav>
          ) : null}
        </aside>
        <main className={styles.main}>{children}</main>
        <footer className={styles.footer}><span>{domain.name} · a Loreforge Domain</span><Link href="/">Loreforge dashboard</Link></footer>
      </div>
    </div>
  )
}
