import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { RECORDS_PREVIEW_MODEL } from '@/lib/design/fixtures'
import { civic } from '@/designs/civic'
import { ledger } from '@/designs/ledger'
import { poster } from '@/designs/poster'

/**
 * Records conformance: every Design renders the model's readable records,
 * exposes folder navigation and search, preserves counts, and offers the
 * permitted actions — through its own composition over the shared workspace.
 */
describe.each([
  ['civic', civic.pages.records],
  ['ledger', ledger.pages.records],
  ['poster', poster.pages.records],
] as const)('%s records', (_key, Records) => {
  it('renders readable records, folder navigation, and search', () => {
    const { container } = render(<Records {...RECORDS_PREVIEW_MODEL} />)
    for (const record of RECORDS_PREVIEW_MODEL.records) {
      expect(screen.getByText(record.title)).toBeTruthy()
    }
    const search = container.querySelector('input[type="search"]')
    expect(search).toBeTruthy()
    expect(container.textContent).toContain('Records')
  })

  it('handles zero records with an empty state', () => {
    const { container } = render(<Records {...RECORDS_PREVIEW_MODEL} records={[]} totalReadableRecordCount={0} />)
    expect(container.textContent).toMatch(/No records/i)
  })

  it('exposes the new-document action', () => {
    const { container } = render(<Records {...RECORDS_PREVIEW_MODEL} />)
    const creation = [...container.querySelectorAll('a')].find((link) => link.getAttribute('href')?.includes('/records/new'))
    expect(creation).toBeTruthy()
  })
})

describe('records structural divergence', () => {
  it('civic keeps the two-pane explorer while ledger and poster diverge', () => {
    const { container: civicDom } = render(<civic.pages.records {...RECORDS_PREVIEW_MODEL} />)
    // Two panes: folder navigator + records browser.
    expect(civicDom.textContent).toContain('Folders')
    const { container: ledgerDom } = render(<ledger.pages.records {...RECORDS_PREVIEW_MODEL} />)
    expect(ledgerDom.textContent).toContain('All folders')
    const { container: posterDom } = render(<poster.pages.records {...RECORDS_PREVIEW_MODEL} />)
    expect(posterDom.textContent).toContain('All ·')
  })
})
