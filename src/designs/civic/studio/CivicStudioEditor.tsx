'use client'

import type { DesignStudioEditorProps } from '@/lib/design/contracts'
import type { CivicConfigV1 } from '../config'
import { ColorField, ImageField, SectionTitle, SelectField } from '../../shared/studio/fields'

const WIDTHS = [
  { value: 'narrow', label: 'Narrow (focused reading)' },
  { value: 'standard', label: 'Standard' },
  { value: 'wide', label: 'Wide' },
]
const HEADERS = [
  { value: 'centered', label: 'Centered masthead' },
  { value: 'compact', label: 'Compact bar' },
  { value: 'banner', label: 'Banner hero' },
]
const DOC_TREATMENTS = [
  { value: 'classic', label: 'Classic (serif record sheet)' },
  { value: 'modern', label: 'Modern (clean reading)' },
]
const BACKGROUNDS = [
  { value: 'plain', label: 'Plain color' },
  { value: 'washes', label: 'Color washes' },
  { value: 'soft', label: 'Soft texture (needs image)' },
  { value: 'vignette', label: 'Vignette (needs image)' },
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

/** Civic's own Studio surface: institutional palette, typography, layout, and reading treatment. */
export function CivicStudioEditor({ value, onChange, uploadAsset }: DesignStudioEditorProps<CivicConfigV1>) {
  const set = (next: CivicConfigV1) => onChange(next)
  return (
    <div data-civic-studio>
      <SectionTitle>Brand palette</SectionTitle>
      <ColorField label="Primary" value={value.palette.primary} onChange={(primary) => set({ ...value, palette: { ...value.palette, primary } })} />
      <ColorField label="Secondary" value={value.palette.secondary} onChange={(secondary) => set({ ...value, palette: { ...value.palette, secondary } })} />
      <ColorField label="Accent" value={value.palette.accent} onChange={(accent) => set({ ...value, palette: { ...value.palette, accent } })} />
      <ColorField label="Page" value={value.palette.page} onChange={(page) => set({ ...value, palette: { ...value.palette, page } })} />

      <SectionTitle>Typography</SectionTitle>
      <SelectField label="Heading font" value={value.typography.headingFontKey} options={FONT_OPTIONS} onChange={(headingFontKey) => set({ ...value, typography: { ...value.typography, headingFontKey: headingFontKey as CivicConfigV1['typography']['headingFontKey'] } })} />
      <SelectField label="Body font" value={value.typography.bodyFontKey} options={FONT_OPTIONS} onChange={(bodyFontKey) => set({ ...value, typography: { ...value.typography, bodyFontKey: bodyFontKey as CivicConfigV1['typography']['bodyFontKey'] } })} />

      <SectionTitle>Layout</SectionTitle>
      <SelectField label="Site width" value={value.layout.width} options={WIDTHS} onChange={(width) => set({ ...value, layout: { ...value.layout, width: width as CivicConfigV1['layout']['width'] } })} />
      <SelectField label="Masthead" value={value.layout.header} options={HEADERS} onChange={(header) => set({ ...value, layout: { ...value.layout, header: header as CivicConfigV1['layout']['header'] } })} />

      <SectionTitle>Document reading</SectionTitle>
      <SelectField label="Record treatment" value={value.document.treatment} options={DOC_TREATMENTS} onChange={(treatment) => set({ ...value, document: { treatment: treatment as CivicConfigV1['document']['treatment'] } })} />

      <SectionTitle>Background &amp; banner</SectionTitle>
      <SelectField label="Background treatment" value={value.background.treatment} options={BACKGROUNDS} onChange={(treatment) => set({ ...value, background: { ...value.background, treatment: treatment as CivicConfigV1['background']['treatment'] } })} />
      <ImageField
        label="Background image"
        value={value.background.image?.url ?? null}
        onUpload={async (file) => {
          const ref = await uploadAsset(file, 'civic-background')
          set({ ...value, background: { ...value.background, image: ref } })
        }}
        onClear={() => set({ ...value, background: { ...value.background, image: null } })}
      />
      <ImageField
        label="Banner image"
        value={value.banner.image?.url ?? null}
        onUpload={async (file) => {
          const ref = await uploadAsset(file, 'civic-banner')
          set({ ...value, banner: { image: ref } })
        }}
        onClear={() => set({ ...value, banner: { image: null } })}
      />
    </div>
  )
}
