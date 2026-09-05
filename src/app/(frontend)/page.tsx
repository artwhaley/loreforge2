import Link from 'next/link'

import { DashboardCharacterPicker } from '@/components/platform/DashboardCharacterPicker'
import { PlatformShell, platformStyles as styles } from '@/components/platform/PlatformShell'
import { getActiveContext } from '@/lib/tenant/activeTenant'
import { characterDisplayLabel } from '@/lib/characters/labels'
import { getDomainsForCharacter } from '@/lib/tenant/characterDomains'
import { getAdministrationDomainsForUser } from '@/lib/tenant/queries'
import { isInvitationToken } from '@/lib/invitations/types'

export const dynamic = 'force-dynamic'

type Props = { searchParams?: Promise<{ error?: string; invite?: string }> }

export default async function HomePage({ searchParams }: Props) {
  const context = await getActiveContext()
  const params = await searchParams
  const error = params?.error
  const invite = isInvitationToken(params?.invite) ? params?.invite : undefined
  const inviteQuery = invite ? `?invite=${encodeURIComponent(invite)}` : ''

  if (!context.user) {
    return (
      <PlatformShell>
        <section className={styles.hero}>
          <div className={styles.heroContent}>
            <h1 className={styles.heroTitle}>Write a world worth remembering.</h1>
            <p className={styles.heroCopy}>One place for all your static and living lore.</p>
            <div className={styles.actions}><Link href="/about" className={styles.secondary}>Explore Loreforge</Link><Link href={`/create-account${inviteQuery}`} className={styles.primary}>Create your account</Link></div>
          </div>
          <div className={styles.loginCard} id="login">
            <h2>Welcome back</h2>
            {error ? <p className={styles.error} role="alert">We couldn’t sign you in with those details. Check your email and password and try again.</p> : null}
            <form action="/api/customer-login" method="post">
              <div className={styles.field}><label htmlFor="email">Email</label><input id="email" name="email" type="email" autoComplete="email" required /></div>
              <div className={styles.field}><label htmlFor="password">Password</label><input id="password" name="password" type="password" autoComplete="current-password" required /></div>
              {invite ? <input type="hidden" name="invite" value={invite} /> : null}
              <label className={styles.remember}><input name="remember" value="1" type="checkbox" /> Remember me on this device</label>
              <button className={`${styles.primary} ${styles.loginButton}`} type="submit">Sign in</button>
            </form>
            <div className={styles.formLinks}><Link href="/forgot-password">Forgot password?</Link><Link href={`/create-account${inviteQuery}`}>Create account</Link></div>
          </div>
        </section>
        <section className={styles.section}>
          <p className={styles.eyebrow}>Made for Second Life</p><h2 className={styles.sectionTitle}>All your lore, records, and communication available in world and on the web.</h2>
          <p className={styles.sectionLead}>Loreforge integrates seamlessly with SL Notecards. Whether you&apos;re happy with plain text or want to take advantage of our markdown features for rich formatting on the web.</p>
          <div className={styles.cards}><article className={styles.card} data-index="01 / IDENTITY"><h3>Characters first</h3><p>Permissions are managed per character and per sim, but your records and work follow the character, not the account. Move to a different city with your personal history intact, or create a new character without old clutter in the way.</p></article><article className={styles.card} data-index="02 / MEMORY"><h3>Records that endure</h3><p>A rich persistent history with version control, history audits, and database backups so your world and work are safe.</p></article><article className={styles.card} data-index="03 / PLACE"><h3>A place that&apos;s yours</h3><p>Customize your community in both look and function. Whether you&apos;re running a kingdom, a city-state, or a modern Metropolis, the vibe is right because you set it.</p></article></div>
        </section>
      </PlatformShell>
    )
  }

  const characters = context.characters
  const activeCharacter = context.activeCharacter
  const managed = await getAdministrationDomainsForUser(context.user.id)
  const domains = activeCharacter ? await getDomainsForCharacter(activeCharacter.id) : []
  const activeDomain = context.tenant

  return (
    <PlatformShell>
      <div className={styles.dashboardHeader}>
        <div><p className={styles.eyebrow}>Your Loreforge</p><h1 className={styles.sectionTitle}>Welcome back, {context.user.name ?? context.user.email}</h1><p className={styles.dashboardGreeting}>{activeCharacter ? `Acting as ${characterDisplayLabel(activeCharacter)}.` : 'Choose a Character to unlock your Domains.'}</p></div>
        <div className={styles.dashboardControls}>
          <div className={styles.actions}><Link href="/work" className={styles.secondary}>Work</Link><Link href="/account" className={styles.secondary}>Account</Link><form action="/api/logout" method="post"><button type="submit" className={styles.textButton}>Log out</button></form></div>
        </div>
      </div>
      <nav className={styles.subnav} aria-label="Account navigation"><Link href="/">Dashboard</Link><Link href="/account">Account</Link><Link href="/account/characters">Characters</Link></nav>
      <div className={styles.dashboardGrid}>
        <section className={styles.panel}>
          <h2>Your Domains</h2>
          {characters.length ? (
            <>
              <div className={styles.domainEntry}>
                <DashboardCharacterPicker characters={characters} activeCharacterId={activeCharacter ? Number(activeCharacter.id) : null} />
              </div>
              {domains.length ? <ul className={styles.domainList}>{domains.map((domain) => <li key={domain.id}><form action="/api/switch-tenant" method="post"><input type="hidden" name="tenantSlug" value={domain.slug} /><button type="submit" className={styles.domainLink}><span>{domain.name}</span><span className={styles.badge}>{managed.some((item) => String(item.id) === String(domain.id)) ? 'Managed' : 'Participating'}</span></button></form></li>)}</ul> : activeCharacter ? <div className={styles.emptyCard}>{activeCharacter.name} isn’t an active member of any Domain yet — membership is granted inside each Domain.</div> : <div className={styles.domainLock}>Choose a Character above to unlock the Domains they belong to.</div>}
            </>
          ) : <div className={styles.emptyCard}>No Characters are connected to this account yet. <Link href="/account/characters">Manage Characters</Link></div>}
        </section>
        <section className={styles.panel}><h2>Continue working</h2><div className={styles.emptyCard}>{activeDomain ? <>You’re currently viewing <strong>{activeDomain.name}</strong>. Open its <Link href={`/domain/${activeDomain.slug}`}>Domain Home</Link> to continue.</> : 'Choose a Domain to pick up where you left off.'}</div><h2 style={{ marginTop: '1.5rem' }}>For you</h2><div className={styles.emptyCard}>Your notices and watched activity will appear here. Nothing new yet.</div></section>
      </div>
    </PlatformShell>
  )
}
