import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { civic } from '@/designs/civic'
import { ledger } from '@/designs/ledger'
import { poster } from '@/designs/poster'
import {
  ABOUT_PREVIEW_MODEL,
  DEPARTMENT_PREVIEW_MODEL,
  DEPARTMENTS_PREVIEW_MODEL,
  DRAFT_DOCUMENT_MODEL,
  EMPTY_RECORDS_CONFORMANCE_MODEL,
  FILED_DOCUMENT_MODEL,
  LOCKED_DOCUMENT_MODEL,
  LORE_PREVIEW_MODEL,
  RECORDS_CONFORMANCE_MODEL,
  SHELL_PREVIEW_MODEL,
  SOURCE_DOCUMENT_MODEL,
  STATUS_DOCUMENT_MODEL,
  SUBMITTED_DOCUMENT_MODEL,
  SUCCESSOR_DOCUMENT_MODEL,
  SUPERSEDED_DOCUMENT_MODEL,
  DEPRECATED_DOCUMENT_MODEL,
} from '@/lib/design/fixtures'
import {
  assertDocumentCapabilities,
  assertRecordsCapabilities,
  assertShellCapabilities,
  assertThinPageCapabilities,
  type DocumentCapability,
  type RecordsCapability,
} from '@/lib/design/conformance'

// The shared shell chrome is a client component under Next router hooks;
// jsdom has no router, so stub the navigation surface for shell conformance.
vi.mock('next/navigation', () => ({
  usePathname: () => '/domain/preview-domain',
  useRouter: () => ({ push: () => {}, refresh: () => {} }),
  useSearchParams: () => new URLSearchParams(),
}))
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}))

const ALL_DESIGNS = [
  ['civic', civic],
  ['ledger', ledger],
  ['poster', poster],
] as const

const SHELL_THEME = { tokens: {}, headerLayout: 'centered', documentStyle: 'classic' }
const stubAction = async () => {}
const VARIANT = { headerLayout: 'centered', documentStyle: 'classic' }

/**
 * P08D-T00 capability conformance. The same fixtures and the same helpers run
 * against every Design. Gaps are declared through the `omit` lists below —
 * these are the "expected future first-class contract" markers: T06 (Civic
 * isolation) and T07 (Ledger isolation) close them by shrinking the lists, not
 * by weakening the assertions.
 */
describe('P08D-T00 shell conformance', () => {
  it.each(ALL_DESIGNS)('%s shell renders the full shared chrome and hosts page children', (_key, Design) => {
    const { container } = render(
      <Design.Shell model={SHELL_PREVIEW_MODEL} theme={SHELL_THEME}>
        <p>CONFORMANCE-SHELL-CHILD</p>
      </Design.Shell>,
    )
    assertShellCapabilities(container, SHELL_PREVIEW_MODEL, { childrenText: 'CONFORMANCE-SHELL-CHILD' })
  })
})

describe('P08D-T00 records conformance', () => {
  // What each Design currently omits from the Records contract. Civic is the
  // mature baseline; Ledger/Poster close these gaps to earn first-class status.
  const RECORDS_GAPS: Record<string, readonly RecordsCapability[]> = {
    civic: [],
    ledger: ['searchSubfolders', 'typeFilter', 'import', 'editRecord', 'supersedeRecord', 'deleteRecord', 'createFolder', 'renameFolder', 'deleteFolder', 'supersessionRepresentation'],
    poster: ['searchSubfolders', 'typeFilter', 'import', 'supersedeRecord', 'deleteRecord', 'createFolder', 'renameFolder', 'deleteFolder', 'supersessionRepresentation'],
  }

  it.each(ALL_DESIGNS)('%s records represent every fixture record, folder, search, and permitted action', (_key, Design) => {
    const { container } = render(<Design.pages.records {...RECORDS_CONFORMANCE_MODEL} />)
    assertRecordsCapabilities(container, RECORDS_CONFORMANCE_MODEL, { omit: RECORDS_GAPS[_key] })
  })

  it.each(ALL_DESIGNS)('%s records render an empty state when nothing is readable', (_key, Design) => {
    const { container } = render(<Design.pages.records {...EMPTY_RECORDS_CONFORMANCE_MODEL} />)
    assertRecordsCapabilities(container, EMPTY_RECORDS_CONFORMANCE_MODEL, { omit: RECORDS_GAPS[_key] })
  })

  it('documents the Civic records baseline: full capability set asserted with no omissions', () => {
    const { container } = render(<civic.pages.records {...RECORDS_CONFORMANCE_MODEL} />)
    assertRecordsCapabilities(container, RECORDS_CONFORMANCE_MODEL)
  })
})

