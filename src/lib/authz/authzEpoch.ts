import type { Payload } from 'payload'

/**
 * P08X-T06: Domain-scoped authorization facts version.
 *
 * Stage role lists (lifecycle-stages) now feed authorization decisions, so a
 * write to them must invalidate the Domain's cached authorization facts.
 * Authorization sessions are request-owned (React `cache()` — nothing
 * survives the request), so the NEXT request always reloads fresh facts; the
 * epoch exists so a write is observable and the session cache can key on it:
 *
 * - `bumpAuthzEpoch` runs on every lifecycle-stages write (collection hooks)
 *   and increments `domains.authzEpoch` plus the module-level bump map;
 * - `currentAuthzEpoch` reads the bump map first (same-process writes are
 *   visible immediately, synchronously) and falls back to the stored field on
 *   other process instances;
 * - the cached session loader keys its request-local memo on the epoch, so a
 *   session loaded before a write can never be reused after it within the
 *   same request — and a fresh request always sees the new value.
 *
 * The module map is deliberately not the source of truth: it is per-process
 * scratch, and the DB field is authoritative across instances.
 */
const bumpMap = new Map<number, number>()

export async function currentAuthzEpoch(payload: Payload, domainId: number | string): Promise<number> {
  const domain = Number(domainId)
  const bumped = bumpMap.get(domain)
  if (bumped !== undefined) return bumped
  const row = await payload.findByID({ collection: 'domains', id: domain, depth: 0, overrideAccess: true }).catch(() => null) as unknown as { authzEpoch?: unknown } | null
  return Number(row?.authzEpoch ?? 0)
}

/** Increment the Domain's authorization facts version (idempotent-ish: each call advances by one). */
export async function bumpAuthzEpoch(payload: Payload, domainId: number | string): Promise<number> {
  const domain = Number(domainId)
  const next = (await currentAuthzEpoch(payload, domain)) + 1
  bumpMap.set(domain, next)
  try {
    await payload.update({ collection: 'domains', id: domain, overrideAccess: true, data: { authzEpoch: next } as never })
  } catch (error) {
    payload.logger.error(`authzEpoch bump failed for Domain ${domain}: ${error instanceof Error ? error.message : String(error)}`)
  }
  return next
}