import { describe, expect, it } from 'vitest'

import type { RecordSummary } from '@/lib/page-models/common'
import { buildSupersessionTrees, isSuperseded, rootOf, newerByOlder } from '@/lib/records/workspace/supersession'

function record(id: number, title: string): RecordSummary {
  return { id, title, folderId: null, documentTypeId: null, updatedAt: '2026-09-01T00:00:00.000Z', preparedBy: null, lifecycle: 'filed', locked: false, capabilities: { read: true, edit: false, supersede: false, delete: false } }
}

/** Shared supersession derivation is pure, total, and cycle-safe. */
describe('supersession derivation', () => {
  it('roots a linear chain at the current version', () => {
    const records = [record(1, 'v1'), record(2, 'v2'), record(3, 'v3')]
    const newer = newerByOlder([{ newerId: 2, olderId: 1 }, { newerId: 3, olderId: 2 }])
    expect(rootOf(1, newer)).toBe(3)
    const trees = buildSupersessionTrees(records, [{ newerId: 2, olderId: 1 }, { newerId: 3, olderId: 2 }])
    expect(trees).toHaveLength(1)
    expect(trees[0].record.id).toBe(3)
    expect(trees[0].children[0].record.id).toBe(2)
    expect(trees[0].children[0].children[0].record.id).toBe(1)
  })

  it('keeps unrelated records as singleton trees', () => {
    const trees = buildSupersessionTrees([record(1, 'a'), record(2, 'b')], [])
    expect(trees).toHaveLength(2)
  })

  it('detects superseded records from the edge set', () => {
    const edges = [{ newerId: 2, olderId: 1 }]
    expect(isSuperseded(1, edges)).toBe(true)
    expect(isSuperseded(2, edges)).toBe(false)
  })

  it('terminates on cyclic edges', () => {
    const records = [record(1, 'a'), record(2, 'b')]
    const edges = [{ newerId: 1, olderId: 2 }, { newerId: 2, olderId: 1 }]
    const trees = buildSupersessionTrees(records, edges)
    expect(trees.length).toBeGreaterThan(0)
  })
})
