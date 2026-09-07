import assert from 'node:assert/strict'

import type { DepartmentPageModel, DepartmentsPageModel } from '@/lib/page-models/departments'
import type { DocumentPageModel } from '@/lib/page-models/document'
import type { AboutPageModel, LorePageModel } from '@/lib/page-models/info'
import type { RecordsPageModel } from '@/lib/page-models/records'
import type { DomainShellModel } from '@/lib/page-models/shell'

/**
 * P08D-T00 shared semantic conformance helpers.
 *
 * These assert *capability reachability and representation* from a rendered
 * Design's DOM — never pixel layout and never implementation-specific class
 * selectors. Every first-class Design must eventually pass the same helpers
 * with the same fixtures; today's gaps are declared per-Design through the
 * `omit`/`future` lists so T06/T07 can prove equal capabilities with
 * different DOM by shrinking those lists.
 *
 * Shared behavior (search debounce, cursor pagination, supersession
 * derivation) is deliberately NOT re-asserted here: it is proven once at the
 * shared layer (useRecordsWorkspace / supersession suites) per guardrail G10.
 */

// ---------------------------------------------------------------------------
// Records capabilities
// ---------------------------------------------------------------------------

export type RecordsCapability =
  | 'folderNavigation'
  | 'nestedTraversal'
  | 'search'
  | 'searchSubfolders'
  | 'typeFilter'
  | 'newDocument'
  | 'import'
  | 'editRecord'
  | 'supersedeRecord'
  | 'deleteRecord'
  | 'createFolder'
  | 'renameFolder'
  | 'deleteFolder'
  | 'supersessionRepresentation'
  | 'emptyState'

export const ALL_RECORDS_CAPABILITIES: readonly RecordsCapability[] = [
  'folderNavigation',
  'nestedTraversal',
  'search',
  'searchSubfolders',
  'typeFilter',
  'newDocument',
  'import',
  'editRecord',
  'supersedeRecord',
  'deleteRecord',
  'createFolder',
  'renameFolder',
  'deleteFolder',
  'supersessionRepresentation',
  'emptyState',
]

// ---------------------------------------------------------------------------
// Document capabilities
// ---------------------------------------------------------------------------

export type DocumentCapability =
  | 'title'
  | 'body'
  | 'bodySource'
  | 'meta'
  | 'preparedBy'
  | 'tags'
  | 'concerns'
  | 'lifecycleRepresentation'
  | 'statusMessage'
  | 'predecessorLink'
  | 'successorLink'
  | 'actionEdit'
  | 'actionHistory'
  | 'actionSubmit'
  | 'actionFile'
  | 'actionApprove'
  | 'actionDeprecate'
  | 'actionRestore'
  | 'actionLock'
  | 'actionUnlock'
  | 'actionSupersede'
  | 'actionDelete'

export const ALL_DOCUMENT_CAPABILITIES: readonly DocumentCapability[] = [
  'title',
  'body',
  'bodySource',
  'meta',
  'preparedBy',
  'tags',
  'concerns',
  'lifecycleRepresentation',
  'statusMessage',
  'predecessorLink',
  'successorLink',
  'actionEdit',
  'actionHistory',
  'actionSubmit',
  'actionFile',
  'actionApprove',
  'actionDeprecate',
  'actionRestore',
  'actionLock',
  'actionUnlock',
  'actionSupersede',
  'actionDelete',
]

// ---------------------------------------------------------------------------
// Small DOM helpers (accessible name/role based, not class based)
// ---------------------------------------------------------------------------

function textOf(container: HTMLElement): string {
  // Collapse whitespace so multi-line renderings match semantic fragments.
  return (container.textContent ?? '').replace(/\s+/g, ' ')
}

function hasText(container: HTMLElement, fragment: string): boolean {
  return textOf(container).includes(fragment)
}

function hrefsOf(container: HTMLElement): string[] {
  return [...container.querySelectorAll<HTMLAnchorElement>('a')]
    .map((link) => link.getAttribute('href'))
    .filter((href): href is string => href !== null)
}

