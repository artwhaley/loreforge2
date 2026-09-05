import Link from 'next/link'
import { notFound } from 'next/navigation'

import { getActiveTenant } from '@/lib/tenant/activeTenant'
import { publicCharacterProjection } from '@/lib/characters/publicProjection'
import { isAllowed } from '@/lib/authz/evaluate'
import { getLorePayload } from '@/lib/payload'

type Props = { params: Promise<{ id: string }> }

export const dynamic = 'force-dynamic'

export default async function CharacterProfilePage({ params }: Props) {
  const { id } = await params
  const characterId = Number(id)
  if (!Number.isFinite(characterId)) notFound()
  const payload = await getLorePayload()
  const character = await payload.findByID({ collection: 'characters', id: characterId, depth: 1 })
  if (!character) notFound()
  // P07X-T01: administrative Character kinds are excluded from public/RP
  // Character semantics and never render an ordinary profile or claim surface.
  if (character.kind === 'domain_admin' || character.kind === 'platform_admin') notFound()

  const context = await getActiveTenant()
  const controller = character.controlledBy && typeof character.controlledBy === 'object' ? character.controlledBy : null
  const profile = publicCharacterProjection(character, controller)
  const tenant = context.tenant
  const localContexts = tenant
    ? await payload.find({
        collection: 'domain-character-contexts',
        where: { and: [{ or: [{ domain: { equals: tenant.id } }, { tenant: { equals: tenant.id } }] }, { character: { equals: character.id } }] },
        depth: 0,
        limit: 1,
      })
    : { docs: [] }
  const localContext = localContexts.docs[0]
  const isAdmin = Boolean(tenant && context.user && await isAllowed({ payload, actor: { userId: context.user.id, activeCharacterId: context.activeCharacter?.id }, domainId: tenant.id, capability: 'manage_claims', resource: { type: 'Domain', id: tenant.id } }))
  const pendingClaims = tenant && isAdmin
    ? await payload.find({
        collection: 'character-claim-requests',
        where: { and: [{ character: { equals: character.id } }, { domain: { equals: tenant.id } }, { status: { equals: 'pending' } }] },
        depth: 1,
        limit: 20,
      })
    : { docs: [] }
  const existingClaim = tenant && context.user
    ? await payload.find({
        collection: 'character-claim-requests',
        where: { and: [{ character: { equals: character.id } }, { domain: { equals: tenant.id } }, { claimant: { equals: context.user.id } }, { status: { equals: 'pending' } }] },
        depth: 0,
        limit: 1,
      })
    : { docs: [] }

  return (
    <main style={{ maxWidth: 760, margin: '2rem auto', padding: '0 1.5rem' }}>
      <p><Link href="/">← Account home</Link></p>
      <h1>{profile.name}</h1>
      <p>{profile.bio || 'No public profile has been written yet.'}</p>
      <p>
        <strong>Controller:</strong> {profile.controller?.name ?? 'Unclaimed'}
      </p>

      {tenant ? (
        <section>
          <h2>In {tenant.name}</h2>
          <p>Domain-local display context is separate from global Character identity and membership.</p>
          {localContext ? <p><strong>Local display:</strong> {localContext.localDisplayName}</p> : null}
          <form action="/api/character-context" method="post">
            <input type="hidden" name="tenantSlug" value={tenant.slug} />
            <input type="hidden" name="characterId" value={character.id} />
            <label>Local display name <input name="localDisplayName" defaultValue={localContext?.localDisplayName ?? profile.name} required /></label>{' '}
            <label>Local note <input name="localNote" defaultValue={localContext?.localNote ?? ''} /></label>{' '}
            <button type="submit">Save local context</button>
          </form>
        </section>
      ) : null}

      {profile.controller === null && context.user && tenant && !existingClaim.docs[0] ? (
        <section>
          <h2>Claim this Character</h2>
          <p>Request control of this unclaimed Character in the current Domain.</p>
          <form action="/api/character-claims" method="post">
            <input type="hidden" name="action" value="request" />
            <input type="hidden" name="characterId" value={character.id} />
            <input type="hidden" name="tenantSlug" value={tenant.slug} />
            <button type="submit">Request claim</button>
          </form>
        </section>
      ) : null}
      {existingClaim.docs[0] ? <p>Claim request pending in {tenant?.name}.</p> : null}

      {isAdmin && tenant && pendingClaims.docs.length > 0 ? (
        <section>
          <h2>Pending claim decisions</h2>
          {pendingClaims.docs.map((claim) => {
            const claimant = typeof claim.claimant === 'object' ? claim.claimant.name : String(claim.claimant)
            return (
              <form key={claim.id} action="/api/character-claims" method="post" style={{ margin: '0.75rem 0' }}>
                <input type="hidden" name="action" value="decide" />
                <input type="hidden" name="claimId" value={claim.id} />
                <input type="hidden" name="characterId" value={character.id} />
                <input type="hidden" name="tenantSlug" value={tenant.slug} />
                <span>Claimant: {claimant}</span>{' '}
                <input name="decisionNote" placeholder="Decision note" />{' '}
                <button name="decision" value="approved" type="submit">Approve</button>{' '}
                <button name="decision" value="rejected" type="submit">Reject</button>
              </form>
            )
          })}
        </section>
      ) : null}

      {context.user && tenant ? (
        <section>
          <h2>Request global merge review</h2>
          <p>Phase 2 can create a pending request only. Platform Admin approval waits for a later phase.</p>
          <form action="/api/character-merge-requests" method="post">
            <input type="hidden" name="tenantSlug" value={tenant.slug} />
            <input type="hidden" name="sourceId" value={character.id} />
            <label>Target Character ID (optional) <input name="targetId" inputMode="numeric" /></label><br />
            <label>Evidence <textarea name="evidence" required /></label><br />
            <label>Note <textarea name="note" required /></label><br />
            <button type="submit">Submit pending merge request</button>
          </form>
        </section>
      ) : null}
    </main>
  )
}
