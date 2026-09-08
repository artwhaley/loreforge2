import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { civic } from '@/designs/civic'
import { civicDefaults } from '@/designs/civic/config'
import { ledger } from '@/designs/ledger'
import { ledgerDefaults } from '@/designs/ledger/config'
import { poster } from '@/designs/poster'
import { posterDefaults } from '@/designs/poster/config'
import { obsidian } from '@/designs/obsidian'
import { obsidianDefaults } from '@/designs/obsidian/config'
import type { DesignDefinition } from './types'

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

// Config is erased at the registry boundary; conformance runs each renderer
// with its real validated defaults so config-dependent production surfaces are
// exercised rather than hidden behind an empty fixture object.
type Erased = DesignDefinition<object>
type DesignKey = 'civic' | 'ledger' | 'poster' | 'obsidian'

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

const ALL_DESIGNS: Array<[DesignKey, Erased]> = [
  ['civic', civic as unknown as Erased],
  ['ledger', ledger as unknown as Erased],
  ['poster', poster as unknown as Erased],
  ['obsidian', obsidian as unknown as Erased],
]

const DESIGN_CONFIGS: Record<DesignKey, object> = {
  civic: civicDefaults,
  ledger: ledgerDefaults,
  poster: posterDefaults,
  obsidian: obsidianDefaults,
}

const SHELL_THEME = { tokens: {}, headerLayout: 'centered', documentStyle: 'classic' }
const stubAction = async () => {}
const VARIANT = { headerLayout: 'centered', documentStyle: 'classic' }

/**
 * P08D-T00 capability conformance. The same fixtures and the same helpers run
 * against every Design. Compatibility gaps remain explicit in the `omit`
 * lists; first-class Obsidian is held to the complete contract.
 */
describe('P08D-T00 shell conformance', () => {
  it.each(ALL_DESIGNS)('%s shell renders the full shared chrome and hosts page children', (_key, Design) => {
    const { container } = render(
      <Design.Shell model={SHELL_PREVIEW_MODEL} theme={SHELL_THEME} designConfig={DESIGN_CONFIGS[_key]}>
        <p>CONFORMANCE-SHELL-CHILD</p>
      </Design.Shell>,
    )
    assertShellCapabilities(container, SHELL_PREVIEW_MODEL, { childrenText: 'CONFORMANCE-SHELL-CHILD' })
  })
})

describe('P08D-T00 records conformance', () => {
  // Poster remains compatibility. All first-class Designs carry the full set.
  const RECORDS_GAPS: Record<string, readonly RecordsCapability[]> = {
    civic: [],
    ledger: [],
    obsidian: [],
    poster: ['searchSubfolders', 'typeFilter', 'import', 'supersedeRecord', 'deleteRecord', 'createFolder', 'renameFolder', 'deleteFolder', 'supersessionRepresentation'],
  }

  it.each(ALL_DESIGNS)('%s records represent every fixture record, folder, search, and permitted action', (_key, Design) => {
    const { container } = render(<Design.pages.records {...RECORDS_CONFORMANCE_MODEL} designConfig={DESIGN_CONFIGS[_key]} />)
    assertRecordsCapabilities(container, RECORDS_CONFORMANCE_MODEL, { omit: RECORDS_GAPS[_key] })
  })

  it.each(ALL_DESIGNS)('%s records render an empty state when nothing is readable', (_key, Design) => {
    const { container } = render(<Design.pages.records {...EMPTY_RECORDS_CONFORMANCE_MODEL} designConfig={DESIGN_CONFIGS[_key]} />)
    assertRecordsCapabilities(container, EMPTY_RECORDS_CONFORMANCE_MODEL, { omit: RECORDS_GAPS[_key] })
  })

  it('documents the Civic records baseline: full capability set asserted with no omissions', () => {
    const { container } = render(<civic.pages.records {...RECORDS_CONFORMANCE_MODEL} designConfig={civicDefaults} />)
    assertRecordsCapabilities(container, RECORDS_CONFORMANCE_MODEL)
  })
})

