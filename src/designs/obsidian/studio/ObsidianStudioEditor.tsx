'use client'

import type { DesignStudioEditorProps } from '@/lib/design/contracts'
import type { ObsidianConfigV1 } from '../config'
import { ColorField, ImageField, RangeField, SectionTitle, SelectField } from '../../shared/studio/fields'

const VIEWS = [
  { value: 'cards', label: 'Cards (gallery)' },
  { value: 'list', label: 'List (dense index)' },
]
const CARD_SIZES = [
  { value: '6', label: '6 per page' },
  { value: '12', label: '12 per page' },
  { value: '24', label: '24 per page' },
]
const LIST_SIZES = [
  { value: '25', label: '25 per page' },
  { value: '50', label: '50 per page' },
  { value: '100', label: '100 per page' },
]

/**
 * Obsidian's own Studio surface (OBSIDIAN-T11): night-harbour palette,
 * bounded geometry, Records defaults, and the atmosphere asset. Draft
 * changes drive the live preview immediately; the host owns save/revert.
 */
export function ObsidianStudioEditor({ value, onChange, uploadAsset }: DesignStudioEditorProps<ObsidianConfigV1>) {
  const set = (next: ObsidianConfigV1) => onChange(next)
  return (
    <div data-obsidian-studio>
      <SectionTitle>Harbour palette</SectionTitle>
      <ColorField label="Deep background" value={value.palette.background} onChange={(background) => set({ ...value, palette: { ...value.palette, background } })} />
      <ColorField label="Surface" value={value.palette.surface} onChange={(surface) => set({ ...value, palette: { ...value.palette, surface } })} />
      <ColorField label="Text" value={value.palette.text} onChange={(text) => set({ ...value, palette: { ...value.palette, text } })} />
      <ColorField label="Muted text" value={value.palette.muted} onChange={(muted) => set({ ...value, palette: { ...value.palette, muted } })} />
      <ColorField label="Luminous accent" value={value.palette.accent} onChange={(accent) => set({ ...value, palette: { ...value.palette, accent } })} />

      <SectionTitle>Geometry</SectionTitle>
      <RangeField label="Content width" min={720} max={2400} step={20} value={value.geometry.contentMax} onChange={(contentMax) => set({ ...value, geometry: { ...value.geometry, contentMax } })} format={(px) => `${px}px`} />
      <RangeField label="Page gutter" min={0} max={160} step={4} value={value.geometry.pageGutter} onChange={(pageGutter) => set({ ...value, geometry: { ...value.geometry, pageGutter } })} format={(px) => `${px}px`} />
      <RangeField label="Surface radius" min={0} max={48} step={2} value={value.geometry.surfaceRadius} onChange={(surfaceRadius) => set({ ...value, geometry: { ...value.geometry, surfaceRadius } })} format={(px) => `${px}px`} />

      <SectionTitle>Records</SectionTitle>
      <SelectField label="Default view" value={value.records.defaultView} options={VIEWS} onChange={(defaultView) => set({ ...value, records: { ...value.records, defaultView: defaultView as ObsidianConfigV1['records']['defaultView'] } })} />
      <SelectField label="Card page size" value={String(value.records.cardPageSize)} options={CARD_SIZES} onChange={(next) => set({ ...value, records: { ...value.records, cardPageSize: Number(next) as ObsidianConfigV1['records']['cardPageSize'] } })} />
      <SelectField label="List page size" value={String(value.records.listPageSize)} options={LIST_SIZES} onChange={(next) => set({ ...value, records: { ...value.records, listPageSize: Number(next) as ObsidianConfigV1['records']['listPageSize'] } })} />

      <SectionTitle>Atmosphere</SectionTitle>
      <ImageField
        label="Atmosphere image"
        value={value.atmosphere?.url ?? null}
        onUpload={async (file) => {
          const ref = await uploadAsset(file, 'obsidian-atmosphere')
          set({ ...value, atmosphere: ref })
        }}
        onClear={() => set({ ...value, atmosphere: null })}
      />
    </div>
  )
}
