// P08D-T03-F: EXPLICIT LEGACY OWNERSHIP. These global axis constants belong to
// the pre-P08D theme-variant era. They are NOT the new runtime contract — a
// first-class Design owns its vocabulary in its own config (Civic
// layout.header, Ledger rail.width, ...). They survive only because legacy
// scalar fields and the transitional studio/resolver still consume them; a new
// Design must not add entries here and T08 removes them.
//
// DESIGN_TEMPLATES / HEADER_LAYOUTS / DOCUMENT_STYLES are re-exported by
// src/lib/theme/fonts.ts for compatibility with existing importers.

import { DESIGN_CATALOG } from '@/lib/design/catalog'
import type { DesignKey } from '@/lib/design/types'

type DesignTemplate = { label: string; description: string }

/** Legacy template metadata is projected from the generated Design catalog. */
export const DESIGN_TEMPLATES = Object.fromEntries(
  DESIGN_CATALOG.map((entry) => [entry.key, { label: entry.name, description: entry.description }]),
) as { [K in DesignKey]: DesignTemplate }

export type DesignTemplateKey = DesignKey

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
