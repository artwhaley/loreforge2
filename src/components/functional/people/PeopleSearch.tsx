'use client'

import { peopleSearchOptionId, usePeopleManagementWorkspace } from '@/components/functional/people/usePeopleManagementWorkspace'

import styles from './people.module.scss'

/**
 * People search (OBSIDIAN-T06). Presentation-only: the shared workspace owns
 * the debounced/abortable search state machine and keyboard navigation.
 */
export function PeopleSearch({ domainSlug }: { domainSlug: string }) {
  const { query, results, loading, activeIndex, listOpen, inputRef, handleQueryChange, handleKeyDown, setActiveIndex } = usePeopleManagementWorkspace(domainSlug)

  return <div className={styles.quickSearch}><label htmlFor="people-quick-search">Find a Character</label><input ref={inputRef} id="people-quick-search" value={query} onChange={handleQueryChange} onKeyDown={handleKeyDown} placeholder="Search name, alias, User, Department, or Role" autoComplete="off" role="combobox" aria-expanded={listOpen} aria-controls="people-search-results" aria-activedescendant={activeIndex !== null && results[activeIndex] ? peopleSearchOptionId(results[activeIndex].id) : undefined} />{loading ? <p role="status">Searching…</p> : null}{query && !loading && results.length === 0 ? <p role="status">No Characters found.</p> : null}{results.length > 0 ? <ul id="people-search-results" className={styles.quickResults} role="listbox" aria-label="People search results">{results.map((result, index) => <li key={result.id} id={peopleSearchOptionId(result.id)} role="option" aria-selected={activeIndex === index} className={activeIndex === index ? styles.quickOptionActive : undefined}><a href={`/domain/${domainSlug}/manage/people/${result.id}`} onMouseEnter={() => setActiveIndex(index)}>{result.localName || result.name}<span>{result.localName && result.localName !== result.name ? `${result.name} · ` : ''}{result.controllerName ? `User: ${result.controllerName}` : 'Unclaimed'} · {result.roles.join(', ') || 'No Role'}</span></a></li>)}</ul> : null}</div>
}