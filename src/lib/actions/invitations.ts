'use server'

import { headers } from 'next/headers.js'
import { getPayload } from 'payload'

import config from '@/payload.config'
import { getActiveContext } from '@/lib/tenant/activeTenant'
import { isInvitationPurpose } from '@/lib/invitations/types'
import { issueCharacterInvitation, issueDomainBootstrapInvitation, issueDomainJoinInvitation } from '@/lib/invitations/workflows'

export type IssueInvitationState = {
  ok: boolean
  link?: string
  error?: string
}

/**
 * P08-GATE-05: invitation issuance as a Server Action. Returns the raw
 * token/link ONCE in action state to the current rendered page — never in the
 * URL, never in logs. Refresh does not regenerate or reveal the old token.
 */
export async function issueInvitationAction(_prev: IssueInvitationState | null, formData: FormData): Promise<IssueInvitationState> {
  const purpose = String(formData.get('purpose') ?? '')
  const domainId = Number(formData.get('domainId') ?? '')
  if (!isInvitationPurpose(purpose) || !Number.isInteger(domainId)) return { ok: false, error: 'invalid' }
  try {
    const payload = await getPayload({ config })
    const { user } = await payload.auth({ headers: await headers() })
    if (!user) return { ok: false, error: 'unauthorized' }
    const context = await getActiveContext()
    const actor = { userId: user.id, activeCharacterId: context.activeCharacter?.id ?? null }
    const expiresRaw = String(formData.get('expiresAt') ?? '').trim()
    const expiresAt = expiresRaw ? new Date(expiresRaw) : null
    if (expiresAt && !Number.isFinite(expiresAt.getTime())) return { ok: false, error: 'invalid' }
    const maxUsesRaw = String(formData.get('maxUses') ?? '').trim()
    const maxUses = maxUsesRaw ? Number(maxUsesRaw) : null
    const result = purpose === 'domain_bootstrap'
      ? await issueDomainBootstrapInvitation(payload, { actor, domainId, expiresAt })
      : purpose === 'character_claim'
        ? await issueCharacterInvitation(payload, { actor, domainId, characterId: Number(formData.get('characterId') ?? ''), expiresAt })
        : await issueDomainJoinInvitation(payload, { actor, domainId, expiresAt, maxUses })
    if (!result.ok) return { ok: false, error: 'failed' }
    // Log issuance metadata only — never the raw token.
    payload.logger.info(`Invitation issued: purpose=${purpose} domain=${domainId} actorUser=${user.id}`)
    return { ok: true, link: `/invite/${result.token}` }
  } catch {
    return { ok: false, error: 'failed' }
  }
}
