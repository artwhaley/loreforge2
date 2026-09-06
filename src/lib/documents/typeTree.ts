import type { Payload } from 'payload'

import type { Lifecycle } from './lifecycle'
import type { LifecycleStageRowShape } from './lifecycleStages'

const relationId = (value: unknown): number | null => value && typeof value === 'object' && 'id' in value
  ? Number((value as { id: number | string }).id)
  : value === null || value === undefined || value === '' ? null : Number(value)

export type TemplateSelection = 'blank' | 'markdown' | 'form'

export type TypeTreeLeaf = {
  id: number
  name: string
  description?: string | null
  active: boolean
  departmentId: number | null
  typeFolderId: number | null
  templateSelection: TemplateSelection
  templateId: number | null
  templateName: string | null
  templateKind: 'document' | 'form' | null
  /** Active constructed child per kind — never the selected one only (T04 inspector). */
  constructedTemplates: { markdown: { id: number; name: string } | null; form: { id: number; name: string } | null }
}

/**
 * One node in the Document Type tree. Department roots and the virtual
 * Unassigned root carry kind 'department'/'unassigned'; manual navigation
 * folders carry 'folder'; Document Types carry 'type' with their leaf data.
 */
export type TypeTreeNode = {
  id: string
  kind: 'department' | 'unassigned' | 'folder' | 'type'
  name: string
  archived?: boolean
  leaf?: TypeTreeLeaf
  departmentId?: number | null
  children: TypeTreeNode[]
}

export type TypeTreeData = {
  roots: TypeTreeNode[]
  hasUnassigned: boolean
  /** Flat department list for pickers (active first, then archived). */
  departments: Array<{ id: number; name: string; archived: boolean }>
  /** All types flat (for search/inspector lookup). */
  types: TypeTreeLeaf[]
}

type TemplateRow = { id: number | string; kind?: unknown; active?: unknown; documentType?: unknown; name?: unknown }

/**
 * Resolve the whole type tree for a Domain (P08X spec §2.2, §3.2):
 * - every active Department is a root at all times, name-ordered; archived
 *   Departments never render as roots (their content lands in Unassigned);
 * - manual type-folders nest by parent under their Department root (or
 *   Unassigned when their Department is archived/null);
 * - Document Types hang under their typeFolder when set, else their
 *   Department root; types with a null or archived Department surface under
 *   the virtual Unassigned root, which renders only when populated.
 * Null selection on legacy rows degrades to Blank; the current template is
 * derived as the active child of the selected kind (never stored twice).
 */
