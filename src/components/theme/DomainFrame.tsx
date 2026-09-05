import type { CSSProperties, ReactNode } from 'react'
import Link from 'next/link'
import { themeTokensToCssVars, type ThemeTokens } from '@/lib/theme/fonts'
import styles from './TenantShell.module.scss'

export const DOMAIN_NAV = [
  { label: 'Home', segment: '' },
  { label: 'About', segment: 'about' },
  { label: 'Lore', segment: 'lore' },
  { label: 'Departments', segment: 'departments' },
  { label: 'Records', segment: 'records' },
] as const

/** Pure presentation: access decisions and operating context stay in TenantShell. */
export function DomainFrame({ name, motto, base, logo, banner, background, tokens, context, management, children, studio = false }: {
  name: string; motto: string; base: string; logo: string; banner: string; background: string
  tokens: ThemeTokens; context?: ReactNode; management?: ReactNode; children: ReactNode; studio?: boolean
}) {
  return <div className={styles.root} data-template={tokens.designTemplate} data-header={tokens.headerLayout} data-studio={studio || undefined}
    style={{ ...themeTokensToCssVars(tokens), ...(background ? { backgroundImage: `url("${background}")`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed' } : {}) } as CSSProperties}>
    <div className={styles.bgOverlay} aria-hidden="true" />
    {context}
    <div className={styles.domainGrid}>
      <header className={styles.header}>
        {banner ? <div className={styles.bannerWrap}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className={styles.banner} src={banner} alt="" />
        </div> : null}
        <div className={styles.headerInner}>
          <a href={base} className={styles.identity} aria-label={`${name} Domain home`}>
            {logo ? /* eslint-disable-next-line @next/next/no-img-element */
              <img className={styles.seal} src={logo} alt="" /> : <span className={styles.sealFallback} aria-hidden="true">{name.charAt(0)}</span>}
            <span className={styles.identityText}><span className={styles.domainName}>{name}</span>{motto ? <span className={styles.motto}>{motto}</span> : null}</span>
          </a>
          <nav className={styles.nav} aria-label={`${name} navigation`}>
            {DOMAIN_NAV.map(item => <a key={item.segment} className={styles.navLink} href={item.segment ? `${base}/${item.segment}` : base}>{item.label}</a>)}
            <a className={styles.navLink} href={`${base}/work`}>Work</a>
          </nav>
        </div>
        {management}
      </header>
      <main className={styles.main}>{children}</main>
      <footer className={styles.footer}><span>{name} · a Loreforge Domain</span><Link href="/">Loreforge dashboard</Link></footer>
    </div>
  </div>
}
