import type { DomainShellModel } from '@/lib/page-models/shell'
import type { HomePageModel } from '@/lib/page-models/home'
import type { RecordsPageModel } from '@/lib/page-models/records'
import type { DocumentPageModel } from '@/lib/page-models/document'
import type { AboutPageModel, LorePageModel } from '@/lib/page-models/info'
import type { DepartmentPageModel, DepartmentsPageModel } from '@/lib/page-models/departments'
import type { NavigationItem } from '@/lib/page-models/common'

/** Deterministic, safe, representative fixtures for the Theme Studio preview. No DB query. */
const PREVIEW_BASE = '/domain/preview-domain'
const PREVIEW_DESTINATIONS: NavigationItem[] = [
  { label: 'About', segment: 'about', href: `${PREVIEW_BASE}/about` },
  { label: 'Lore', segment: 'lore', href: `${PREVIEW_BASE}/lore` },
  { label: 'Departments', segment: 'departments', href: `${PREVIEW_BASE}/departments` },
  { label: 'Records', segment: 'records', href: `${PREVIEW_BASE}/records` },
]

export const SHELL_PREVIEW_MODEL: DomainShellModel = {
  domain: {
    id: 0,
    slug: 'preview-domain',
    name: 'Preview Domain',
    motto: 'A world worth remembering',
    logoUrl: null,
    bannerUrl: null,
    backgroundUrl: null,
  },
  primaryNavigation: [
    { label: 'Home', segment: '', href: PREVIEW_BASE },
    ...PREVIEW_DESTINATIONS,
  ],
  managementNavigation: [
    { label: 'People', segment: 'manage/people', href: `${PREVIEW_BASE}/manage/people` },
    { label: 'Roles', segment: 'roles', href: `${PREVIEW_BASE}/roles` },
    { label: 'Folders', segment: 'manage/folders', href: `${PREVIEW_BASE}/manage/folders` },
    { label: 'Departments', segment: 'manage/departments', href: `${PREVIEW_BASE}/manage/departments` },
    { label: 'Document Types', segment: 'document-types', href: `${PREVIEW_BASE}/document-types` },
    { label: 'Customize', segment: 'customize', href: `${PREVIEW_BASE}/customize` },
  ],
  operatingContext: {
    platformLabel: 'Loreforge',
    availableDomains: [],
    activeDomainId: 0,
    availableCharacters: [],
    activeCharacterId: null,
    account: null,
  },
  routes: { baseUrl: PREVIEW_BASE, workUrl: `${PREVIEW_BASE}/work` },
}

export const HOME_PREVIEW_MODEL: HomePageModel = {
  baseUrl: PREVIEW_BASE,
  domain: { name: 'Preview Domain', motto: 'A world worth remembering' },
  welcome: { html: '<p>A preview Domain, assembled purely for the customization experience.</p>', editHref: `${PREVIEW_BASE}/pages/home/edit` },
  destinations: PREVIEW_DESTINATIONS,
  recentRecords: [
    { id: '1', title: 'Incident Report 2026-014', type: 'Report', activity: 'filed · Sep 1, 2026' },
    { id: '2', title: 'Trade Ledger, Folio 9', type: 'Ledger', activity: 'updated · Aug 28, 2026' },
    { id: '3', title: 'Commission Charter', type: 'Charter', activity: 'filed · Aug 20, 2026' },
  ],
}

export const RECORDS_PREVIEW_MODEL: RecordsPageModel = {
  baseUrl: PREVIEW_BASE,
  domainSlug: 'preview-domain',
  folders: [],
  totalReadableRecordCount: 3,
  records: HOME_PREVIEW_MODEL.recentRecords.map((record, index) => ({
    id: index + 1,
    title: record.title,
    folderId: null,
    documentTypeId: null,
    updatedAt: '2026-09-01T00:00:00.000Z',
    preparedBy: 'Elias Vane',
    lifecycle: 'filed',
    locked: false,
    capabilities: { read: true, edit: true, supersede: true, delete: false },
  })),
  documentTypes: [{ id: 1, name: 'Report' }, { id: 2, name: 'Ledger' }, { id: 3, name: 'Charter' }],
  supersessionEdges: [],
  query: { folderId: null, search: '' },
  capabilities: { manageFolders: true, actOnRecords: true, deleteRecords: false },
  vocabulary: { documentSingular: 'Record', documentPlural: 'Records', folderPlural: 'Folders' },
}

export const DOCUMENT_PREVIEW_MODEL: DocumentPageModel = {
  baseUrl: PREVIEW_BASE,
  domainSlug: 'preview-domain',
  recordId: 1,
  title: 'Incident Report 2026-014',
  bodyHtml: '<p>The clerk ruled a fresh line and copied the incident as spoken.</p><blockquote>Order was restored by sundown.</blockquote>',
  bodySource: null,
  meta: [
    { label: 'Prepared by', value: 'Elias Vane' },
    { label: 'Date', value: 'September 1, 2026' },
  ],
  lifecycle: 'filed',
  locked: false,
  isSuperseded: false,
  supersession: { supersededBy: null, supersedes: null },
  concerns: [],
  tags: ['incident', 'ledger'],
  preparedByLabel: 'Elias Vane',
  capabilities: { edit: true, submit: false, file: false, approve: false, restore: false, deprecate: true, lock: true, unlock: false, delete: false, supersede: true },
  routes: { editUrl: `${PREVIEW_BASE}/documents/1/edit`, historyUrl: `${PREVIEW_BASE}/documents/1/history`, supersedeUrl: `${PREVIEW_BASE}/records/new?supersedes=1` },
  statusMessage: null,
}