export async function resolveTypeTree(payload: Payload, domainId: number | string): Promise<TypeTreeData> {
  const domain = Number(domainId)
  const [departmentRows, folderRows, typeRows, templateRows] = await Promise.all([
    payload.find({ collection: 'subdomains', where: { domain: { equals: domain } }, depth: 0, limit: 200, sort: 'name', overrideAccess: true }),
    payload.find({ collection: 'type-folders', where: { domain: { equals: domain } }, depth: 0, limit: 500, overrideAccess: true }),
    payload.find({ collection: 'document-types', where: { domain: { equals: domain } }, depth: 0, limit: 500, sort: 'name', overrideAccess: true }),
    payload.find({ collection: 'templates', where: { domain: { equals: domain } }, depth: 0, limit: 1000, overrideAccess: true }),
  ])

  const archivedIds = new Set<number>()
  const activeDepartments = departmentRows.docs
    .map((row) => ({ id: Number(row.id), name: String((row as { name?: unknown }).name ?? ''), archived: (row as { publicListing?: unknown }).publicListing === false }))
    .filter((department) => {
      if (department.archived) { archivedIds.add(department.id); return false }
      return Boolean(department.name)
    })
    .sort((a, b) => a.name.localeCompare(b.name))

  const folders = folderRows.docs.map((row) => ({
    id: Number(row.id),
    name: String((row as { name?: unknown }).name ?? ''),
    departmentId: relationId((row as { department?: unknown }).department),
    parentId: relationId((row as { parent?: unknown }).parent),
  }))

  // Active child of each kind per Type for the derived template line card.
  const templatesByType = new Map<number, { document: TemplateRow | null; form: TemplateRow | null }>()
  for (const row of templateRows.docs as unknown as TemplateRow[]) {
    const typeId = relationId(row.documentType)
    if (typeId == null || row.active === false) continue
    const kind = String(row.kind ?? 'document') === 'form' ? 'form' : 'document'
    const bucket = templatesByType.get(typeId) ?? { document: null, form: null }
    if (!bucket[kind]) bucket[kind] = row
    templatesByType.set(typeId, bucket)
  }

  const leaves: TypeTreeLeaf[] = typeRows.docs.map((row) => {
    const raw = row as unknown as { id: number | string; name?: unknown; description?: unknown; active?: unknown; department?: unknown; typeFolder?: unknown; templateSelection?: unknown }
    const id = Number(raw.id)
    const selection = String(raw.templateSelection ?? 'blank') as TemplateSelection
    const template = selection === 'blank' ? null : templatesByType.get(id)?.[selection === 'markdown' ? 'document' : 'form'] ?? null
    const constructed = templatesByType.get(id) ?? { document: null, form: null }
    return {
      id,
      name: String(raw.name ?? ''),
      description: raw.description == null ? null : String(raw.description),
      active: raw.active !== false,
      departmentId: relationId(raw.department),
      typeFolderId: relationId(raw.typeFolder),
      templateSelection: selection,
      templateId: template ? Number(template.id) : null,
      templateName: template ? String(template.name ?? '') : null,
      templateKind: template ? (String(template.kind ?? 'document') === 'form' ? 'form' : 'document') : null,
      constructedTemplates: {
        markdown: constructed.document ? { id: Number(constructed.document.id), name: String(constructed.document.name ?? '') } : null,
        form: constructed.form ? { id: Number(constructed.form.id), name: String(constructed.form.name ?? '') } : null,
      },
    }
  })

  const leafByFolder = new Map<number | null, TypeTreeLeaf[]>()
  for (const leaf of leaves) {
    const key = leaf.typeFolderId
    const bucket = leafByFolder.get(key) ?? []
    bucket.push(leaf)
    leafByFolder.set(key, bucket)
  }
  const folderChildren = new Map<number | null, typeof folders>()
  for (const folder of folders) {
    const bucket = folderChildren.get(folder.parentId) ?? []
    bucket.push(folder)
    folderChildren.set(folder.parentId, bucket)
  }

  const typeNode = (leaf: TypeTreeLeaf): TypeTreeNode => ({
    id: `type-${leaf.id}`,
    kind: 'type',
    name: leaf.name,
    leaf,
    children: [],
  })

  const buildFolder = (folder: (typeof folders)[number]): TypeTreeNode => {
    const subfolders = (folderChildren.get(folder.id) ?? []).map(buildFolder)
    const typeChildren = (leafByFolder.get(folder.id) ?? []).map(typeNode)
    return {
      id: `fld-${folder.id}`,
      kind: 'folder',
      name: folder.name,
      departmentId: folder.departmentId,
      children: [...subfolders, ...typeChildren],
    }
  }

  const rootNodes: TypeTreeNode[] = []
  const unassignedChildren: TypeTreeNode[] = []

  for (const department of activeDepartments) {
    const rootFolders = (folderChildren.get(null) ?? []).filter((folder) => folder.departmentId === department.id)
    const rootTypes = (leafByFolder.get(null) ?? []).filter((leaf) => leaf.departmentId === department.id)
    rootNodes.push({
      id: `dept-${department.id}`,
      kind: 'department',
      name: department.name,
      children: [...rootFolders.map(buildFolder), ...rootTypes.map(typeNode)],
    })
  }

  // Folders under archived/null Departments, and their type descendants.
  const strayFolders = (folderChildren.get(null) ?? []).filter((folder) => folder.departmentId == null || archivedIds.has(folder.departmentId))
  // Types with archived/null Department that are NOT inside a stray folder.
  const strayTypes = (leafByFolder.get(null) ?? []).filter((leaf) => leaf.departmentId == null || archivedIds.has(leaf.departmentId))
  // Types inside stray folders (folder children already carry them).
  for (const folder of strayFolders) {
    const node = buildFolder(folder)
    const hasContent = node.children.length > 0
    if (hasContent) unassignedChildren.push(node)
  }
  for (const leaf of strayTypes) unassignedChildren.push(typeNode(leaf))
  const hasUnassigned = unassignedChildren.length > 0
  // The virtual Unassigned root renders only when it has population; it is a
  // read-only surface (never a drop target, never a picker choice).
  if (hasUnassigned) {
    rootNodes.push({ id: 'unassigned', kind: 'unassigned', name: 'Unassigned', children: unassignedChildren })
  }

  return {
    roots: rootNodes,
    hasUnassigned,
    departments: [...activeDepartments.map((department) => ({ id: department.id, name: department.name, archived: false })), ...departmentRows.docs
      .filter((row) => archivedIds.has(Number(row.id)))
      .map((row) => ({ id: Number(row.id), name: String((row as { name?: unknown }).name ?? ''), archived: true }))],
    types: leaves,
  }
}

