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
import sharp from 'sharp'

import config from '@/payload.config'
import { planMembershipMigration } from '@/lib/characters/membershipMigration'
import { recordDocumentProvenance, latestDocumentRevisionId } from '@/lib/documents/provenance'

const TEST_USERS = [
  {
    email: 'admin@example.test',
    name: 'Morgan Vale',
    password: 'test-password-123',
    slVerificationState: 'unlinked' as const,
  },
  {
    email: 'officer@example.test',
    name: 'Alex Mercer',
    password: 'test-password-123',
    slVerificationState: 'unlinked' as const,
  },
]

const TEST_CHARACTERS: Array<{
  key: string
  name: string
  controlledBy?: string
  bio: string
}> = [
  {
    key: 'lucan',
    name: 'Lucan',
    controlledBy: 'admin@example.test',
    bio: 'A civic-minded resident used to verify multi-Character context.',
  },
  {
    key: 'elara',
    name: 'Elara',
    controlledBy: 'admin@example.test',
    bio: 'A second Character controlled by the same account.',
  },
  {
    key: 'alex-resident',
    name: 'Alex Mercer',
    controlledBy: 'officer@example.test',
    bio: 'A resident Character used for ordinary-member checks.',
  },
  {
    key: 'unknown-traveler',
    name: 'Unknown Traveler',
    bio: 'An unclaimed Character used for claim and local-context flows.',
  },
  { key: 'kael', name: 'Kael', bio: 'Warrior Commander fixture.' },
  { key: 'rarius', name: 'Rarius', bio: 'First Platoon Captain fixture.' },
  { key: 'tarl', name: 'Tarl', bio: 'Second Platoon Captain fixture.' },
  { key: 'varro', name: 'Varro', bio: 'Warrior fixture.' },
  { key: 'cassian', name: 'Cassian', bio: 'Warrior explicit-deny fixture.' },
  { key: 'livia', name: 'Livia', bio: 'Magistrate fixture.' },
  { key: 'aren', name: 'Aren', bio: 'Multi-Role Warrior and Magistrate fixture.' },
  { key: 'marlen', name: 'Marlen', bio: 'Head Scribe fixture.' },
  { key: 'sera', name: 'Sera', bio: 'Junior Scribe fixture.' },
  { key: 'dorian', name: 'Dorian', bio: 'Junior Scribe fixture.' },
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

// --- Ticket 06: simulated Second Life notecard import ---
const SL_NOTECARD = `# Patrol Contact Report

**Officer:** Alex Mercer  
**Date:** September 1, 2026  
**Location:** Ravenhurst Square

## Contact

Spoke with a resident regarding a noise complaint near the square. The resident agreed to lower the volume and no further action was required.

## Disposition

Closed without citation.`

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
// Port Victoria = modern flat teal mark. Source SVG strings are rasterized to
// PNG before storage so seeded media follows the same no-SVG contract as the
// Theme Studio upload action.
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
  { filename: 'ravenhurst-seal.png', alt: 'City of Ravenhurst civic seal', svg: RAVENHURST_SEAL_SVG, tenantSlug: 'ravenhurst', field: 'logo' },
  { filename: 'ravenhurst-banner.png', alt: 'City of Ravenhurst banner', svg: RAVENHURST_BANNER_SVG, tenantSlug: 'ravenhurst', field: 'banner' },
  { filename: 'port-victoria-seal.png', alt: 'Port Victoria civic mark', svg: PORT_VICTORIA_SEAL_SVG, tenantSlug: 'port-victoria', field: 'logo' },
  { filename: 'port-victoria-banner.png', alt: 'Port Victoria banner', svg: PORT_VICTORIA_BANNER_SVG, tenantSlug: 'port-victoria', field: 'banner' },
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
    if (!existing.docs[0].slVerificationState) {
      await payload.update({
        collection: 'users',
        id: existing.docs[0].id,
        data: { slVerificationState: 'unlinked' },
      })
      payload.logger.info(`Initialized Second Life placeholder for ${user.email}`)
    }
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

// --- Characters (Phase 2) ---
const charactersByKey: Record<string, { id: number }> = {}
for (const character of TEST_CHARACTERS) {
  const existing = await payload.find({
    collection: 'characters',
    where: { name: { equals: character.name } },
    depth: 0,
    limit: 1,
  })
  if (existing.docs[0]) {
    charactersByKey[character.key] = existing.docs[0]
    payload.logger.info(`Character ${character.name} already exists — skipping`)
    continue
  }
  const created = await payload.create({
    collection: 'characters',
    data: {
      name: character.name,
      bio: character.bio,
      controlledBy: character.controlledBy ? usersByEmail[character.controlledBy].id : null,
      status: 'active',
    },
  })
  charactersByKey[character.key] = created
  payload.logger.info(`Created Character ${character.name}`)
}

// --- Durable Community Domains (Phase 3) ---
// Keep the spike Tenants as migration input, but seed the canonical Domain
// records as well. Ar/Bayview are the stable institutional-structure fixtures.
const domainsBySlug: Record<string, { id: number; tenantId?: number }> = {}
const domainFixtures = [
  ...TENANTS.map((tenant) => ({ ...tenant, tenantId: tenantsBySlug[tenant.slug].id, ownerUser: usersByEmail['admin@example.test'].id })),
  {
    slug: 'ar', name: 'Ar', motto: 'Strength, Honor, Order', preset: 'heritage' as const,
    primaryColor: '#2B2430', secondaryColor: '#8D6E4A', accentColor: '#C6A15B', backgroundColor: '#F2ECE1',
    headingFontKey: 'georgia' as const, bodyFontKey: 'verdana' as const, ownerUser: usersByEmail['admin@example.test'].id,
  },
  {
    slug: 'bayview', name: 'Bayview', motto: 'Open, Capable, Connected', preset: 'modern' as const,
    primaryColor: '#164A63', secondaryColor: '#E9F1F4', accentColor: '#3DB6C6', backgroundColor: '#F8FBFC',
    headingFontKey: 'trebuchet' as const, bodyFontKey: 'verdana' as const, ownerUser: usersByEmail['admin@example.test'].id,
  },
]
for (const fixture of domainFixtures) {
  const existing = await payload.find({ collection: 'domains', where: { slug: { equals: fixture.slug } }, depth: 0, limit: 1 })
  const domain = existing.docs[0] ?? await payload.create({ collection: 'domains', data: { ...fixture, kind: 'community', lifecycle: 'active', defaultFilingPolicy: 'direct-file', publicEnabled: false } })
  if (!domain.defaultFilingPolicy) await payload.update({ collection: 'domains', id: domain.id, data: { defaultFilingPolicy: 'direct-file' } })
  domainsBySlug[fixture.slug] = { id: domain.id, tenantId: 'tenantId' in fixture ? fixture.tenantId : undefined }
  const admin = await payload.find({ collection: 'domain-admins', where: { and: [{ domain: { equals: domain.id } }, { user: { equals: fixture.ownerUser } }] }, depth: 0, limit: 1 })
  if (!admin.docs[0]) await payload.create({ collection: 'domain-admins', data: { domain: domain.id, user: fixture.ownerUser, status: 'active', addedBy: fixture.ownerUser } })
}

// --- Seed one active Plain Text Document Type per Domain (Phase 4) ---
const documentTypesByDomain: Record<string, { id: number }> = {}
for (const [slug, domain] of Object.entries(domainsBySlug)) {
  const existing = await payload.find({ collection: 'document-types', where: { and: [{ domain: { equals: domain.id } }, { name: { equals: 'Plain Text' } }] }, depth: 0, limit: 1 })
  const type = existing.docs[0] ?? await payload.create({ collection: 'document-types', data: { domain: domain.id, name: 'Plain Text', description: 'A freeform Markdown record.', active: true, defaultFilingPolicy: 'direct-file', templateFilingPolicy: 'inherit' } })
  documentTypesByDomain[slug] = { id: type.id }
}

// Backfill new required Document fields on the spike records while retaining
// their canonical Markdown bodies. Existing records are treated as Filed
// archive material; newly authored records begin as Draft.
const existingDocuments = await payload.find({ collection: 'documents', depth: 0, limit: 5000 })
for (const document of existingDocuments.docs) {
  const domainId = typeof document.domain === 'object' ? document.domain?.id : document.domain
  const domainEntry = Object.entries(domainsBySlug).find(([, value]) => Number(value.id) === Number(domainId))
  const typeId = domainEntry ? documentTypesByDomain[domainEntry[0]]?.id : null
  if (!typeId) continue
  const sourceKind = document.origin === 'markdown-import' ? 'markdown-import' : document.origin === 'form' ? 'form' : 'web'
  await payload.update({ collection: 'documents', id: document.id, data: { documentType: document.documentType ?? typeId, sourceKind: document.sourceKind ?? sourceKind, lifecycle: document.lifecycle ?? 'filed', publicAccess: document.publicAccess ?? 'inherit' }, depth: 0, context: { interimWorkflowAuthorized: true } })
}
const existingFolders = await payload.find({ collection: 'folders', depth: 0, limit: 5000 })
for (const folder of existingFolders.docs) if (!folder.filingPolicy) await payload.update({ collection: 'folders', id: folder.id, data: { filingPolicy: 'inherit' }, depth: 0 })

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
    const png = await sharp(Buffer.from(asset.svg, 'utf8'), {
      failOn: 'error',
      limitInputPixels: 4096 * 4096,
    })
      .png()
      .toBuffer()
    const created = await payload.create({
      collection: 'media',
      data: { alt: asset.alt },
      file: {
        data: png,
        mimetype: 'image/png',
        name: asset.filename,
        size: png.length,
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

// --- Character Domain memberships (Phase 2) ---
// Keep the legacy User Membership rows as a restartable migration source until
// P03 consumes/removes them. Explicit fixture mappings resolve Morgan's two
// Characters without fanning one User membership out to both Characters.
const relationId = (value: unknown): number =>
  typeof value === 'object' && value !== null && 'id' in value
    ? Number((value as { id: number | string }).id)
    : Number(value)
const legacyMembershipDocs = await payload.find({
  collection: 'memberships',
  depth: 0,
  limit: 200,
})
const legacyMembershipRows = legacyMembershipDocs.docs.map((row) => ({
  id: row.id,
  userId: relationId(row.user),
  tenantId: relationId(row.tenant),
  role: row.role,
}))
const controlledCharacterIds = new Map<string, Array<number | string>>([
  [String(usersByEmail['admin@example.test'].id), [charactersByKey.lucan.id, charactersByKey.elara.id]],
  [String(usersByEmail['officer@example.test'].id), [charactersByKey['alex-resident'].id]],
])
const explicitMembershipMappings = [
  {
    userId: usersByEmail['admin@example.test'].id,
    tenantId: tenantsBySlug.ravenhurst.id,
    characterId: charactersByKey.lucan.id,
    reason: 'Fixture owner mapping for multi-Character User.',
  },
  {
    userId: usersByEmail['admin@example.test'].id,
    tenantId: tenantsBySlug['port-victoria'].id,
    characterId: charactersByKey.lucan.id,
    reason: 'Fixture owner mapping for multi-Character User.',
  },
]
const migration = planMembershipMigration(legacyMembershipRows, controlledCharacterIds, explicitMembershipMappings)
for (const row of migration.mapped) {
  const existing = await payload.find({
    collection: 'domain-memberships',
    where: {
      and: [{ tenant: { equals: row.tenantId } }, { character: { equals: row.characterId } }],
    },
    depth: 0,
    limit: 1,
  })
  if (existing.docs[0]) continue
  await payload.create({
    collection: 'domain-memberships',
    data: {
      tenant: Number(row.tenantId),
      character: Number(row.characterId),
      status: 'active',
      addedBy: Number(row.userId),
      note: `Migrated from legacy Membership ${row.id}: ${row.reason}`,
    },
  })
}
// Explicit fixture-only membership proves that two Characters controlled by
// one User can differ while Lucan participates in both Domains.
const fixtureCharacterMemberships = [
  { tenantId: tenantsBySlug.ravenhurst.id, characterId: charactersByKey.elara.id, addedBy: usersByEmail['admin@example.test'].id },
]
for (const membership of fixtureCharacterMemberships) {
  const existing = await payload.find({
    collection: 'domain-memberships',
    where: {
      and: [{ tenant: { equals: membership.tenantId } }, { character: { equals: membership.characterId } }],
    },
    depth: 0,
    limit: 1,
  })
  if (!existing.docs[0]) {
    await payload.create({
      collection: 'domain-memberships',
      data: {
        tenant: membership.tenantId,
        character: membership.characterId,
        status: 'active',
        addedBy: membership.addedBy,
        note: 'Phase 2 multi-Character fixture membership.',
      },
    })
  }
}
payload.logger.info(
  `Character membership migration mapped ${migration.mapped.length} legacy rows; unresolved ${migration.unresolved.length}; accounted ${migration.accountedRowIds.length}`,
)

// --- Subdomains and Character memberships (Phase 3) ---
const subdomainFixtures = [
  { domainSlug: 'ar', slug: 'scribes', name: 'Scribes', description: 'Records, deeds, and historical archives.' },
  { domainSlug: 'ar', slug: 'warriors', name: 'Warriors', description: 'Command, patrol, and battle records.' },
  { domainSlug: 'ar', slug: 'magistrates', name: 'Magistrates', description: 'Courts, rulings, and civic judgment.' },
]
const subdomainsByKey: Record<string, { id: number }> = {}
for (const fixture of subdomainFixtures) {
  const domain = domainsBySlug[fixture.domainSlug]
  const existing = await payload.find({ collection: 'subdomains', where: { and: [{ domain: { equals: domain.id } }, { slug: { equals: fixture.slug } }] }, depth: 0, limit: 1 })
  const subdomain = existing.docs[0] ?? await payload.create({ collection: 'subdomains', data: { domain: domain.id, slug: fixture.slug, name: fixture.name, description: fixture.description, publicListing: true } })
  subdomainsByKey[`${fixture.domainSlug}:${fixture.slug}`] = { id: subdomain.id }
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
        domain: domainsBySlug[tenantSlug].id,
        tenant: tenantsBySlug[tenantSlug].id,
        name: file.name,
        parent: file.parentPath ? (folderIds[tenantSlug][file.parentPath] ?? null) : null,
        filingPolicy: 'inherit',
        publicAccess: 'inherit',
      },
    })
    folderIds[tenantSlug][file.path] = created.id
    payload.logger.info(`Created folder ${tenantSlug}/${file.path}`)
  }
}

