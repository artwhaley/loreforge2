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

// --- Ticket 04: informational pages (Home welcome prose + About) ---
const RAVENHURST_HOME = `Ravenhurst is a city of record, order, and public service. Residents and city staff share a single archive for civic records, ordinances, and department documents created during roleplay.

Use the links below to explore our departments, public records, and city information.`

const RAVENHURST_ABOUT = `# About Ravenhurst

Ravenhurst is a roleplay community centered on municipal life, public service, and collaborative storytelling.

This archive provides residents and city staff with a shared home for public records, departmental documents, and other civic material created during roleplay.

## City Services

- City administration
- Police services
- Municipal court
- Public records`

const PORT_VICTORIA_HOME = `Port Victoria is a forward-looking coastal community. This archive houses public records, departmental documents, and civic material for residents and city staff.

Find what you need through our departments and public records.`

const PORT_VICTORIA_ABOUT = `# About Port Victoria

Port Victoria is a roleplay community with a coastal metropolitan identity—open, modern, and oriented toward the harbor.

This archive gives residents and staff a shared home for public records, departmental documents, and other civic material created during roleplay.

## City Services

- City administration
- Public safety
- Harbor authority
- Public records`

// --- Ticket 05: archive folder trees ---
const FOLDER_TREES: Record<string, Array<{ name: string; path: string; parentPath?: string }>> = {
  ravenhurst: [
    { name: 'City Records', path: 'city-records' },
    { name: 'Police', path: 'city-records/police', parentPath: 'city-records' },
    { name: 'Reports', path: 'city-records/police/reports', parentPath: 'city-records/police' },
    { name: 'Court', path: 'city-records/court', parentPath: 'city-records' },
    { name: 'Filings', path: 'city-records/court/filings', parentPath: 'city-records/court' },
    { name: 'Ordinances', path: 'city-records/ordinances', parentPath: 'city-records' },
  ],
  'port-victoria': [
    { name: 'Public Records', path: 'public-records' },
    { name: 'Public Safety', path: 'public-records/public-safety', parentPath: 'public-records' },
    { name: 'Reports', path: 'public-records/public-safety/reports', parentPath: 'public-records/public-safety' },
    { name: 'Harbor Authority', path: 'public-records/harbor-authority', parentPath: 'public-records' },
    { name: 'Council', path: 'public-records/council', parentPath: 'public-records' },
  ],
}

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

const RAVENHURST_BANNER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 240" preserveAspectRatio="xMidYMid meet">
  <rect width="1920" height="240" fill="#243145"/>
  <rect y="224" width="1920" height="6" fill="#B9975B"/>
  <rect y="230" width="1920" height="10" fill="#8A6A3C"/>
  <circle cx="1580" cy="120" r="80" fill="none" stroke="#B9975B" stroke-width="5"/>
  <circle cx="1580" cy="120" r="58" fill="none" stroke="#8A6A3C" stroke-width="2"/>
  <text x="96" y="134" font-family="Georgia, serif" font-size="76" fill="#F3EFE6">City of Ravenhurst</text>
  <text x="100" y="192" font-family="Georgia, serif" font-size="30" fill="#B9975B">Order · Service · Community</text>
</svg>`

const PORT_VICTORIA_SEAL_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
  <circle cx="100" cy="100" r="96" fill="#FFFFFF" stroke="#21A4B8" stroke-width="8"/>
  <circle cx="100" cy="100" r="74" fill="#123C5A"/>
  <path d="M40 115 Q70 95 100 115 T160 115" fill="none" stroke="#21A4B8" stroke-width="10" stroke-linecap="round"/>
  <path d="M52 138 Q76 122 100 138 T148 138" fill="none" stroke="#FFFFFF" stroke-width="8" stroke-linecap="round"/>
  <text x="100" y="70" text-anchor="middle" font-family="Trebuchet MS, sans-serif" font-size="30" font-weight="bold" fill="#FFFFFF">PV</text>
</svg>`

