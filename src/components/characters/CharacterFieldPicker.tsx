'use client'

import { useEffect, useState } from 'react'

type Character = { id: number; name: string }

/**
 * Debounced Character search picker shared by the new-document editor and the
 * member-facing form fill. Stores the selected Character id as its value.
 */
export function CharacterFieldPicker({ domainSlug, value, onChange, disabled = false, ariaLabel = 'Search Characters', name }: { domainSlug: string; value: string; onChange: (value: string) => void; disabled?: boolean; ariaLabel?: string; name?: string }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Character[]>([])
  useEffect(() => {
    const q = query.trim()
    if (!q || disabled) return
    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/character-search?domainSlug=${encodeURIComponent(domainSlug)}&q=${encodeURIComponent(q)}`, { signal: controller.signal })
        const data = await response.json() as { results?: Character[] }
        setResults(data.results ?? [])
      } catch (error) {
        if ((error as { name?: string }).name !== 'AbortError') setResults([])
      }
    }, 160)
    return () => { controller.abort(); window.clearTimeout(timer) }
  }, [domainSlug, query, disabled])
  const selected = results.find((result) => String(result.id) === String(value))
  return (
    <span style={{ display: 'grid', gap: '.35rem', minWidth: 0 }}>
      {name ? <input type="hidden" name={name} value={value} /> : null}
      <input type="search" value={query} disabled={disabled} onChange={(event) => { const next = event.target.value; setQuery(next); if (!next.trim()) setResults([]) }} placeholder="Search Characters" autoComplete="off" aria-label={ariaLabel} />
      {value ? (
        <small>
          {selected ? selected.name : `Selected Character ID ${value}`}{' '}
          {!disabled ? <button type="button" onClick={() => { onChange(''); setQuery('') }}>Clear</button> : null}
        </small>
      ) : null}
      {!disabled && results.length > 0 ? (
        <span role="listbox" aria-label="Character results" style={{ display: 'grid', gap: '.2rem' }}>
          {results.map((result) => (
            <button type="button" role="option" aria-selected={String(result.id) === value} key={result.id} onClick={() => { onChange(String(result.id)); setQuery(result.name); setResults([]) }}>
              {result.name}
            </button>
          ))}
        </span>
      ) : null}
    </span>
  )
}
