import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { DOCUMENT_PREVIEW_MODEL } from '@/lib/design/fixtures'
import type { DesignDefinition } from '@/lib/design/types'
import { civic } from '@/designs/civic'

const variant = { headerLayout: 'centered', documentStyle: 'classic' }
const stubAction = async () => {}
// Config is erased at the fixture boundary (OBSIDIAN-T02).
type Erased = DesignDefinition<object>
const CONFIG = {}
const ERASED: Array<['civic', Erased]> = [
  ['civic', civic as unknown as Erased],
]

/**
 * Document conformance: every Design renders the canonical body, lifecycle
 * cues, credits/tags, and the permitted actions from the same safe model.
 * The action bridge arrives as props (server views are not client-context
 * consumers), mirroring the route and Theme Studio.
 */
describe.each(ERASED.map(([key, design]) => [key, design.pages.document] as const))('%s document', (_key, Document) => {
  it('renders the canonical body, credits, and permitted actions', () => {
    const { container } = render(
      <Document {...DOCUMENT_PREVIEW_MODEL} {...variant} workflowAction={stubAction} deleteAction={stubAction} designConfig={CONFIG} />,
    )
    expect(screen.getByText('Incident Report 2026-014')).toBeTruthy()
    expect(container.textContent).toContain('Elias Vane')
    expect(container.textContent).toContain('The clerk ruled a fresh line')
    // Permitted actions are represented, not silently dropped.
    expect(screen.getByText('Edit')).toBeTruthy()
    expect(screen.getByText('History')).toBeTruthy()
    // Civic labels the supersede action explicitly.
    const supersede = screen.queryByText('Supersede') ?? screen.getByText('Create superseding document')
    expect(supersede).toBeTruthy()
    expect(screen.getByText('Deprecate')).toBeTruthy()
    expect(screen.getByText('Lock')).toBeTruthy()
  })

  it('renders tags and the status message when supplied', () => {
    const { container } = render(
      <Document {...DOCUMENT_PREVIEW_MODEL} {...variant} workflowAction={stubAction} deleteAction={stubAction} statusMessage={{ code: 'x', text: 'Retry your change.' }} designConfig={CONFIG} />,
    )
    expect(container.textContent).toContain('incident')
    expect(screen.getByText('Retry your change.')).toBeTruthy()
  })

  it('omits workflow affordances when no action bridge exists', () => {
    const { container } = render(<Document {...DOCUMENT_PREVIEW_MODEL} {...variant} designConfig={CONFIG} />)
    expect(container.textContent).not.toContain('Deprecate')
  })
})