/** A control (button, link, or input) whose accessible name is exactly `name`. */
function namedControl(container: HTMLElement, name: string): HTMLElement | null {
  const elements = [
    ...container.querySelectorAll<HTMLButtonElement>('button'),
    ...container.querySelectorAll<HTMLAnchorElement>('a'),
    ...container.querySelectorAll<HTMLInputElement>('input'),
    ...container.querySelectorAll<HTMLSelectElement>('select'),
  ]
  const byAria = elements.find((element) => element.getAttribute('aria-label') === name)
  if (byAria) return byAria
  return elements.find((element) => element.textContent?.trim() === name) ?? null
}

function assertHasLinkTo(container: HTMLElement, expectedHref: string, label: string): void {
  const hrefs = hrefsOf(container)
  // Query-string-bearing hrefs are compared by prefix so designs may append params.
  const match = expectedHref.includes('?')
    ? hrefs.some((href) => href.startsWith(expectedHref.split('?')[0]) && href.includes('?'))
    : hrefs.includes(expectedHref)
  assert.ok(match, `${label}: expected a link to ${expectedHref}; got [${hrefs.join(', ')}]`)
}

/** Assert `expected` appears as text (normally the body/markdown rendering). */
function assertRendersText(container: HTMLElement, expected: string, label: string): void {
  assert.ok(hasText(container, expected), `${label}: expected rendered text containing "${expected}"`)
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

// ---------------------------------------------------------------------------
// Shell
// ---------------------------------------------------------------------------

export function assertShellCapabilities(
  container: HTMLElement,
  model: DomainShellModel,
  opts: { childrenText?: string } = {},
): void {
  const label = 'shell'
  // Operating context renders exactly once, with exactly one Domain selector.
  assert.equal(container.querySelectorAll('[aria-label="Operating context"]').length, 1, `${label}: OperatingContext rendered exactly once`)
  assert.equal(container.querySelectorAll('#tenant-switcher').length, 1, `${label}: exactly one Domain selector`)
  // Domain identity is a link home.
  const identity = container.querySelector(`a[aria-label="${model.domain.name} Domain home"]`)
  assert.ok(identity, `${label}: Domain identity link present`)
  assert.equal(identity?.getAttribute('href'), model.routes.baseUrl, `${label}: identity links to the Domain home`)
  // Every supplied primary nav item renders, plus Work.
  for (const item of model.primaryNavigation) {
    assert.ok(hasText(container, item.label), `${label}: primary nav item "${item.label}" rendered`)
    assertHasLinkTo(container, item.href, `${label}: primary nav item "${item.label}"`)
  }
  assertHasLinkTo(container, model.routes.workUrl, `${label}: Work`)
  // Every supplied management nav item renders.
  for (const item of model.managementNavigation) {
    assert.ok(hasText(container, item.label), `${label}: management nav item "${item.label}" rendered`)
    assertHasLinkTo(container, item.href, `${label}: management nav item "${item.label}"`)
  }
  // Page children render inside the shell.
  if (opts.childrenText) assertRendersText(container, opts.childrenText, `${label}: page children`)
  // Route back to the LoreForge dashboard.
  assert.ok(hrefsOf(container).includes('/'), `${label}: route back to the LoreForge dashboard`)
  // Domain name is present at least once (identity/footer).
  assert.ok(hasText(container, model.domain.name), `${label}: Domain name rendered`)
}

// ---------------------------------------------------------------------------
// Records
// ---------------------------------------------------------------------------

export function assertRecordsCapabilities(
  container: HTMLElement,
  model: RecordsPageModel,
  opts: { omit?: readonly RecordsCapability[] } = {},
): void {
  const omit = new Set(opts.omit ?? [])
  const required = ALL_RECORDS_CAPABILITIES.filter((capability) => !omit.has(capability))

  // Every readable record is reachable by title.
  for (const record of model.records) {
    assertRendersText(container, record.title, `records: record "${record.title}"`)
  }

  for (const capability of required) {
    switch (capability) {
      case 'folderNavigation':
        for (const folder of flattenFolders(model.folders)) {
          assertRendersText(container, folder.name, `records: folder "${folder.name}"`)
        }
        break
      case 'nestedTraversal':
        // Every folder with children exposes each nested folder (no-op when the
        // model has no nesting, so empty-state renders stay valid).
        for (const folder of flattenFolders(model.folders)) {
          for (const child of folder.children) assertRendersText(container, child.name, `records: nested folder "${child.name}"`)
        }
        break
      case 'search':
        assert.ok(container.querySelector('input[type="search"]'), 'records: search input present')
        break
      case 'searchSubfolders':
        assert.ok(hasText(container, 'Search subfolders'), 'records: search-subfolders toggle present')
        break
      case 'typeFilter':
        assert.ok(container.querySelector('select[aria-label*="type" i], select[aria-label*="Type" i]'), 'records: document-type filter present')
        break
      case 'newDocument':
        assert.ok(hrefsOf(container).some((href) => href.includes('/records/new')), 'records: New Document affordance present')
        break
      case 'import':
        assert.ok(hrefsOf(container).some((href) => href.includes('/import')), 'records: Import affordance present')
        break
      case 'editRecord':
        if (model.records.some((record) => record.capabilities.edit)) {
          assert.ok(namedControl(container, 'Edit'), 'records: Edit affordance present for editable records')
        }
        break
      case 'supersedeRecord':
        assert.ok(namedControl(container, 'Supersede'), 'records: Supersede affordance present')
        break
      case 'deleteRecord':
        assert.ok(namedControl(container, 'Delete'), 'records: Delete affordance present')
        break
      case 'createFolder':
        assert.ok(namedControl(container, 'Create folder'), 'records: Create folder affordance present')
        break
      case 'renameFolder':
        assert.ok(namedControl(container, 'Rename folder'), 'records: Rename folder affordance present')
        break
      case 'deleteFolder':
        assert.ok(namedControl(container, 'Delete folder'), 'records: Delete folder affordance present')
        break
      case 'supersessionRepresentation':
        assertSupersessionRepresentation(container, model)
        break
      case 'emptyState':
        if (model.records.length === 0) {
          assert.ok(/no records|nothing here/i.test(textOf(container)), 'records: empty state present')
        }
        break
    }
  }
}

/** Successor is the entry point; the predecessor must be reachable beneath it or explicitly marked superseded. */
function assertSupersessionRepresentation(container: HTMLElement, model: RecordsPageModel): void {
  const treeitems = [...container.querySelectorAll<HTMLElement>('[role="treeitem"]')]
  const pairs = model.supersessionEdges.map((edge) => {
    const newer = model.records.find((record) => record.id === edge.newerId)
    const older = model.records.find((record) => record.id === edge.olderId)
    return { newer, older }
  }).filter((pair): pair is { newer: NonNullable<typeof pair.newer>; older: NonNullable<typeof pair.older> } => Boolean(pair.newer && pair.older))
  for (const { newer, older } of pairs) {
    if (treeitems.length > 0) {
      const newerItem = treeitems.find((item) => item.textContent?.includes(newer.title))
      const olderItem = treeitems.find((item) => item.textContent?.includes(older.title))
      assert.ok(newerItem, `records: successor "${newer.title}" is a tree entry point`)
      assert.ok(olderItem, `records: predecessor "${older.title}" is represented in the tree`)
      if (newerItem && olderItem) assert.ok(newerItem.contains(olderItem), `records: predecessor "${older.title}" reachable beneath successor "${newer.title}"`)
    } else {
      // Non-tree designs must still mark the relationship explicitly.
      const supersededMarkers = textOf(container).toLowerCase()
      assert.ok(
        supersededMarkers.includes(older.title.toLowerCase()) && /supersed/i.test(supersededMarkers),
        `records: predecessor "${older.title}" marked as superseded`,
      )
    }
  }
}

function flattenFolders(folders: RecordsPageModel['folders']): RecordsPageModel['folders'] {
  return folders.flatMap((folder) => [folder, ...flattenFolders(folder.children)])
}

// ---------------------------------------------------------------------------
// Document
// ---------------------------------------------------------------------------

/**
 * Assert the Document capability contract. When `opts.workflowAction` /
 * `opts.deleteAction` are provided, action affordances are expected to be
 * wired; without them, action-capable states must still represent the action
 * list per the model capabilities. The fixture states decide which actions
 * apply (Draft → Submit/File, Submitted → Approve, Filed → Deprecate/Lock,
 * Deprecated → Restore, Locked → Unlock, Superseded → no creation actions).
 */
export function assertDocumentCapabilities(
  container: HTMLElement,
  model: DocumentPageModel,
  opts: { omit?: readonly DocumentCapability[]; workflowAction?: (formData: FormData) => void | Promise<void>; deleteAction?: (formData: FormData) => void | Promise<void> } = {},
): void {
  const omit = new Set(opts.omit ?? [])
  const required = ALL_DOCUMENT_CAPABILITIES.filter((capability) => !omit.has(capability))
  const hasWorkflowBridge = typeof opts.workflowAction === 'function'

  for (const capability of required) {
    switch (capability) {
      case 'title':
        assertRendersText(container, model.title, 'document: title')
        break
      case 'body':
        // The canonical body is rendered unless raw source replaces it.
        if (model.bodySource === null) {
          const fragment = stripHtml(model.bodyHtml)
          assert.ok(fragment.length > 0, 'document: fixture body is non-empty')
          assertRendersText(container, fragment.slice(0, 40), 'document: body')
        }
        break
      case 'bodySource':
        if (model.bodySource !== null) assertRendersText(container, stripHtml(model.bodySource).slice(0, 40), 'document: raw source')
        break
      case 'meta':
        for (const entry of model.meta) assertRendersText(container, entry.label, 'document: meta label')
        break
      case 'preparedBy':
        assertRendersText(container, model.preparedByLabel, 'document: prepared-by')
        break
      case 'tags':
        if (model.tags.length > 0) for (const tag of model.tags) assertRendersText(container, tag, 'document: tag')
        break
      case 'concerns':
        for (const concern of model.concerns) assertRendersText(container, concern.name, 'document: concern')
        break
      case 'lifecycleRepresentation':
        assertLifecycleRepresented(container, model)
        break
      case 'statusMessage':
        if (model.statusMessage) {
          assert.ok(container.querySelector('[role="alert"]'), 'document: status/error surfaced with role=alert')
          assertRendersText(container, model.statusMessage.text, 'document: status message')
        }
        break
      case 'predecessorLink':
        if (model.supersession.supersedes) {
          assertRendersText(container, model.supersession.supersedes.title, 'document: predecessor title')
          assertHasLinkTo(container, `${model.baseUrl}/documents/${model.supersession.supersedes.id}`, 'document: predecessor link')
        }
        break
      case 'successorLink':
        if (model.supersession.supersededBy) {
          assertRendersText(container, model.supersession.supersededBy.title, 'document: successor title')
          assertHasLinkTo(container, `${model.baseUrl}/documents/${model.supersession.supersededBy.id}`, 'document: successor link')
        }
        break
      case 'actionEdit':
        if (model.capabilities.edit && !model.isSuperseded && model.routes.editUrl) {
          assert.ok(namedControl(container, 'Edit'), 'document: Edit action')
        }
        break
      case 'actionHistory':
        if (model.routes.historyUrl) assert.ok(namedControl(container, 'History'), 'document: History action')
        break
      case 'actionSubmit':
        if (model.lifecycle === 'draft' && model.capabilities.submit && hasWorkflowBridge) assert.ok(namedControl(container, 'Submit for review'), 'document: Submit action')
        break
      case 'actionFile':
        if (model.lifecycle === 'draft' && model.capabilities.file && hasWorkflowBridge) assert.ok(namedControl(container, 'File now'), 'document: File action')
        break
      case 'actionApprove':
        if (model.lifecycle === 'submitted' && model.capabilities.approve && hasWorkflowBridge) assert.ok(namedControl(container, 'Approve'), 'document: Approve action')
        break
      case 'actionDeprecate':
        if (model.lifecycle === 'filed' && model.capabilities.deprecate && hasWorkflowBridge) assert.ok(namedControl(container, 'Deprecate'), 'document: Deprecate action')
        break
      case 'actionRestore':
        if (model.lifecycle === 'deprecated' && model.capabilities.restore && hasWorkflowBridge) assert.ok(namedControl(container, 'Restore'), 'document: Restore action')
        break
      case 'actionLock':
        if (model.capabilities.lock && !model.locked && !model.isSuperseded && hasWorkflowBridge) assert.ok(namedControl(container, 'Lock'), 'document: Lock action')
        break
      case 'actionUnlock':
        if (model.capabilities.unlock && model.locked && !model.isSuperseded && hasWorkflowBridge) assert.ok(namedControl(container, 'Unlock'), 'document: Unlock action')
        break
      case 'actionSupersede':
        if (model.capabilities.supersede && !model.isSuperseded) {
          // Civic labels it explicitly; Ledger/Poster use the short verb.
          assert.ok(namedControl(container, 'Supersede') ?? namedControl(container, 'Create superseding document'), 'document: Supersede action')
        }
        break
      case 'actionDelete':
        if (model.capabilities.delete && typeof opts.deleteAction === 'function') assert.ok(namedControl(container, 'Delete'), 'document: Delete action')
        break
    }
  }
}

function assertLifecycleRepresented(container: HTMLElement, model: DocumentPageModel): void {
  const text = textOf(container).toLowerCase()
  const lifecycleLabels: Record<string, string> = {
    draft: 'draft',
    submitted: 'submitted',
    filed: 'filed',
    deprecated: 'deprecated',
  }
  const lifecycleWord = lifecycleLabels[String(model.lifecycle)]
  const superseded = model.isSuperseded && /superseded/.test(text)
  const locked = model.locked && /locked/.test(text)
  const shown = (lifecycleWord && text.includes(lifecycleWord)) || superseded || locked
  assert.ok(shown, `document: lifecycle state "${model.lifecycle}"${model.locked ? ' (locked)' : ''}${model.isSuperseded ? ' (superseded)' : ''} is represented`)
}

// ---------------------------------------------------------------------------
// Thin pages (Departments / Department / About / Lore)
// ---------------------------------------------------------------------------

export type ThinPageKind = 'departments' | 'department' | 'about' | 'lore'

export function assertThinPageCapabilities(
  container: HTMLElement,
  kind: ThinPageKind,
  model: DepartmentsPageModel | DepartmentPageModel | AboutPageModel | LorePageModel,
): void {
  const label = `thin:${kind}`
  switch (kind) {
    case 'departments': {
      const page = model as DepartmentsPageModel
      assertRendersText(container, page.vocabulary.subdomainPlural, `${label}: plural heading`)
      for (const department of page.departments) {
        assertRendersText(container, department.name, `${label}: department "${department.name}"`)
        assertHasLinkTo(container, `${page.baseUrl}/departments/${department.slug}`, `${label}: department "${department.name}" link`)
      }
      if (page.manageHref) assertHasLinkTo(container, page.manageHref, `${label}: manage link`)
      break
    }
    case 'department': {
      const page = model as DepartmentPageModel
      assertRendersText(container, page.name, `${label}: department name`)
      for (const member of page.members) assertRendersText(container, member.name, `${label}: member "${member.name}"`)
      for (const folder of page.folderNames) assertRendersText(container, folder, `${label}: folder "${folder}"`)
      if (page.manageHref) assertHasLinkTo(container, page.manageHref, `${label}: manage link`)
      break
    }
    case 'about': {
      const page = model as AboutPageModel
      assertRendersText(container, stripHtml(page.bodyHtml).slice(0, 40), `${label}: about body`)
      if (page.editHref) assertHasLinkTo(container, page.editHref, `${label}: edit link`)
      break
    }
    case 'lore':
      assertRendersText(container, 'Lore', `${label}: heading`)
      break
  }
}