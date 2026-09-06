import type { Payload } from 'payload'

import type { Lifecycle } from '@/lib/documents/lifecycle'

/** The four intentional lifecycle stages (P08X spec §2.4). */
export const LIFECYCLE_STAGES: readonly Lifecycle[] = ['draft', 'submitted', 'filed', 'deprecated']

export const LIFECYCLE_STAGE_LABELS: Record<Lifecycle, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  filed: 'Filed',
  deprecated: 'Deprecated',
}

const relationId = (value: unknown): number | null => value && typeof value === 'object' && 'id' in value
  ? Number((value as { id: number | string }).id)
  : value === null || value === undefined || value === '' ? null : Number(value)

export type LifecycleStageRowShape = {
  id?: number | string
  documentType?: unknown
  stage?: unknown
  enabled?: unknown
  allowOnCreation?: unknown
  folder?: unknown
  privateDraftsAllowed?: unknown
  readRoles?: unknown
  writeRoles?: unknown
  editOthersRoles?: unknown
  manageRoles?: unknown
}

/**
 * Default stage configuration for a brand-new Document Type (P08X-T02 §7):
 * all four stage rows exist; Filed is enabled by default; Draft is enabled
 * with allowOnCreation + privateDraftsAllowed; Submitted and Deprecated exist
 * but start disabled. Idempotent — existing rows are never overwritten.
 */
export async function ensureLifecycleStageRows(payload: Payload, documentTypeId: number | string): Promise<void> {
  const typeId = Number(documentTypeId)
  if (!Number.isInteger(typeId) || typeId <= 0) throw new Error('A Document Type id is required to seed lifecycle stages.')
  for (const stage of LIFECYCLE_STAGES) {
    const existing = await payload.find({
      collection: 'lifecycle-stages',
      where: { and: [{ documentType: { equals: typeId } }, { stage: { equals: stage } }] },
      depth: 0,
      limit: 1,
      overrideAccess: true,
    })
    if (existing.docs[0]) continue
    const enabled = stage === 'filed' || stage === 'draft'
    const allowOnCreation = stage === 'draft'
    await payload.create({
      collection: 'lifecycle-stages',
      overrideAccess: true,
      data: {
        documentType: typeId,
        stage,
        enabled,
        allowOnCreation,
        privateDraftsAllowed: stage === 'draft',
      },
    })
  }
}

/** Load all stage rows for one Document Type, keyed by stage. */
export async function lifecycleStageRowsForType(payload: Payload, documentTypeId: number | string): Promise<Record<Lifecycle, LifecycleStageRowShape | null>> {
  const typeId = Number(documentTypeId)
  const result = await payload.find({
    collection: 'lifecycle-stages',
    where: { documentType: { equals: typeId } },
    depth: 0,
    limit: 10,
    overrideAccess: true,
  })
  const byStage: Record<Lifecycle, LifecycleStageRowShape | null> = { draft: null, submitted: null, filed: null, deprecated: null }
  for (const row of result.docs) {
    const stage = String((row as { stage?: unknown }).stage ?? '')
    if (stage in byStage) byStage[stage as Lifecycle] = row as unknown as LifecycleStageRowShape
  }
  return byStage
}

/** Whether a stage is enabled for the Type (missing row counts as disabled). */
export function stageEnabled(row: LifecycleStageRowShape | null | undefined): boolean {
  return Boolean(row?.enabled)
}

/** Resolve the stage row's Folder (or null when unset). */
export function stageFolderId(row: LifecycleStageRowShape | null | undefined): number | null {
  return relationId(row?.folder)
}

/** Resolve a role list's ids from a hasMany relationship value. */
export function stageRoleIds(row: LifecycleStageRowShape | null | undefined, field: 'readRoles' | 'writeRoles' | 'editOthersRoles' | 'manageRoles'): number[] {
  const raw = row?.[field]
  const values = Array.isArray(raw) ? raw : raw == null || raw === '' ? [] : [raw]
  return values.map((value) => relationId(value)).filter((id): id is number => id != null)
}