import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { RecordsPageModel } from '@/lib/page-models/records'
import { useRecordsWorkspace } from '@/lib/records/workspace/useRecordsWorkspace'

/**
 * Shared-workspace behavior tests (spec §29.4): the debounce, abort,
 * stale-response, and cursor-pagination state machine is tested ONCE here at
 * the shared layer; Design renderers are only tested for consuming it.
 */
function model(overrides: Partial<RecordsPageModel> = {}): RecordsPageModel {
  return {
    baseUrl: '/domain/ar/records',
    domainSlug: 'ar',
    folders: [
      { id: 1, name: 'Civic', systemManaged: false, readableRecordCount: 2, children: [{ id: 2, name: 'Nested', systemManaged: false, readableRecordCount: 1, children: [] }] },
    ],
    totalReadableRecordCount: 2,
    records: [
      { id: 10, title: 'Fixture record', folderId: 1, documentTypeId: null, updatedAt: '2026-09-01T00:00:00.000Z', preparedBy: null, lifecycle: 'filed', locked: false, capabilities: { read: true, edit: false, supersede: false, delete: false } },
    ],
    documentTypes: [],
    supersessionEdges: [],
    query: { folderId: null, search: '' },
    capabilities: { manageFolders: false, actOnRecords: false, deleteRecords: false },
    vocabulary: { documentSingular: 'Record', documentPlural: 'Records', folderPlural: 'Folders' },
    ...overrides,
  }
}

type SearchResponse = { results: Array<{ id: number; title: string; folderId: number | null; documentTypeId: number | null; updatedAt: string; preparedBy: string | null; lifecycle: string; locked: boolean }>; supersessionEdges?: Array<{ newerId: number; olderId: number }>; nextCursor?: string | null }

function jsonResponse(body: SearchResponse, delayMs = 0) {
  return new Promise<Response>((resolve, reject) => {
    const timer = setTimeout(() => resolve(new Response(JSON.stringify(body), { status: 200 })), delayMs)
    // If the test aborts before the delay elapses, reject like a real fetch.
    timer.unref?.()
    void timer
    fetchMock.abortListeners.push(() => { clearTimeout(timer); reject(new DOMException('Aborted', 'AbortError')) })
  })
}

const fetchMock = { calls: [] as Array<{ url: string; signal: AbortSignal }>, abortListeners: [] as Array<() => void>, impl: null as null | ((url: string, init?: RequestInit) => Promise<Response>) }

