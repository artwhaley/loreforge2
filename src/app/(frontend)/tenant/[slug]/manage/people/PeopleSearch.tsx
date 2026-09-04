'use client'

import { useEffect, useRef, useState } from 'react'

import { clampActiveIndex, stepActiveIndex } from '@/lib/people/searchNavigation'

import styles from './people.module.scss'

type Result = { id: number; name: string; localName: string | null; controllerName: string | null; roles: string[]; departments: string[] }

const optionId = (id: number) => `people-search-option-${id}`

export function PeopleSearch({ domainSlug }: { domainSlug: string }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Result[]>([])
  const [loading, setLoading] = useState(false)
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listOpen = query.length > 0

  useEffect(() => {
    const value = query.trim()
    if (!value) { setResults([]); setLoading(false); setActiveIndex(null); return }
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

  // Keep the active option visible: clamp when the result set shrinks, and
  // scroll it into view whenever the highlight moves (P05R-T03 C).
  useEffect(() => {
    setActiveIndex((current) => clampActiveIndex(current, results.length))
  }, [results.length])
  useEffect(() => {
    if (activeIndex === null) return
    const activeOption = document.getElementById(optionId(results[activeIndex]?.id))
    if (activeOption) activeOption.scrollIntoView({ block: 'nearest' })
  }, [activeIndex, results])

  const moveActive = (direction: 1 | -1) => setActiveIndex((current) => stepActiveIndex({ activeIndex: current, count: results.length }, direction))

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (results.length === 0 && event.key !== 'Escape') return
    if (event.key === 'ArrowDown') { event.preventDefault(); moveActive(1) } else if (event.key === 'ArrowUp') { event.preventDefault(); moveActive(-1) } else if (event.key === 'Escape') {
      event.preventDefault()
      setActiveIndex(null)
      setResults([])
      setQuery('')
      inputRef.current?.blur()
    } else if (event.key === 'Enter' && activeIndex !== null && results[activeIndex]) {
      event.preventDefault()
      window.location.href = `/domain/${domainSlug}/manage/people/${results[activeIndex].id}`
    }
  }

  return <div className={styles.quickSearch}><label htmlFor="people-quick-search">Find a Character</label><input ref={inputRef} id="people-quick-search" value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={handleKeyDown} placeholder="Search name, alias, User, Department, or Role" autoComplete="off" role="combobox" aria-expanded={listOpen} aria-controls="people-search-results" aria-activedescendant={activeIndex !== null && results[activeIndex] ? optionId(results[activeIndex].id) : undefined} />{loading ? <p role="status">Searching…</p> : null}{query && !loading && results.length === 0 ? <p role="status">No Characters found.</p> : null}{results.length > 0 ? <ul id="people-search-results" className={styles.quickResults} role="listbox" aria-label="People search results">{results.map((result, index) => <li key={result.id} id={optionId(result.id)} role="option" aria-selected={activeIndex === index} className={activeIndex === index ? styles.quickOptionActive : undefined}><a href={`/domain/${domainSlug}/manage/people/${result.id}`} onMouseEnter={() => setActiveIndex(index)}>{result.localName || result.name}<span>{result.localName && result.localName !== result.name ? `${result.name} · ` : ''}{result.controllerName ? `User: ${result.controllerName}` : 'Unclaimed'} · {result.roles.join(', ') || 'No Role'}</span></a></li>)}</ul> : null}</div>
}