describe('P08D-T00 document conformance', () => {
  // First-class Designs badge lifecycle state and render raw source plus
  // predecessor links; Poster remains compatibility.
  const DOCUMENT_GAPS: Record<string, readonly DocumentCapability[]> = {
    civic: [],
    ledger: [],
    obsidian: [],
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
        <Design.pages.document {...fixture} {...VARIANT} workflowAction={stubAction} deleteAction={stubAction} designConfig={DESIGN_CONFIGS[_key]} />,
      )
      assertDocumentCapabilities(container, fixture, { omit: DOCUMENT_GAPS[_key], workflowAction: stubAction, deleteAction: stubAction })
    }
  })

  it.each(ALL_DESIGNS)('%s document surfaces the route status message with role=alert', (_key, Design) => {
    const { container } = render(
      <Design.pages.document {...STATUS_DOCUMENT_MODEL} {...VARIANT} workflowAction={stubAction} deleteAction={stubAction} designConfig={DESIGN_CONFIGS[_key]} />,
    )
    assertDocumentCapabilities(container, STATUS_DOCUMENT_MODEL, { omit: DOCUMENT_GAPS[_key], workflowAction: stubAction, deleteAction: stubAction })
  })

  it('civic badges lifecycle state on the record sheet (T06 first-class)', () => {
    const statusTextOf = (model: typeof DRAFT_DOCUMENT_MODEL) => {
      const { container } = render(<civic.pages.document {...model} {...VARIANT} workflowAction={stubAction} deleteAction={stubAction} designConfig={civicDefaults} />)
      const badge = container.querySelector('[role="status"]')
      return badge?.textContent ?? ''
    }
    expect(statusTextOf(DRAFT_DOCUMENT_MODEL)).toMatch(/draft/i)
    expect(statusTextOf(FILED_DOCUMENT_MODEL)).toMatch(/filed/i)
    expect(statusTextOf(LOCKED_DOCUMENT_MODEL)).toMatch(/locked/i)
  })

  it('ledger badges lifecycle state on the docket (T07 first-class)', () => {
    const statusTextOf = (model: typeof DRAFT_DOCUMENT_MODEL) => {
      const { container } = render(<ledger.pages.document {...model} {...VARIANT} workflowAction={stubAction} deleteAction={stubAction} designConfig={ledgerDefaults} />)
      const badge = container.querySelector('[role="status"]')
      return badge?.textContent ?? ''
    }
    expect(statusTextOf(DRAFT_DOCUMENT_MODEL)).toMatch(/draft/i)
    expect(statusTextOf(FILED_DOCUMENT_MODEL)).toMatch(/filed/i)
    expect(statusTextOf(LOCKED_DOCUMENT_MODEL)).toMatch(/locked/i)
  })

  it('tripwire: poster does not badge lifecycle states yet (T08 closes this)', () => {
    const { container } = render(
      <poster.pages.document {...DRAFT_DOCUMENT_MODEL} {...VARIANT} workflowAction={stubAction} deleteAction={stubAction} designConfig={posterDefaults} />,
    )
    const text = container.textContent?.toLowerCase().replace(/\s+/g, ' ')
    expect(text).not.toMatch(/\bdraft\b/)
    expect(text).not.toMatch(/\bfiled\b/)
    expect(text).not.toMatch(/\blocked\b/)
  })
})

describe('P08D-T00 thin-page conformance', () => {
  it.each(ALL_DESIGNS)('%s departments directory lists every department with a working link', (_key, Design) => {
    const { container } = render(<Design.pages.departments {...DEPARTMENTS_PREVIEW_MODEL} {...VARIANT} designConfig={DESIGN_CONFIGS[_key]} />)
    assertThinPageCapabilities(container, 'departments', DEPARTMENTS_PREVIEW_MODEL)
  })

  it.each(ALL_DESIGNS)('%s department detail shows members, folders, and the manage route', (_key, Design) => {
    const { container } = render(<Design.pages.department {...DEPARTMENT_PREVIEW_MODEL} {...VARIANT} designConfig={DESIGN_CONFIGS[_key]} />)
    assertThinPageCapabilities(container, 'department', DEPARTMENT_PREVIEW_MODEL)
  })

  it.each(ALL_DESIGNS)('%s about renders the body and the edit route', (_key, Design) => {
    const { container } = render(<Design.pages.about {...ABOUT_PREVIEW_MODEL} {...VARIANT} designConfig={DESIGN_CONFIGS[_key]} />)
    assertThinPageCapabilities(container, 'about', ABOUT_PREVIEW_MODEL)
  })

  it.each(ALL_DESIGNS)('%s lore renders the canonical Lore surface', (_key, Design) => {
    const { container } = render(<Design.pages.lore {...LORE_PREVIEW_MODEL} {...VARIANT} designConfig={DESIGN_CONFIGS[_key]} />)
    assertThinPageCapabilities(container, 'lore', LORE_PREVIEW_MODEL)
  })
})
