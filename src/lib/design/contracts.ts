// P08D first-class Design contract (03_TARGET_CONTRACTS.md). Pure types only —
// no React runtime, no Payload, no auth — so Payload/schema-safe code may
// import them. The Design config vocabularies live HERE, owned by the
// Designs: Civic speaks palette/layout.header, Ledger speaks ink/rail.width.
// There is no shared HEADER_LAYOUTS validator in this contract.
import type { ComponentType } from 'react'

// ---------------------------------------------------------------------------
// Cross-cutting types
// ---------------------------------------------------------------------------

export type DesignStatus = 'first-class' | 'compatibility'

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; errors: string[] }

/** A local authorized media reference only: /media/... URLs. (G14) */
export type DesignAssetRef = {
  url: string
}

/** Curated font keys (mirror of the FONT_STACKS allowlist). */
export type FontKey =
  | 'georgia'
  | 'palatino'
  | 'newsreader'
  | 'tahoma'
  | 'trebuchet'
  | 'verdana'
  | 'lato'

export const FONT_KEYS: readonly FontKey[] = [
  'georgia',
  'palatino',
  'newsreader',
  'tahoma',
  'trebuchet',
  'verdana',
  'lato',
]

/**
 * Universal base visual bridge every first-class Design resolves from its own
 * config. Serialized to the --tenant-* variables (03_TARGET_CONTRACTS §4).
 * Design-specific variables use Design prefixes and never join this set (G13).
 */
export type BaseDesignTheme = {
  primary: string
  secondary: string
  accent: string
  pageBg: string
  surfaceBg: string
  surfaceBorder: string
  textOnPrimary: string
  headingFont: string
  bodyFont: string
  mutedText: string
}

export const BASE_THEME_VARS = {
  primary: '--tenant-primary',
  secondary: '--tenant-secondary',
  accent: '--tenant-accent',
  pageBg: '--tenant-page-bg',
  surfaceBg: '--tenant-surface-bg',
  surfaceBorder: '--tenant-surface-border',
  textOnPrimary: '--tenant-text-on-primary',
  headingFont: '--tenant-heading-font',
  bodyFont: '--tenant-body-font',
  mutedText: '--tenant-muted-text',
} as const

// ---------------------------------------------------------------------------
// Design Studio editor contract
// ---------------------------------------------------------------------------

/**
 * A Design's Studio editor receives draft config plus the Domain identity
 * facts it may need, and reports changes through onChange. The editor never
 * saves directly and never queries the database — the host owns save,
 * validation, revert, and media upload plumbing.
 */
export type DesignStudioEditorProps<TConfig> = {
  value: TConfig
  onChange(next: TConfig): void

  domain: {
    name: string
    motto: string
    logoUrl: string | null
  }

  uploadAsset(file: File, purpose: string): Promise<DesignAssetRef>
}

// ---------------------------------------------------------------------------
// Civic config v1 (first-class proof layer)
// ---------------------------------------------------------------------------

export type CivicConfigV1 = {
  palette: {
    primary: string
    secondary: string
    accent: string
    page: string
  }
  typography: {
    headingFontKey: FontKey
    bodyFontKey: FontKey
  }
  layout: {
    width: 'narrow' | 'standard' | 'wide'
    header: 'centered' | 'compact' | 'banner'
  }
  document: {
    treatment: 'classic' | 'modern'
  }
  background: {
    treatment: 'plain' | 'washes' | 'soft' | 'vignette'
    image: DesignAssetRef | null
  }
  banner: {
    image: DesignAssetRef | null
  }
}

// ---------------------------------------------------------------------------
// Ledger config v1 (second first-class proof layer — different vocabulary)
// ---------------------------------------------------------------------------

export type LedgerConfigV1 = {
  palette: {
    ink: string
    secondaryInk: string
    accent: string
    paper: string
  }
  typography: {
    displayFontKey: FontKey
    bodyFontKey: FontKey
  }
  rail: {
    width: 'narrow' | 'standard' | 'wide'
    density: 'airy' | 'standard' | 'compact'
  }
  masthead: {
    treatment: 'formal' | 'compact' | 'folio'
    image: DesignAssetRef | null
  }
  rules: {
    strength: 'hairline' | 'standard' | 'heavy'
  }
  document: {
    treatment: 'register' | 'docket'
  }
  paperTexture: DesignAssetRef | null
}

// ---------------------------------------------------------------------------
// Obsidian config v1 (night-harbour Design — ported from the incubation
// vocabulary, production-validated). OBSIDIAN-T11.
// ---------------------------------------------------------------------------

export type ObsidianConfigV1 = {
  palette: {
    background: string
    surface: string
    text: string
    muted: string
    accent: string
  }
  geometry: {
    /** Content max width in px, bounded. */
    contentMax: number
    /** Page gutter in px, bounded. */
    pageGutter: number
    /** Surface corner radius in px, bounded. */
    surfaceRadius: number
  }
  records: {
    defaultView: 'cards' | 'list'
    cardPageSize: 6 | 12 | 24
    listPageSize: 25 | 50 | 100
  }
  /** Persisted local media reference; null renders the CSS/gradient fallback. */
  atmosphere: DesignAssetRef | null
}

// ---------------------------------------------------------------------------
// Poster config v1 (compatibility Design — deliberately small vocabulary)
// ---------------------------------------------------------------------------

export type PosterConfigV1 = {
  palette: {
    primary: string
    accent: string
    page: string
  }
  typography: {
    displayFontKey: FontKey
    bodyFontKey: FontKey
  }
  masthead: {
    treatment: 'bold' | 'stacked'
  }
  document: {
    treatment: 'feature' | 'brief'
  }
}

// ---------------------------------------------------------------------------
// Definition-time types
// ---------------------------------------------------------------------------

/** Legacy scalar appearance fields (compatibility/rollback only, T04+). */
export type LegacyDomainAppearance = {
  designTemplate?: unknown
  headerLayout?: unknown
  documentStyle?: unknown
  primaryColor?: unknown
  secondaryColor?: unknown
  accentColor?: unknown
  backgroundColor?: unknown
  headingFontKey?: unknown
  bodyFontKey?: unknown
  contentWidth?: unknown
  designConfig?: unknown
  backgroundTreatment?: unknown
}

/**
 * A Design's own Studio surface. Reusable input primitives are encouraged;
 * the layout and concepts belong to the Design (G6).
 */
export type DesignStudio = {
  Editor: ComponentType<DesignStudioEditorProps<object>>
}