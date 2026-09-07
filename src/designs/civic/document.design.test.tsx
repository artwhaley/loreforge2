import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { RecordActionsProvider } from '@/components/functional/records/recordActions'
import { DOCUMENT_PREVIEW_MODEL } from '@/lib/design/fixtures'
import { civic } from '@/designs/civic'
import { ledger } from '@/designs/ledger'
import { poster } from '@/designs/poster'

const variant = { headerLayout: 'centered', documentStyle: 'classic' }
const stubAction = async () => {}

/**
 * Document conformance: every Design renders the canonical body, lifecycle
 * cues, credits/tags, and the permitted actions from the same safe model.
 */
describe.each([
  ['civic', civic.pages.document],
  ['ledger', ledger.pages.document],
  ['poster', poster.pages.document],
] as const)('%s document', (_key, Document) => {
  it('renders the canonical body, credits, and permitted actions', () => {
    const { container } = render(
      <RecordActionsProvider workflowAction={stubAction} deleteAction={stubAction}>
        <Document {...DOCUMENT_PREVIEW_MODEL} {...variant} />
      </RecordActionsProvider>,
    )
    expect(screen.getByText('Incident Report 2026-014')).toBeTruthy()
    expect(container.textContent).toContain('Elias Vane')
    expect(container.textContent).toContain('The clerk ruled a fresh line')
    // Permitted actions are represented, not silently dropped.
    expect(screen.getByText('Edit')).toBeTruthy()
    expect(screen.getByText('History')).toBeTruthy()
    // Civic labels the supersede action explicitly; Ledger/Poster use "Supersede".
    const supersede = screen.queryByText('Supersede') ?? screen.getByText('Create superseding document')
    expect(supersede).toBeTruthy()
    expect(screen.getByText('Deprecate')).toBeTruthy()
    expect(screen.getByText('Lock')).toBeTruthy()
  })

  it('renders tags and the status message when supplied', () => {
    const { container } = render(
      <RecordActionsProvider workflowAction={stubAction} deleteAction={stubAction}>
        <Document {...DOCUMENT_PREVIEW_MODEL} {...variant} statusMessage={{ code: 'x', text: 'Retry your change.' }} />
      </RecordActionsProvider>,
    )
    expect(container.textContent).toContain('incident')
    expect(screen.getByText('Retry your change.')).toBeTruthy()
  })

  it('omits workflow affordances when no action bridge exists', () => {
    const { container } = render(<Document {...DOCUMENT_PREVIEW_MODEL} {...variant} />)
    expect(container.textContent).not.toContain('Deprecate')
  })
})