export type InspectorRole = { id: number; name: string; active: boolean }
export type InspectorFolderNode = { id: number; name: string; children: InspectorFolderNode[] }

/**
 * P08X-T04 inspector data: every Domain role (for the four role-list editors),
 * the Folder tree (for the compressed stage-folder picker popup), and every
 * lifecycle-stages row grouped by Document Type. All read through the
 * access-closed override path, like the tree resolver.
 */
export async function resolveInspectorData(payload: Payload, domainId: number | string, typeIds: number[]): Promise<{
  roles: InspectorRole[]
  folders: InspectorFolderNode[]
  stagesByType: Record<number, Record<Lifecycle, LifecycleStageRowShape | null>>
}> {
  const domain = Number(domainId)
  const [roleRows, folderRows, stageRows] = await Promise.all([
    payload.find({ collection: 'roles', where: { domain: { equals: domain } }, depth: 0, limit: 500, sort: 'name', overrideAccess: true }),
    payload.find({ collection: 'folders', where: { domain: { equals: domain } }, depth: 0, limit: 0, pagination: false, sort: 'name', overrideAccess: true }),
    typeIds.length > 0
      ? payload.find({ collection: 'lifecycle-stages', where: { documentType: { in: typeIds } }, depth: 0, limit: typeIds.length * 6, overrideAccess: true })
      : Promise.resolve({ docs: [] as unknown[] }),
  ])
  const roles: InspectorRole[] = roleRows.docs.map((row) => ({
    id: Number(row.id),
    name: String((row as { name?: unknown }).name ?? ''),
    active: (row as { active?: unknown }).active !== false,
  }))
  // Build the Folder tree from the flat rows (parent ids are stored flat).
  const rawFolders = folderRows.docs.map((row) => ({ id: Number(row.id), name: String((row as { name?: unknown }).name ?? ''), parentId: relationId((row as { parent?: unknown }).parent) }))
  const rawById = new Map(rawFolders.map((folder) => [folder.id, folder]))
  const folderById = new Map<number, InspectorFolderNode>()
  for (const folder of rawFolders) folderById.set(folder.id, { id: folder.id, name: folder.name, children: [] })
  const roots: InspectorFolderNode[] = []
  for (const folder of rawFolders) {
    if (folder.parentId != null && rawById.has(folder.parentId)) folderById.get(folder.parentId)!.children.push(folderById.get(folder.id)!)
    else roots.push(folderById.get(folder.id)!)
  }
  const stagesByType: Record<number, Record<Lifecycle, LifecycleStageRowShape | null>> = {}
  for (const typeId of typeIds) stagesByType[typeId] = { draft: null, submitted: null, filed: null, deprecated: null }
  for (const row of stageRows.docs as unknown as LifecycleStageRowShape[]) {
    const typeId = relationId(row.documentType)
    const stage = String(row.stage ?? '')
    if (typeId == null || !(stage in (stagesByType[typeId] ?? {}))) continue
    stagesByType[typeId][stage as Lifecycle] = row
  }
  return { roles, folders: roots, stagesByType }
}