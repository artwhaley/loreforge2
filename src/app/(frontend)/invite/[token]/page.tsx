import Link from 'next/link'

import { PlatformShell, platformStyles as styles } from '@/components/platform/PlatformShell'
import { getActiveContext } from '@/lib/tenant/activeTenant'
import { getLorePayload } from '@/lib/payload'
import { isInvitationPurpose, isInvitationToken } from '@/lib/invitations/types'
import { resolveInvitation } from '@/lib/invitations/service'

type Props = { params: Promise<{ token: string }>; searchParams?: Promise<{ accepted?: string; error?: string }> }

export const dynamic = 'force-dynamic'

export default async function InvitationResolverPage({ params, searchParams }: Props) {
  const { token } = await params
  const query = await searchParams
  const payload = await getLorePayload()
  const resolution = await resolveInvitation(payload, token)
  const context = await getActiveContext()
  const inviteQuery = isInvitationToken(token) ? `?invite=${encodeURIComponent(token)}` : ''
  const invitation = resolution.invitation
  const acceptedPurpose = isInvitationPurpose(query?.accepted) ? query?.accepted : null
  const accepted = Boolean(acceptedPurpose && invitation && invitation.purpose === acceptedPurpose && invitation.useCount > 0)

  if (accepted && invitation) {
    const acceptedText = invitation.purpose === 'domain_bootstrap'
      ? 'For extra security, platform administrators must approve all new domain administrators. You’ll be notified when that process is complete and you can begin setting up your new Community domain!'
      : invitation.purpose === 'character_claim'
        ? `The Character ${invitation.character?.name ?? ''} is now connected to your account.`
        : 'Your Domain join request is pending the Domain Administrator’s approval.'
    const acceptedCard = invitation.purpose === 'domain_bootstrap'
      ? <strong>{`Community Domain ${invitation.domain?.name ?? ''}: pending platform approval.`}</strong>
      : <span><strong>{invitation.purposeLabel}</strong>{invitation.domain ? ` · ${invitation.domain.name}` : ''}{invitation.character ? ` · ${invitation.character.name}` : ''}</span>
    return <PlatformShell><section className={styles.panel}><h1 className={styles.sectionTitle}>You’re all set.</h1><p className={styles.sectionLead}>{acceptedText}</p><div className={styles.emptyCard}>{acceptedCard}</div><p style={{ marginTop: '1.6rem' }}><Link href="/" className={styles.primary}>Continue to Loreforge</Link></p></section></PlatformShell>
  }

  if (resolution.status !== 'valid' || !invitation) {
    return (
      <PlatformShell>
        <section className={styles.panel}>
          <p className={styles.eyebrow}>Invitation link</p>
          <h1 className={styles.sectionTitle}>This invitation is no longer available.</h1>
          <p className={styles.sectionLead}>The link may be expired, revoked, already used, or no longer match its Domain. Ask the issuer for a new Copy Link.</p>
          <p style={{ marginTop: '1.6rem' }}><Link href={context.user ? '/' : '/'} className={styles.primary}>{context.user ? 'Return to Loreforge' : 'Return to sign in'}</Link></p>
        </section>
      </PlatformShell>
    )
  }

  const target = invitation.purpose === 'character_claim'
    ? invitation.character?.name ?? 'a Character'
    : invitation.domain?.name ?? 'a Domain'
  let joinCandidates = context.characters.filter((character) => character.kind === 'player' || character.kind === 'npc')
  if (invitation.purpose === 'domain_join' && invitation.domain) {
    // The service remains the final authority, but the resolver should not
    // offer Characters that are already active members of this Domain.
    const memberships = await payload.find({
      collection: 'domain-memberships',
      where: { and: [{ domain: { equals: invitation.domain.id } }, { status: { equals: 'active' } }] },
      depth: 0,
      limit: 1000,
      pagination: false,
      overrideAccess: true,
    })
    const activeIds = new Set(memberships.docs.map((membership) => Number(typeof membership.character === 'object' ? membership.character.id : membership.character)))
    joinCandidates = joinCandidates.filter((character) => !activeIds.has(Number(character.id)))
  }
  const signInHref = `/${inviteQuery}#login`
  const registerHref = `/create-account${inviteQuery}`

  return (
    <PlatformShell>
      <section className={styles.panel}>
        <h1 className={styles.sectionTitle}>You’re invited to {target}.</h1>
        <p className={styles.sectionLead}>
          {invitation.purpose === 'domain_bootstrap'
            ? 'You’ve been invited to the administrator role of your new Loreforge Community Domain. Create a new account or sign into an existing one below to accept this invitation.'
            : invitation.purpose === 'character_claim'
              ? `This secure link is for the unclaimed Character ${invitation.character?.name ?? 'you were invited to control'}.`
              : `This secure link is for participation in ${invitation.domain?.name ?? 'this Domain'}.`}
        </p>
        <div className={styles.emptyCard}>
          {invitation.domain ? <p><strong>Domain:</strong> {invitation.domain.name}</p> : null}
          {invitation.character ? <p><strong>Character:</strong> {invitation.character.name}</p> : null}
        </div>
        {query?.error === 'login' ? <p className={styles.error} role="alert">Sign in before accepting this invitation.</p> : query?.error ? <p className={styles.error} role="alert">This invitation could not be accepted. It may no longer be available.</p> : null}
        {context.user ? (
          <form action="/api/invitations/accept" method="post" style={{ marginTop: '1.6rem' }}>
            <input type="hidden" name="token" value={token} />
            {invitation.purpose === 'domain_join' ? <><div className={styles.field}><label htmlFor="invite-character">Existing Character (optional)</label><select id="invite-character" name="characterId" defaultValue=""><option value="">Create a new Character</option>{joinCandidates.map((character) => <option key={character.id} value={character.id}>{character.name}</option>)}</select></div><div className={styles.field}><label htmlFor="invite-name">New Character name</label><input id="invite-name" name="requestedName" placeholder="Only needed for a new Character" /></div></> : null}
            <button className={styles.primary} type="submit">Accept invitation</button>
          </form>
        ) : <div className={styles.actions} style={{ marginTop: '1.6rem' }}><Link href={registerHref} className={styles.primary}>Create account</Link><Link href={signInHref} className={styles.secondary}>Sign in</Link></div>}
      </section>
    </PlatformShell>
  )
}
