import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { SHELL_PREVIEW_MODEL } from '@/lib/design/fixtures'
import type { CivicConfigV1 } from './config'

import { CivicShell } from './CivicShell'
import { CivicStudioEditor } from './studio/CivicStudioEditor'
import { civicDefaults, validateCivicConfig } from './config'

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

describe('Civic shell (T06 owned frame)', () => {
  it('renders operating context once, identity, primary + management nav, Work, children, and dashboard return', () => {
    const { container } = render(
      <CivicShell model={SHELL_PREVIEW_MODEL} theme={{ tokens: {}, ...THEME }} designConfig={civicDefaults}>
        <p>CIVIC-SHELL-CHILD</p>
      </CivicShell>,
    )
    expect(container.querySelectorAll('[aria-label="Operating context"]').length).toBe(1)
    expect(container.querySelectorAll('#tenant-switcher').length).toBe(1)
    const identity = screen.getByLabelText('Preview Domain Domain home')
    expect(identity.getAttribute('href')).toBe(SHELL_PREVIEW_MODEL.routes.baseUrl)
    for (const item of SHELL_PREVIEW_MODEL.primaryNavigation) {
      expect(screen.getAllByText(item.label).some((el) => el.getAttribute('href') === item.href)).toBe(true)
    }
    expect(screen.getAllByText('Work').some((el) => el.getAttribute('href') === SHELL_PREVIEW_MODEL.routes.workUrl)).toBe(true)
    for (const item of SHELL_PREVIEW_MODEL.managementNavigation) {
      expect(screen.getAllByText(item.label).some((el) => el.getAttribute('href') === item.href)).toBe(true)
    }
    expect(container.textContent).toContain('CIVIC-SHELL-CHILD')
    expect(screen.getByText('Loreforge dashboard').getAttribute('href')).toBe('/')
  })

  it.each(['centered', 'compact', 'banner'] as const)('applies the %s header posture from the resolved Civic config', (header) => {
    const { container } = render(
      <CivicShell model={SHELL_PREVIEW_MODEL} theme={{ tokens: { '--civic-header': header }, ...THEME }} designConfig={civicDefaults}>
        <p>c</p>
      </CivicShell>,
    )
    const root = container.querySelector('[data-template="civic"]')
    expect(root?.getAttribute('data-header')).toBe(header)
  })

  it('falls back to the centered posture when no Civic header token is present', () => {
    const { container } = render(
      <CivicShell model={SHELL_PREVIEW_MODEL} theme={{ tokens: {}, ...THEME }} designConfig={civicDefaults}>
        <p>c</p>
      </CivicShell>,
    )
    expect(container.querySelector('[data-template="civic"]')?.getAttribute('data-header')).toBe('centered')
  })
})

describe('Civic responsive + reduced-motion paths', () => {
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
      <CivicShell model={SHELL_PREVIEW_MODEL} theme={{ tokens: {}, ...THEME }} designConfig={civicDefaults}>
        <p>responsive-child</p>
      </CivicShell>,
    )
    expect(container.querySelectorAll('nav').length).toBeGreaterThanOrEqual(2)
    expect(container.textContent).toContain('responsive-child')
  })

  it('renders cleanly with prefers-reduced-motion active', () => {
    stubMatchMedia('(prefers-reduced-motion: reduce)', true)
    const { container } = render(
      <CivicShell model={SHELL_PREVIEW_MODEL} theme={{ tokens: {}, ...THEME }} designConfig={civicDefaults}>
        <p>calm-child</p>
      </CivicShell>,
    )
    expect(container.textContent).toContain('calm-child')
  })

  it('owns responsive and reduced-motion rules in its own stylesheet (no shared template styling)', () => {
    const source = readFileSync(path.join(__dirname, 'CivicShell.module.css'), 'utf8')
    expect(source).toMatch(/@media \(max-width: 900px\)/)
    expect(source).toMatch(/prefers-reduced-motion: reduce/)
  })
})

describe('Civic Studio', () => {
  it('emits a config that passes Civic validation when the masthead posture changes', () => {
    let emitted: CivicConfigV1 | null = null
    render(
      <CivicStudioEditor
        value={civicDefaults}
        onChange={(next) => { emitted = next }}
        domain={{ name: 'Preview Domain', motto: 'A world worth remembering', logoUrl: null }}
        uploadAsset={async () => ({ url: '/media/mock-civic.png' })}
      />,
    )
    fireEvent.change(screen.getByLabelText('Masthead'), { target: { value: 'compact' } })
    expect(emitted).not.toBeNull()
    const result = validateCivicConfig(emitted)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value.layout.header).toBe('compact')
  })

  it('rejects a color outside the supported #rrggbb format', () => {
    const result = validateCivicConfig({ ...civicDefaults, palette: { ...civicDefaults.palette, primary: 'red' } })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.join(' ')).toMatch(/palette\.primary/)
  })
})
