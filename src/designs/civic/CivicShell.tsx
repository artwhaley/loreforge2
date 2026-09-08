import type { CSSProperties, ReactNode } from 'react'
import Link from 'next/link'

import type { CivicConfigV1 } from './config'
import type { DesignShellProps } from '@/lib/design/types'
import { OperatingContext } from '@/components/platform/OperatingContext'

import styles from './CivicShell.module.scss'

/**
 * Civic shell (P08D-T06): the classic institutional portal composition, owned
 * entirely by Civic. The platform OperatingContext renders exactly once; every
 * frame region (identity, primary nav, Work, management nav, footer/dashboard
 * return) is Civic DOM + SCSS. The header posture comes from the resolved
 * Civic config (`--civic-header`), not from a shared axis list.
 */
export function CivicShell({ model, theme, children }: DesignShellProps<CivicConfigV1>) {
  const { domain, primaryNavigation, managementNavigation, routes } = model
  const header = theme.tokens['--civic-header'] ?? 'centered'
  return (
    <div className={styles.root} data-template="civic" data-header={header}
      style={{ ...theme.tokens, ...(model.domain.backgroundUrl ? { backgroundImage: `url("${model.domain.backgroundUrl}")`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed' } : {}) } as CSSProperties}>
      <div className={styles.bgOverlay} aria-hidden="true" />
      <OperatingContext model={model} />
      <div className={styles.domainGrid}>
        <header className={styles.header}>
          {domain.bannerUrl ? <div className={styles.bannerWrap}><img className={styles.banner} src={domain.bannerUrl} alt="" /></div> : null}
          <div className={styles.headerInner}>
            <a href={routes.baseUrl} className={styles.identity} aria-label={`${domain.name} Domain home`}>
              {domain.logoUrl ? <img className={styles.seal} src={domain.logoUrl} alt="" /> : <span className={styles.sealFallback} aria-hidden="true">{domain.name.charAt(0)}</span>}
              <span className={styles.identityText}><span className={styles.domainName}>{domain.name}</span>{domain.motto ? <span className={styles.motto}>{domain.motto}</span> : null}</span>
            </a>
            <nav className={styles.nav} aria-label={`${domain.name} navigation`}>
              {primaryNavigation.map((item) => <a key={item.segment} className={styles.navLink} href={item.href}>{item.label}</a>)}
              <a className={styles.navLink} href={routes.workUrl}>Work</a>
            </nav>
          </div>
          {managementNavigation.length > 0 ? (
            <nav className={styles.managementNav} aria-label={`${domain.name} management`}>
              {managementNavigation.map((item) => <Link key={item.segment} href={item.href}>{item.label}</Link>)}
            </nav>
          ) : null}
        </header>
        <main className={styles.main}>{children}</main>
        <footer className={styles.footer}><span>{domain.name} · a Loreforge Domain</span><Link href="/">Loreforge dashboard</Link></footer>
      </div>
    </div>
  )
}
