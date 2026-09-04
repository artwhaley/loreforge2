'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import styles from './PlatformShell.module.scss'

type PickerCharacter = { id: number | string; name: string }

/**
 * Dashboard Character listbox. Changing the selection switches the active
 * Character immediately — there is no Switch button; the Domain picker below
 * stays locked until an identity is chosen.
 */
export function DashboardCharacterPicker({
  characters,
  activeCharacterId,
}: {
  characters: PickerCharacter[]
  activeCharacterId: number | null
}) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [selectedId, setSelectedId] = useState(String(activeCharacterId ?? ''))
  const [lastServerCharacterId, setLastServerCharacterId] = useState(activeCharacterId)

  // Re-sync the select when the server-rendered active Character changes after
  // a refresh (the guarded adjust-during-render pattern used by CharacterSwitcher).
  if (lastServerCharacterId !== activeCharacterId) {
    setLastServerCharacterId(activeCharacterId)
    setSelectedId(String(activeCharacterId ?? ''))
  }

  async function switchCharacter(value: string) {
    if (pending || value === selectedId) return
    const formData = new FormData()
    formData.set('characterId', value)
    setPending(true)
    try {
      const response = await fetch('/api/switch-character', {
        method: 'POST',
        body: formData,
        credentials: 'same-origin',
        headers: { Accept: 'application/json', 'X-Loreforge-Character-Switch': 'fetch' },
      })
      if (!response.ok) {
        router.refresh()
        return
      }
      const body = (await response.json().catch(() => null)) as { redirectTo?: string } | null
      if (body?.redirectTo && body.redirectTo !== '/') router.push(body.redirectTo)
      else router.refresh()
    } finally {
      setPending(false)
    }
  }

  return (
    <>
      <label htmlFor="dashboard-character" className={styles.domainEntryLabel}>Acting as</label>
      <select
        id="dashboard-character"
        className={styles.dashboardCharacterSelect}
        value={selectedId}
        onChange={(event) => { setSelectedId(event.target.value); void switchCharacter(event.target.value) }}
        disabled={pending || characters.length === 0}
      >
        <option value="">No active Character</option>
        {characters.map((character) => <option key={String(character.id)} value={String(character.id)}>{character.name}</option>)}
      </select>
    </>
  )
}
