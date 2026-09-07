import { cache } from 'react'

import type { Payload } from 'payload'

import { currentAuthzEpoch } from './authzEpoch'
import { loadAuthorizationSession, type AuthzSession } from './session'

/**
 * P07P-02 request-local memoization.
 *
 * React `cache()` deduplicates only within a single server request, which is
 * the exact lifetime the spec requires. Keys are PRIMITIVES (userId,
 * activeCharacterId, domainId) so every call site constructing a fresh actor
 * object still hits the same cache entry. Routes/actions/services with
 * transactions use loadAuthorizationSession directly (transaction-fresh
 * authority, never this cache).
 *
 * P08X-T06: the inner memo is additionally keyed on the Domain's
 * authorization-facts epoch (`domains.authzEpoch`, bumped by every
 * lifecycle-stages write). A session loaded before a stage-list edit can
 * never be reused for the epoch after it — permission edits take effect as
 * soon as the facts change, and a fresh request always starts from the
 * stored epoch. `currentAuthzEpoch` reads the same-process bump map first,
 * so a write earlier in this request is visible to the very next decision.
 *
 * No module-global session state, no TTL, nothing survives the request.
 */
const sessionByEpoch = cache(async (payload: Payload, userId: number, activeCharacterId: number | null, domainId: number, epoch: number): Promise<AuthzSession> =>
  loadAuthorizationSession(payload, { userId, activeCharacterId }, domainId),
)

export const loadCachedAuthorizationSession = cache(async (payload: Payload, userId: number | string, activeCharacterId: number | string | null, domainId: number | string): Promise<AuthzSession> => {
  const domain = Number(domainId)
  const epoch = await currentAuthzEpoch(payload, domain)
  return sessionByEpoch(payload, Number(userId), activeCharacterId == null ? null : Number(activeCharacterId), domain, epoch)
})