import Link from 'next/link'

import { PlatformShell, platformStyles as styles } from '@/components/platform/PlatformShell'
import { isInvitationToken } from '@/lib/invitations/types'
import { getLorePayload } from '@/lib/payload'
import { resolveInvitation } from '@/lib/invitations/service'

export default async function CreateAccountPage({ searchParams }: { searchParams?: Promise<{ invite?: string; error?: string }> }) {
  const params = await searchParams
  const invite = isInvitationToken(params?.invite) ? params?.invite : undefined
  const resolution = invite ? await resolveInvitation(await getLorePayload(), invite) : null
  const invitation = resolution?.status === 'valid' ? resolution.invitation : null
  if (!invite || !invitation) return <PlatformShell><section className={styles.panel}><h1 className={styles.sectionTitle}>Your Loreforge invitation starts here.</h1><p className={styles.sectionLead}>Open registration is available from a valid Loreforge invitation. Ask your Domain or platform administrator for a Copy Link.</p><div className={styles.emptyCard}>{params?.error ? 'The account could not be created. Check the details and try again.' : 'No account was created. Nothing was submitted.'}</div><p style={{ marginTop: '1.6rem' }}><Link href="/" className={styles.primary}>Return to sign in</Link></p></section></PlatformShell>
  return <PlatformShell><section className={styles.panel}><h1 className={styles.sectionTitle}>Join {invitation.domain?.name ?? 'Loreforge'}.</h1><p className={styles.sectionLead}>This will become the administrator account for the community domain. A person with these login credentials will be able to delete your community domain, so choose a strong password and keep it safe.</p>{params?.error ? <p className={styles.error} role="alert">That account could not be created. Check the details and try again.</p> : null}<form action="/api/customer-register" method="post" style={{ maxWidth: '34rem', marginTop: '1.35rem' }}><input type="hidden" name="invite" value={invite} /><div className={styles.field}><label htmlFor="register-name">Second Life Legacy Name</label><input id="register-name" name="name" autoComplete="name" required /></div><div className={styles.field}><label htmlFor="register-email">Email</label><input id="register-email" name="email" type="email" autoComplete="email" required /></div><div className={styles.field}><label htmlFor="register-password">Password</label><input id="register-password" name="password" type="password" autoComplete="new-password" minLength={12} required /></div><button className={styles.primary} type="submit">Create account</button></form></section></PlatformShell>
}
