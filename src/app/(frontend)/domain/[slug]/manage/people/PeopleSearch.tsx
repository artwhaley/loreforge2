'use client'

import { useRouter } from 'next/navigation'
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
  const router = useRouter()
  const listOpen = query.length > 0

  // P05R-T08: clearing happens in the change handler (instant, no stale-flash)
  // rather than a synchronous setState branch inside the effect.
  const handleQueryChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const next = event.target.value
    setQuery(next)
    if (!next.trim()) {
      setResults([])
      setLoading(false)
      setActiveIndex(null)
    }
  }

  useEffect(() => {
    const value = query.trim()
    if (!value) return
    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      setLoading(true)
      try {
        const response = await fetch(`/api/people-search?domainSlug=${encodeURIComponent(domainSlug)}&q=${encodeURIComponent(value)}`, { signal: controller.signal })
        const body = await response.json() as { results?: Result[] }
        const nextResults = body.results ?? []
        setResults(nextResults)
        // Keep the highlight valid whenever the result set shrinks (P05R-T03 C).
        setActiveIndex((current) => clampActiveIndex(current, nextResults.length))
      } catch (error) {
        if ((error as { name?: string }).name !== 'AbortError') {
          setResults([])
          setActiveIndex(null)
        }
      } finally { setLoading(false) }
    }, 180)
    return () => { controller.abort(); window.clearTimeout(timer) }
  }, [domainSlug, query])

  // Scroll the active option into view whenever the highlight moves (P05R-T03 C).
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
      router.push(`/domain/${domainSlug}/manage/people/${results[activeIndex].id}`)
    }
  }

  return <div className={styles.quickSearch}><label htmlFor="people-quick-search">Find a Character</label><input ref={inputRef} id="people-quick-search" value={query} onChange={handleQueryChange} onKeyDown={handleKeyDown} placeholder="Search name, alias, User, Department, or Role" autoComplete="off" role="combobox" aria-expanded={listOpen} aria-controls="people-search-results" aria-activedescendant={activeIndex !== null && results[activeIndex] ? optionId(results[activeIndex].id) : undefined} />{loading ? <p role="status">Searching…</p> : null}{query && !loading && results.length === 0 ? <p role="status">No Characters found.</p> : null}{results.length > 0 ? <ul id="people-search-results" className={styles.quickResults} role="listbox" aria-label="People search results">{results.map((result, index) => <li key={result.id} id={optionId(result.id)} role="option" aria-selected={activeIndex === index} className={activeIndex === index ? styles.quickOptionActive : undefined}><a href={`/domain/${domainSlug}/manage/people/${result.id}`} onMouseEnter={() => setActiveIndex(index)}>{result.localName || result.name}<span>{result.localName && result.localName !== result.name ? `${result.name} · ` : ''}{result.controllerName ? `User: ${result.controllerName}` : 'Unclaimed'} · {result.roles.join(', ') || 'No Role'}</span></a></li>)}</ul> : null}</div>
}