// ---------------------------------------------------------------------------
// Conformance fixtures (P08D-T00). These deliberately exercise every Records
// and Document contract surface so the shared assertion helpers can prove a
// Design's capability reachability — not just that it mounts.
// ---------------------------------------------------------------------------

/**
 * Full-featured Records fixture: root + nested + system folders, editable,
 * non-editable, supersedable, and deletable records, a supersession pair,
 * several Document Types, and every capability flag raised.
 */
export const RECORDS_CONFORMANCE_MODEL: RecordsPageModel = {
  baseUrl: PREVIEW_BASE,
  domainSlug: 'preview-domain',
  folders: [
    {
      id: 1,
      name: 'Civic Affairs',
      systemManaged: false,
      readableRecordCount: 4,
      children: [
        { id: 2, name: 'Commissions', systemManaged: false, readableRecordCount: 1, children: [] },
      ],
    },
    { id: 3, name: 'System Vault', systemManaged: true, readableRecordCount: 0, children: [] },
  ],
  totalReadableRecordCount: 5,
  records: [
    { id: 10, title: 'Editable Draft Charter', folderId: 1, documentTypeId: 1, updatedAt: '2026-09-01T00:00:00.000Z', preparedBy: 'Elias Vane', lifecycle: 'draft', locked: false, capabilities: { read: true, edit: true, supersede: false, delete: false } },
    { id: 11, title: 'Filed Read-Only Resolution', folderId: 1, documentTypeId: 3, updatedAt: '2026-08-20T00:00:00.000Z', preparedBy: 'Mira Sable', lifecycle: 'filed', locked: false, capabilities: { read: true, edit: false, supersede: false, delete: false } },
    { id: 12, title: 'Ordinance 2026-101', folderId: 2, documentTypeId: 2, updatedAt: '2026-08-01T00:00:00.000Z', preparedBy: 'Elias Vane', lifecycle: 'filed', locked: false, capabilities: { read: true, edit: false, supersede: false, delete: false } },
    { id: 13, title: 'Ordinance 2026-102', folderId: 2, documentTypeId: 2, updatedAt: '2026-09-02T00:00:00.000Z', preparedBy: 'Elias Vane', lifecycle: 'filed', locked: false, capabilities: { read: true, edit: true, supersede: true, delete: false } },
    { id: 14, title: 'Scrap Note', folderId: 3, documentTypeId: null, updatedAt: '2026-07-15T00:00:00.000Z', preparedBy: null, lifecycle: 'draft', locked: false, capabilities: { read: true, edit: false, supersede: false, delete: true } },
  ],
  documentTypes: [
    { id: 1, name: 'Charter' },
    { id: 2, name: 'Ordinance' },
    { id: 3, name: 'Resolution' },
  ],
  supersessionEdges: [{ newerId: 13, olderId: 12 }],
  query: { folderId: null, search: '' },
  capabilities: { manageFolders: true, actOnRecords: true, deleteRecords: true },
  vocabulary: { documentSingular: 'Record', documentPlural: 'Records', folderPlural: 'Folders' },
}

/** Records fixture with zero readable records, for empty-state conformance. */
export const EMPTY_RECORDS_CONFORMANCE_MODEL: RecordsPageModel = {
  ...RECORDS_CONFORMANCE_MODEL,
  folders: [],
  totalReadableRecordCount: 0,
  records: [],
  supersessionEdges: [],
}

const DOCUMENT_HTML = '<p>The clerk ruled a fresh line and copied the incident as spoken.</p>'
const DOCUMENT_SOURCE = '# Conformance Record\n\nThe clerk ruled a fresh line and copied the incident as spoken.'

/**
 * Document fixture factory. Start from the Filed state with every lifecycle
 * capability that Filed permits; override per lifecycle state.
 */
export function documentFixture(overrides: Partial<DocumentPageModel> = {}): DocumentPageModel {
  return {
    baseUrl: PREVIEW_BASE,
    domainSlug: 'preview-domain',
    recordId: 1,
    title: 'Conformance Record',
    bodyHtml: DOCUMENT_HTML,
    bodySource: null,
    meta: [
      { label: 'Prepared by', value: 'Elias Vane' },
      { label: 'Date', value: 'September 1, 2026' },
    ],
    lifecycle: 'filed',
    locked: false,
    isSuperseded: false,
    supersession: { supersededBy: null, supersedes: null },
    concerns: [{ name: 'Harbor Commission' }],
    tags: ['conformance'],
    preparedByLabel: 'Elias Vane',
    capabilities: { edit: true, submit: false, file: false, approve: false, restore: false, deprecate: true, lock: true, unlock: false, delete: true, supersede: true },
    routes: {
      editUrl: `${PREVIEW_BASE}/documents/1/edit`,
      historyUrl: `${PREVIEW_BASE}/documents/1/history`,
      supersedeUrl: `${PREVIEW_BASE}/records/new?supersedes=1`,
    },
    statusMessage: null,
    ...overrides,
  }
}

