// P08D-T03-F: EXPLICIT LEGACY OWNERSHIP. These global axis constants belong to
// the pre-P08D theme-variant era. They are NOT the new runtime contract — a
// first-class Design owns its vocabulary in its own config (Civic
// layout.header, Ledger rail.width, ...). They survive only because legacy
// scalar fields and the transitional studio/resolver still consume them; a new
// Design must not add entries here and T08 removes them.
//
// DESIGN_TEMPLATES / HEADER_LAYOUTS / DOCUMENT_STYLES are re-exported by
// src/lib/theme/fonts.ts for compatibility with existing importers.

/**
 * First-class design templates (owner decision 2026-09-05): three complete,
 * distinct top-level site designs. Every template consumes the same palette
 * and typography tokens, so each remains fully themeable.
 */
export const DESIGN_TEMPLATES = {
  civic: {
    label: 'Civic (classic community)',
    description: 'An institutional portal: composed masthead, a clear directory, and a structured record grid.',
  },
  ledger: {
    label: 'Ledger (Loreforge print)',
    description: 'An editorial archive: a persistent side index, generous reading column, and a ruled register.',
  },
  poster: {
    label: 'Poster (bold modern)',
    description: 'A cultural publication: monumental type, asymmetric compositions, and graphic destination tiles.',
  },
} as const

export type DesignTemplateKey = keyof typeof DESIGN_TEMPLATES

export const DESIGN_TEMPLATE_OPTIONS = (Object.entries(DESIGN_TEMPLATES) as Array<[DesignTemplateKey, { label: string }]>).map(([value, v]) => ({ value, label: v.label }))

/**
 * Header layouts (owner decision 2026-09-05): three genuinely different
 * navigation/identity presentations, distinct within every design template.
 */
export const HEADER_LAYOUTS = {
  centered: { label: 'Centered masthead' },
  'left-aligned': { label: 'Compact bar' },
  'banner-forward': { label: 'Banner hero' },
} as const

export type HeaderLayoutKey = keyof typeof HEADER_LAYOUTS

export const DOCUMENT_STYLES = {
  classic: { label: 'Classic (serif record sheet)' },
  modern: { label: 'Modern (clean reading)' },
} as const

export type DocumentStyleKey = keyof typeof DOCUMENT_STYLES

export const HEADER_LAYOUT_OPTIONS = (Object.entries(HEADER_LAYOUTS) as Array<[HeaderLayoutKey, { label: string }]>).map(([value, v]) => ({ value, label: v.label }))
export const DOCUMENT_STYLE_OPTIONS = (Object.entries(DOCUMENT_STYLES) as Array<[DocumentStyleKey, { label: string }]>).map(([value, v]) => ({ value, label: v.label }))