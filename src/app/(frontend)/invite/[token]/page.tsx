import Link from 'next/link'

import { PlatformShell, platformStyles as styles } from '@/components/platform/PlatformShell'
import { getActiveContext } from '@/lib/tenant/activeTenant'
import { getLorePayload } from '@/lib/payload'
import { invitationPurposeLabel, isInvitationToken } from '@/lib/invitations/types'
import { resolveInvitation } from '@/lib/invitations/service'

type Props = { params: Promise<{ token: string }> }

export const dynamic = 'force-dynamic'

function invitePath(token: string): string {
  return `/invite/${encodeURIComponent(token)}`
}

export default async function InvitationResolverPage({ params }: Props) {
  const { token } = await params
  const payload = await getLorePayload()
  const resolution = await resolveInvitation(payload, token)
  const context = await getActiveContext()
  const inviteHref = isInvitationToken(token) ? invitePath(token) : '/invite'
  const inviteQuery = isInvitationToken(token) ? `?invite=${encodeURIComponent(token)}` : ''
  const invitation = resolution.invitation

  if (resolution.status !== 'valid' || !invitation) {
    return (
      <PlatformShell>
        <section className={styles.panel}>
          <p className={styles.eyebrow}>Invitation link</p>
          <h1 className={styles.sectionTitle}>This invitation is no longer available.</h1>
          <p className={styles.sectionLead}>The link may be expired, revoked, already used, or no longer match its Domain. Ask the issuer for a new Copy Link.</p>
          <p style={{ marginTop: '1.6rem' }}><Link href={context.user ? '/' : `/${inviteQuery}`} className={styles.primary}>{context.user ? 'Return to Loreforge' : 'Return to sign in'}</Link></p>
        </section>
      </PlatformShell>
    )
  }

  const target = invitation.purpose === 'character_claim'
    ? invitation.character?.name ?? 'a Character'
    : invitation.domain?.name ?? 'a Domain'
  const signInHref = `/${inviteQuery}#login`
  const registerHref = `/create-account${inviteQuery}`

  return (
    <PlatformShell>
      <section className={styles.panel}>
        <p className={styles.eyebrow}>{invitation.purposeLabel}</p>
        <h1 className={styles.sectionTitle}>You’re invited to {target}.</h1>
        <p className={styles.sectionLead}>
          {invitation.purpose === 'domain_bootstrap'
            ? 'This secure link starts a pending Domain handoff for platform approval.'
            : invitation.purpose === 'character_claim'
              ? `This secure link is for the unclaimed Character ${invitation.character?.name ?? 'you were invited to control'}.`
              : `This secure link is for participation in ${invitation.domain?.name ?? 'this Domain'}.`}
        </p>
        <div className={styles.emptyCard}>
          <p><strong>Purpose:</strong> {invitationPurposeLabel(invitation.purpose)}</p>
          {invitation.domain ? <p><strong>Domain:</strong> {invitation.domain.name}</p> : null}
          {invitation.character ? <p><strong>Character:</strong> {invitation.character.name}</p> : null}
          {invitation.expiresAt ? <p><strong>Expires:</strong> {new Date(invitation.expiresAt).toLocaleString()}</p> : <p><strong>Expires:</strong> Never</p>}
        </div>
        <div className={styles.actions} style={{ marginTop: '1.6rem' }}>
          {context.user ? <Link href={inviteHref} className={styles.primary}>Continue with this invite</Link> : <><Link href={registerHref} className={styles.primary}>Create account</Link><Link href={signInHref} className={styles.secondary}>Sign in</Link></>}
        </div>
      </section>
    </PlatformShell>
  )
}

