import type { ReactNode } from 'react'
import s from './atelier.module.css'

export function Heading({ number, title, children, actions }: { number: string; title: string; children?: ReactNode; actions?: ReactNode }) {
  return <header className={s.heading}><div><p className={s.eyebrow}><span>{number}</span> / ATELIER</p><h1>{title}</h1>{children && <div className={s.intro}>{children}</div>}</div>{actions && <div className={s.actions}>{actions}</div>}</header>
}
export function Empty({ children }: { children: ReactNode }) { return <p className={s.empty}>{children}</p> }
export function Status({ status }: { status: { level: 'info' | 'error'; message: string } | null }) { return status ? <p className={s.notice} role={status.level === 'error' ? 'alert' : 'status'}>{status.message}</p> : null }
export function Html({ html }: { html: string }) { return <div className={s.prose} dangerouslySetInnerHTML={{ __html: html }} /> }
export function Destinations({ items }: { items: Array<{ href: string; label: string }> }) { return <nav className={s.destinations} aria-label="Explore">{items.map((d, i) => <a href={d.href} key={d.href}><span className={s.ordinal}>{String(i + 1).padStart(2, '0')}</span><span>{d.label}</span><span aria-hidden="true">↗</span></a>)}</nav> }
