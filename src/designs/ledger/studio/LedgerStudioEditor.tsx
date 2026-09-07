'use client'

import type { DesignStudioEditorProps } from '@/lib/design/contracts'
import type { LedgerConfigV1 } from '@/lib/design/contracts'
import { ColorField, ImageField, SectionTitle, SelectField } from '../../shared/studio/fields'

const RAIL_WIDTHS = [
  { value: 'narrow', label: 'Narrow rail' },
  { value: 'standard', label: 'Standard rail' },
  { value: 'wide', label: 'Wide rail' },
]
const DENSITIES = [
  { value: 'airy', label: 'Airy' },
  { value: 'standard', label: 'Standard' },
  { value: 'compact', label: 'Compact' },
]
const MASTHEADS = [
  { value: 'formal', label: 'Formal' },
  { value: 'compact', label: 'Compact' },
  { value: 'folio', label: 'Folio' },
]
const RULES = [
  { value: 'hairline', label: 'Hairline rules' },
  { value: 'standard', label: 'Standard rules' },
  { value: 'heavy', label: 'Heavy rules' },
]
const DOC_TREATMENTS = [
  { value: 'register', label: 'Register (entry-by-entry)' },
  { value: 'docket', label: 'Docket (case jacket)' },
]
const FONT_OPTIONS = [
  { value: 'georgia', label: 'Georgia (traditional serif)' },
  { value: 'palatino', label: 'Palatino (bookish serif)' },
  { value: 'newsreader', label: 'Newsreader (editorial serif)' },
  { value: 'tahoma', label: 'Tahoma (compact sans)' },
  { value: 'trebuchet', label: 'Trebuchet (friendly sans)' },
  { value: 'verdana', label: 'Verdana (readable sans)' },
  { value: 'lato', label: 'Lato (clean sans)' },
]

/**
 * Ledger's own Studio surface — Ledger vocabulary only: ink/paper, rail,
 * rules, register/docket. If this editor had to expose `headerLayout`, the
 * architecture would be unfinished.
 */
export function LedgerStudioEditor({ value, onChange, uploadAsset }: DesignStudioEditorProps<LedgerConfigV1>) {
  const set = (next: LedgerConfigV1) => onChange(next)
  return (
    <div data-ledger-studio>
      <SectionTitle>Ink &amp; paper</SectionTitle>
      <ColorField label="Ink" value={value.palette.ink} onChange={(ink) => set({ ...value, palette: { ...value.palette, ink } })} />
      <ColorField label="Secondary ink" value={value.palette.secondaryInk} onChange={(secondaryInk) => set({ ...value, palette: { ...value.palette, secondaryInk } })} />
      <ColorField label="Accent" value={value.palette.accent} onChange={(accent) => set({ ...value, palette: { ...value.palette, accent } })} />
      <ColorField label="Paper" value={value.palette.paper} onChange={(paper) => set({ ...value, palette: { ...value.palette, paper } })} />

      <SectionTitle>Typography</SectionTitle>
      <SelectField label="Display font" value={value.typography.displayFontKey} options={FONT_OPTIONS} onChange={(displayFontKey) => set({ ...value, typography: { ...value.typography, displayFontKey: displayFontKey as LedgerConfigV1['typography']['displayFontKey'] } })} />
      <SelectField label="Body font" value={value.typography.bodyFontKey} options={FONT_OPTIONS} onChange={(bodyFontKey) => set({ ...value, typography: { ...value.typography, bodyFontKey: bodyFontKey as LedgerConfigV1['typography']['bodyFontKey'] } })} />

      <SectionTitle>Side rail</SectionTitle>
      <SelectField label="Rail width" value={value.rail.width} options={RAIL_WIDTHS} onChange={(width) => set({ ...value, rail: { ...value.rail, width: width as LedgerConfigV1['rail']['width'] } })} />
      <SelectField label="Density" value={value.rail.density} options={DENSITIES} onChange={(density) => set({ ...value, rail: { ...value.rail, density: density as LedgerConfigV1['rail']['density'] } })} />

      <SectionTitle>Masthead</SectionTitle>
      <SelectField label="Masthead treatment" value={value.masthead.treatment} options={MASTHEADS} onChange={(treatment) => set({ ...value, masthead: { ...value.masthead, treatment: treatment as LedgerConfigV1['masthead']['treatment'] } })} />
      <ImageField
        label="Masthead image"
        value={value.masthead.image?.url ?? null}
        onUpload={async (file) => {
          const ref = await uploadAsset(file, 'ledger-masthead')
          set({ ...value, masthead: { ...value.masthead, image: ref } })
        }}
        onClear={() => set({ ...value, masthead: { ...value.masthead, image: null } })}
      />

      <SectionTitle>Rules &amp; document</SectionTitle>
      <SelectField label="Rule strength" value={value.rules.strength} options={RULES} onChange={(strength) => set({ ...value, rules: { strength: strength as LedgerConfigV1['rules']['strength'] } })} />
      <SelectField label="Document treatment" value={value.document.treatment} options={DOC_TREATMENTS} onChange={(treatment) => set({ ...value, document: { treatment: treatment as LedgerConfigV1['document']['treatment'] } })} />
      <ImageField
        label="Paper texture"
        value={value.paperTexture?.url ?? null}
        onUpload={async (file) => {
          const ref = await uploadAsset(file, 'ledger-paper-texture')
          set({ ...value, paperTexture: ref })
        }}
        onClear={() => set({ ...value, paperTexture: null })}
      />
    </div>
  )
}