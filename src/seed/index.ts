/**
 * Ticket 00 seed/reset script.
 *
 * Seeds the minimal authenticated users needed for Ticket 00 acceptance.
 * Later tickets extend this with fixture tenants, users, and documents
 * from `sl-civic-archive-mvp-packet/02_TEST_FIXTURES.md`.
 *
 * Run with: npm run seed
 * Reset: delete the SQLite file (see README), then re-run.
 */
import { getPayload } from 'payload'

import config from '@/payload.config'

const TEST_USERS = [
  {
    email: 'admin@example.test',
    name: 'Morgan Vale',
    password: 'test-password-123',
  },
  {
    email: 'officer@example.test',
    name: 'Alex Mercer',
    password: 'test-password-123',
  },
]

const payload = await getPayload({ config })

for (const user of TEST_USERS) {
  const existing = await payload.find({
    collection: 'users',
    where: { email: { equals: user.email } },
  })
  if (existing.docs.length > 0) {
    payload.logger.info(`User ${user.email} already exists — skipping`)
    continue
  }
  await payload.create({ collection: 'users', data: user })
  payload.logger.info(`Created user ${user.email}`)
}

payload.logger.info('Ticket 00 seed complete.')
process.exit(0)
