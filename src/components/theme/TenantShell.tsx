import Link from 'next/link'
import type { Character, Tenant } from '@/payload-types'

import { mediaSrc } from '@/lib/theme/fonts'
import { getActiveContext } from '@/lib/tenant/activeTenant'
import { getCharactersForTenant, getTenantsForUser } from '@/lib/tenant/queries'
import { CharacterSwitcher } from './CharacterSwitcher'

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

const PRIMARY_NAV = [
  { label: 'Home', segment: '' },
  { label: 'About', segment: 'about' },
  { label: 'Departments', segment: 'departments' },
  { label: 'Records', segment: 'records' },
]

/** Branded Domain shell with one selected Domain and optional acting Character. */
export async function TenantShell({ tenant, cssVars, role, switcherTenants, activeCharacter, switcherCharacters, children }: Props) {
  const context = await getActiveContext()
  const resolvedCharacters = switcherCharacters ?? (context.user ? await getCharactersForTenant(tenant, context.user.id) : context.characters)
  const resolvedActiveCharacter = activeCharacter === undefined ? context.activeCharacter : activeCharacter
  const resolvedTenants = switcherTenants ?? (context.user ? await getTenantsForUser(context.user.id) : [])
  const base = `/domain/${tenant.slug}`

  return (
    <div className={styles.root} style={cssVars as React.CSSProperties}>
      <div className={styles.contextBar} aria-label="Operating context">
        <Link href="/" className={styles.platformBrand}><span className={styles.platformMark} aria-hidden="true">L</span>Loreforge</Link>
        <form action="/api/switch-tenant" method="post" className={styles.contextControl}>
          <label htmlFor="tenant-switcher" className={styles.contextLabel}>Domain</label>
          <select id="tenant-switcher" name="tenantSlug" defaultValue={tenant.slug} className={styles.contextSelect} disabled={resolvedTenants.length === 0}>
            {resolvedTenants.length === 0 ? <option value={tenant.slug}>{tenant.name}</option> : null}
            {resolvedTenants.map((item) => <option key={item.id} value={item.slug}>{item.name}</option>)}
          </select>
          <button type="submit" className={styles.contextButton} disabled={resolvedTenants.length === 0}>Switch</button>
        </form>
        <CharacterSwitcher characters={resolvedCharacters} activeCharacter={resolvedActiveCharacter} />
        {context.user ? <div className={styles.accountControls}><details className={styles.accountMenu}><summary>{context.user.name ?? context.user.email}</summary><div className={styles.accountPopover}><Link href="/">Dashboard</Link><Link href="/account">Account</Link><Link href="/account/characters">Characters</Link><form action="/api/logout" method="post"><button type="submit" className={styles.logoutButton}>Log out</button></form></div></details></div> : null}
      </div>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.identity}><Link href={base} className={styles.domainIdentity} aria-label={`${tenant.name} Domain home`}>{mediaSrc(tenant.logo) ? <img className={styles.seal} src={mediaSrc(tenant.logo)} alt="" /> : <span className={styles.sealFallback}>{tenant.name.charAt(0)}</span>}<span><span className={styles.domainName}>{tenant.name}</span>{tenant.motto ? <span className={styles.motto}>{tenant.motto}</span> : null}</span></Link></div>
          <nav className={styles.nav} aria-label={`${tenant.name} navigation`}>{PRIMARY_NAV.map((item) => <Link key={item.label} className={styles.navLink} href={item.segment ? `${base}/${item.segment}` : base}>{item.label}</Link>)}</nav>
        </div>
        {role === 'admin' ? <nav className={styles.managementNav} aria-label={`${tenant.name} administration`}><Link href={`${base}/manage/people`}>People</Link><Link href={`${base}/roles`}>Roles</Link><Link href={`${base}/manage/folders`}>Folders</Link><Link href={`${base}/forms`}>Templates &amp; Forms</Link><Link href={`${base}/customize`}>Customize</Link></nav> : null}
        <div className={styles.rule} />
        {mediaSrc(tenant.banner) ? <div className={styles.bannerWrap}><img className={styles.banner} src={mediaSrc(tenant.banner)} alt="" /></div> : null}
      </header>
      <main className={styles.main}>{children}</main>
      <footer className={styles.footer}><span>{tenant.name} · a Loreforge Domain</span><Link href="/">Loreforge dashboard</Link></footer>
    </div>
  )
}
