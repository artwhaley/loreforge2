import { cache } from 'react'

import type { Payload } from 'payload'

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
 * No module-global state, no TTL, nothing survives the request.
 */
export const loadCachedAuthorizationSession = cache(async (payload: Payload, userId: number | string, activeCharacterId: number | string | null, domainId: number | string): Promise<AuthzSession> =>
  loadAuthorizationSession(payload, { userId, activeCharacterId }, domainId),
)