// --- System-managed Domain roots and institutional Ar folder tree (Phase 3) ---
const rootFolderIds: Record<string, number> = {}
for (const [domainSlug, domainRef] of Object.entries(domainsBySlug)) {
  const existingRoot = await payload.find({ collection: 'folders', where: { and: [{ domain: { equals: domainRef.id } }, { systemManaged: { equals: true } }, { parent: { equals: null } }] }, depth: 0, limit: 1 })
  const root = existingRoot.docs[0] ?? await payload.create({ collection: 'folders', draft: false, data: { domain: domainRef.id, tenant: domainRef.tenantId ?? null, name: 'Domain Root', parent: null, systemManaged: true, filingPolicy: 'inherit', publicAccess: 'inherit' } })
  rootFolderIds[domainSlug] = root.id
  const topLevel = await payload.find({ collection: 'folders', where: { and: [{ domain: { equals: domainRef.id } }, { parent: { equals: null } }] }, depth: 0, limit: 500 })
  for (const folder of topLevel.docs) {
    if (folder.id !== root.id && !folder.systemManaged) await payload.update({ collection: 'folders', id: folder.id, data: { parent: root.id } })
  }
  const rootDocs = await payload.find({ collection: 'documents', where: { and: [{ domain: { equals: domainRef.id } }, { folder: { equals: null } }] }, depth: 0, limit: 500 })
  for (const document of rootDocs.docs) await payload.update({ collection: 'documents', id: document.id, data: { folder: root.id } })
}

