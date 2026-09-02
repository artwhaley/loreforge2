import { getPayload } from 'payload'

import config from '@/payload.config'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const payload = await getPayload({ config })
  const headers = await import('next/headers.js').then((m) => m.headers())
  const { user } = await payload.auth({ headers })

  let userCount: number | null = null
  let dbOk = true
  try {
    const result = await payload.count({ collection: 'users' })
    userCount = result.totalDocs
  } catch (err) {
    console.error('Health check failed to query local database:', err)
    dbOk = false
  }

  // Cities the logged-in user belongs to (MVP entry point into tenant sites).
  let cities: Array<{ slug: string; name: string }> = []
  if (user) {
    const memberships = await payload.find({
      collection: 'memberships',
      where: { user: { equals: user.id } },
      depth: 1,
      limit: 50,
    })
    cities = memberships.docs
      .map((m) => m.tenant)
      .filter((t): t is Exclude<typeof t, number | null> => Boolean(t && typeof t === 'object'))
      .map((t) => ({ slug: t.slug, name: t.name }))
  }

  return (
    <main>
      <h1>SL Civic Archive</h1>
      <p>Local MVP spike — Ticket 01: tenant themed document slice.</p>

      {user ? (
        <section>
          <h2>Your cities</h2>
          {cities.length === 0 ? (
            <p>No city memberships for this account.</p>
          ) : (
            <ul>
              {cities.map((city) => (
                <li key={city.slug}>
                  <form action="/api/switch-tenant" method="post" style={{ display: 'inline' }}>
                    <input type="hidden" name="tenantSlug" value={city.slug} />
                    <button type="submit">{city.name}</button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : (
        <p>
          <a href="/admin/login">Log in</a> to access your city archive.{' '}
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
