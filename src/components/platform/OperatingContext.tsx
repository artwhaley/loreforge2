'use client'

import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useRef, useState } from 'react'

import type { CharacterSwitcherOption, DomainShellModel, DomainSwitcherOption } from '@/lib/page-models/shell'

import styles from './operating.module.scss'

/**
 * Platform-owned operating-context chrome (P08D-T03-G): the LoreForge brand,
 * Domain switcher, and acting-Character switcher belong outside art direction.
 * Neutral and deliberately unthemed — first-class Shells import this and never
 * restyle it.
 */
export function OperatingContext({ model, tone = 'neutral' }: { model: DomainShellModel; tone?: 'neutral' | 'obsidian' }) {
  const { operatingContext } = model
  const isObsidian = tone === 'obsidian'
  return (
    <div className={`${styles.contextBar} ${isObsidian ? styles.obsidianContext : ''}`} aria-label="Operating context">
      <Link href="/" className={styles.platformBrand}>
        {isObsidian ? <>{operatingContext.platformLabel.toUpperCase()} <ArrowUpRight size={12} /></> : <><span className={styles.platformMark} aria-hidden="true">L</span>{operatingContext.platformLabel}</>}
      </Link>
      <DomainSelect options={operatingContext.availableDomains} currentSlug={model.domain.slug} disabled={operatingContext.availableDomains.length === 0} />
      <CharacterSelect options={operatingContext.availableCharacters} activeId={operatingContext.activeCharacterId} showAvatar={isObsidian} />
      {operatingContext.account ? (
        <div className={styles.accountControls}>
          <details className={styles.accountMenu}>
            <summary aria-label={isObsidian ? `Account menu for ${operatingContext.account.name}` : undefined}>
              {isObsidian ? <span aria-hidden="true">⌄</span> : operatingContext.account.name}
            </summary>
            <div className={styles.accountPopover}>
              <Link href="/">Dashboard</Link>
              <Link href="/account">Account</Link>
              <Link href="/account/characters">Characters</Link>
              <form action="/api/logout" method="post"><button type="submit" className={styles.logoutButton}>Log out</button></form>
            </div>
          </details>
        </div>
      ) : null}
    </div>
  )
}

function DomainSelect({ options, currentSlug, disabled }: { options: DomainSwitcherOption[]; currentSlug: string; disabled: boolean }) {
  const formRef = useRef<HTMLFormElement>(null)
  return (
    <form ref={formRef} action="/api/switch-tenant" method="post" className={styles.contextControl}>
      <label htmlFor="tenant-switcher" className={styles.contextLabel}>Domain</label>
      <select id="tenant-switcher" name="tenantSlug" defaultValue={currentSlug} className={styles.contextSelect} disabled={disabled} onChange={() => formRef.current?.requestSubmit()}>
        {options.length === 0 ? <option value={currentSlug}>{currentSlug}</option> : null}
        {options.map((item) => <option key={item.id} value={item.slug}>{item.name}</option>)}
      </select>
    </form>
  )
}

function CharacterSelect({ options, activeId, showAvatar = false }: { options: CharacterSwitcherOption[]; activeId: number | null; showAvatar?: boolean }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [pending, setPending] = useState(false)
  const [selectedId, setSelectedId] = useState(String(activeId ?? ''))
  const [lastActiveId, setLastActiveId] = useState<number | null>(activeId)
  const returnTo = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`
  if (lastActiveId !== activeId) {
    setLastActiveId(activeId)
    setSelectedId(String(activeId ?? ''))
  }
  async function submit(event: React.ChangeEvent<HTMLSelectElement>) {
    const form = event.currentTarget.form
    if (!form || pending) return
    setPending(true)
    try {
      const response = await fetch('/api/switch-character', { method: 'POST', body: new FormData(form), credentials: 'same-origin', headers: { Accept: 'application/json', 'X-Loreforge-Character-Switch': 'fetch' } })
      const body = await response.json() as { redirectTo?: string }
      if (body.redirectTo === '/') router.push('/')
      else router.refresh()
    } finally {
      setPending(false)
    }
  }
  const activeCharacter = options.find((character) => character.id === activeId)
  return (
    <form className={styles.contextControl}>
      {showAvatar ? <span className={styles.avatar} aria-hidden="true">{initials(activeCharacter?.name ?? 'Account')}</span> : null}
      <label htmlFor="character-switcher" className={styles.contextLabel}>Acting as</label>
      <select id="character-switcher" name="characterId" value={selectedId} onChange={submit} className={styles.contextSelect} disabled={pending}>
        <option value="">No participating Character</option>
        {options.map((character) => <option key={character.id} value={character.id}>{character.name}</option>)}
      </select>
      <input type="hidden" name="returnTo" value={returnTo} />
    </form>
  )
}

function initials(value: string): string {
  return value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
    .slice(0, 2)
}
