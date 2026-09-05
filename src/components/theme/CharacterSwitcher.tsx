'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'

import type { Character } from '@/payload-types'

import { characterDisplayLabel } from '@/lib/characters/labels'
import styles from './TenantShell.module.scss'

export function CharacterSwitcher({ characters, activeCharacter }: { characters: Character[]; activeCharacter: Character | null }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [pending, setPending] = useState(false)
  const [selectedId, setSelectedId] = useState(String(activeCharacter?.id ?? ''))
  const [lastActiveId, setLastActiveId] = useState(activeCharacter?.id)
  const returnTo = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`

  // P05R-T08: re-sync the select when the server-rendered active Character
  // changes (page navigation), using the guarded adjust-during-render pattern
  // instead of a setState-in-effect.
  if (lastActiveId !== activeCharacter?.id) {
    setLastActiveId(activeCharacter?.id)
    setSelectedId(String(activeCharacter?.id ?? ''))
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    try {
      const response = await fetch('/api/switch-character', { method: 'POST', body: new FormData(event.currentTarget), credentials: 'same-origin', headers: { Accept: 'application/json', 'X-Loreforge-Character-Switch': 'fetch' } })
      const body = await response.json() as { redirectTo?: string }
      if (body.redirectTo === '/') router.push('/')
      else router.refresh()
    } finally {
      setPending(false)
    }
  }

  return <form action="/api/switch-character" method="post" className={styles.contextControl} onSubmit={submit}>
    <label htmlFor="character-switcher" className={styles.contextLabel}>Acting as</label>
    <select id="character-switcher" name="characterId" value={selectedId} onChange={(event) => setSelectedId(event.target.value)} className={styles.contextSelect} disabled={pending}>
      <option value="">No participating Character</option>
      {characters.map((character) => <option key={character.id} value={character.id}>{characterDisplayLabel(character)}</option>)}
    </select>
    <input type="hidden" name="returnTo" value={returnTo} />
    <button type="submit" className={styles.contextButton} disabled={pending}>{pending ? 'Switching…' : 'Switch'}</button>
  </form>
}
