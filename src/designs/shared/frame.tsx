import type { CSSProperties, ReactNode } from 'react'
import Link from 'next/link'

import type { DesignKey } from '@/lib/design/types'
import type { DomainShellModel } from '@/lib/page-models/shell'

import { OperatingContext } from './operating'
import styles from '@/components/theme/TenantShell.module.scss'

/**
 * Shared shell skeleton. It renders the platform-owned operating context plus
 * the Domain frame regions every Design needs; each Design owns its Shell
 * file and may replace this skeleton with its own composition later.
 */
export function ShellFrame({ design, model, cssVars, headerLayout, children }: {
  design: DesignKey
  model: DomainShellModel
  cssVars: Record<string, string>
  headerLayout: string
  children: ReactNode
}) {
  const { domain, primaryNavigation, managementNavigation, routes } = model
  return (
    <div className={styles.root} data-template={design} data-header={headerLayout}
      style={{ ...cssVars, ...(model.domain.backgroundUrl ? { backgroundImage: `url("${model.domain.backgroundUrl}")`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed' } : {}) } as CSSProperties}>
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
