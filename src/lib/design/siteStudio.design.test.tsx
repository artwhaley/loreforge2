import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { SiteStudio } from '@/components/site-studio/SiteStudio'
import { saveSiteDesignAction } from '@/lib/actions/saveSiteDesign'

/**
 * P08D-T05 genericity proof. The registry is mocked with a test-only fake
 * Design whose config vocabulary (glow / borderStyle / parallax) appears
 * NOWHERE in the SiteStudio host source. The host must mount its editor,
 * flow its changes into the draft state, and save its bank unchanged —
 * without any host knowledge of the config shape and without any
 * switch(activeDesign) field branching.
 */
vi.mock('@/lib/design/registry', () => {
  const FAKE_DEFAULTS = { glow: '#ffe08a', borderStyle: 'dashed', parallax: 0.5 }
  const FakeEditor = ({ value, onChange }: { value: Record<string, unknown>; onChange(next: Record<string, unknown>): void }) => (
    <div data-fake-studio>
      <span data-testid="fake-glow">{String(value.glow)}</span>
      <button type="button" onClick={() => onChange({ ...value, glow: '#00ff88' })}>change glow</button>
    </div>
  )
  const stubPage = () => <div data-fake-page />
  const fakeDesign = {
    key: 'fake',
    status: 'first-class',
    name: 'Fake Neon',
    description: 'Test-only design whose config fields SiteStudio has never heard of.',
    preview: { thumbnail: '/designs/fake.svg' },
    config: {
      version: 1,
      defaults: FAKE_DEFAULTS,
      validate: (raw: unknown) => ({ ok: true, value: raw }),
      migrate: (_version: number, raw: unknown) => ({ ok: true, value: raw }),
      resolveTheme: (config: { glow?: string; borderStyle?: string }) => ({
        base: {
          primary: '#111111', secondary: '#222222', accent: '#333333', pageBg: '#0b0b12',
          surfaceBg: '#151525', surfaceBorder: '#ffe08a', textOnPrimary: '#ffffff',
          headingFont: 'monospace', bodyFont: 'monospace', mutedText: '#777777',
        },
        vars: { '--fake-glow': config.glow ?? '#ffe08a', '--fake-border': config.borderStyle ?? 'dashed' },
      }),
    },
    studio: { Editor: FakeEditor },
    Shell: ({ children }: { children?: React.ReactNode }) => <div data-fake-shell>{children}</div>,
    pages: { home: stubPage, records: stubPage, document: stubPage, departments: stubPage, department: stubPage, about: stubPage, lore: stubPage },
  }
  return {
    DESIGNS: { fake: fakeDesign },
    DESIGN_KEYS: ['fake'],
    DESIGN_METADATA: [{ key: 'fake', status: 'first-class', name: 'Fake Neon', description: 'Test-only design', thumbnail: '/designs/fake.svg' }],
    resolveDesign: () => fakeDesign,
  }
})

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
vi.mock('@/lib/actions/saveSiteDesign', () => ({
  saveSiteDesignAction: vi.fn(async () => ({ ok: true })),
}))
vi.mock('@/lib/actions/uploadDesignAsset', () => ({
  uploadDesignAssetAction: vi.fn(async () => ({ ok: true, ref: { url: '/media/fake.png' } })),
}))
vi.mock('@/lib/actions/uploadThemeAsset', () => ({
  uploadThemeAssetAction: vi.fn(async () => ({ ok: true, url: '/media/logo.png' })),
}))

const FAKE_DEFAULTS = { glow: '#ffe08a', borderStyle: 'dashed', parallax: 0.5 }

describe('P08D-T05 Site Studio genericity', () => {
  beforeEach(() => {
    // PreviewViewport observes its host; jsdom has no ResizeObserver.
    class ResizeObserverStub {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    vi.stubGlobal('ResizeObserver', ResizeObserverStub)
    vi.mocked(saveSiteDesignAction).mockClear()
  })

  it('mounts a Design-owned editor whose config fields the host has never heard of', () => {
    const { container } = render(<SiteStudio
      tenantSlug="preview"
      domainIdentity={{ name: 'Preview Domain', motto: 'A world worth remembering', logoUrl: null }}
      initialBanks={{ fake: { version: 1, config: FAKE_DEFAULTS } }}
      initialActiveDesign="fake"
    />)
    expect(screen.getByTestId('fake-glow').textContent).toBe('#ffe08a')
    expect(screen.getByText('Fake Neon settings')).toBeTruthy()
    // The picker uses the registry-provided real thumbnail — no shared wireframe.
    const thumb = Array.from(container.querySelectorAll('img')).find((img) => img.getAttribute('src') === '/designs/fake.svg')
    expect(thumb).toBeTruthy()
  })

  it('flows editor changes into the host draft, marks dirty, and saves the unknown bank unchanged', async () => {
    render(<SiteStudio
      tenantSlug="preview"
      domainIdentity={{ name: 'Preview Domain', motto: 'A world worth remembering', logoUrl: null }}
      initialBanks={{ fake: { version: 1, config: FAKE_DEFAULTS } }}
      initialActiveDesign="fake"
    />)

    await screen.getByRole('button', { name: 'change glow' }).click()
    expect(screen.getByTestId('fake-glow').textContent).toBe('#00ff88')
    // The host derived dirty from the draft vs. saved — no field knowledge needed.
    expect(screen.getByText('unsaved')).toBeTruthy()

    await screen.getByRole('button', { name: 'Save changes' }).click()
    await waitFor(() => expect(screen.getByText('Saved')).toBeTruthy())
    expect(saveSiteDesignAction).toHaveBeenCalledWith({
      tenantSlug: 'preview',
      activeDesign: 'fake',
      banks: { fake: { version: 1, config: { ...FAKE_DEFAULTS, glow: '#00ff88' } } },
    })
  })

  it('revert restores the saved bank for the selected Design', async () => {
    render(<SiteStudio
      tenantSlug="preview"
      domainIdentity={{ name: 'Preview Domain', motto: 'A world worth remembering', logoUrl: null }}
      initialBanks={{ fake: { version: 1, config: FAKE_DEFAULTS } }}
      initialActiveDesign="fake"
    />)

    await screen.getByRole('button', { name: 'change glow' }).click()
    expect(screen.getByTestId('fake-glow').textContent).toBe('#00ff88')
    await screen.getByRole('button', { name: 'Revert unsaved' }).click()
    expect(screen.getByTestId('fake-glow').textContent).toBe('#ffe08a')
    expect(screen.queryByText('unsaved')).toBeNull()
  })
})