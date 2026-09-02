import type { Character, Tenant } from '@/payload-types'

import { mediaSrc } from '@/lib/theme/fonts'
import { getActiveContext } from '@/lib/tenant/activeTenant'
import { getAdministrationDomainsForUser, getCharactersForTenant, getTenantsForUser } from '@/lib/tenant/queries'

import styles from './TenantShell.module.scss'

type Props = {
  tenant: Tenant
  cssVars: Record<string, string>
  role: 'admin' | 'member' | null
  switcherTenants?: Tenant[]
  activeCharacter?: Character | null
  switcherCharacters?: Character[]
  children: React.ReactNode
}

const NAV = [
  { label: 'Home', segment: '' },
  { label: 'About', segment: 'about' },
  { label: 'Subdomains', segment: 'subdomains' },
  { label: 'Roles', segment: 'roles' },
  { label: 'Records', segment: 'records' },
  { label: 'Forms', segment: 'forms' },
]

/**
 * Branded application shell. Reads only semantic theme tokens through CSS
 * custom properties — components never read arbitrary tenant fields.
 */
export async function TenantShell({
  tenant,
  cssVars,
  role,
  switcherTenants,
  activeCharacter,
  switcherCharacters,
  children,
}: Props) {
  const context = await getActiveContext()
  const resolvedCharacters =
    switcherCharacters ??
    (context.user ? await getCharactersForTenant(tenant, context.user.id) : context.characters)
  const resolvedActiveCharacter = activeCharacter === undefined ? context.activeCharacter : activeCharacter
  const resolvedTenants =
    switcherTenants ?? (context.user ? await getTenantsForUser(context.user.id) : [])
  const administrationDomains = context.user ? await getAdministrationDomainsForUser(context.user.id) : []
  const base = `/domain/${tenant.slug}`

  return (
    <div className={styles.root} style={cssVars as React.CSSProperties}>
      <div className={styles.contextBar} aria-label="Operating context">
        <form action="/api/switch-tenant" method="post" className={styles.contextControl}>
          <label htmlFor="tenant-switcher" className={styles.contextLabel}>
            Domain
          </label>
          <select
            id="tenant-switcher"
            name="tenantSlug"
            defaultValue={tenant.slug}
            className={styles.contextSelect}
            disabled={resolvedTenants.length === 0}
          >
            {resolvedTenants.length === 0 ? <option value={tenant.slug}>{tenant.name}</option> : null}
            {resolvedTenants.map((t) => (
              <option key={t.id} value={t.slug}>
                {t.name}
              </option>
            ))}
          </select>
          <button type="submit" className={styles.contextButton} disabled={resolvedTenants.length === 0}>
            Switch
          </button>
        </form>
        <form action="/api/switch-character" method="post" className={styles.contextControl}>
          <label htmlFor="character-switcher" className={styles.contextLabel}>
            Acting as
          </label>
          <select
            id="character-switcher"
            name="characterId"
            defaultValue={resolvedActiveCharacter?.id ?? ''}
            className={styles.contextSelect}
          >
            <option value="">No active Character</option>
            {resolvedCharacters.map((character) => (
              <option key={character.id} value={character.id}>
                {character.name}
              </option>
            ))}
          </select>
          <button type="submit" className={styles.contextButton}>
            Switch
          </button>
        </form>
        {administrationDomains.length > 0 ? (
          <form action="/api/switch-administration" method="post" className={styles.contextControl}>
            <label htmlFor="administration-domain-switcher" className={styles.contextLabel}>Administration</label>
            <select id="administration-domain-switcher" name="domainSlug" className={styles.contextSelect} defaultValue={tenant.slug}>
              {administrationDomains.map((domain) => <option key={domain.id} value={domain.slug}>{domain.name}</option>)}
            </select>
            <button type="submit" className={styles.contextButton}>Enter</button>
          </form>
        ) : null}
        {role === 'admin' ? (
          <form action="/api/switch-administration" method="post" className={styles.adminModeForm}>
            <input type="hidden" name="domainSlug" value={tenant.slug} />
            <button type="submit" className={styles.adminMode}>
            Administration
            </button>
          </form>
        ) : null}
      </div>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.identity}>
            {mediaSrc(tenant.logo) ? (
              <img className={styles.seal} src={mediaSrc(tenant.logo)} alt={tenant.name} />
            ) : (
              <div className={styles.sealFallback}>{tenant.name.charAt(0)}</div>
            )}
            <div>
              <a href={base} className={styles.domainName}>
                {tenant.name}
              </a>
              {tenant.motto ? <div className={styles.motto}>{tenant.motto}</div> : null}
            </div>
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
            {role === 'admin' ? (
              <a className={styles.navLink} href={`${base}/customize`}>
                Customize
              </a>
            ) : null}
          </nav>
        </div>
        <div className={styles.rule} />
        {mediaSrc(tenant.banner) ? (
          <div className={styles.bannerWrap}>
            <img className={styles.banner} src={mediaSrc(tenant.banner)} alt="Banner" />
          </div>
        ) : null}
      </header>
      <main className={styles.main}>{children}</main>
      <footer className={styles.footer}>
        <span>{tenant.name} — civic records archive</span>
      </footer>
    </div>
  )
}
