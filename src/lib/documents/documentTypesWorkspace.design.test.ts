import { describe, expect, it } from 'vitest'

import type { TypeTreeNode } from '@/lib/documents/typeTree'
import { flattenTypeFolders } from '@/components/functional/document-types/useDocumentTypesManagementWorkspace'

/**
 * OBSIDIAN-T05: fixture-based tree-selection presentation contract. The
 * flatten helper powers the inspector's subfolder picker; it must never
 * flatten Department roots, the virtual Unassigned root, or Type nodes into
 * folder options, and it must preserve nesting depth for the picker.
 */

const departmentRoot = (id: number, name: string, children: TypeTreeNode[] = []): TypeTreeNode => ({ id: `dept-${id}`, kind: 'department', name, children })
const folder = (id: number, name: string, children: TypeTreeNode[] = [], departmentId: number | null = null): TypeTreeNode => ({ id: `fld-${id}`, kind: 'folder', name, departmentId, children })
const typeNode = (id: number, name: string): TypeTreeNode => ({ id: `type-${id}`, kind: 'type', name, children: [] })

describe('OBSIDIAN-T05 type-folder flatten', () => {
  const roots: TypeTreeNode[] = [
    departmentRoot(1, 'Hall of Coin', [
      folder(10, 'Deeds', [
        folder(11, 'Nested', [], 1),
        typeNode(100, 'Deed of Transfer'),
      ], 1),
      typeNode(101, 'Treasury Note'),
    ]),
    { id: 'unassigned', kind: 'unassigned', name: 'Unassigned', children: [folder(20, 'Orphaned', [], null)] },
  ]

  it('flattens only manual folder nodes with depth, never roots or types', () => {
    const flat = flattenTypeFolders(roots)
    expect(flat).toEqual([
      { id: 10, name: 'Deeds', departmentId: 1, depth: 0 },
      { id: 11, name: 'Nested', departmentId: 1, depth: 1 },
      { id: 20, name: 'Orphaned', departmentId: null, depth: 0 },
    ])
  })

  it('does not expose the virtual Unassigned root as a folder option', () => {
    const flat = flattenTypeFolders(roots)
    expect(flat.some((option) => option.name === 'Unassigned')).toBe(false)
    expect(flat.some((option) => option.id === 20)).toBe(true) // its folder children still surface
  })
})