const arFolderFixtures = [
  { path: 'scribes', name: 'Scribes', parent: null, subdomain: 'scribes' },
  { path: 'scribes/property-records', name: 'Property Records', parent: 'scribes', subdomain: 'scribes' },
  { path: 'scribes/property-records/deeds', name: 'Deeds', parent: 'scribes/property-records', subdomain: 'scribes' },
  { path: 'scribes/historical-records', name: 'Historical Records', parent: 'scribes', subdomain: 'scribes' },
  { path: 'warriors', name: 'Warriors', parent: null, subdomain: 'warriors' },
  { path: 'warriors/incident-reports', name: 'Incident Reports', parent: 'warriors', subdomain: 'warriors' },
  { path: 'warriors/first-platoon', name: 'First Platoon', parent: 'warriors', subdomain: 'warriors' },
  { path: 'warriors/first-platoon/battle-plans', name: 'Battle Plans', parent: 'warriors/first-platoon', subdomain: 'warriors' },
  { path: 'warriors/second-platoon', name: 'Second Platoon', parent: 'warriors', subdomain: 'warriors' },
  { path: 'warriors/second-platoon/battle-plans', name: 'Battle Plans', parent: 'warriors/second-platoon', subdomain: 'warriors' },
  { path: 'warriors/internal-affairs', name: 'Internal Affairs', parent: 'warriors', subdomain: 'warriors' },
  { path: 'magistrates', name: 'Magistrates', parent: null, subdomain: 'magistrates' },
  { path: 'magistrates/court-cases', name: 'Court Cases', parent: 'magistrates', subdomain: 'magistrates' },
  { path: 'magistrates/rulings', name: 'Rulings', parent: 'magistrates', subdomain: 'magistrates' },
]
const arFolderIds: Record<string, number> = {}
for (const fixture of arFolderFixtures) {
  const parentId = fixture.parent ? arFolderIds[fixture.parent] : rootFolderIds.ar
  const subdomain = subdomainsByKey[`ar:${fixture.subdomain}`]
  const existing = await payload.find({ collection: 'folders', where: { and: [{ domain: { equals: domainsBySlug.ar.id } }, { name: { equals: fixture.name } }, { parent: { equals: parentId } }] }, depth: 0, limit: 1 })
  const folder = existing.docs[0] ?? await payload.create({ collection: 'folders', draft: false, data: { domain: domainsBySlug.ar.id, tenant: domainsBySlug.ar.tenantId ?? null, name: fixture.name, parent: parentId, subdomain: subdomain?.id ?? null, systemManaged: false, filingPolicy: 'inherit', publicAccess: 'inherit' } })
  arFolderIds[fixture.path] = folder.id
}

