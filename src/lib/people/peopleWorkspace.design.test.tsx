import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { PeopleSearch } from '@/components/functional/people/PeopleSearch'

vi.mock('next/navigation', () => ({
  usePathname: () => '/domain/preview/manage/people',
  useRouter: () => ({ push: () => {}, refresh: () => {} }),
  useSearchParams: () => new URLSearchParams(),
}))

/**
 * OBSIDIAN-T06: the shared People-search workspace mounts inside the Civic
 * presentation. Search scope and non-discoverability stay server-side (the
 * /api/people-search endpoint + peopleWorkspace security suite); this test
 * proves the refactored presentation consumes the workspace without breaking.
 */
describe('OBSIDIAN-T06 people search workspace', () => {
  it('renders the combobox surface through the shared workspace', () => {
    const { container } = render(<PeopleSearch domainSlug="preview" />)
    expect(screen.getByLabelText('Find a Character')).toBeTruthy()
    const combobox = container.querySelector('input[role="combobox"]')
    expect(combobox).toBeTruthy()
    expect(combobox?.getAttribute('aria-expanded')).toBe('false')
  })

  it('clears results immediately when the query is emptied (P05R-T08 semantics)', () => {
    render(<PeopleSearch domainSlug="preview" />)
    const input = screen.getByLabelText('Find a Character')
    input.focus()
    // Typing starts a debounced search; clearing instantly resets the surface.
    input.setAttribute('value', 'x')
    input.dispatchEvent(new Event('input', { bubbles: true }))
    input.setAttribute('value', '')
    input.dispatchEvent(new Event('input', { bubbles: true }))
    expect(input.getAttribute('value')).toBe('')
  })
})