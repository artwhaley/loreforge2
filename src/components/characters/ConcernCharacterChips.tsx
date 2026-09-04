'use client'

import { useEffect, useMemo, useState } from 'react'

type Result = { id: number; name: string }
type Chip = { key: string; characterId?: number; newName?: string; name: string; relationshipLabel: string }

type Props = {
  domainSlug: string
  initialValue?: string
}

function parseInitial(value: string | undefined): Chip[] {
  if (!value) return []
  try {
    const parsed = JSON.parse(value) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.flatMap((item, index) => {
      if (!item || typeof item !== 'object') return []
      const row = item as Record<string, unknown>
      const characterId = Number(row.characterId)
      const newName = typeof row.newName === 'string' ? row.newName.trim() : ''
      const name = typeof row.name === 'string' ? row.name : newName
      if ((!Number.isFinite(characterId) || characterId <= 0) && !newName) return []
      return [{ key: `${characterId || 'new'}-${index}`, characterId: Number.isFinite(characterId) && characterId > 0 ? characterId : undefined, newName: newName || undefined, name: name || `Character ${characterId}`, relationshipLabel: typeof row.relationshipLabel === 'string' ? row.relationshipLabel : '' }]
    })
  } catch {
    return []
  }
}

/** Search-and-chip editor for arbitrary Concerns Characters. */
export function ConcernCharacterChips({ domainSlug, initialValue }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Result[]>([])
  const [chips, setChips] = useState<Chip[]>(() => parseInitial(initialValue))
  const [lastInitial, setLastInitial] = useState(initialValue)
  const selectedIds = useMemo(() => new Set(chips.flatMap((chip) => chip.characterId ? [chip.characterId] : [])), [chips])

  // P05R-T08: re-sync chips when a freshly submitted form re-renders with a
  // new initial value (adjust-during-render, guarded to converge).
  if (initialValue !== lastInitial) {
    setLastInitial(initialValue)
    setChips(parseInitial(initialValue))
  }

  // Clearing stale results when the input empties happens in the change
  // handler below; this effect only ever fetches.
  const handleQueryChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const next = event.target.value
    setQuery(next)
    if (!next.trim()) setResults([])
  }

  useEffect(() => {
    const value = query.trim()
    if (!value) return
    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/character-search?domainSlug=${encodeURIComponent(domainSlug)}&q=${encodeURIComponent(value)}`, { signal: controller.signal })
        const body = await response.json() as { results?: Result[] }
        setResults(body.results ?? [])
      } catch (error) {
        if ((error as { name?: string }).name !== 'AbortError') setResults([])
      }
    }, 160)
    return () => { controller.abort(); window.clearTimeout(timer) }
  }, [domainSlug, query])

  const addExisting = (result: Result) => {
    if (selectedIds.has(result.id)) return
    setChips((current) => [...current, { key: `character-${result.id}`, characterId: result.id, name: result.name, relationshipLabel: '' }])
    setQuery('')
    setResults([])
  }

  const addNew = () => {
    const name = query.trim()
    if (!name || chips.some((chip) => chip.name.toLocaleLowerCase() === name.toLocaleLowerCase())) return
    setChips((current) => [...current, { key: `new-${Date.now()}`, newName: name, name, relationshipLabel: '' }])
    setQuery('')
    setResults([])
  }

  return <fieldset style={{ display: 'grid', gap: '.55rem' }}>
    <legend><strong>Concerns</strong></legend>
    <small>Search any Character, or add a new unlinked Character by name. Each concern gets its own relationship.</small>
    <input type="search" value={query} onChange={handleQueryChange} onKeyDown={(event) => { if (event.key === 'Enter' && results[0]) { event.preventDefault(); addExisting(results[0]) } }} placeholder="Search Characters or type a new name…" aria-label="Search Characters for Concerns" autoComplete="off" />
    {results.length > 0 ? <ul role="listbox" style={{ margin: 0, paddingLeft: '1.25rem' }}>{results.map((result) => <li key={result.id}><button type="button" onClick={() => addExisting(result)} disabled={selectedIds.has(result.id)}>{result.name}{selectedIds.has(result.id) ? ' (added)' : ''}</button></li>)}</ul> : null}
    {query.trim() && results.length === 0 ? <button type="button" onClick={addNew}>Add “{query.trim()}” as a new unlinked Character</button> : null}
    <div style={{ display: 'grid', gap: '.5rem' }} aria-label="Selected Concerns">
      {chips.map((chip) => <div key={chip.key} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(12rem, 1fr) auto', gap: '.5rem', alignItems: 'center' }}>
        <span><strong>{chip.name}</strong>{chip.newName ? ' · new, unlinked' : ''}</span>
        <label>Relationship <input value={chip.relationshipLabel} onChange={(event) => setChips((current) => current.map((item) => item.key === chip.key ? { ...item, relationshipLabel: event.target.value } : item))} placeholder="e.g. perp, victim, witness" /></label>
        <button type="button" onClick={() => setChips((current) => current.filter((item) => item.key !== chip.key))}>Remove</button>
      </div>)}
      {chips.length === 0 ? <small>No Characters attached yet.</small> : null}
    </div>
    <input type="hidden" name="concernLinks" value={JSON.stringify(chips.map(({ characterId, newName, relationshipLabel, name }) => ({ characterId, newName, relationshipLabel, name })))} readOnly />
  </fieldset>
}
