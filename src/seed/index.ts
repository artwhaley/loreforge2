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

const EDITOR_STRESS_DOC = `# City Council Meeting Notes

## Attendance

- Mayor Morgan Vale
- Clerk Jamie North
- Councilor Avery Stone

## Agenda

1. Call to order
2. Harbor permit discussion
3. Public comments
4. Adjournment

The council discussed **Permit PV-2026-22** and agreed that the revised application should be reviewed at the next meeting.

For background, see [Permit Guidance](https://example.invalid/permit-guidance).

> Clerk's note: no final action was taken.

---

Meeting adjourned at 8:42 PM.
`

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

// --- Theme Studio media fixtures (Ticket 03) ---
// Clearly different civic identities: Ravenhurst = heraldic navy/gold seal;
// Port Victoria = modern flat teal mark. Generated as SVG text so the seed
// stays dependency-free; Payload/sharp handle SVG uploads like any image.
const RAVENHURST_SEAL_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
  <circle cx="100" cy="100" r="96" fill="#F3EFE6" stroke="#B9975B" stroke-width="6"/>
  <circle cx="100" cy="100" r="78" fill="none" stroke="#243145" stroke-width="4"/>
  <path d="M70 130 V85 L100 60 L130 85 V130 H112 V100 H88 V130 Z" fill="#243145" stroke="#B9975B" stroke-width="2"/>
  <path d="M60 140 H140" stroke="#B9975B" stroke-width="4"/>
  <text x="100" y="165" text-anchor="middle" font-family="Georgia, serif" font-size="18" fill="#243145">RAVENHURST</text>
</svg>`

const RAVENHURST_BANNER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 400" preserveAspectRatio="xMidYMid slice">
  <rect width="1200" height="400" fill="#243145"/>
  <rect y="330" width="1200" height="70" fill="#8A6A3C"/>
  <rect y="322" width="1200" height="8" fill="#B9975B"/>
  <circle cx="980" cy="120" r="70" fill="none" stroke="#B9975B" stroke-width="6"/>
  <text x="80" y="210" font-family="Georgia, serif" font-size="64" fill="#F3EFE6">City of Ravenhurst</text>
  <text x="80" y="260" font-family="Georgia, serif" font-size="28" fill="#B9975B">Order · Service · Community</text>
</svg>`

const PORT_VICTORIA_SEAL_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
  <circle cx="100" cy="100" r="96" fill="#FFFFFF" stroke="#21A4B8" stroke-width="8"/>
  <circle cx="100" cy="100" r="74" fill="#123C5A"/>
  <path d="M40 115 Q70 95 100 115 T160 115" fill="none" stroke="#21A4B8" stroke-width="10" stroke-linecap="round"/>
  <path d="M52 138 Q76 122 100 138 T148 138" fill="none" stroke="#FFFFFF" stroke-width="8" stroke-linecap="round"/>
  <text x="100" y="70" text-anchor="middle" font-family="Trebuchet MS, sans-serif" font-size="30" font-weight="bold" fill="#FFFFFF">PV</text>
</svg>`

const PORT_VICTORIA_BANNER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 400" preserveAspectRatio="xMidYMid slice">
  <rect width="1200" height="400" fill="#F8FAFC"/>
  <rect width="1200" height="260" fill="#123C5A"/>
  <path d="M0 260 Q300 220 600 260 T1200 260 V400 H0 Z" fill="#21A4B8"/>
  <path d="M0 300 Q300 270 600 300 T1200 300 V400 H0 Z" fill="#123C5A" opacity="0.35"/>
  <text x="80" y="150" font-family="Trebuchet MS, sans-serif" font-size="64" font-weight="bold" fill="#FFFFFF">Port Victoria</text>
  <text x="80" y="200" font-family="Trebuchet MS, sans-serif" font-size="28" fill="#9BD8E0">Forward Together</text>
</svg>`

const MEDIA_ASSETS: Array<{
  filename: string
  alt: string
  svg: string
  tenantSlug: string
  field: 'logo' | 'banner'
}> = [
  { filename: 'ravenhurst-seal.svg', alt: 'City of Ravenhurst civic seal', svg: RAVENHURST_SEAL_SVG, tenantSlug: 'ravenhurst', field: 'logo' },
  { filename: 'ravenhurst-banner.svg', alt: 'City of Ravenhurst banner', svg: RAVENHURST_BANNER_SVG, tenantSlug: 'ravenhurst', field: 'banner' },
  { filename: 'port-victoria-seal.svg', alt: 'Port Victoria civic mark', svg: PORT_VICTORIA_SEAL_SVG, tenantSlug: 'port-victoria', field: 'logo' },
  { filename: 'port-victoria-banner.svg', alt: 'Port Victoria banner', svg: PORT_VICTORIA_BANNER_SVG, tenantSlug: 'port-victoria', field: 'banner' },
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

// --- Theme media assets + tenant attachment ---
for (const asset of MEDIA_ASSETS) {
  const existing = await payload.find({
    collection: 'media',
    where: { filename: { equals: asset.filename } },
    depth: 0,
    limit: 1,
  })
  let mediaId: number
  if (existing.docs[0]) {
    mediaId = existing.docs[0].id
    payload.logger.info(`Media ${asset.filename} already exists — skipping`)
  } else {
    const created = await payload.create({
      collection: 'media',
      data: { alt: asset.alt },
      file: {
        data: Buffer.from(asset.svg, 'utf8'),
        mimetype: 'image/svg+xml',
        name: asset.filename,
        size: Buffer.byteLength(asset.svg, 'utf8'),
      },
    })
    mediaId = created.id
    payload.logger.info(`Created media ${asset.filename}`)
  }

  const tenant = tenantsBySlug[asset.tenantSlug]
  const current = await payload.findByID({ collection: 'tenants', id: tenant.id, depth: 0 })
  if (!current[asset.field]) {
    await payload.update({
      collection: 'tenants',
      id: tenant.id,
      data: { [asset.field]: mediaId },
      depth: 0,
    })
    payload.logger.info(`Attached ${asset.filename} as ${asset.field} for ${asset.tenantSlug}`)
  }
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

// --- Editor round-trip stress fixture (Ravenhurst only) ---
const stressTenant = tenantsBySlug['ravenhurst']
if (stressTenant) {
  const existing = await payload.find({
    collection: 'documents',
    where: {
      and: [
        { tenant: { equals: stressTenant.id } },
        { title: { equals: 'City Council Meeting Notes' } },
      ],
    },
    depth: 0,
    limit: 1,
  })
  if (existing.docs[0]) {
    payload.logger.info('Editor stress document exists — skipping')
  } else {
    await payload.create({
      collection: 'documents',
      data: {
        tenant: stressTenant.id,
        title: 'City Council Meeting Notes',
        body: EDITOR_STRESS_DOC,
        origin: 'web-editor',
        createdBy: usersByEmail['admin@example.test'].id,
      },
    })
    payload.logger.info('Created editor stress document')
  }
}

payload.logger.info('Seed complete.')
process.exit(0)
