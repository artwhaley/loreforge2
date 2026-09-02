/**
 * Seed / reset script.
 *
 * Seeds fixture users, tenants, memberships, and documents from
 * `sl-civic-archive-mvp-packet/02_TEST_FIXTURES.md`. Idempotent: existing
 * records (matched by email/slug) are skipped.
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

const SHARED_INCIDENT_REPORT = `# Incident Report 2026-014

**Reporting Officer:** Alex Mercer  
**Date:** September 1, 2026  
**Location:** 118 Market Street  
**Classification:** Property Damage

## Narrative

At approximately 9:35 PM, I responded to a report of property damage at 118 Market Street. On arrival, I observed a broken front window and spoke with the property occupant.

The occupant reported hearing an impact shortly before discovering the damage. No injuries were reported.

## Persons Contacted

- Jordan Resident - property occupant
- Casey Witness - nearby resident

## Disposition

Photographs were taken and the incident was documented for follow-up.

> This report is an MVP fixture used to evaluate formatting, editing, search, and tenant-specific presentation.
`

const TENANTS: Array<{
  slug: string
  name: string
  motto: string
  preset: 'heritage' | 'modern'
  primaryColor: string
  secondaryColor: string
  accentColor: string
  backgroundColor: string
  headingFontKey: 'georgia' | 'palatino' | 'verdana' | 'trebuchet'
  bodyFontKey: 'georgia' | 'verdana' | 'trebuchet' | 'tahoma'
}> = [
  {
    slug: 'ravenhurst',
    name: 'City of Ravenhurst',
    motto: 'Order, Service, Community',
    preset: 'heritage',
    primaryColor: '#243145',
    secondaryColor: '#8A6A3C',
    accentColor: '#B9975B',
    backgroundColor: '#F3EFE6',
    headingFontKey: 'georgia',
    bodyFontKey: 'verdana',
  },
  {
    slug: 'port-victoria',
    name: 'Port Victoria',
    motto: 'Forward Together',
    preset: 'modern',
    primaryColor: '#123C5A',
    secondaryColor: '#E8EDF1',
    accentColor: '#21A4B8',
    backgroundColor: '#F8FAFC',
    headingFontKey: 'trebuchet',
    bodyFontKey: 'verdana',
  },
]

const payload = await getPayload({ config })

// --- Users ---
const usersByEmail: Record<string, { id: number }> = {}
for (const user of TEST_USERS) {
  const existing = await payload.find({
    collection: 'users',
    where: { email: { equals: user.email } },
    depth: 0,
    limit: 1,
  })
  if (existing.docs[0]) {
    usersByEmail[user.email] = existing.docs[0]
    payload.logger.info(`User ${user.email} already exists — skipping`)
    continue
  }
  const created = await payload.create({ collection: 'users', data: user })
  usersByEmail[user.email] = created
  payload.logger.info(`Created user ${user.email}`)
}

// --- Tenants ---
const tenantsBySlug: Record<string, { id: number }> = {}
for (const tenant of TENANTS) {
  const existing = await payload.find({
    collection: 'tenants',
    where: { slug: { equals: tenant.slug } },
    depth: 0,
    limit: 1,
  })
  if (existing.docs[0]) {
    tenantsBySlug[tenant.slug] = existing.docs[0]
    payload.logger.info(`Tenant ${tenant.slug} already exists — skipping`)
    continue
  }
  const created = await payload.create({ collection: 'tenants', data: tenant })
  tenantsBySlug[tenant.slug] = created
  payload.logger.info(`Created tenant ${tenant.slug}`)
}

// --- Memberships ---
const MEMBERSHIPS: Array<{ userEmail: string; tenantSlug: string; role: 'admin' | 'member' }> = [
  { userEmail: 'admin@example.test', tenantSlug: 'ravenhurst', role: 'admin' },
  { userEmail: 'admin@example.test', tenantSlug: 'port-victoria', role: 'admin' },
  { userEmail: 'officer@example.test', tenantSlug: 'ravenhurst', role: 'member' },
]

for (const membership of MEMBERSHIPS) {
  const existing = await payload.find({
    collection: 'memberships',
    where: {
      and: [
        { user: { equals: usersByEmail[membership.userEmail].id } },
        { tenant: { equals: tenantsBySlug[membership.tenantSlug].id } },
      ],
    },
    depth: 0,
    limit: 1,
  })
  if (existing.docs[0]) {
    payload.logger.info(`Membership ${membership.userEmail}->${membership.tenantSlug} exists — skipping`)
    continue
  }
  await payload.create({
    collection: 'memberships',
    data: {
      user: usersByEmail[membership.userEmail].id,
      tenant: tenantsBySlug[membership.tenantSlug].id,
      role: membership.role,
    },
  })
  payload.logger.info(`Created membership ${membership.userEmail}->${membership.tenantSlug}`)
}

// --- Shared fixture document (once per tenant) ---
for (const tenant of TENANTS) {
  const existing = await payload.find({
    collection: 'documents',
    where: {
      and: [
        { tenant: { equals: tenantsBySlug[tenant.slug].id } },
        { title: { equals: 'Incident Report 2026-014' } },
      ],
    },
    depth: 0,
    limit: 1,
  })
  if (existing.docs[0]) {
    payload.logger.info(`Fixture document for ${tenant.slug} exists — skipping`)
    continue
  }
  await payload.create({
    collection: 'documents',
    data: {
      tenant: tenantsBySlug[tenant.slug].id,
      title: 'Incident Report 2026-014',
      body: SHARED_INCIDENT_REPORT,
      origin: 'web-editor',
      createdBy: usersByEmail['officer@example.test'].id,
    },
  })
  payload.logger.info(`Created fixture document for ${tenant.slug}`)
}

payload.logger.info('Seed complete.')
process.exit(0)
