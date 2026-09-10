'use client'
import type { CSSProperties } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { OperatingContext } from '@/components/platform/OperatingContext'
import type { DesignShellProps } from '@/lib/design/types'
import type { AtelierConfigV1 } from './config'
import s from './atelier.module.css'

export function AtelierShell({ model, theme, designConfig, children }: DesignShellProps<AtelierConfigV1>) {
  const pathname = usePathname()
  const links = [...model.primaryNavigation, { href: model.routes.workUrl, label: 'Work', segment: 'work' }]
  return <div className={s.root} data-template="atelier" data-density={designConfig.density} style={theme.tokens as CSSProperties}>
    <a className={s.skip} href="#atelier-content">Skip to content</a>
    <OperatingContext model={model} />
    <div className={s.layout}>
      <aside className={s.rail}>
        <a className={s.identity} href={model.routes.baseUrl} aria-label={`${model.domain.name} Domain home`}>
          {model.domain.logoUrl ? <img src={model.domain.logoUrl} alt="" /> : <span className={s.monogram} aria-hidden="true">{model.domain.name.slice(0, 1)}</span>}
          <span>{model.domain.name}</span>
        </a>
        {model.domain.motto && <p className={s.motto}>{model.domain.motto}</p>}
        <details className={s.navigation} open><summary>Navigation <span aria-hidden="true">＋</span></summary>
          <nav aria-label="Primary navigation">{links.map((link) => <a href={link.href} key={link.href} aria-current={pathname === link.href ? 'page' : undefined}>{link.label}</a>)}</nav>
          {model.managementNavigation.length > 0 && <details className={s.management}><summary>Manage domain</summary><nav aria-label="Domain management">{model.managementNavigation.map(link => <a href={link.href} key={link.href}>{link.label}</a>)}</nav></details>}
        </details>
        <div className={s.railFoot}><Link href="/">Loreforge dashboard</Link></div>
      </aside>
      <div className={s.canvas}><main id="atelier-content" className={s.content} tabIndex={-1}>{children}</main><footer className={s.footer}><span>{model.domain.name}</span><a href={model.routes.baseUrl}>Back to home</a></footer></div>
    </div>
  </div>
}
