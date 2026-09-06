'use client'

import { useMemo, useState } from 'react'

import type { LifecycleStageRowShape } from '@/lib/documents/lifecycleStages'
import type { Lifecycle } from '@/lib/documents/lifecycle'
import type { InspectorFolderNode, InspectorRole, TypeTreeData } from '@/lib/documents/typeTree'

import { TypeTree } from './TypeTree'
import { TypeInspector } from './TypeInspector'

type TypeFolderOption = { id: number; name: string; departmentId: number | null; depth: number }

function flattenTypeFolders(nodes: TypeTreeData['roots'], depth = 0): TypeFolderOption[] {
  return nodes.flatMap((node) => {
    if (node.kind !== 'folder') return []
    return [{ id: Number(node.id.slice('fld-'.length)), name: node.name, departmentId: node.departmentId ?? null, depth }, ...flattenTypeFolders(node.children, depth + 1)]
  })
}

/**
 * P08X-T03/T04: the tree is the first-order surface; selecting a Type (or
 * Create new) opens the shared inspector beneath it. All data is resolved
 * server-side — the client only holds the selection.
 */
export function DocumentTypesBrowser({ domainSlug, data, canManage, roles, folders, stagesByType }: {
  domainSlug: string
  data: TypeTreeData
  canManage: boolean
  roles: InspectorRole[]
  folders: InspectorFolderNode[]
  stagesByType: Record<number, Record<Lifecycle, LifecycleStageRowShape | null>>
}) {
  const [selectedTypeId, setSelectedTypeId] = useState<number | null>(null)
  const [creating, setCreating] = useState(false)
  const selectedLeaf = useMemo(() => data.types.find((type) => type.id === selectedTypeId) ?? null, [data.types, selectedTypeId])
  const typeFolders = useMemo(() => flattenTypeFolders(data.roots), [data.roots])

  return <div style={{ display: 'grid', gap: '1.1rem' }}>
    <TypeTree
      domainSlug={domainSlug}
      data={data}
      canManage={canManage}
      selectedTypeId={selectedTypeId}
      onSelectType={(id) => { setSelectedTypeId(id); setCreating(false) }}
      onCreateNew={canManage ? () => { setSelectedTypeId(null); setCreating(true) } : undefined}
    />
    {canManage && (creating || selectedLeaf) ? <TypeInspector
      key={creating ? 'create' : `type-${selectedLeaf!.id}`}
      mode={creating ? 'create' : 'edit'}
      domainSlug={domainSlug}
      leaf={selectedLeaf}
      departments={data.departments}
      typeFolders={typeFolders}
      roles={roles}
      folders={folders}
      stages={creating || !selectedLeaf ? null : (stagesByType[selectedLeaf.id] ?? null)}
      defaultDepartmentId={selectedLeaf?.departmentId ?? null}
      onCreated={(typeId) => { setCreating(false); setSelectedTypeId(typeId) }}
      onCancel={creating ? () => setCreating(false) : undefined}
    /> : null}
  </div>
}