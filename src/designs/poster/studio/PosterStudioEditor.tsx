'use client'

import type { DesignStudioEditorProps } from '@/lib/design/contracts'
import type { PosterConfigV1 } from '@/lib/design/contracts'
import { ColorField, SectionTitle, SelectField } from '../../shared/studio/fields'

const MASTHEADS = [
  { value: 'bold', label: 'Bold wordmark' },
  { value: 'stacked', label: 'Stacked title' },
]
const DOC_TREATMENTS = [
  { value: 'feature', label: 'Feature spread' },
  { value: 'brief', label: 'Brief note' },
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

/** Poster's compatibility Studio surface — deliberately small. */
export function PosterStudioEditor({ value, onChange }: DesignStudioEditorProps<PosterConfigV1>) {
  const set = (next: PosterConfigV1) => onChange(next)
  return (
    <div data-poster-studio>
      <SectionTitle>Palette</SectionTitle>
      <ColorField label="Primary" value={value.palette.primary} onChange={(primary) => set({ ...value, palette: { ...value.palette, primary } })} />
      <ColorField label="Accent" value={value.palette.accent} onChange={(accent) => set({ ...value, palette: { ...value.palette, accent } })} />
      <ColorField label="Page" value={value.palette.page} onChange={(page) => set({ ...value, palette: { ...value.palette, page } })} />

      <SectionTitle>Typography</SectionTitle>
      <SelectField label="Display font" value={value.typography.displayFontKey} options={FONT_OPTIONS} onChange={(displayFontKey) => set({ ...value, typography: { ...value.typography, displayFontKey: displayFontKey as PosterConfigV1['typography']['displayFontKey'] } })} />
      <SelectField label="Body font" value={value.typography.bodyFontKey} options={FONT_OPTIONS} onChange={(bodyFontKey) => set({ ...value, typography: { ...value.typography, bodyFontKey: bodyFontKey as PosterConfigV1['typography']['bodyFontKey'] } })} />

      <SectionTitle>Composition</SectionTitle>
      <SelectField label="Masthead" value={value.masthead.treatment} options={MASTHEADS} onChange={(treatment) => set({ ...value, masthead: { treatment: treatment as PosterConfigV1['masthead']['treatment'] } })} />
      <SelectField label="Document treatment" value={value.document.treatment} options={DOC_TREATMENTS} onChange={(treatment) => set({ ...value, document: { treatment: treatment as PosterConfigV1['document']['treatment'] } })} />
    </div>
  )
}