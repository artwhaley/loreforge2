import type { DomainShellModel } from '@/lib/page-models/shell'
import type { HomePageModel } from '@/lib/page-models/home'
import type { RecordsPageModel } from '@/lib/page-models/records'
import type { DocumentPageModel } from '@/lib/page-models/document'
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