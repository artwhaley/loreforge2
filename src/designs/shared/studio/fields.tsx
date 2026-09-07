'use client'

/**
 * Reusable Studio input primitives (G6). These are neutral controls — no
 * Design vocabulary, no art direction. Each Design's Studio editor composes
 * them with its own labels, options, and layout.
 */
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
      <select value={value} onChange={(event) => onChange(event.target.value)} style={{ width: '100%', padding: '.45rem .5rem', borderRadius: 4, border: '1px solid #cbd2d9', background: '#fff' }}>
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  )
}

/** Image picker: shows the current local media ref or lets the host upload one. */
export function ImageField({ label, value, onUpload, onClear }: { label: string; value: string | null; onUpload(file: File): void; onClear(): void }) {
  return (
    <div style={{ display: 'grid', gap: '.3rem', marginBottom: '.6rem' }}>
      <span style={{ fontSize: '.8rem', fontWeight: 600 }}>{label}</span>
      {value ? (
        <span style={{ fontSize: '.75rem', color: '#556' }}>
          {value}
          <button type="button" onClick={onClear} style={{ marginLeft: '.5rem', fontSize: '.75rem' }}>Remove</button>
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