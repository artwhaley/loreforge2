'use client'

import { useState } from 'react'

import type { TypeTreeData } from '@/lib/documents/typeTree'

import { TypeTree } from './TypeTree'

/**
 * P08X-T03: client surface for the Document Types page. Holds the selected
 * type so the tree and (T04) the inspector panel share one selection.
 */
export function DocumentTypesBrowser({ domainSlug, data, canManage }: {
  domainSlug: string
  data: TypeTreeData
  canManage: boolean
}) {
  const [selectedTypeId, setSelectedTypeId] = useState<number | null>(null)
  return <TypeTree
    domainSlug={domainSlug}
    data={data}
    canManage={canManage}
    selectedTypeId={selectedTypeId}
    onSelectType={setSelectedTypeId}
  />
}