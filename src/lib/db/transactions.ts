import type { Payload } from 'payload'

/**
 * Run `fn` inside one DB transaction. Every Payload operation inside `fn` must
 * pass `req: { transactionID }` so it joins instead of auto-committing (Payload
 * 3.88: Local API operations auto-begin/commit their own transaction unless a
 * transactionID is already present on the request). On failure the whole
 * transaction rolls back. Established by P05R-T02 (supersession atomicity) and
 * shared with P05R-T05 (Domain-participation removal).
 */
export async function runInTransaction<T>(payload: Payload, fn: (transactionID: number | string) => Promise<T>): Promise<T> {
  const transactionID = await payload.db.beginTransaction()
  if (transactionID === null || transactionID === undefined) {
    // Adapter without live transaction support: document exact evidence and
    // fall back to sequential execution (P05R-T02 B evidence note).
    payload.logger.warn('runInTransaction: adapter returned no transactionID; running without a real transaction.')
    return fn(0 as unknown as number)
  }
  try {
    const result = await fn(transactionID)
    await payload.db.commitTransaction(transactionID)
    return result
  } catch (error) {
    try {
      await payload.db.rollbackTransaction(transactionID)
    } catch {
      // Rollback failure is logged by the adapter; the original error wins.
    }
    throw error
  }
}