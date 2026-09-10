'use client'

import { FONT_KEYS } from '@/lib/design/contracts'

/**
 * Reusable Studio input primitives (G6). These are neutral controls — no
 * Design vocabulary, no art direction. Each Design's Studio editor composes
 * them with its own labels, options, and layout. P08D-T05: the low-level
 * helper set a Design may use — SegmentedChoice / ChoiceCards / ColorField /
 * FontField / RangeField / ToggleField / DesignAssetField / SelectField.
 */

const FONT_LABELS: Record<string, string> = {
  georgia: 'Georgia (traditional serif)',
  palatino: 'Palatino (bookish serif)',
  newsreader: 'Newsreader (editorial serif)',
  tahoma: 'Tahoma (compact sans)',
  trebuchet: 'Trebuchet (friendly sans)',
  verdana: 'Verdana (readable sans)',
  lato: 'Lato (clean sans)',
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 style={{ margin: '0 0 .5rem', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{children}</h3>
}

export function ColorField({ label, value, onChange }: { label: string; value: string; onChange(next: string): void }) {
  return (
    <label style={{ display: 'grid', gap: '.3rem', marginBottom: '.6rem' }}>
      <span style={{ fontSize: '.8rem', fontWeight: 600 }}>{label}</span>
      <input
        type="color"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        style={{ width: '100%', height: '2.2rem', border: '1px solid #cbd2d9', borderRadius: 4, background: '#fff', padding: 2 }}
      />
    </label>
  )
}

export function SelectField({ label, value, options, onChange }: { label: string; value: string; options: Array<{ value: string; label: string }>; onChange(next: string): void }) {
  return (
    <label style={{ display: 'grid', gap: '.3rem', marginBottom: '.6rem' }}>
      <span style={{ fontSize: '.8rem', fontWeight: 600 }}>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} style={{ width: '100%', padding: '.45rem .5rem', borderRadius: 4, border: '1px solid #cbd2d9', background: '#fff', color: '#243145' }}>
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  )
}

/** Curated-font picker over the platform allowlist (contract FONT_KEYS). */
export function FontField({ label, value, onChange }: { label: string; value: string; onChange(next: string): void }) {
  return (
    <SelectField
      label={label}
      value={value}
      options={FONT_KEYS.map((key) => ({ value: key, label: FONT_LABELS[key] ?? key }))}
      onChange={onChange}
    />
  )
}

/** Single-select segmented row for short option lists. */
export function SegmentedChoice({ label, value, options, onChange }: {
  label: string
  value: string
  options: Array<{ value: string; label: string }>
  onChange(next: string): void
}) {
  return (
    <fieldset style={{ border: 0, padding: 0, margin: '0 0 .6rem', display: 'grid', gap: '.3rem' }}>
      <legend style={{ fontSize: '.8rem', fontWeight: 600, padding: 0 }}>{label}</legend>
      <div role="group" aria-label={label} style={{ display: 'flex', gap: '.25rem', flexWrap: 'wrap' }}>
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={value === option.value}
            onClick={() => onChange(option.value)}
            style={{
              flex: '1 1 auto',
              padding: '.4rem .6rem',
              borderRadius: 4,
              border: `1px solid ${value === option.value ? '#243145' : '#cbd2d9'}`,
              background: value === option.value ? '#243145' : '#fff',
              color: value === option.value ? '#fff' : '#243145',
              fontSize: '.78rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {option.label}
          </button>
        ))}
      </div>
    </fieldset>
  )
}

/** Descriptive choice cards for options that need a sentence each. */
export function ChoiceCards({ label, value, options, onChange }: {
  label: string
  value: string
  options: Array<{ value: string; label: string; description?: string }>
  onChange(next: string): void
}) {
  return (
    <fieldset style={{ border: 0, padding: 0, margin: '0 0 .6rem', display: 'grid', gap: '.3rem' }}>
      <legend style={{ fontSize: '.8rem', fontWeight: 600, padding: 0 }}>{label}</legend>
      <div style={{ display: 'grid', gap: '.3rem' }}>
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={value === option.value}
            onClick={() => onChange(option.value)}
            style={{
              textAlign: 'left',
              padding: '.5rem .6rem',
              borderRadius: 4,
              border: `1px solid ${value === option.value ? '#243145' : '#cbd2d9'}`,
              background: value === option.value ? '#eef2f7' : '#fff',
              cursor: 'pointer',
            }}
          >
            <span style={{ display: 'block', fontSize: '.8rem', fontWeight: 600, color: '#243145' }}>{option.label}</span>
            {option.description ? <span style={{ display: 'block', fontSize: '.72rem', color: '#556' }}>{option.description}</span> : null}
          </button>
        ))}
      </div>
    </fieldset>
  )
}

export function RangeField({ label, min, max, step, value, onChange, format }: {
  label: string
  min: number
  max: number
  step: number
  value: number
  onChange(next: number): void
  format?: (value: number) => string
}) {
  return (
    <label style={{ display: 'grid', gap: '.3rem', marginBottom: '.6rem' }}>
      <span style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.8rem', fontWeight: 600 }}>
        <span>{label}</span>
        <span style={{ fontWeight: 400, color: '#556' }}>{format ? format(value) : value}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        style={{ width: '100%' }}
      />
    </label>
  )
}

export function ToggleField({ label, checked, onChange }: { label: string; checked: boolean; onChange(next: boolean): void }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginBottom: '.6rem', fontSize: '.8rem', fontWeight: 600, cursor: 'pointer' }}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        style={{ width: '1rem', height: '1rem', accentColor: '#243145' }}
      />
      {label}
    </label>
  )
}

/**
 * Design asset picker: shows the current local media ref or lets the host
 * upload one through the authorized upload plumbing. The editor decides where
 * the returned ref lands in the draft config (P08D-T05).
 */
export function DesignAssetField({ label, value, onUpload, onClear }: { label: string; value: string | null; onUpload(file: File): void; onClear(): void }) {
  return (
    <div style={{ display: 'grid', gap: '.3rem', marginBottom: '.6rem' }}>
      <span style={{ fontSize: '.8rem', fontWeight: 600 }}>{label}</span>
      {value ? (
        <span style={{ display: 'flex', alignItems: 'center', gap: '.5rem', fontSize: '.75rem', color: '#556' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="" style={{ width: '3rem', height: '2rem', objectFit: 'cover', border: '1px solid #cbd2d9', borderRadius: 4 }} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '10rem' }}>{value}</span>
          <button type="button" onClick={onClear} style={{ fontSize: '.75rem' }}>Remove</button>
        </span>
      ) : (
        <input
          type="file"
          accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
          aria-label={label}
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) onUpload(file)
          }}
          style={{ fontSize: '.8rem' }}
        />
      )}
    </div>
  )
}

/** @deprecated Alias — DesignAssetField is the canonical name (P08D-T05). */
export const ImageField = DesignAssetField
