import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { DESIGNS } from './registry'
import type { DesignDefinition, DesignKey } from './types'

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
} from '@/lib/design/conformance'

// Config is erased at the registry boundary; conformance runs each renderer
// with its real validated defaults so config-dependent production surfaces are
// exercised rather than hidden behind an empty fixture object.
type Erased = DesignDefinition<object>

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

// The roster is DERIVED from the registry: every discovered Design is held to
// the full first-class contract with zero per-design bookkeeping. A Design
// that cannot meet a capability fails loudly here instead of being listed in
// an omit ledger that silently rots.
const ALL_DESIGNS: Array<[DesignKey, Erased]> = Object.values(DESIGNS).map(
  (design) => [design.key, design as unknown as Erased],
)

const DESIGN_CONFIGS: Record<string, object> = Object.fromEntries(
  Object.values(DESIGNS).map((design) => [design.key, design.config.defaults]),
)

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
  // Every registered Design is first-class: the complete capability set is
  // asserted with no omissions. A future compatibility Design must either
  // meet the contract or reintroduce an explicit, reviewed gap ledger.
  it.each(ALL_DESIGNS)('%s records represent every fixture record, folder, search, and permitted action', (_key, Design) => {
    const { container } = render(<Design.pages.records {...RECORDS_CONFORMANCE_MODEL} designConfig={DESIGN_CONFIGS[_key]} />)
    assertRecordsCapabilities(container, RECORDS_CONFORMANCE_MODEL)
  })

  it.each(ALL_DESIGNS)('%s records render an empty state when nothing is readable', (_key, Design) => {
    const { container } = render(<Design.pages.records {...EMPTY_RECORDS_CONFORMANCE_MODEL} designConfig={DESIGN_CONFIGS[_key]} />)
    assertRecordsCapabilities(container, EMPTY_RECORDS_CONFORMANCE_MODEL)
  })
})

describe('P08D-T00 document conformance', () => {
  // Every registered Design badges lifecycle state and renders raw source
  // plus predecessor links — the complete document contract, no omissions.

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
      assertDocumentCapabilities(container, fixture, { workflowAction: stubAction, deleteAction: stubAction })
    }
  })

  it.each(ALL_DESIGNS)('%s document surfaces the route status message with role=alert', (_key, Design) => {
    const { container } = render(
      <Design.pages.document {...STATUS_DOCUMENT_MODEL} {...VARIANT} workflowAction={stubAction} deleteAction={stubAction} designConfig={DESIGN_CONFIGS[_key]} />,
    )
    assertDocumentCapabilities(container, STATUS_DOCUMENT_MODEL, { workflowAction: stubAction, deleteAction: stubAction })
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
