import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { SHELL_PREVIEW_MODEL } from '@/lib/design/fixtures'
import type { LedgerConfigV1 } from './config'

import { LedgerShell } from './LedgerShell'
import { LedgerStudioEditor } from './studio/LedgerStudioEditor'
import { ledgerDefaults, validateLedgerConfig } from './config'

// The shell chrome (OperatingContext) is a client component under Next router
// hooks; jsdom has no router, so stub the navigation surface.
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

const THEME = { headerLayout: 'centered', documentStyle: 'classic' }

describe('Ledger shell (T07 owned frame)', () => {
  it('renders a true semantic side rail with identity, primary + management nav, Work, children, and dashboard return', () => {
    const { container } = render(
      <LedgerShell model={SHELL_PREVIEW_MODEL} theme={{ tokens: {}, ...THEME }} designConfig={ledgerDefaults}>
        <p>LEDGER-SHELL-CHILD</p>
      </LedgerShell>,
    )
    expect(container.querySelectorAll('[aria-label="Operating context"]').length).toBe(1)
    const rail = container.querySelector('aside[aria-label="Preview Domain index"]')
    expect(rail).toBeTruthy()
    const identity = screen.getByLabelText('Preview Domain Domain home')
    expect(identity.getAttribute('href')).toBe(SHELL_PREVIEW_MODEL.routes.baseUrl)
    // The rail structurally contains the navigation (not a CSS-reordered header).
    for (const item of SHELL_PREVIEW_MODEL.primaryNavigation) {
      const link = [...(rail?.querySelectorAll('a') ?? [])].find((a) => a.textContent?.trim() === item.label)
      expect(link?.getAttribute('href')).toBe(item.href)
    }
    expect([...(rail?.querySelectorAll('a') ?? [])].find((a) => a.textContent?.trim() === 'Work')?.getAttribute('href')).toBe(SHELL_PREVIEW_MODEL.routes.workUrl)
    for (const item of SHELL_PREVIEW_MODEL.managementNavigation) {
      expect([...(rail?.querySelectorAll('a') ?? [])].some((a) => a.textContent?.trim() === item.label)).toBe(true)
    }
    expect(container.textContent).toContain('LEDGER-SHELL-CHILD')
    expect(screen.getByText('Loreforge dashboard').getAttribute('href')).toBe('/')
  })

  it('applies Ledger rail vocabulary from the resolved config tokens', () => {
    const { container } = render(
      <LedgerShell model={SHELL_PREVIEW_MODEL} theme={{ tokens: {
        '--ledger-rail-width': 'wide',
        '--ledger-rail-density': 'compact',
        '--ledger-masthead': 'folio',
        '--ledger-rules': 'heavy',
      }, ...THEME }} designConfig={ledgerDefaults}>
        <p>c</p>
      </LedgerShell>,
    )
    const root = container.querySelector('[data-template="ledger"]')
    expect(root?.getAttribute('data-rail')).toBe('wide')
    expect(root?.getAttribute('data-density')).toBe('compact')
    expect(root?.getAttribute('data-masthead')).toBe('folio')
    expect(root?.getAttribute('data-rules')).toBe('heavy')
  })

  it('falls back to Ledger defaults when no config tokens are present', () => {
    const { container } = render(
      <LedgerShell model={SHELL_PREVIEW_MODEL} theme={{ tokens: {}, ...THEME }} designConfig={ledgerDefaults}>
        <p>c</p>
      </LedgerShell>,
    )
    const root = container.querySelector('[data-template="ledger"]')
    expect(root?.getAttribute('data-rail')).toBe('standard')
    expect(root?.getAttribute('data-masthead')).toBe('formal')
  })

  it('renders the masthead image from Ledger design media, not the legacy banner field', () => {
    const { container } = render(
      <LedgerShell model={{ ...SHELL_PREVIEW_MODEL, domain: { ...SHELL_PREVIEW_MODEL.domain, bannerUrl: '/legacy/banner.png' } }} designConfig={ledgerDefaults}
        theme={{ tokens: { '--ledger-masthead-image': '/media/ledger-masthead.png' }, ...THEME }}>
        <p>c</p>
      </LedgerShell>,
    )
    const img = container.querySelector('img[src="/media/ledger-masthead.png"]')
    expect(img).toBeTruthy()
    expect(container.querySelector('img[src="/legacy/banner.png"]')).toBeNull()
  })
})

describe('Ledger responsive + reduced-motion paths', () => {
  function stubMatchMedia(query: string, matches: boolean) {
    vi.stubGlobal('matchMedia', vi.fn((q: string) => ({
      matches: q === query ? matches : false,
      media: q,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })))
  }

  it('renders the full nav set under a narrow viewport (responsive smoke)', () => {
    stubMatchMedia('(max-width: 900px)', true)
    const { container } = render(
      <LedgerShell model={SHELL_PREVIEW_MODEL} theme={{ tokens: {}, ...THEME }} designConfig={ledgerDefaults}>
        <p>responsive-child</p>
      </LedgerShell>,
    )
    expect(container.querySelectorAll('nav').length).toBeGreaterThanOrEqual(2)
    expect(container.textContent).toContain('responsive-child')
  })

  it('renders cleanly with prefers-reduced-motion active', () => {
    stubMatchMedia('(prefers-reduced-motion: reduce)', true)
    const { container } = render(
      <LedgerShell model={SHELL_PREVIEW_MODEL} theme={{ tokens: {}, ...THEME }} designConfig={ledgerDefaults}>
        <p>calm-child</p>
      </LedgerShell>,
    )
    expect(container.textContent).toContain('calm-child')
  })

  it('owns responsive and reduced-motion rules in its own stylesheet', () => {
    const source = readFileSync(path.join(__dirname, 'LedgerShell.module.scss'), 'utf8')
    expect(source).toMatch(/@media \(max-width: 900px\)/)
    expect(source).toMatch(/prefers-reduced-motion: reduce/)
  })
})

describe('Ledger Studio', () => {
  it('emits a config that passes Ledger validation when the rail width changes', () => {
    let emitted: LedgerConfigV1 | null = null
    render(
      <LedgerStudioEditor
        value={ledgerDefaults}
        onChange={(next) => { emitted = next }}
        domain={{ name: 'Preview Domain', motto: 'A world worth remembering', logoUrl: null }}
        uploadAsset={async () => ({ url: '/media/mock-ledger.png' })}
      />,
    )
    fireEvent.change(screen.getByLabelText('Rail width'), { target: { value: 'wide' } })
    expect(emitted).not.toBeNull()
    const result = validateLedgerConfig(emitted)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value.rail.width).toBe('wide')
  })

  it('rejects Civic vocabulary in a Ledger config', () => {
    const result = validateLedgerConfig({ ...ledgerDefaults, palette: { primary: '#111111', secondary: '#222222', accent: '#333333', page: '#444444' } })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.join(' ')).toMatch(/palette\.ink/)
  })
})
