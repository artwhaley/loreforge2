import type { Lifecycle } from '@/lib/documents/lifecycle'

export type RoutingFolderShape = {
  defaultFolder?: unknown
  draftFolder?: unknown
  pendingReviewFolder?: unknown
  filedFolder?: unknown
  lockedFolder?: unknown
}

const relationId = (value: unknown): number | null => value && typeof value === 'object' && 'id' in value
  ? Number((value as { id: number | string }).id)
  : value === null || value === undefined || value === '' ? null : Number(value)

/** The Document Type route field that owns each lifecycle state (P07X-T05). */
export const LIFECYCLE_ROUTE_FIELDS: Record<Lifecycle, keyof RoutingFolderShape> = {
  draft: 'draftFolder',
  pending_review: 'pendingReviewFolder',
  filed: 'filedFolder',
  locked: 'lockedFolder',
}

/**
 * P07X-T05 centralized lifecycle routing — the single resolution helper used
 * by every lifecycle transition. A state-specific route wins; otherwise the
 * Type's defaultFolder is the fallback; with neither, the record keeps its
 * current Folder (legacy Domains without routing config stay put).
 *
 * Pure over the Type row shape: callers fetch the record once and pass it.
 */
export function resolveLifecycleRouteFolder(type: RoutingFolderShape | null | undefined, lifecycle: Lifecycle, currentFolderId: number | null): number | null {
  if (!type) return currentFolderId
  const field = LIFECYCLE_ROUTE_FIELDS[lifecycle]
  const stateFolder = relationId(type[field])
  if (stateFolder != null) return stateFolder
  const fallback = relationId(type.defaultFolder)
  return fallback != null ? fallback : currentFolderId
}

/** The Folder a new record of this Type should start in (used by creation paths). */
export function defaultRouteFolder(type: RoutingFolderShape | null | undefined, currentFolderId: number | null): number | null {
  if (!type) return currentFolderId
  const fallback = relationId(type.defaultFolder)
  return fallback != null ? fallback : currentFolderId
}

export { relationId as routingRelationId }