const PORT_VICTORIA_BANNER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 240" preserveAspectRatio="xMidYMid meet">
  <rect width="1920" height="240" fill="#123C5A"/>
  <path d="M0 196 Q240 168 480 196 T960 196 T1440 196 T1920 196 V240 H0 Z" fill="#21A4B8"/>
  <path d="M0 212 Q240 188 480 212 T960 212 T1440 212 T1920 212 V240 H0 Z" fill="#0E2F45" opacity="0.5"/>
  <text x="96" y="134" font-family="Trebuchet MS, sans-serif" font-size="76" font-weight="bold" fill="#FFFFFF">Port Victoria</text>
  <text x="100" y="192" font-family="Trebuchet MS, sans-serif" font-size="30" fill="#9BD8E0">Forward Together</text>
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

// --- Archive folders (Ticket 05) ---
const folderIds: Record<string, Record<string, number>> = {}
for (const [tenantSlug, files] of Object.entries(FOLDER_TREES)) {
  folderIds[tenantSlug] = {}
  for (const file of files) {
    const parentCond: { parent: { equals: number | null } } = file.parentPath
      ? { parent: { equals: folderIds[tenantSlug][file.parentPath] } }
      : { parent: { equals: null } }
    const existing = await payload.find({
      collection: 'folders',
      where: {
        and: [
          { tenant: { equals: tenantsBySlug[tenantSlug].id } },
          { name: { equals: file.name } },
          parentCond,
        ],
      },
      depth: 0,
      limit: 1,
    })
    if (existing.docs[0]) {
      folderIds[tenantSlug][file.path] = existing.docs[0].id
      payload.logger.info(`Folder ${tenantSlug}/${file.path} exists — skipping`)
      continue
    }
    const created = await payload.create({
      collection: 'folders',
      data: {
        tenant: tenantsBySlug[tenantSlug].id,
        name: file.name,
        parent: file.parentPath ? (folderIds[tenantSlug][file.parentPath] ?? null) : null,
      },
    })
    folderIds[tenantSlug][file.path] = created.id
    payload.logger.info(`Created folder ${tenantSlug}/${file.path}`)
  }
}

// --- Shared fixture document (once per tenant) ---
const DOC_FOLDER_PATH: Record<string, string> = {
  ravenhurst: 'city-records/police/reports',
  'port-victoria': 'public-records/public-safety/reports',
}
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
  const folderId = folderIds[tenant.slug]?.[DOC_FOLDER_PATH[tenant.slug]] ?? null
  if (existing.docs[0]) {
    if (folderId !== null && existing.docs[0].folder !== folderId) {
      await payload.update({
        collection: 'documents',
        id: existing.docs[0].id,
        data: { folder: folderId },
        depth: 0,
      })
      payload.logger.info(`Filed existing fixture document for ${tenant.slug}`)
    } else {
      payload.logger.info(`Fixture document for ${tenant.slug} exists — skipping`)
    }
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
      folder: folderId,
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

// --- Informational pages (Ticket 04) ---
const PAGES: Array<{ tenantSlug: string; slug: string; title: string; body: string }> = [
  { tenantSlug: 'ravenhurst', slug: 'home', title: 'Ravenhurst Home', body: RAVENHURST_HOME },
  { tenantSlug: 'ravenhurst', slug: 'about', title: 'About Ravenhurst', body: RAVENHURST_ABOUT },
  { tenantSlug: 'port-victoria', slug: 'home', title: 'Port Victoria Home', body: PORT_VICTORIA_HOME },
  { tenantSlug: 'port-victoria', slug: 'about', title: 'About Port Victoria', body: PORT_VICTORIA_ABOUT },
]

for (const page of PAGES) {
  const existing = await payload.find({
    collection: 'pages',
    where: {
      and: [
        { tenant: { equals: tenantsBySlug[page.tenantSlug].id } },
        { slug: { equals: page.slug } },
      ],
    },
    depth: 0,
    limit: 1,
  })
  if (existing.docs[0]) {
    payload.logger.info(`Page ${page.slug} for ${page.tenantSlug} exists — skipping`)
    continue
  }
  await payload.create({
    collection: 'pages',
    data: {
      tenant: tenantsBySlug[page.tenantSlug].id,
      title: page.title,
      slug: page.slug,
      body: page.body,
      published: true,
    },
  })
  payload.logger.info(`Created page ${page.slug} for ${page.tenantSlug}`)
}

payload.logger.info('Seed complete.')
process.exit(0)
