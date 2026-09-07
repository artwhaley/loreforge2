'use client'

import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useRef, useState } from 'react'

import type { CharacterSwitcherOption, DomainShellModel, DomainSwitcherOption } from '@/lib/page-models/shell'

import shellStyles from '@/components/theme/TenantShell.module.scss'

/** Shared operating-context chrome. Platform-owned and deliberately unthemed; Designs place it, never restyle it. */
export function OperatingContext({ model }: { model: DomainShellModel }) {
  const { operatingContext } = model
  return (
    <div className={shellStyles.contextBar} aria-label="Operating context">
      <Link href="/" className={shellStyles.platformBrand}><span className={shellStyles.platformMark} aria-hidden="true">L</span>{operatingContext.platformLabel}</Link>
      <DomainSelect options={operatingContext.availableDomains} currentSlug={model.domain.slug} disabled={operatingContext.availableDomains.length === 0} />
      <CharacterSelect options={operatingContext.availableCharacters} activeId={operatingContext.activeCharacterId} />
      {operatingContext.account ? (
        <div className={shellStyles.accountControls}>
          <details className={shellStyles.accountMenu}>
            <summary>{operatingContext.account.name}</summary>
            <div className={shellStyles.accountPopover}>
              <Link href="/">Dashboard</Link>
              <Link href="/account">Account</Link>
              <Link href="/account/characters">Characters</Link>
              <form action="/api/logout" method="post"><button type="submit" className={shellStyles.logoutButton}>Log out</button></form>
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
    <form ref={formRef} action="/api/switch-tenant" method="post" className={shellStyles.contextControl}>
      <label htmlFor="tenant-switcher" className={shellStyles.contextLabel}>Domain</label>
      <select id="tenant-switcher" name="tenantSlug" defaultValue={currentSlug} className={shellStyles.contextSelect} disabled={disabled} onChange={() => formRef.current?.requestSubmit()}>
        {options.length === 0 ? <option value={currentSlug}>{currentSlug}</option> : null}
        {options.map((item) => <option key={item.id} value={item.slug}>{item.name}</option>)}
      </select>
    </form>
  )
}

function CharacterSelect({ options, activeId }: { options: CharacterSwitcherOption[]; activeId: number | null }) {
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
  return (
    <form className={shellStyles.contextControl}>
      <label htmlFor="character-switcher" className={shellStyles.contextLabel}>Acting as</label>
      <select id="character-switcher" name="characterId" value={selectedId} onChange={submit} className={shellStyles.contextSelect} disabled={pending}>
        <option value="">No participating Character</option>
        {options.map((character) => <option key={character.id} value={character.id}>{character.name}</option>)}
      </select>
      <input type="hidden" name="returnTo" value={returnTo} />
    </form>
  )
}
