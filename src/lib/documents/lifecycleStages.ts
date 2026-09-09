import type { Payload } from 'payload'

import { bumpAuthzEpoch } from '@/lib/authz/authzEpoch'
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
  readRoles?: unknown
  writeRoles?: unknown
  editOthersRoles?: unknown
  manageRoles?: unknown
}

/**
 * Default stage configuration for a brand-new Document Type (P08X-T02 §7):
 * all four stage rows exist; Filed is enabled by default; Draft is enabled
 * with allowOnCreation; Submitted and Deprecated exist but start disabled.
 * Idempotent — existing rows are never overwritten.
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
      },
    })
  }
}

export type LifecycleStageConfigInput = {
  stage: Lifecycle
  enabled?: boolean
  allowOnCreation?: boolean
  folderId?: number | null
  readRoleIds?: number[]
  writeRoleIds?: number[]
  editOthersRoleIds?: number[]
  manageRoleIds?: number[]
}

/**
 * P08X-T04: apply the inspector's lifecycle table to one Document Type,
 * upserting rows and validating same-Domain Folders and role lists. Returns
 * readable errors instead of relying on collection-hook rejects. A missing
 * field in a config entry leaves the stored value untouched (so a caller that
 * only moves a Folder doesn't clobber the role lists); the inspector itself
 * always sends the full row state.
 */
export async function applyLifecycleStageConfig(payload: Payload, args: { documentTypeId: number | string; domainId: number | string; stages: LifecycleStageConfigInput[] }): Promise<void> {
  const typeId = Number(args.documentTypeId)
  const domainId = Number(args.domainId)
  if (!Number.isInteger(typeId) || typeId <= 0) throw new Error('A Document Type id is required.')
  if (!Array.isArray(args.stages) || args.stages.length === 0) throw new Error('At least one lifecycle stage must be configured.')
  for (const config of args.stages) {
    if (!LIFECYCLE_STAGES.includes(config.stage)) throw new Error('Unknown lifecycle stage.')
  }
  if (args.stages.filter((config) => config.enabled !== false).length === 0) throw new Error('At least one lifecycle stage must be enabled — a Document Type needs somewhere for its records to live.')
  const folderIds = [...new Set(args.stages.map((config) => config.folderId).filter((id): id is number => id != null))]
  if (folderIds.length > 0) {
    const folderRows = await payload.find({ collection: 'folders', where: { and: [{ id: { in: folderIds } }, { domain: { equals: domainId } }] }, depth: 0, limit: folderIds.length, overrideAccess: true })
    if (folderRows.docs.length !== folderIds.length) throw new Error('Every lifecycle stage Folder must belong to the same Domain as the Document Type.')
  }
  const roleIds = [...new Set(args.stages.flatMap((config) => [
    ...(config.readRoleIds ?? []),
    ...(config.writeRoleIds ?? []),
    ...(config.editOthersRoleIds ?? []),
    ...(config.manageRoleIds ?? []),
  ]))]
  if (roleIds.length > 0) {
    const roleRows = await payload.find({ collection: 'roles', where: { and: [{ id: { in: roleIds } }, { domain: { equals: domainId } }] }, depth: 0, limit: roleIds.length, overrideAccess: true })
    if (roleRows.docs.length !== roleIds.length) throw new Error('Every lifecycle stage role must belong to the same Domain as the Document Type.')
  }
  for (const config of args.stages) {
    const existing = await payload.find({
      collection: 'lifecycle-stages',
      where: { and: [{ documentType: { equals: typeId } }, { stage: { equals: config.stage } }] },
      depth: 0,
      limit: 1,
      overrideAccess: true,
    })
    const data: Record<string, unknown> = {
      documentType: typeId,
      stage: config.stage,
    }
    // Merge contract: a missing field leaves the stored value untouched, so
    // partial updates (move a Folder, flip one switch) never clobber the rest.
    if (config.enabled !== undefined) data.enabled = Boolean(config.enabled)
    if (config.allowOnCreation !== undefined) data.allowOnCreation = Boolean(config.allowOnCreation)
    if (config.folderId !== undefined) data.folder = config.folderId ? Number(config.folderId) : null
    if (config.readRoleIds !== undefined) data.readRoles = config.readRoleIds.map(Number)
    if (config.writeRoleIds !== undefined) data.writeRoles = config.writeRoleIds.map(Number)
    if (config.editOthersRoleIds !== undefined) data.editOthersRoles = config.editOthersRoleIds.map(Number)
    if (config.manageRoleIds !== undefined) data.manageRoles = config.manageRoleIds.map(Number)
    if (existing.docs[0]) {
      await payload.update({ collection: 'lifecycle-stages', id: existing.docs[0].id, overrideAccess: true, data: data as never })
    } else {
      await payload.create({ collection: 'lifecycle-stages', overrideAccess: true, data: data as never })
    }
  }
  // P08X-T06: stage role lists feed authorization decisions, so any write
  // here invalidates the Domain's cached authorization facts. Runs after the
  // loop (never inside a row transaction) — the next authorization session
  // reloads the fresh stage lists.
  await bumpAuthzEpoch(payload, domainId)
}

/** Load all stage rows for one Document Type, keyed by stage. */
export async function lifecycleStageRowsForType(payload: Payload, documentTypeId: number | string, transactionID?: number | string | null): Promise<Record<Lifecycle, LifecycleStageRowShape | null>> {
  const typeId = Number(documentTypeId)
  const result = await payload.find({
    collection: 'lifecycle-stages',
    where: { documentType: { equals: typeId } },
    depth: 0,
    limit: 10,
    overrideAccess: true,
    ...(transactionID == null ? {} : { req: { transactionID } }),
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