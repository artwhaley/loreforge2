import Link from 'next/link'
import type { Character, Tenant } from '@/payload-types'

import { DomainFrame } from './DomainFrame'
import { mediaSrc, resolveThemeTokens } from '@/lib/theme/fonts'
import { PLATFORM_NOUNS as vocab } from '@/lib/theme/nouns'
import { getActiveContext } from '@/lib/tenant/activeTenant'
import { getCharactersForTenant, getTenantsForUser } from '@/lib/tenant/queries'
import { CharacterSwitcher } from './CharacterSwitcher'
import { DomainSwitcher } from './DomainSwitcher'
import { loadCachedAuthorizationSession } from '@/lib/authz/sessionCache'
import { decideOne, type AuthzSession } from '@/lib/authz/session'
import { getLorePayload } from '@/lib/payload'
import { canOpenPeopleSession } from '@/lib/authz/workspaces'
import { canManageDomainInvitations } from '@/lib/invitations/workflows'

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

/** Branded Domain shell with one selected Domain and optional acting Character. */
export async function TenantShell({ tenant, role, switcherTenants, activeCharacter, switcherCharacters, children }: Props) {
  const context = await getActiveContext()
  const resolvedCharacters = switcherCharacters ?? (context.user ? await getCharactersForTenant(tenant, context.user.id) : context.characters)
  const resolvedActiveCharacter = activeCharacter === undefined ? context.activeCharacter : activeCharacter
  const resolvedTenants = switcherTenants ?? (context.user ? await getTenantsForUser(context.user.id) : [])
  const base = `/domain/${tenant.slug}`
  const tokens = resolveThemeTokens(tenant)
  const bannerUrl = mediaSrc(tenant.banner)
  const backgroundUrl = mediaSrc(tenant.backgroundImage)
  // P07P-02: one request-owned authorization session decides ALL navigation
  // visibility with zero per-folder SQL.
  const payload = context.user ? await getLorePayload() : null
  const session = payload && context.user ? await loadCachedAuthorizationSession(payload, Number(context.user.id), resolvedActiveCharacter?.id ?? null, tenant.id) : null
  const canMembers = session ? await canOpenPeopleSession(session) : false
  const canRoles = session ? decideDomainOrAny(session, 'manage_roles') || decideDomainOrAnySubdomain(session, 'manage_roles') : false
  const canFolders = session ? decideDomainOrAny(session, 'manage_folders') || decideDomainOrAnyFolder(session, 'manage_folders') : false
  const canTemplates = session ? decideDomainOrAny(session, 'manage_templates') : false
  const canCustomize = session ? decideDomainOrAny(session, 'manage_domain_appearance') : false
  const canInvitations = payload && context.user ? await canManageDomainInvitations(payload, { userId: context.user.id, activeCharacterId: resolvedActiveCharacter?.id ?? null }, tenant.id) : false

  return (
    <DomainFrame name={tenant.name} motto={tenant.motto ?? ''} base={base}
      logo={mediaSrc(tenant.logo)} banner={bannerUrl} background={backgroundUrl} tokens={tokens}
      context={
      <div className={styles.contextBar} aria-label="Operating context">
        <Link href="/" className={styles.platformBrand}><span className={styles.platformMark} aria-hidden="true">L</span>Loreforge</Link>
        <DomainSwitcher tenants={resolvedTenants} currentTenant={tenant} disabled={resolvedTenants.length === 0} />
        <CharacterSwitcher characters={resolvedCharacters} activeCharacter={resolvedActiveCharacter} />
        {context.user ? <div className={styles.accountControls}><details className={styles.accountMenu}><summary>{context.user.name ?? context.user.email}</summary><div className={styles.accountPopover}><Link href="/">Dashboard</Link><Link href="/account">Account</Link><Link href="/account/characters">Characters</Link><form action="/api/logout" method="post"><button type="submit" className={styles.logoutButton}>Log out</button></form></div></details></div> : null}
      </div>
      }
      management={
        (canMembers || canRoles || canFolders || canTemplates || canCustomize || canInvitations) ? (
          <nav className={styles.managementNav} aria-label={`${tenant.name} management`}>
            {canMembers ? <Link href={`${base}/manage/people`}>People</Link> : null}
            {role === 'admin' ? <Link href={`${base}/members`}>{vocab.member.plural}</Link> : null}
            {canRoles ? <Link href={`${base}/roles`}>{vocab.role.plural}</Link> : null}
            {canFolders ? <Link href={`${base}/manage/folders`}>{vocab.folder.plural}</Link> : null}
            {canTemplates ? <Link href={`${base}/forms`}>Templates &amp; Forms</Link> : null}
            {canInvitations ? <Link href={`${base}/manage/invitations`}>Invitations</Link> : null}
            {canCustomize ? <Link href={`${base}/customize`}>Customize</Link> : null}
          </nav>
        ) : null
      }
    >{children}</DomainFrame>
  )
}

function decideDomainOrAny(session: AuthzSession, capability: string): boolean {
  if (session.authority) return true
  return decideOne(session, capability as never, { type: 'Domain', id: session.domainId }).allowed
}

function decideDomainOrAnySubdomain(session: AuthzSession, capability: string): boolean {
  if (session.authority) return true
  for (const subdomainId of session.subdomains.keys()) if (decideOne(session, capability as never, { type: 'Subdomain', id: subdomainId }).allowed) return true
  return false
}

function decideDomainOrAnyFolder(session: AuthzSession, capability: string): boolean {
  if (session.authority) return true
  for (const folderId of session.folders.keys()) if (decideOne(session, capability as never, { type: 'Folder', id: folderId }).allowed) return true
  return false
}