beforeEach(() => {
  fetchMock.calls = []
  fetchMock.abortListeners = []
  fetchMock.impl = null
  vi.stubGlobal('fetch', vi.fn((url: string, init?: RequestInit) => {
    fetchMock.calls.push({ url: String(url), signal: init?.signal as AbortSignal })
    const impl = fetchMock.impl
    return impl ? impl(String(url), init) : jsonResponse({ results: [] })
  }))
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('useRecordsWorkspace shared behavior', () => {
  it('debounces search requests', async () => {
    const { result } = renderHook(() => useRecordsWorkspace(model()))
    for (const value of ['a', 'ab', 'abc']) {
      act(() => { result.current.search.setValue(value) })
    }
    expect(fetchMock.calls.length).toBe(0)
    await waitFor(() => { expect(fetchMock.calls.length).toBe(1) }, { timeout: 500 })
    expect(fetchMock.calls[0].url).toContain('q=abc')
  })

  it('aborts the in-flight request when the query changes and keeps only the newest results (stale protection)', async () => {
    let resolveFirst: ((body: SearchResponse) => void) | null = null
    fetchMock.impl = (_url, init) => new Promise<Response>((resolve, reject) => {
      const isSecond = fetchMock.calls.length === 2
      if (isSecond) resolve(new Response(JSON.stringify({ results: [{ id: 99, title: 'fresh', folderId: null, documentTypeId: null, updatedAt: '2026-09-01T00:00:00.000Z', preparedBy: null, lifecycle: 'filed', locked: false }], nextCursor: null }), { status: 200 }))
      else {
        resolveFirst = (body) => resolve(new Response(JSON.stringify(body), { status: 200 }))
        init?.signal?.addEventListener('abort', () => { resolveFirst = null; reject(new DOMException('Aborted', 'AbortError')) })
      }
    })
    const { result } = renderHook(() => useRecordsWorkspace(model()))
    act(() => { result.current.search.setValue('first') })
    await waitFor(() => { expect(fetchMock.calls.length).toBe(1) })
    act(() => { result.current.search.setValue('secon') })
    await waitFor(() => { expect(fetchMock.calls.length).toBe(2) })
    // The stale first response must not overwrite the fresh results. If the
    // abort already rejected it, resolving is a harmless no-op.
    const resolveStale: (body: SearchResponse) => void = (body) => { resolveFirst?.(body) }
    await act(async () => { resolveStale({ results: [{ id: 1, title: 'STALE', folderId: null, documentTypeId: null, updatedAt: '2026-09-01T00:00:00.000Z', preparedBy: null, lifecycle: 'filed', locked: false }], nextCursor: null }) })
    await waitFor(() => {
      expect(result.current.results.records.some((record) => record.title === 'STALE')).toBe(false)
      expect(result.current.results.records.some((record) => record.title === 'fresh')).toBe(true)
    })
  })

  it('cursor paginates with dedupe and stops when exhausted', async () => {
    let page = 0
    fetchMock.impl = () => {
      page += 1
      const row = (id: number) => ({ id, title: `row-${id}`, folderId: null, documentTypeId: null, updatedAt: '2026-09-01T00:00:00.000Z', preparedBy: null, lifecycle: 'filed', locked: false })
      if (page === 1) return Promise.resolve(new Response(JSON.stringify({ results: [row(1), row(2)], nextCursor: 'c2' }), { status: 200 }))
      if (page === 2) return Promise.resolve(new Response(JSON.stringify({ results: [row(2), row(3)], nextCursor: null }), { status: 200 }))
      throw new Error('unexpected page')
    }
    const { result } = renderHook(() => useRecordsWorkspace(model()))
    act(() => { result.current.search.setValue('row') })
    await waitFor(() => { expect(result.current.results.records.length).toBe(2) })
    expect(result.current.results.hasMore).toBe(true)
    await act(async () => { await result.current.results.loadMore() })
    // row 2 arrives again on page two and must be deduped.
    expect(result.current.results.records.map((record) => record.id).sort((a, b) => a - b)).toEqual([1, 2, 3])
    expect(result.current.results.hasMore).toBe(false)
  })

  it('resets search results when the folder selection changes', async () => {
    const { result } = renderHook(() => useRecordsWorkspace(model()))
    act(() => { result.current.search.setValue('query') })
    await waitFor(() => { expect(fetchMock.calls.length).toBe(1) })
    act(() => { result.current.folders.select(1) })
    expect(result.current.results.records.every((record) => record.title !== 'Fixture record' || record.folderId === 1)).toBe(true)
    // Selecting a folder clears the search result set and refires the query.
    await waitFor(() => { expect(fetchMock.calls.length).toBe(2) })
    expect(fetchMock.calls[1].url).toContain('folder=1')
  })

  it('expands folders with children by default and toggles on demand', () => {
    const { result } = renderHook(() => useRecordsWorkspace(model()))
    expect(result.current.folders.expandedIds.has(1)).toBe(true)
    act(() => { result.current.folders.toggleExpanded(1) })
    expect(result.current.folders.expandedIds.has(1)).toBe(false)
  })

  it('derives supersession trees from already-authorized edges without fetching', () => {
    const edges = [{ newerId: 20, olderId: 10 }]
    const { result } = renderHook(() => useRecordsWorkspace(model({
      records: [
        { id: 10, title: 'v1', folderId: null, documentTypeId: null, updatedAt: '2026-09-01T00:00:00.000Z', preparedBy: null, lifecycle: 'filed', locked: false, capabilities: { read: true, edit: false, supersede: false, delete: false } },
        { id: 20, title: 'v2', folderId: null, documentTypeId: null, updatedAt: '2026-09-01T00:00:00.000Z', preparedBy: null, lifecycle: 'filed', locked: false, capabilities: { read: true, edit: false, supersede: false, delete: false } },
      ],
      supersessionEdges: edges,
    })))
    expect(result.current.results.trees).toHaveLength(1)
    expect(result.current.results.trees[0].record.id).toBe(20)
    expect(result.current.selection.isSuperseded).toBe(false)
    expect(fetchMock.calls.length).toBe(0)
  })
})