// --- Institutional Role hierarchy and scoped assignments (Phase 3) ---
const arDomain = domainsBySlug.ar
const arSubdomainId = (slug: string) => subdomainsByKey[`ar:${slug}`]?.id
// Keep the document-authoring gate executable: the seeded admin controls two
// Characters that are active Ar members, so the Acting as selector can be
// used for Prepared by without granting institutional Roles to the test user.
for (const characterId of [charactersByKey.lucan.id, charactersByKey.elara.id]) {
  const existing = await payload.find({ collection: 'domain-memberships', where: { and: [{ domain: { equals: arDomain.id } }, { character: { equals: characterId } }] }, depth: 0, limit: 1 })
  if (!existing.docs[0]) await payload.create({ collection: 'domain-memberships', data: { domain: arDomain.id, character: characterId, status: 'active', addedBy: usersByEmail['admin@example.test'].id, note: 'Phase 5 document-authoring fixture membership.' } })
}
const roleFixtures = [
  { key: 'head-scribe', name: 'Head Scribe', subdomain: 'scribes', parent: null },
  { key: 'assistant-head-scribe', name: 'Assistant Head Scribe', subdomain: 'scribes', parent: 'head-scribe' },
  { key: 'property-records-clerk', name: 'Property Records Clerk', subdomain: 'scribes', parent: 'assistant-head-scribe' },
  { key: 'historical-records-clerk', name: 'Historical Records Clerk', subdomain: 'scribes', parent: 'assistant-head-scribe' },
  { key: 'commander', name: 'Commander', subdomain: 'warriors', parent: null },
  { key: 'first-captain', name: 'First Captain', subdomain: 'warriors', parent: 'commander' },
  { key: 'second-captain', name: 'Second Captain', subdomain: 'warriors', parent: 'commander' },
  { key: 'warrior', name: 'Warrior', subdomain: 'warriors', parent: 'commander' },
  { key: 'chief-magistrate', name: 'Chief Magistrate', subdomain: 'magistrates', parent: null },
  { key: 'magistrate', name: 'Magistrate', subdomain: 'magistrates', parent: 'chief-magistrate' },
  { key: 'clerk', name: 'Clerk', subdomain: 'magistrates', parent: 'chief-magistrate' },
]
const rolesByKey: Record<string, { id: number }> = {}
for (const fixture of roleFixtures) {
  const existing = await payload.find({ collection: 'roles', where: { and: [{ domain: { equals: arDomain.id } }, { name: { equals: fixture.name } }] }, depth: 0, limit: 1 })
  const role = existing.docs[0] ?? await payload.create({ collection: 'roles', data: { domain: arDomain.id, subdomain: arSubdomainId(fixture.subdomain) ?? null, name: fixture.name, parentRole: fixture.parent ? rolesByKey[fixture.parent].id : null, active: true, system: false } })
  rolesByKey[fixture.key] = { id: role.id }
}
const roleAssignments = [
  { character: 'kael', role: 'commander' },
  { character: 'rarius', role: 'first-captain' },
  { character: 'tarl', role: 'second-captain' },
  { character: 'varro', role: 'warrior' },
  { character: 'cassian', role: 'warrior' },
  { character: 'livia', role: 'magistrate' },
  { character: 'aren', role: 'warrior' },
  { character: 'aren', role: 'magistrate' },
  { character: 'marlen', role: 'head-scribe' },
  { character: 'sera', role: 'property-records-clerk' },
  { character: 'dorian', role: 'historical-records-clerk' },
]
for (const assignment of roleAssignments) {
  const character = charactersByKey[assignment.character]
  const role = rolesByKey[assignment.role]
  if (!character || !role) continue
  const member = await payload.find({ collection: 'domain-memberships', where: { and: [{ domain: { equals: arDomain.id } }, { character: { equals: character.id } }] }, depth: 0, limit: 1 })
  if (!member.docs[0]) await payload.create({ collection: 'domain-memberships', data: { domain: arDomain.id, character: character.id, status: 'active', addedBy: usersByEmail['admin@example.test'].id, note: 'Phase 3 Role fixture membership.' } })
  const existing = await payload.find({ collection: 'role-assignments', where: { and: [{ character: { equals: character.id } }, { role: { equals: role.id } }] }, depth: 0, limit: 1 })
  if (!existing.docs[0]) await payload.create({ collection: 'role-assignments', data: { character: character.id, role: role.id, status: 'active', assignedBy: usersByEmail['admin@example.test'].id } })
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
    context: { allowSystemCreate: true },
    data: {
      domain: domainsBySlug[tenant.slug].id,
      tenant: tenantsBySlug[tenant.slug].id,
      title: 'Incident Report 2026-014',
      body: SHARED_INCIDENT_REPORT,
      origin: 'web-editor',
      sourceKind: 'web',
      documentType: documentTypesByDomain[tenant.slug].id,
      lifecycle: 'filed',
      publicAccess: 'inherit',
      createdBy: usersByEmail['officer@example.test'].id,
      folder: folderId ?? rootFolderIds[tenant.slug] ?? null,
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
      context: { allowSystemCreate: true },
      data: {
        domain: domainsBySlug.ravenhurst.id,
        tenant: stressTenant.id,
        title: 'City Council Meeting Notes',
        body: EDITOR_STRESS_DOC,
        origin: 'web-editor',
        sourceKind: 'web',
        documentType: documentTypesByDomain.ravenhurst.id,
        lifecycle: 'draft',
        publicAccess: 'inherit',
        createdBy: usersByEmail['admin@example.test'].id,
        folder: rootFolderIds.ravenhurst,
      },
    })
    payload.logger.info('Created editor stress document')
  }
}

