import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { HOME_PREVIEW_MODEL } from '@/lib/design/fixtures'
import { civic } from '@/designs/civic'
import { ledger } from '@/designs/ledger'
import { poster } from '@/designs/poster'

const variant = { headerLayout: 'centered', documentStyle: 'classic' }

/**
 * Home conformance: every Design renders the same semantic content —
 * welcome, required destinations, authorized recent records, edit affordance —
 * through its own composition.
 */
describe.each([
  ['civic', civic.pages.home],
  ['ledger', ledger.pages.home],
  ['poster', poster.pages.home],
] as const)('%s home', (_key, Home) => {
  it('renders welcome, destinations, recent records, and the edit affordance', () => {
    const { container } = render(<Home {...HOME_PREVIEW_MODEL} {...variant} />)
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
    render(<Home {...HOME_PREVIEW_MODEL} {...variant} recentRecords={[]} />)
    expect(screen.getByText('No records filed yet.')).toBeTruthy()
  })

  it('omits the edit affordance when the model supplies none', () => {
    const { container } = render(<Home {...HOME_PREVIEW_MODEL} {...variant} welcome={{ ...HOME_PREVIEW_MODEL.welcome, editHref: null }} />)
    expect(container.textContent).not.toContain('Edit welcome')
  })
})

describe('home structural divergence', () => {
  it('ledger uses an index composition and poster uses tiles', () => {
    const { container: ledgerDom } = render(<ledger.pages.home {...HOME_PREVIEW_MODEL} {...variant} />)
    expect(ledgerDom.textContent).toContain('Index')
    const { container: posterDom } = render(<poster.pages.home {...HOME_PREVIEW_MODEL} {...variant} />)
    expect(posterDom.querySelectorAll('ul').length).toBeGreaterThanOrEqual(1)
    // Civic keeps the ordinal quick-link composition.
    const { container: civicDom } = render(<civic.pages.home {...HOME_PREVIEW_MODEL} {...variant} />)
    expect(civicDom.textContent).toContain('Welcome to')
  })
})
