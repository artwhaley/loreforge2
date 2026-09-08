import type { DomainShellModel } from '@/lib/page-models/shell'
import s from './obsidian.module.css'

/** Capability-filtered management index; links come from the shell model. */
export function ObsidianManagement({ model }: { model: DomainShellModel }) {
  return <section className={s.workspacePage} aria-label="Domain management">
    <p className={s.eyebrow}>DOMAIN MANAGEMENT</p>
    <h1>Manage {model.domain.name}</h1>
    {model.managementNavigation.length === 0 ? <p className={s.managementEmpty}>No management surfaces are available for this identity.</p> : <nav className={s.managementTable} aria-label="Management navigation">{model.managementNavigation.map((item) => <a key={item.segment} href={item.href}>{item.label}</a>)}</nav>}
  </section>
}
