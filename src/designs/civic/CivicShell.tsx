'use client'

import { useEffect, useRef, type CSSProperties } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'

import type { CivicConfigV1 } from './config'
import type { DesignShellProps } from '@/lib/design/types'
import { OperatingContext } from '@/components/platform/OperatingContext'

import styles from './CivicShell.module.css'

/**
 * Civic shell (P08D-T06): the classic institutional portal composition, owned
 * entirely by Civic. The platform OperatingContext renders exactly once; every
 * frame region (identity, primary nav, Work, management nav, footer/dashboard
 * return) is Civic DOM + SCSS. The header posture comes from the resolved
 * Civic config (`--civic-header`), not from a shared axis list.
 */
export function CivicShell({ model, theme, children, designConfig }: DesignShellProps<CivicConfigV1>) {
  const pathname = usePathname()
  const mainRef = useRef<HTMLElement>(null)
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    const animation = mainRef.current?.animate?.([{ opacity: 0, transform: 'translateY(10px)', clipPath: 'inset(0 0 5% 0)' }, { opacity: 1, transform: 'translateY(0)', clipPath: 'inset(0)' }], { duration: 240, easing: 'cubic-bezier(.2,.8,.2,1)' })
    return () => animation?.cancel()
  }, [pathname])
  const { domain, primaryNavigation, managementNavigation, routes } = model
  const header = theme.tokens['--civic-header'] ?? 'centered'
  const bannerUrl = designConfig?.banner.image?.url ?? domain.bannerUrl
  return (
    <div className={styles.root} data-template="civic" data-header={header}
      style={{ ...theme.tokens, ...(designConfig?.background.image ? { backgroundImage: `url("${designConfig.background.image.url}")`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}) } as CSSProperties}>
      <div className={styles.bgOverlay} aria-hidden="true" />
      <OperatingContext model={model} />
      <div className={styles.domainGrid}>
        <header className={styles.header}>
          {bannerUrl ? <div className={styles.bannerWrap}><img className={styles.banner} src={bannerUrl} alt="" /></div> : null}
          <div className={styles.headerInner}>
            <a href={routes.baseUrl} className={styles.identity} aria-label={`${domain.name} Domain home`}>
              {domain.logoUrl ? <img className={styles.seal} src={domain.logoUrl} alt="" /> : <span className={styles.sealFallback} aria-hidden="true">{domain.name.charAt(0)}</span>}
              <span className={styles.identityText}><span className={styles.domainName}>{domain.name}</span>{domain.motto ? <span className={styles.motto}>{domain.motto}</span> : null}</span>
            </a>
            <nav className={styles.nav} aria-label={`${domain.name} navigation`}>
              {primaryNavigation.map((item) => <a key={item.segment} className={styles.navLink} aria-current={pathname === item.href ? 'page' : undefined} href={item.href}>{item.label}</a>)}
              <a className={styles.navLink} aria-current={pathname === routes.workUrl ? 'page' : undefined} href={routes.workUrl}>Work</a>
            </nav>
          </div>
          {managementNavigation.length > 0 ? (
            <nav className={styles.managementNav} aria-label={`${domain.name} management`}>
              {managementNavigation.map((item) => <Link key={item.segment} href={item.href}>{item.label}</Link>)}
            </nav>
          ) : null}
        </header>
        <main ref={mainRef} className={styles.main}>{children}</main>
        <footer className={styles.footer}><span>{domain.name} · a Loreforge Domain</span><Link href="/">Loreforge dashboard</Link></footer>
      </div>
    </div>
  )
}
