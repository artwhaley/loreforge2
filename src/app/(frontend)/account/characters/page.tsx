import Link from 'next/link'

import { PlatformShell, platformStyles as styles } from '@/components/platform/PlatformShell'
import { getActiveContext } from '@/lib/tenant/activeTenant'
import { getLorePayload } from '@/lib/payload'
import { isAdminKind } from '@/lib/characters/kinds'
import { ClearQuery } from './ClearQuery'

type Props = { searchParams?: Promise<{ created?: string; deleted?: string; error?: string }> }

export const dynamic = 'force-dynamic'

const KIND_LABELS: Record<string, string> = {
  player: 'Player',
  npc: 'NPC',
  domain_admin: 'Domain admin',
  platform_admin: 'Platform admin',
}

const ERROR_MESSAGES: Record<string, string> = {
  login: 'Sign in to manage your Characters.',
  name: 'Enter a Character name (up to 160 characters).',
  create: "Couldn't create the Character. Please try again.",
  id: 'Invalid Character.',
  missing: 'Character not found.',
  owner: 'You can only delete Characters you control.',
  admin: 'Administrative identities cannot be deleted.',
  'in-use': "This Character is in use (Domain membership, Roles, claims, or links) and can't be deleted yet.",
  delete: "Couldn't delete the Character. Please try again.",
  action: 'Unsupported action.',
}

const relationId = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'object' && value !== null && 'id' in value) return Number((value as { id: number | string }).id)
  return Number(value)
}

export default async function AccountCharactersPage({ searchParams }: Props) {
  const query = await searchParams
  const context = await getActiveContext()
  if (!context.user) {
    return <PlatformShell><section className={styles.panel}><h1 className={styles.sectionTitle}>Sign in to view your Characters.</h1><p><Link href="/" className={styles.primary}>Go to sign in</Link></p></section></PlatformShell>
  }
  const payload = await getLorePayload()

  const characters = context.characters
  const characterIds = characters.map((character) => Number(character.id))
  const memberships = characterIds.length
    ? await payload.find({ collection: 'domain-memberships', where: { and: [{ character: { in: characterIds } }, { status: { equals: 'active' } }] }, depth: 1, limit: 0, pagination: false, overrideAccess: true })
    : { docs: [] }
  const domainsByCharacter = new Map<number, string[]>()
  for (const membership of memberships.docs) {
    const record = membership as { character?: unknown; domain?: unknown; tenant?: unknown }
    const parent = relationId(record.character)
    if (parent == null) continue
    const domainRecord = record.domain
    const tenantRecord = record.tenant
    const domainName = (
      (domainRecord && typeof domainRecord === 'object' && 'name' in domainRecord ? String((domainRecord as { name?: unknown }).name ?? '') : '')
      || (tenantRecord && typeof tenantRecord === 'object' && 'name' in tenantRecord ? String((tenantRecord as { name?: unknown }).name ?? '') : '')
      || 'Unknown Domain'
    )
    domainsByCharacter.set(parent, [...(domainsByCharacter.get(parent) ?? []), domainName])
  }

  const notice = query?.created === '1'
    ? { kind: 'success', text: 'Character created.' }
    : query?.deleted === '1'
      ? { kind: 'success', text: 'Character deleted.' }
      : query?.error
        ? { kind: 'error', text: ERROR_MESSAGES[query.error] ?? 'Something went wrong. Please try again.' }
        : null

  return (
    <PlatformShell>
      <ClearQuery />
      <section className={styles.panel}>
        <h1 className={styles.sectionTitle}>Your Characters</h1>
        <p className={styles.sectionLead}>A character is just what it sounds like - a roleplay identity. A character can be an active member of multiple community domains, and each character has separate permissions and associations.</p>
        {notice ? <p className={notice.kind === 'success' ? styles.successFlash : styles.error}>{notice.text}</p> : null}
        {characters.length > 0 ? (
          <table className={styles.characterTable}>
            <thead><tr><th>Character</th><th>Kind</th><th>Domains</th><th>Manage</th></tr></thead>
            <tbody>
              {characters.map((character) => {
                const kind = String(character.kind ?? 'player')
                return (
                  <tr key={character.id}>
                    <td><Link href={`/characters/${character.id}`}>{character.name}</Link></td>
                    <td><span className={styles.kindBadge}>{KIND_LABELS[kind] ?? kind}</span></td>
                    <td>{domainsByCharacter.get(Number(character.id))?.join(', ') ?? <span className={styles.muted}>Not a member of any Domain</span>}</td>
                    <td>{isAdminKind(kind) ? <span className={styles.cellNote}>System-managed</span> : (
                      <form action="/api/account-characters" method="post">
                        <input type="hidden" name="action" value="delete" />
                        <input type="hidden" name="characterId" value={character.id} />
                        <button type="submit" className={styles.textButton}>Delete</button>
                      </form>
                    )}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        ) : <div className={styles.emptyCard}>No active Characters are connected to this account yet.</div>}
        <form action="/api/account-characters" method="post" style={{ marginTop: '1.8rem', maxWidth: '420px' }}>
          <input type="hidden" name="action" value="create" />
          <div className={styles.field}>
            <label htmlFor="character-name">Add a Character</label>
            <input id="character-name" name="name" type="text" placeholder="Character name" maxLength={160} required />
          </div>
          <button type="submit" className={styles.primary}>Create Character</button>
        </form>
        <p style={{ marginTop: '1.6rem' }}><Link href="/" className={styles.secondary}>Back to dashboard</Link></p>
      </section>
    </PlatformShell>
  )
}