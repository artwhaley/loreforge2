import { getPayload } from 'payload'

import config from '@/payload.config'
import { getActiveContext } from '@/lib/tenant/activeTenant'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const payload = await getPayload({ config })
  const headers = await import('next/headers.js').then((m) => m.headers())
  const { user } = await payload.auth({ headers })
  const context = await getActiveContext()

  let userCount: number | null = null
  let dbOk = true
  try {
    const result = await payload.count({ collection: 'users' })
    userCount = result.totalDocs
  } catch (err) {
    console.error('Health check failed to query local database:', err)
    dbOk = false
  }

  // Domains the logged-in user belongs to (MVP entry point into Domain sites).
  let domains: Array<{ slug: string; name: string }> = []
  if (user) {
    const memberships = await payload.find({
      collection: 'memberships',
      where: { user: { equals: user.id } },
      depth: 1,
      limit: 50,
    })
    domains = memberships.docs
      .map((m) => m.tenant)
      .filter((t): t is Exclude<typeof t, number | null> => Boolean(t && typeof t === 'object'))
      .map((t) => ({ slug: t.slug, name: t.name }))
  }

  return (
    <main>
      <h1>SL Civic Archive</h1>
      <p>Local MVP spike — Ticket 01: Domain-themed document slice.</p>

      {user ? (
        <section>
          <h2>Choose your Character</h2>
          <p>
            {context.activeCharacter
              ? `Acting as ${context.activeCharacter.name}.`
              : 'No Character is active. Choose one to enter a Domain as that roleplay identity.'}
          </p>
          <form action="/api/switch-character" method="post">
            <label htmlFor="home-character-switcher">Acting as: </label>
            <select
              id="home-character-switcher"
              name="characterId"
              defaultValue={context.activeCharacter?.id ?? ''}
            >
              <option value="">No active Character</option>
              {context.characters.map((character) => (
                <option key={character.id} value={character.id}>
                  {character.name}
                </option>
              ))}
            </select>{' '}
            <button type="submit">Set Character</button>
          </form>

          <h2>Your Domains</h2>
          {!context.activeCharacter ? (
            <p>Select an active Character before choosing a Domain.</p>
          ) : domains.length === 0 ? (
            <p>No Domain memberships for this account.</p>
          ) : (
            <ul>
              {domains.map((domain) => (
                <li key={domain.slug}>
                  <form action="/api/switch-tenant" method="post" style={{ display: 'inline' }}>
                    <input type="hidden" name="tenantSlug" value={domain.slug} />
                    <button type="submit">{domain.name}</button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : (
        <p>
          <a href="/admin/login">Log in</a> to access your Domain archive.{' '}
          <strong>Test login:</strong> <code>admin@example.test</code> /{' '}
          <code>test-password-123</code>
        </p>
      )}

      <hr />
      <ul>
        <li>Next.js: running</li>
        <li>
          Payload: running — <a href="/admin">admin</a>
        </li>
        <li>
          SQLite: {dbOk ? 'connected' : 'ERROR querying database'} (users in DB:{' '}
          {userCount ?? 'unknown'})
        </li>
      </ul>
    </main>
  )
}
