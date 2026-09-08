import type { DesignDefinition } from '@/lib/design/types'
import type { ValidationResult } from '@/lib/design/contracts'

type PortabilityProbeConfig = {
  tone: 'quiet'
}

const defaults: PortabilityProbeConfig = { tone: 'quiet' }

const validate = (raw: unknown): ValidationResult<PortabilityProbeConfig> =>
  raw && typeof raw === 'object' && (raw as { tone?: unknown }).tone === 'quiet'
    ? { ok: true, value: defaults }
    : { ok: false, errors: ['tone must be quiet'] }

const probe: DesignDefinition<PortabilityProbeConfig> = {
  key: 'portability-probe',
  status: 'compatibility',
  name: 'Portability Probe',
  description: 'A minimal compile-time fixture for the portable Design folder contract.',
  preview: { thumbnail: '/design-assets/portability-probe/thumbnail.svg' },
  config: {
    version: 1,
    defaults,
    validate,
    migrate: (_fromVersion, raw) => validate(raw),
    resolveTheme: () => ({
      base: {
        primary: '#253243',
        secondary: '#33445a',
        accent: '#d8b36a',
        pageBg: '#f5f3ee',
        surfaceBg: '#ffffff',
        surfaceBorder: '#d6d0c4',
        textOnPrimary: '#ffffff',
        headingFont: 'Georgia, serif',
        bodyFont: 'Verdana, sans-serif',
        mutedText: '#5e6874',
      },
      vars: { '--probe-tone': 'quiet' },
    }),
  },
  studio: { Editor: () => null },
  Shell: ({ children }) => children,
  pages: {
    home: () => null,
    records: () => null,
    document: () => null,
    departments: () => null,
    department: () => null,
    about: () => null,
    lore: () => null,
    work: () => null,
    members: () => null,
    management: {
      departments: () => null,
      folders: () => null,
      roles: () => null,
      documentTypes: () => null,
      people: () => null,
      person: () => null,
      invitations: () => null,
    },
  },
}

export { probe }
export default probe