// --- Simulated SL notecard import fixture (Ticket 06, Ravenhurst) ---
const importTenant = tenantsBySlug['ravenhurst']
const importFolder = folderIds['ravenhurst']?.['city-records/police/reports'] ?? null
if (importTenant) {
  const existing = await payload.find({
    collection: 'documents',
    where: {
      and: [{ tenant: { equals: importTenant.id } }, { title: { equals: 'Patrol Contact Report' } }],
    },
    depth: 0,
    limit: 1,
  })
  if (existing.docs[0]) {
    payload.logger.info('Imported notecard document exists — skipping')
  } else {
    await payload.create({
      collection: 'documents',
      context: { allowSystemCreate: true },
      data: {
        domain: domainsBySlug.ravenhurst.id,
        tenant: importTenant.id,
        title: 'Patrol Contact Report',
        body: SL_NOTECARD,
        origin: 'markdown-import',
        sourceKind: 'markdown-import',
        documentType: documentTypesByDomain.ravenhurst.id,
        lifecycle: 'filed',
        publicAccess: 'inherit',
        createdBy: usersByEmail['officer@example.test'].id,
        folder: importFolder,
      },
    })
    payload.logger.info('Created imported notecard document')
  }
}

// --- Fixture structured report form (Ticket 07, fixture §7) ---
const formTenant = tenantsBySlug['ravenhurst']
const formFolder = folderIds['ravenhurst']?.['city-records/police/reports'] ?? null
const INCIDENT_REPORT_TEMPLATE = [
  '# {{incident_type}} Report',
  '',
  '**Date:** {{incident_date}}  ',
  '**Reporting Officer:** {{officer_name}}  ',
  '**Location:** {{location}}',
  '',
  '## Persons Involved',
  '',
  '{{persons_involved}}',
  '',
  '## Narrative',
  '',
  '{{narrative}}',
  '',
  '## Follow-up Required',
  '',
  '{{follow_up_required}}',
].join('\n')
if (formTenant) {
  const existingForm = await payload.find({
    collection: 'forms',
    where: {
      and: [{ tenant: { equals: formTenant.id } }, { title: { equals: 'Incident Report' } }],
    },
    depth: 0,
    limit: 1,
  })
  if (existingForm.docs[0]) {
    payload.logger.info('Fixture Incident Report form exists — skipping')
  } else {
    await payload.create({
      collection: 'forms',
      data: {
        tenant: formTenant.id,
        folder: formFolder,
        title: 'Incident Report',
        confirmationType: 'message',
        confirmationMessage: {
          root: {
            type: 'root',
            format: '',
            indent: 0,
            version: 1,
            direction: 'ltr',
            children: [
              {
                type: 'paragraph',
                format: '',
                indent: 0,
                version: 1,
                direction: 'ltr',
                textFormat: 0,
                textStyle: '',
                children: [
                  {
                    type: 'text',
                    format: 0,
                    detail: 0,
                    mode: 'normal',
                    style: '',
                    text: 'Your report has been filed in the archive.',
                    version: 1,
                  },
                ],
              },
            ],
          },
        },
        archive: {
          titleTemplate: '{{incident_type}} Report - {{incident_date}}',
          markdownTemplate: INCIDENT_REPORT_TEMPLATE,
        },
        fields: [
          { blockType: 'date', name: 'incident_date', label: 'Incident Date', required: true },
          { blockType: 'text', name: 'officer_name', label: 'Reporting Officer', required: true },
          { blockType: 'text', name: 'location', label: 'Location', required: true },
          {
            blockType: 'select',
            name: 'incident_type',
            label: 'Incident Type',
            required: true,
            options: [
              { label: 'Property Damage', value: 'Property Damage' },
              { label: 'Disturbance', value: 'Disturbance' },
              { label: 'Traffic Stop', value: 'Traffic Stop' },
              { label: 'Medical Assist', value: 'Medical Assist' },
              { label: 'Other', value: 'Other' },
            ],
          },
          { blockType: 'textarea', name: 'persons_involved', label: 'Persons Involved' },
          { blockType: 'textarea', name: 'narrative', label: 'Narrative', required: true },
          { blockType: 'checkbox', name: 'follow_up_required', label: 'Follow-up Required' },
        ],
      } as never,
    })
    payload.logger.info('Created fixture Incident Report form')
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

// --- Provenance backfill (Phase 4) ---
// Existing fixture records predate the event stream. Create one idempotent
// origin event for each Domain document so history is complete without
// rewriting Markdown or inventing an actor for later changes.
const provenanceDocuments = await payload.find({ collection: 'documents', depth: 0, limit: 5000 })
for (const document of provenanceDocuments.docs) {
  const domainId = typeof document.domain === 'object' ? document.domain?.id : document.domain
  if (!domainId) continue
  const existingEvent = await payload.find({ collection: 'document-provenance-events', where: { and: [{ domain: { equals: domainId } }, { document: { equals: document.id } }, { eventType: { equals: 'created' } }] }, depth: 0, limit: 1, overrideAccess: true })
  if (existingEvent.docs[0]) continue
  const createdBy = typeof document.createdBy === 'object' ? document.createdBy?.id : document.createdBy
  await recordDocumentProvenance({ payload, domainId, documentId: document.id, eventType: 'created', actorUserId: createdBy, context: { backfill: true, sourceKind: document.sourceKind }, revisionId: await latestDocumentRevisionId(payload, document.id), sourceDescriptor: 'phase-4-seed-backfill' })
}

payload.logger.info('Seed complete.')
process.exit(0)
