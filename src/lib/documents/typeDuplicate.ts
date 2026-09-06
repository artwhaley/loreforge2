import type { Payload } from 'payload'

import type { LifecycleStageRowShape } from './lifecycleStages'

const relationId = (value: unknown): number | null => value && typeof value === 'object' && 'id' in value
  ? Number((value as { id: number | string }).id)
  : value === null || value === undefined || value === '' ? null : Number(value)

const roleIds = (value: unknown): number[] => {
  const values = Array.isArray(value) ? value : value == null || value === '' ? [] : [value]
  return values.map(relationId).filter((id): id is number => id != null)
}

export type DuplicateResult = { ok: true; typeId: number; name: string } | { ok: false; error: string }

/**
 * P08X-T05: duplicate a Document Type in its current state (active stays
 * active) with name + " (copyN)" (first free N), deep-copying every
 * constructed child template of both kinds as independent rows (name +
 * " (copyN)", same content, `active: true`, `version: +1`, never a shared
 * reference — including the base-template graph when it stays inside the
 * Type) and copying the lifecycle-stages rows wholesale (enabled flags,
 * creation flags, folders, all four role lists). Placement
 * (department/typeFolder) and template selection carry over unchanged.
 */
export async function duplicateDocumentType(payload: Payload, args: { typeId: number | string; domainId: number | string }): Promise<DuplicateResult> {
  const typeId = Number(args.typeId)
  const domainId = Number(args.domainId)
  if (!Number.isInteger(typeId) || typeId <= 0) return { ok: false, error: 'invalid' }
  const source = await payload.findByID({ collection: 'document-types', id: typeId, depth: 0, overrideAccess: true }).catch(() => null) as unknown as ({
    id: number | string
    domain?: unknown
    name?: unknown
    description?: unknown
    active?: unknown
    templateSelection?: unknown
    department?: unknown
    typeFolder?: unknown
    defaultFilingPolicy?: unknown
    templateFilingPolicy?: unknown
  }) | null
  if (!source || relationId(source.id) !== typeId) return { ok: false, error: 'not-found' }
  if (relationId(source.domain) !== domainId) return { ok: false, error: 'not-found' }

  const baseName = String(source.name ?? 'Untitled').trim() || 'Untitled'
  const copyNumber = await nextCopyNumber(payload, domainId, baseName)
  const suffix = ` (copy${copyNumber})`

  const selection = (['blank', 'markdown', 'form'] as const).includes(String(source.templateSelection ?? 'blank') as never) ? String(source.templateSelection ?? 'blank') : 'blank'
  const created = await payload.create({
    collection: 'document-types',
    overrideAccess: true,
    data: {
      domain: domainId,
      name: `${baseName}${suffix}`,
      description: source.description == null || source.description === '' ? undefined : String(source.description),
      active: source.active !== false,
      templateSelection: selection,
      allowBlank: selection === 'blank',
      allowTemplate: selection === 'markdown',
      allowForm: selection === 'form',
      department: relationId(source.department) ?? undefined,
      typeFolder: relationId(source.typeFolder) ?? undefined,
      defaultFilingPolicy: String(source.defaultFilingPolicy ?? 'direct-file'),
      templateFilingPolicy: String(source.templateFilingPolicy ?? 'inherit'),
    } as never,
  })
  const copyTypeId = Number(created.id)

  // Deep-copy every constructed child template (both kinds). Pass 1 creates
  // the rows with baseTemplate null; pass 2 rewires bases that stay inside
  // the Type to their copied row, so no row is ever shared with the source.
  const templateRows = await payload.find({ collection: 'templates', where: { and: [{ documentType: { equals: typeId } }, { active: { equals: true } }] }, depth: 0, limit: 50, overrideAccess: true })
  const idMap = new Map<number, number>()
  const copies: Array<{ sourceId: number; copyId: number; baseId: number | null }> = []
  for (const row of templateRows.docs as unknown as Array<Record<string, unknown> & { id: number | string }>) {
    const kind = String(row.kind ?? 'document') === 'form' ? 'form' : 'document'
    const copyName = `${String(row.name ?? 'Template').trim() || 'Template'}${suffix}`
    const copy = await payload.create({
      collection: 'templates',
      overrideAccess: true,
      data: {
        domain: domainId,
        documentType: copyTypeId,
        name: copyName,
        kind,
        scopeFolder: relationId(row.scopeFolder),
        destinationFolder: relationId(row.destinationFolder),
        allowDestinationOverride: false,
        availableToDescendants: row.availableToDescendants !== false,
        baseTemplate: null,
        titleTemplate: row.titleTemplate,
        bodyTemplate: row.bodyTemplate,
        headerMarkdown: row.headerMarkdown ?? '',
        footerMarkdown: row.footerMarkdown ?? '',
        formSchema: row.formSchema ?? null,
        lifecyclePolicy: String(row.lifecyclePolicy ?? 'inherit'),
        active: true,
        version: Number(row.version ?? 1) + 1,
      } as never,
    })
    const copyId = Number(copy.id)
    idMap.set(Number(row.id), copyId)
    copies.push({ sourceId: Number(row.id), copyId, baseId: relationId(row.baseTemplate) })
  }
  for (const copy of copies) {
    const mappedBase = copy.baseId == null ? null : idMap.get(copy.baseId) ?? null
    if (mappedBase != null) {
      await payload.update({ collection: 'templates', id: copy.copyId, overrideAccess: true, data: { baseTemplate: mappedBase } as never })
    }
  }

  // Copy the lifecycle-stages rows wholesale: flags, folders, role lists.
  const stageRows = await payload.find({ collection: 'lifecycle-stages', where: { documentType: { equals: typeId } }, depth: 0, limit: 10, overrideAccess: true })
  for (const row of stageRows.docs as unknown as LifecycleStageRowShape[]) {
    await payload.create({
      collection: 'lifecycle-stages',
      overrideAccess: true,
      data: {
        documentType: copyTypeId,
        stage: String(row.stage ?? ''),
        enabled: row.enabled !== false,
        allowOnCreation: Boolean(row.allowOnCreation),
        privateDraftsAllowed: row.privateDraftsAllowed !== false,
        folder: relationId(row.folder) ?? undefined,
        readRoles: roleIds(row.readRoles),
        writeRoles: roleIds(row.writeRoles),
        editOthersRoles: roleIds(row.editOthersRoles),
        manageRoles: roleIds(row.manageRoles),
      } as never,
    })
  }

  return { ok: true, typeId: copyTypeId, name: `${baseName}${suffix}` }
}

/** First free " (copyN)" number for a name inside the Domain (copy1, copy2, …). */
async function nextCopyNumber(payload: Payload, domainId: number, baseName: string): Promise<number> {
  const rows = await payload.find({ collection: 'document-types', where: { and: [{ domain: { equals: domainId } }, { name: { like: `${baseName} (copy%)` } }] }, depth: 0, limit: 500, overrideAccess: true })
  const taken = new Set<number>()
  for (const row of rows.docs) {
    const match = String((row as { name?: unknown }).name ?? '').match(/\(copy(\d+)\)\s*$/)
    if (match) taken.add(Number(match[1]))
  }
  let number = 1
  while (taken.has(number)) number += 1
  return number
}