'use client'

import { useEffect, useState } from 'react'

import styles from './people.module.scss'

type Result = { id: number; name: string; localName: string | null; controllerName: string | null; roles: string[]; departments: string[] }

export function PeopleSearch({ domainSlug }: { domainSlug: string }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Result[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const value = query.trim()
    if (!value) { setResults([]); setLoading(false); return }
    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      setLoading(true)
      try {
        const response = await fetch(`/api/people-search?domainSlug=${encodeURIComponent(domainSlug)}&q=${encodeURIComponent(value)}`, { signal: controller.signal })
        const body = await response.json() as { results?: Result[] }
        setResults(body.results ?? [])
      } catch (error) {
        if ((error as { name?: string }).name !== 'AbortError') setResults([])
      } finally { setLoading(false) }
    }, 180)
    return () => { controller.abort(); window.clearTimeout(timer) }
  }, [domainSlug, query])

  return <div className={styles.quickSearch}><label htmlFor="people-quick-search">Find a Character</label><input id="people-quick-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, alias, User, Department, or Role" autoComplete="off" aria-controls="people-search-results" aria-expanded={query.length > 0} />{loading ? <p role="status">Searching…</p> : null}{query && !loading && results.length === 0 ? <p role="status">No Characters found.</p> : null}{results.length > 0 ? <ul id="people-search-results" className={styles.quickResults} role="listbox">{results.map((result) => <li key={result.id} role="option"><a href={`/domain/${domainSlug}/manage/people/${result.id}`}>{result.localName || result.name}<span>{result.localName && result.localName !== result.name ? `${result.name} · ` : ''}{result.controllerName ? `User: ${result.controllerName}` : 'Unclaimed'} · {result.roles.join(', ') || 'No Role'}</span></a></li>)}</ul> : null}</div>
}
