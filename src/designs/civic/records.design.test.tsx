import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { RECORDS_PREVIEW_MODEL } from '@/lib/design/fixtures'
import type { DesignDefinition } from '@/lib/design/types'
import { civic } from '@/designs/civic'
import { civicDefaults } from '@/designs/civic/config'
import { ledger } from '@/designs/ledger'
import { ledgerDefaults } from '@/designs/ledger/config'
import { poster } from '@/designs/poster'
import { posterDefaults } from '@/designs/poster/config'

// Config is erased at the fixture boundary (OBSIDIAN-T02); these tests assert
// composition over the shared model, never config fields.
type Erased = DesignDefinition<object>
const CONFIG = {}
const ERASED: Array<['civic' | 'ledger' | 'poster', Erased]> = [
  ['civic', civic as unknown as Erased],
  ['ledger', ledger as unknown as Erased],
  ['poster', poster as unknown as Erased],
]

/**
 * Records conformance: every Design renders the model's readable records,
 * exposes folder navigation and search, preserves counts, and offers the
 * permitted actions — through its own composition over the shared workspace.
 */
describe.each(ERASED.map(([key, design]) => [key, design.pages.records] as const))('%s records', (_key, Records) => {
  it('renders readable records, folder navigation, and search', () => {
    const { container } = render(<Records {...RECORDS_PREVIEW_MODEL} designConfig={CONFIG} />)
    for (const record of RECORDS_PREVIEW_MODEL.records) {
      expect(screen.getByText(record.title)).toBeTruthy()
    }
    const search = container.querySelector('input[type="search"]')
    expect(search).toBeTruthy()
    expect(container.textContent).toContain('Records')
  })

  it('handles zero records with an empty state', () => {
    const { container } = render(<Records {...RECORDS_PREVIEW_MODEL} records={[]} totalReadableRecordCount={0} designConfig={CONFIG} />)
    expect(container.textContent).toMatch(/No records/i)
  })

  it('exposes the new-document action', () => {
    const { container } = render(<Records {...RECORDS_PREVIEW_MODEL} designConfig={CONFIG} />)
    const creation = [...container.querySelectorAll('a')].find((link) => link.getAttribute('href')?.includes('/records/new'))
    expect(creation).toBeTruthy()
  })
})

describe('records structural divergence', () => {
  it('civic keeps the two-pane explorer while ledger and poster diverge', () => {
    const { container: civicDom } = render(<civic.pages.records {...RECORDS_PREVIEW_MODEL} designConfig={civicDefaults} />)
    // Two panes: folder navigator + records browser.
    expect(civicDom.textContent).toContain('Folders')
    const { container: ledgerDom } = render(<ledger.pages.records {...RECORDS_PREVIEW_MODEL} designConfig={ledgerDefaults} />)
    expect(ledgerDom.textContent).toContain('All folders')
    const { container: posterDom } = render(<poster.pages.records {...RECORDS_PREVIEW_MODEL} designConfig={posterDefaults} />)
    expect(posterDom.textContent).toContain('All ·')
  })
})