/** Draft: editable, submittable, fileable, lockable. */
export const DRAFT_DOCUMENT_MODEL = documentFixture({
  lifecycle: 'draft',
  capabilities: { edit: true, submit: true, file: true, approve: false, restore: false, deprecate: false, lock: true, unlock: false, delete: true, supersede: false },
})

/** Submitted: awaiting approval; no longer editable. */
export const SUBMITTED_DOCUMENT_MODEL = documentFixture({
  lifecycle: 'submitted',
  capabilities: { edit: false, submit: false, file: false, approve: true, restore: false, deprecate: false, lock: false, unlock: false, delete: false, supersede: false },
})

/** Filed: deprecatable, lockable, supersedable, deletable. */
export const FILED_DOCUMENT_MODEL = documentFixture({})

/** Deprecated: restorable, supersedable. */
export const DEPRECATED_DOCUMENT_MODEL = documentFixture({
  lifecycle: 'deprecated',
  capabilities: { edit: false, submit: false, file: false, approve: false, restore: true, deprecate: false, lock: false, unlock: false, delete: false, supersede: true },
})

/** Locked: unlockable, otherwise read-only. */
export const LOCKED_DOCUMENT_MODEL = documentFixture({
  locked: true,
  capabilities: { edit: false, submit: false, file: false, approve: false, restore: false, deprecate: false, lock: false, unlock: true, delete: false, supersede: false },
})

/** Superseded: read-only, carries the successor link, no creation actions. */
export const SUPERSEDED_DOCUMENT_MODEL = documentFixture({
  isSuperseded: true,
  supersession: {
    supersededBy: { id: 2, title: 'Ordinance 2026-102', createdLabel: 'September 2, 2026', preparedByLabel: 'Elias Vane' },
    supersedes: null,
  },
  capabilities: { edit: false, submit: false, file: false, approve: false, restore: false, deprecate: false, lock: false, unlock: false, delete: false, supersede: false },
})

/** Filed record carrying a predecessor: shows the Supersedes link. */
export const SUCCESSOR_DOCUMENT_MODEL = documentFixture({
  title: 'Ordinance 2026-102',
  supersession: {
    supersededBy: null,
    supersedes: { id: 12, title: 'Ordinance 2026-101' },
  },
})

/** Raw source is viewable; body rendering is replaced by the source view. */
export const SOURCE_DOCUMENT_MODEL = documentFixture({
  bodySource: DOCUMENT_SOURCE,
})

/** A status/error message surfaced by the route after a failed action. */
export const STATUS_DOCUMENT_MODEL = documentFixture({
  statusMessage: { code: 'conformance', text: 'Retry your change.' },
})

// ---------------------------------------------------------------------------
// Thin-page fixtures (P08D-T00) — Departments / Department / About / Lore.
// ---------------------------------------------------------------------------

export const DEPARTMENTS_PREVIEW_MODEL: DepartmentsPageModel = {
  baseUrl: PREVIEW_BASE,
  domainSlug: 'preview-domain',
  domainName: 'Preview Domain',
  departments: [
    { id: 1, name: 'Harbor Commission', slug: 'harbor-commission', description: 'Oversees the docks and ship registries.', memberCount: 4 },
    { id: 2, name: 'Census Office', slug: 'census-office', description: null, memberCount: 2 },
  ],
  manageHref: `${PREVIEW_BASE}/manage/people`,
  vocabulary: { subdomainSingular: 'Department', subdomainPlural: 'Departments' },
}

export const DEPARTMENT_PREVIEW_MODEL: DepartmentPageModel = {
  baseUrl: PREVIEW_BASE,
  domainSlug: 'preview-domain',
  name: 'Harbor Commission',
  description: 'Oversees the docks and ship registries.',
  members: [
    { id: 1, name: 'Elias Vane' },
    { id: 2, name: 'Mira Sable' },
  ],
  folderNames: ['Dock Ledgers', 'Ship Registries'],
  manageHref: `${PREVIEW_BASE}/manage/people`,
  vocabulary: { subdomainSingular: 'Department', subdomainPlural: 'Departments', folderPlural: 'Folders', memberPlural: 'Participants' },
  destinations: [],
}

export const ABOUT_PREVIEW_MODEL: AboutPageModel = {
  baseUrl: PREVIEW_BASE,
  bodyHtml: '<p>Preview Domain was founded to keep a true record of the port.</p>',
  editHref: `${PREVIEW_BASE}/pages/about/edit`,
  destinations: [],
}

export const LORE_PREVIEW_MODEL: LorePageModel = {
  baseUrl: PREVIEW_BASE,
  destinations: [],
}