describe('P08D-T00 document conformance', () => {
  // bodySource/predecessorLink are Civic-only today; no Design badges the
  // lifecycle state yet (covered by the tripwire test below).
  const DOCUMENT_GAPS: Record<string, readonly DocumentCapability[]> = {
    civic: ['lifecycleRepresentation'],
    ledger: ['bodySource', 'lifecycleRepresentation', 'predecessorLink'],
    poster: ['bodySource', 'lifecycleRepresentation', 'predecessorLink'],
  }

  const LIFECYCLE_FIXTURES = [
    ['draft', DRAFT_DOCUMENT_MODEL],
    ['submitted', SUBMITTED_DOCUMENT_MODEL],
    ['filed', FILED_DOCUMENT_MODEL],
    ['deprecated', DEPRECATED_DOCUMENT_MODEL],
    ['locked', LOCKED_DOCUMENT_MODEL],
    ['superseded', SUPERSEDED_DOCUMENT_MODEL],
    ['successor', SUCCESSOR_DOCUMENT_MODEL],
    ['source', SOURCE_DOCUMENT_MODEL],
  ] as const

  it.each(ALL_DESIGNS)('%s document represents title, body, credits, tags, concerns, and every permitted action', (_key, Design) => {
    for (const [, fixture] of LIFECYCLE_FIXTURES) {
      const { container } = render(
        <Design.pages.document {...fixture} {...VARIANT} workflowAction={stubAction} deleteAction={stubAction} />,
      )
      assertDocumentCapabilities(container, fixture, { omit: DOCUMENT_GAPS[_key], workflowAction: stubAction, deleteAction: stubAction })
    }
  })

  it.each(ALL_DESIGNS)('%s document surfaces the route status message with role=alert', (_key, Design) => {
    const { container } = render(
      <Design.pages.document {...STATUS_DOCUMENT_MODEL} {...VARIANT} workflowAction={stubAction} deleteAction={stubAction} />,
    )
    assertDocumentCapabilities(container, STATUS_DOCUMENT_MODEL, { omit: DOCUMENT_GAPS[_key], workflowAction: stubAction, deleteAction: stubAction })
  })

  it('documents the expected-future lifecycle label: no Design badges lifecycle states yet', () => {
    // Tripwire: once T06/T07 add an explicit lifecycle badge, this fails and
    // 'lifecycleRepresentation' must be promoted out of DOCUMENT_GAPS.
    for (const [key, Design] of ALL_DESIGNS) {
      const { container } = render(
        <Design.pages.document {...DRAFT_DOCUMENT_MODEL} {...VARIANT} workflowAction={stubAction} deleteAction={stubAction} />,
      )
      const text = container.textContent?.toLowerCase().replace(/\s+/g, ' ')
      expect(text).not.toMatch(/\bdraft\b/)
      expect(text).not.toMatch(/\bfiled\b/)
      expect(text).not.toMatch(/\blocked\b/)
    }
  })
})

describe('P08D-T00 thin-page conformance', () => {
  it.each(ALL_DESIGNS)('%s departments directory lists every department with a working link', (_key, Design) => {
    const { container } = render(<Design.pages.departments {...DEPARTMENTS_PREVIEW_MODEL} {...VARIANT} />)
    assertThinPageCapabilities(container, 'departments', DEPARTMENTS_PREVIEW_MODEL)
  })

  it.each(ALL_DESIGNS)('%s department detail shows members, folders, and the manage route', (_key, Design) => {
    const { container } = render(<Design.pages.department {...DEPARTMENT_PREVIEW_MODEL} {...VARIANT} />)
    assertThinPageCapabilities(container, 'department', DEPARTMENT_PREVIEW_MODEL)
  })

  it.each(ALL_DESIGNS)('%s about renders the body and the edit route', (_key, Design) => {
    const { container } = render(<Design.pages.about {...ABOUT_PREVIEW_MODEL} {...VARIANT} />)
    assertThinPageCapabilities(container, 'about', ABOUT_PREVIEW_MODEL)
  })

  it.each(ALL_DESIGNS)('%s lore renders the canonical Lore surface', (_key, Design) => {
    const { container } = render(<Design.pages.lore {...LORE_PREVIEW_MODEL} {...VARIANT} />)
    assertThinPageCapabilities(container, 'lore', LORE_PREVIEW_MODEL)
  })
})