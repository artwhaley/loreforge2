'use client'

import { useEffect, useState } from 'react'

type Character = { id: number; name: string }

type Props = {
  domainSlug: string
  /** Single mode: the chosen Character id as a string. Multi mode: the chosen ids. */
  value: string | string[]
  onChange: (value: string | string[]) => void
  disabled?: boolean
  ariaLabel?: string
  name?: string
  /** When true the picker collects several Characters; defaults to a single pick. */
  multi?: boolean
}

function serialized(value: string | string[]): string {
  return JSON.stringify(Array.isArray(value) ? value.map(String) : [value])
}

/**
 * Debounced Character search picker shared by the new-document editor and the
 * member-facing form fill. Single mode stores one Character id as its value;
 * multi mode stores an array of ids and emits one hidden input per chosen
 * Character (same name) so native form submission surfaces them as repeated
 * fields the server reads with getAll.
 */
export function CharacterFieldPicker({ domainSlug, value, onChange, disabled = false, ariaLabel = 'Search Characters', name, multi = false }: Props) {
  const valueIds = multi ? (Array.isArray(value) ? value.map(String) : []) : Array.isArray(value) ? value.map(String) : value ? [String(value)] : []
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Character[]>([])
  const [chips, setChips] = useState<Array<{ id: string; name: string }>>(() => valueIds.map((id) => ({ id, name: `Character #${id}` })))
  const [lastValue, setLastValue] = useState(serialized(value))
  // Re-sync the chips when the value arrives changed from outside (a fresh
  // submission snapshot after a failed save, a cleared field, ...). Names the
  // picker has already learned survive; brand-new ids get a placeholder.
  if (serialized(value) !== lastValue) {
    setLastValue(serialized(value))
    const next = new Set(valueIds)
    setChips((current) => {
      const kept = current.filter((chip) => next.has(chip.id))
      for (const id of valueIds) if (!kept.some((chip) => chip.id === id)) kept.push({ id, name: `Character #${id}` })
      return kept
    })
  }

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

  const select = (result: Character) => {
    if (multi) {
      const nextIds = valueIds.includes(String(result.id)) ? valueIds : [...valueIds, String(result.id)]
      setChips((current) => {
        const next = current.some((chip) => chip.id === String(result.id)) ? current : [...current, { id: String(result.id), name: result.name }]
        return next
      })
      onChange(nextIds)
    } else {
      onChange(String(result.id))
      setChips([{ id: String(result.id), name: result.name }])
    }
    setQuery('')
    setResults([])
  }

  const remove = (id: string) => {
    if (!multi) {
      onChange('')
      setChips([])
      setQuery('')
      setResults([])
      return
    }
    onChange(valueIds.filter((chipId) => chipId !== id))
  }

  const selectedName = !multi ? chips.find((chip) => chip.id === String(value))?.name : undefined

  return (
    <span style={{ display: 'grid', gap: '.35rem', minWidth: 0 }}>
      {name && !multi ? <input type="hidden" name={name} value={Array.isArray(value) ? '' : value} /> : null}
      {name && multi ? chips.map((chip) => <input type="hidden" name={name} value={chip.id} key={chip.id} />) : null}
      <input
        type="search"
        value={query}
        disabled={disabled}
        onChange={(event) => { const next = event.target.value; setQuery(next); if (!next.trim()) setResults([]) }}
        onKeyDown={(event) => { if (event.key === 'Enter' && !disabled && results[0]) { event.preventDefault(); select(results[0]) } }}
        placeholder={multi ? 'Search Characters to add…' : 'Search Characters'}
        autoComplete="off"
        aria-label={multi ? `${ariaLabel} — search Characters to add` : ariaLabel}
      />
      {!multi && value && (
        <small>
          {selectedName ?? `Selected Character ID ${value}`}{' '}
          {!disabled ? <button type="button" onClick={() => remove(String(value))}>Clear</button> : null}
        </small>
      )}
      {multi && !disabled && chips.length > 0 ? (
        <ul aria-label="Selected Characters" style={{ margin: 0, paddingLeft: '1.25rem', display: 'grid', gap: '.2rem' }}>
          {chips.map((chip) => (
            <li key={chip.id}>
              {chip.name}{' '}
              <button type="button" onClick={() => remove(chip.id)} aria-label={`Remove ${chip.name}`}>Remove</button>
            </li>
          ))}
        </ul>
      ) : null}
      {!disabled && results.length > 0 ? (
        <span role="listbox" aria-label="Character results" style={{ display: 'grid', gap: '.2rem' }}>
          {results.map((result) => {
            const chosen = multi ? valueIds.includes(String(result.id)) : String(result.id) === String(value)
            return (
              <button type="button" role="option" aria-selected={chosen} disabled={chosen} key={result.id} onClick={() => select(result)}>
                {result.name}{chosen ? ' (chosen)' : ''}
              </button>
            )
          })}
        </span>
      ) : null}
    </span>
  )
}
