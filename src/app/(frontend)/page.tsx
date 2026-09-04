import Link from 'next/link'

import { PlatformShell, platformStyles as styles } from '@/components/platform/PlatformShell'
import { getActiveContext } from '@/lib/tenant/activeTenant'
import { getAdministrationDomainsForUser, getTenantsForUser } from '@/lib/tenant/queries'

export const dynamic = 'force-dynamic'

type Props = { searchParams?: Promise<{ error?: string }> }

export default async function HomePage({ searchParams }: Props) {
  const context = await getActiveContext()
  const error = (await searchParams)?.error

  if (!context.user) {
    return (
      <PlatformShell>
        <section className={styles.hero}>
          <div className={styles.heroContent}>
            <h1 className={styles.heroTitle}>Write a world worth remembering.</h1>
            <p className={styles.heroCopy}>One place for all your static and living lore.</p>
            <div className={styles.actions}><Link href="/about" className={styles.secondary}>Explore Loreforge</Link><Link href="/create-account" className={styles.primary}>Create your account</Link></div>
          </div>
          <div className={styles.loginCard} id="login">
            <h2>Welcome back</h2>
            {error ? <p className={styles.error} role="alert">We couldn’t sign you in with those details. Check your email and password and try again.</p> : null}
            <form action="/api/customer-login" method="post">
              <div className={styles.field}><label htmlFor="email">Email</label><input id="email" name="email" type="email" autoComplete="email" required /></div>
              <div className={styles.field}><label htmlFor="password">Password</label><input id="password" name="password" type="password" autoComplete="current-password" required /></div>
              <label className={styles.remember}><input name="remember" value="1" type="checkbox" /> Remember me on this device</label>
              <button className={`${styles.primary} ${styles.loginButton}`} type="submit">Sign in</button>
            </form>
            <div className={styles.formLinks}><Link href="/forgot-password">Forgot password?</Link><Link href="/create-account">Create account</Link></div>
          </div>
        </section>
        <section className={styles.section}>
          <p className={styles.eyebrow}>Made for Second Life</p><h2 className={styles.sectionTitle}>All your lore, records, and communication available in world and on the web.</h2>
          <p className={styles.sectionLead}>Loreforge integrates seamlessly with SL Notecards. Whether you're happy with plain text or want to take advantage of our markdown features for rich formatting on the web.</p>
          <div className={styles.cards}><article className={styles.card} data-index="01 / IDENTITY"><h3>Characters first</h3><p>Permissions are managed per character and per sim, but your records and work follow the character, not the account. Move to a different city with your personal history intact, or create a new character without old clutter in the way.</p></article><article className={styles.card} data-index="02 / MEMORY"><h3>Records that endure</h3><p>A rich persistent history with version control, history audits, and database backups so your world and work are safe.</p></article><article className={styles.card} data-index="03 / PLACE"><h3>A place that's yours</h3><p>Customize your community in both look and function. Whether you're running a kingdom, a city-state, or a modern Metropolis, the vibe is right because you set it.</p></article></div>
        </section>
      </PlatformShell>
    )
  }

  const [domains, managed] = await Promise.all([getTenantsForUser(context.user.id), getAdministrationDomainsForUser(context.user.id)])
  const byId = new Map([...domains, ...managed].map((domain) => [String(domain.id), domain]))
  const allDomains = [...byId.values()].sort((a, b) => a.name.localeCompare(b.name))
  const activeDomain = context.tenant

  return (
    <PlatformShell>
      <div className={styles.dashboardHeader}>
        <div><p className={styles.eyebrow}>Your Loreforge</p><h1 className={styles.sectionTitle}>Welcome back, {context.user.name ?? context.user.email}</h1><p className={styles.dashboardGreeting}>{context.activeCharacter ? `Acting as ${context.activeCharacter.name}.` : 'No participating Character is active.'}</p></div>
        <div className={styles.dashboardControls}>
          <form action="/api/switch-character" method="post" className={styles.characterPicker}>
            <label htmlFor="dashboard-character">Character</label>
            <select id="dashboard-character" name="characterId" defaultValue={context.activeCharacter?.id ?? ''}>
              <option value="">No active Character</option>
              {context.characters.map((character) => <option key={character.id} value={character.id}>{character.name}</option>)}
            </select>
            <button type="submit">Switch</button>
          </form>
          <div className={styles.actions}><Link href="/account" className={styles.secondary}>Account</Link><form action="/api/logout" method="post"><button type="submit" className={styles.textButton}>Log out</button></form></div>
        </div>
      </div>
      <nav className={styles.subnav} aria-label="Account navigation"><Link href="/">Dashboard</Link><Link href="/account">Account</Link><Link href="/account/characters">Characters</Link></nav>
      <div className={styles.dashboardGrid}>
        <section className={styles.panel}><h2>Your Domains</h2>{allDomains.length ? <ul className={styles.domainList}>{allDomains.map((domain) => <li key={domain.id}><form action="/api/switch-tenant" method="post"><input type="hidden" name="tenantSlug" value={domain.slug} /><button type="submit" className={styles.domainLink}><span>{domain.name}</span><span className={styles.badge}>{managed.some((item) => String(item.id) === String(domain.id)) ? 'Managed' : 'Participating'}</span></button></form></li>)}</ul> : <div className={styles.emptyCard}>Your Domains will appear here when a Character joins one.</div>}</section>
        <section className={styles.panel}><h2>Continue working</h2><div className={styles.emptyCard}>{activeDomain ? <>You’re currently viewing <strong>{activeDomain.name}</strong>. Open its <Link href={`/domain/${activeDomain.slug}`}>Domain Home</Link> to continue.</> : 'Choose a Domain above to pick up where you left off.'}</div><h2 style={{ marginTop: '1.5rem' }}>For you</h2><div className={styles.emptyCard}>Your notices and watched activity will appear here. Nothing new yet.</div></section>
      </div>
    </PlatformShell>
  )
}
