import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { HOME_PREVIEW_MODEL } from '@/lib/design/fixtures'
import type { DesignDefinition } from '@/lib/design/types'
import { civic } from '@/designs/civic'
import { civicDefaults } from '@/designs/civic/config'
import { ledger } from '@/designs/ledger'
import { ledgerDefaults } from '@/designs/ledger/config'
import { poster } from '@/designs/poster'
import { posterDefaults } from '@/designs/poster/config'

const variant = { headerLayout: 'centered', documentStyle: 'classic' }
// The page components are config-parameterized; the fixture erases config the
// same way the registry does (OBSIDIAN-T02), since these tests inspect
// composition, not config fields.
type Erased = DesignDefinition<object>
const CONFIG = {}
const ERASED: Array<['civic' | 'ledger' | 'poster', Erased]> = [
  ['civic', civic as unknown as Erased],
  ['ledger', ledger as unknown as Erased],
  ['poster', poster as unknown as Erased],
]

/**
 * Home conformance: every Design renders the same semantic content —
 * welcome, required destinations, authorized recent records, edit affordance —
 * through its own composition.
 */
describe.each(ERASED.map(([key, design]) => [key, design.pages.home] as const))('%s home', (_key, Home) => {
  it('renders welcome, destinations, recent records, and the edit affordance', () => {
    const { container } = render(<Home {...HOME_PREVIEW_MODEL} {...variant} designConfig={CONFIG} />)
    expect(screen.getByText('Preview Domain')).toBeTruthy()
    for (const destination of HOME_PREVIEW_MODEL.destinations) {
      expect(screen.getByText(destination.label)).toBeTruthy()
    }
    for (const record of HOME_PREVIEW_MODEL.recentRecords) {
      expect(screen.getByText(record.title)).toBeTruthy()
    }
    const edit = screen.getByText('Edit welcome')
    expect(edit.getAttribute('href')).toBe(`${HOME_PREVIEW_MODEL.baseUrl}/pages/home/edit`)
    expect(container.querySelectorAll('a[href]').length).toBeGreaterThan(0)
  })

  it('renders the empty state when no records are readable', () => {
    render(<Home {...HOME_PREVIEW_MODEL} {...variant} recentRecords={[]} designConfig={CONFIG} />)
    expect(screen.getByText('No records filed yet.')).toBeTruthy()
  })

  it('omits the edit affordance when the model supplies none', () => {
    const { container } = render(<Home {...HOME_PREVIEW_MODEL} {...variant} welcome={{ ...HOME_PREVIEW_MODEL.welcome, editHref: null }} designConfig={CONFIG} />)
    expect(container.textContent).not.toContain('Edit welcome')
  })
})

describe('home structural divergence', () => {
  it('ledger uses an index composition and poster uses tiles', () => {
    const { container: ledgerDom } = render(<ledger.pages.home {...HOME_PREVIEW_MODEL} {...variant} designConfig={ledgerDefaults} />)
    expect(ledgerDom.textContent).toContain('Index')
    const { container: posterDom } = render(<poster.pages.home {...HOME_PREVIEW_MODEL} {...variant} designConfig={posterDefaults} />)
    expect(posterDom.querySelectorAll('ul').length).toBeGreaterThanOrEqual(1)
    // Civic keeps the ordinal quick-link composition.
    const { container: civicDom } = render(<civic.pages.home {...HOME_PREVIEW_MODEL} {...variant} designConfig={civicDefaults} />)
    expect(civicDom.textContent).toContain('Welcome to')
  })
})
