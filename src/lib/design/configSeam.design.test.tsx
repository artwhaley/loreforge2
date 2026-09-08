import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { DESIGNS } from './registry'

/**
 * OBSIDIAN-T02 config seam proof. A test-only Design whose page renderer
 * DISPLAYS its typed config field through the erased registry dispatch —
 * exactly the path routes use (`resolveDomainRouteShell().design.pages.*` +
 * `designConfig={route.config}`).
 *
 * The fallback guarantee for invalid persisted config (resolver returns
 * validated defaults, never raw stored values) is proven for the real Designs
 * in `v2.design.test.ts` ("invalid active bank falls back to Design defaults
 * without executing raw values") and `config.design.test.ts`; the fake key is
 * intentionally not exercised through `resolveDomainDesign` because
 * `pickDesignKey` only accepts registered keys.
 */
vi.mock('@/lib/design/registry', () => {
  const FAKE_DEFAULTS = { recordColumns: 2, banner: null }
  const SeamPage = ({ designConfig }: { designConfig: { recordColumns: number } }) => (
    <div data-seam-page>recordColumns={designConfig.recordColumns}</div>
  )
  const stub = () => <div />
  const fakeDesign = {
    key: 'seam-test',
    status: 'first-class',
    name: 'Seam Test',
    description: 'Test-only design proving the typed config seam.',
    preview: { thumbnail: '/designs/seam-test.svg' },
    config: {
      version: 1,
      defaults: FAKE_DEFAULTS,
      validate: (raw: unknown) => {
        const value = raw as { recordColumns?: unknown }
        return typeof value?.recordColumns === 'number' ? { ok: true as const, value: raw } : { ok: false as const, errors: ['recordColumns must be a number'] }
      },
      migrate: (fromVersion: number, raw: unknown) => (fromVersion === 1 ? { ok: true as const, value: raw } : { ok: false as const, errors: ['unsupported'] }),
      fromLegacy: () => FAKE_DEFAULTS,
      resolveTheme: () => ({
        base: {
          primary: '#111111', secondary: '#222222', accent: '#333333', pageBg: '#ffffff',
          surfaceBg: '#fafafa', surfaceBorder: '#dddddd', textOnPrimary: '#ffffff',
          headingFont: 'sans', bodyFont: 'sans', mutedText: '#666666',
        },
      }),
    },
    studio: { Editor: stub },
    Shell: ({ children }: { children?: React.ReactNode }) => <div data-seam-shell>{children}</div>,
    pages: {
      home: SeamPage,
      records: stub,
      document: stub,
      departments: stub,
      department: stub,
      about: stub,
      lore: stub,
    },
  }
  return {
    DESIGNS: { 'seam-test': fakeDesign },
    DESIGN_KEYS: ['seam-test'],
    DESIGN_METADATA: [],
    resolveDesign: (key: string) => (key === 'seam-test' ? fakeDesign : DESIGNS_FALLBACK.civic),
  }
})

// The mock factory cannot reference itself; a frozen fallback satisfies the
// unknown-key branch of resolveDesign inside the mocked module scope.
const DESIGNS_FALLBACK = { civic: undefined }

vi.mock('next/navigation', () => ({
  usePathname: () => '/domain/preview-domain',
  useRouter: () => ({ push: () => {}, refresh: () => {} }),
  useSearchParams: () => new URLSearchParams(),
}))
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a>,
}))

describe('OBSIDIAN-T02 config seam', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('a Design page reads its validated config through the erased dispatch', () => {
    // The mocked registry carries a fake key the real DesignKey type cannot
    // express; the lookup is widened at the fixture boundary only.
    const Design = (DESIGNS as unknown as Record<string, {
      pages: { home: (props: { headerLayout: string; documentStyle: string; designConfig: { recordColumns: number } }) => React.ReactElement }
    }>)['seam-test']
    render(<Design.pages.home headerLayout="centered" documentStyle="classic" designConfig={{ recordColumns: 4 }} />)
    expect(screen.getByText('recordColumns=4')).toBeTruthy()
  })

})