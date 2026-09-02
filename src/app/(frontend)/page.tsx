import { getPayload } from 'payload'

import config from '@/payload.config'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const payload = await getPayload({ config })

  let userCount: number | null = null
  let dbOk = true
  try {
    const result = await payload.count({ collection: 'users' })
    userCount = result.totalDocs
  } catch (err) {
    console.error('Health check failed to query local database:', err)
    dbOk = false
  }

  return (
    <main>
      <h1>SL Civic Archive</h1>
      <p>Local MVP spike — Ticket 00 bootstrap.</p>
      <ul>
        <li>Next.js: running</li>
        <li>
          Payload: running — <a href="/admin/login">log in to the admin</a>
        </li>
        <li>
          SQLite: {dbOk ? 'connected' : 'ERROR querying database'} (users in DB:{' '}
          {userCount ?? 'unknown'})
        </li>
      </ul>
      <p>
        <strong>Test login:</strong> <code>admin@example.test</code> /{' '}
        <code>test-password-123</code>
      </p>
    </main>
  )
}
