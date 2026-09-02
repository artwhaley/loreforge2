import type { Tenant } from '@/payload-types'

import styles from './TenantShell.module.scss'

type Props = {
  tenant: Tenant
  cssVars: Record<string, string>
  role: 'admin' | 'member' | null
  switcherTenants?: Tenant[]
  children: React.ReactNode
}

const NAV = [
  { label: 'Home', segment: '' },
  { label: 'Records', segment: 'records' },
]

/**
 * Branded application shell. Reads only semantic theme tokens through CSS
 * custom properties — components never read arbitrary tenant fields.
 */
export function TenantShell({ tenant, cssVars, role, switcherTenants, children }: Props) {
  const base = `/tenant/${tenant.slug}`

  return (
    <div className={styles.root} style={cssVars as React.CSSProperties}>
      {switcherTenants && switcherTenants.length > 1 ? (
        <div className={styles.switcherBar}>
          <form action="/api/switch-tenant" method="post" className={styles.switcherForm}>
            <label htmlFor="tenant-switcher" className={styles.switcherLabel}>
              Viewing as:
            </label>
            <select
              id="tenant-switcher"
              name="tenantSlug"
              defaultValue={tenant.slug}
              className={styles.switcherSelect}
            >
              {switcherTenants.map((t) => (
                <option key={t.id} value={t.slug}>
                  {t.name}
                </option>
              ))}
            </select>
            <button type="submit" className={styles.switcherButton}>
              Switch
            </button>
          </form>
        </div>
      ) : null}
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div>
            <a href={base} className={styles.cityName}>
              {tenant.name}
            </a>
            {tenant.motto ? <div className={styles.motto}>{tenant.motto}</div> : null}
          </div>
          <nav className={styles.nav}>
            {NAV.map((item) => (
              <a
                key={item.label}
                className={styles.navLink}
                href={item.segment ? `${base}/${item.segment}` : base}
              >
                {item.label}
              </a>
            ))}
            {/* Theme Studio (Customize) arrives in Ticket 03. */}
          </nav>
        </div>
        <div className={styles.rule} />
      </header>
      <main className={styles.main}>{children}</main>
      <footer className={styles.footer}>
        <span>{tenant.name} — civic records archive</span>
      </footer>
    </div>
  )
}
