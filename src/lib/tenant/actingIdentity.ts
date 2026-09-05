import type { Payload } from 'payload'

import { ACTIVE_CHARACTER_COOKIE, ACTIVE_TENANT_COOKIE } from './activeTenant'

export type ActingIdentity = { tenantSlug: string | null; characterId: number | null }

function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get('cookie')
  if (!header) return null
  for (const part of header.split(';')) {
    const eq = part.indexOf('=')
    if (eq === -1) continue
    if (part.slice(0, eq).trim() === name) {
      try {
        return decodeURIComponent(part.slice(eq + 1).trim())
      } catch {
        return null
      }
    }
  }
  return null
}

/**
 * P07X-T02 acting-identity resolution for guarded route handlers.
 *
 * Reads the selector cookies from THIS request. Route handlers expose the
 * same cookies through next/headers; reading the request directly keeps the
 * sanctioned seams testable headlessly and is behavior-identical in
 * production. The tuple is validated exactly like switch-character: an
 * active Character controlled by the calling User. The decision engine
 * re-validates kind/domain scope on every evaluatePermission call, so e.g. a
 * domain_admin of another Domain still fails closed in the routes' guards.
 */
export async function resolveActingIdentity(payload: Payload, request: Request, userId: number | string): Promise<ActingIdentity> {
  const tenantSlug = readCookie(request, ACTIVE_TENANT_COOKIE)
  const raw = readCookie(request, ACTIVE_CHARACTER_COOKIE)
  const characterId = raw ? Number(raw) : NaN
  if (!Number.isFinite(characterId)) return { tenantSlug, characterId: null }
  const character = await payload.findByID({ collection: 'characters', id: characterId, depth: 0, overrideAccess: true }).catch(() => null) as ({ status?: unknown; controlledBy?: unknown } | null)
  const controlledBy = character != null && character.controlledBy != null && typeof character.controlledBy === 'object'
    ? (character.controlledBy as { id?: number | string }).id
    : character != null ? character.controlledBy as number | string | null : null
  const valid = character != null && character.status === 'active' && controlledBy != null && String(controlledBy) === String(userId)
  return { tenantSlug, characterId: valid ? characterId : null }
}