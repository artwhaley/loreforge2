'use client'

import { useMemo, useState } from 'react'

type CharacterOption = { id: number; name: string; localName?: string | null }

type Props = {
  name: string
  label: string
  options: CharacterOption[]
  lockedId?: number
  help?: string
}

/** Small, keyboard-native filterable checkbox list for document Character links. */
export function CharacterMultiSelect({ name, label, options, lockedId, help }: Props) {
  const [query, setQuery] = useState('')
  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase()
    return q ? options.filter((option) => `${option.name} ${option.localName ?? ''}`.toLocaleLowerCase().includes(q)) : options
  }, [options, query])
  return <fieldset style={{ display: 'grid', gap: '.45rem' }}>
    <legend><strong>{label}</strong></legend>
    <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${label.toLocaleLowerCase()}`} aria-label={`Search ${label}`} />
    {help ? <small>{help}</small> : null}
    <div role="group" aria-label={`${label} results`} style={{ display: 'grid', gap: '.25rem', maxHeight: 180, overflowY: 'auto' }}>
      {filtered.map((option) => <label key={option.id}><input type="checkbox" name={name} value={option.id} defaultChecked={option.id === lockedId} disabled={option.id === lockedId} /> {option.name}{option.localName ? ` · ${option.localName}` : ''}{option.id === lockedId ? ' (required)' : ''}</label>)}
      {filtered.length === 0 ? <small>No matching Characters.</small> : null}
    </div>
  </fieldset>
}
