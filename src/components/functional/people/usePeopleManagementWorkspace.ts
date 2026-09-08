'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

import { clampActiveIndex, stepActiveIndex } from '@/lib/people/searchNavigation'

export type PeopleSearchResult = { id: number; name: string; localName: string | null; controllerName: string | null; roles: string[]; departments: string[] }

export const peopleSearchOptionId = (id: number) => `people-search-option-${id}`

/**
 * Shared People-search workspace (OBSIDIAN-T06). Owns the debounced,
 * abortable people-search state machine (query, results, loading, active
 * highlight, keyboard navigation) exactly as the previous inline component
 * did — P05R-T08 clearing semantics and P05R-T03 highlight clamping included.
 * A Design supplies only presentation.
 */
export function usePeopleManagementWorkspace(domainSlug: string) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<PeopleSearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
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
        const body = await response.json() as { results?: PeopleSearchResult[] }
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
    const activeOption = document.getElementById(peopleSearchOptionId(results[activeIndex]?.id))
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

  return {
    query,
    results,
    loading,
    activeIndex,
    listOpen,
    inputRef,
    handleQueryChange,
    handleKeyDown,
    setActiveIndex,
    selectResult: (id: number) => { router.push(`/domain/${domainSlug}/manage/people/${id}`) },
  }
}