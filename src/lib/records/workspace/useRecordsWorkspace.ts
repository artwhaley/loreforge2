'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

import type { FolderSummary, RecordSummary, SupersessionEdge } from '@/lib/page-models/common'
import type { RecordsPageModel } from '@/lib/page-models/records'
import { buildSupersessionTrees, isSuperseded } from './supersession'
import type { RecordsContextMenu, RecordsDialog } from './types'

function filterFolders(node: FolderSummary, matching: Set<number>): FolderSummary | null {
  const children = node.children.map((child) => filterFolders(child, matching)).filter((child): child is FolderSummary => child !== null)
  return matching.has(node.id) || children.length > 0 ? { ...node, children } : null
}

function descendantIdsOf(folder: FolderSummary): number[] {
  return [folder.id, ...folder.children.flatMap(descendantIdsOf)]
}

type SearchRow = { id: number; title: string; folderId: number | null; documentTypeId: number | null; updatedAt: string; preparedBy: string | null; lifecycle: string; locked: boolean }

/**
 * Shared Records interactive behavior (spec §13/Stage G). Owns search,
 * cursor pagination, folder workspace, supersession derivation, selection,
 * and dialog/menu state over an already-authorized RecordsPageModel.
 * No authorization is inferred here; the server endpoints enforce it.
 */
export function useRecordsWorkspace(model: RecordsPageModel) {
  const { folders, records, documentTypes, supersessionEdges, query, capabilities } = model
  const [selectedFolderId, setSelectedFolderId] = useState<number | null>(query.folderId)
  const [selectedRecordId, setSelectedRecordId] = useState<number | null>(null)
  const [search, setSearch] = useState(query.search)
  const [searchSubfolders, setSearchSubfolders] = useState(true)
  const [typeChoice, setTypeChoice] = useState('')
  const [exposedTypeId, setExposedTypeId] = useState<number | null>(null)
  const [dialog, setDialog] = useState<RecordsDialog>(null)
  const [contextMenu, setContextMenu] = useState<RecordsContextMenu>(null)
  const [searchRecords, setSearchRecords] = useState<RecordSummary[]>([])
  const [searchEdges, setSearchEdges] = useState<SupersessionEdge[]>([])
  const [searchCursor, setSearchCursor] = useState<string | null>(null)
  const [searchHasMore, setSearchHasMore] = useState(false)
  const [searching, setSearching] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const searchKeyRef = useRef('')
  const searchRequestRef = useRef<AbortController | null>(null)
  const [expandedFolders, setExpandedFolders] = useState<Set<number>>(() => {
    const expanded = new Set<number>()
    const visit = (nodes: FolderSummary[]) => nodes.forEach((folder) => {
      if (folder.children.length > 0) expanded.add(folder.id)
      visit(folder.children)
    })
    visit(folders)
    return expanded
  })

  const folderById = useMemo(() => {
    const byId = new Map<number, FolderSummary>()
    const visit = (nodes: FolderSummary[]) => nodes.forEach((folder) => { byId.set(folder.id, folder); visit(folder.children) })
    visit(folders)
    return byId
  }, [folders])
  const selectedFolder = selectedFolderId != null ? folderById.get(selectedFolderId) ?? null : null
  const selectedFolderDescendants = useMemo(() => selectedFolder ? new Set(descendantIdsOf(selectedFolder)) : null, [selectedFolder])

  const searchTrimmed = search.trim()
  const searchActive = searchTrimmed.length > 0
  useEffect(() => {
    const searchKey = JSON.stringify([model.domainSlug, searchTrimmed, searchSubfolders, selectedFolderId, exposedTypeId])
    searchKeyRef.current = searchKey
    searchRequestRef.current?.abort()
    if (!searchActive) return
    const controller = new AbortController()
    searchRequestRef.current = controller
    const timer = setTimeout(async () => {
      setSearching(true)
      try {
        const params = new URLSearchParams({ domainSlug: model.domainSlug, q: searchTrimmed, subfolders: String(searchSubfolders) })
        if (selectedFolderId !== null) params.set('folder', String(selectedFolderId))
        if (exposedTypeId !== null) params.set('type', String(exposedTypeId))
        const response = await fetch(`/api/records-search?${params}`, { signal: controller.signal })
        if (!response.ok) return
        const data = await response.json() as { results: SearchRow[]; supersessionEdges?: SupersessionEdge[]; nextCursor?: string | null }
        if (searchKeyRef.current !== searchKey) return
        setSearchRecords(data.results.map((row) => ({ ...row, capabilities: { read: true, edit: false, supersede: false, delete: false } })))
        setSearchEdges(data.supersessionEdges ?? [])
        setSearchCursor(data.nextCursor ?? null)
        setSearchHasMore(Boolean(data.nextCursor))
      } catch { /* aborted or network failure: keep prior results */ } finally {
        if (searchKeyRef.current === searchKey) setSearching(false)
      }
    }, 200)
    return () => { clearTimeout(timer); controller.abort(); if (searchRequestRef.current === controller) searchRequestRef.current = null }
  }, [searchActive, searchTrimmed, searchSubfolders, selectedFolderId, exposedTypeId, model.domainSlug])

  const loadMore = async () => {
    if (!searchActive || !searchHasMore || !searchCursor || loadingMore) return
    const searchKey = searchKeyRef.current
    const controller = new AbortController()
    searchRequestRef.current?.abort()
    searchRequestRef.current = controller
    setLoadingMore(true)
    try {
      const params = new URLSearchParams({ domainSlug: model.domainSlug, q: searchTrimmed, subfolders: String(searchSubfolders), cursor: searchCursor })
      if (selectedFolderId !== null) params.set('folder', String(selectedFolderId))
      if (exposedTypeId !== null) params.set('type', String(exposedTypeId))
      const response = await fetch(`/api/records-search?${params}`, { signal: controller.signal })
      if (!response.ok || searchKeyRef.current !== searchKey) return
      const data = await response.json() as { results: SearchRow[]; supersessionEdges?: SupersessionEdge[]; nextCursor?: string | null }
      if (searchKeyRef.current !== searchKey) return
      setSearchRecords((current) => {
        const merged = new Map(current.map((row) => [row.id, row]))
        for (const row of data.results) merged.set(row.id, { ...row, capabilities: { read: true, edit: false, supersede: false, delete: false } })
        return [...merged.values()]
      })
      setSearchEdges((current) => {
        const merged = new Map([...current, ...(data.supersessionEdges ?? [])].map((edge) => [`${edge.newerId}:${edge.olderId}`, edge]))
        return [...merged.values()]
      })
      setSearchCursor(data.nextCursor ?? null)
      setSearchHasMore(Boolean(data.nextCursor))
    } catch { /* aborted or network failure: retain the loaded page */ } finally {
      if (searchKeyRef.current === searchKey) setLoadingMore(false)
      if (searchRequestRef.current === controller) searchRequestRef.current = null
    }
  }

  const resetSearchResults = () => { setSearchRecords([]); setSearchEdges([]); setSearchCursor(null); setSearchHasMore(false) }
  const selectFolder = (folderId: number | null) => { setSelectedFolderId(folderId); setSelectedRecordId(null); resetSearchResults() }
  const applyExposure = (choice: string) => { setExposedTypeId(choice ? Number(choice) : null); setSelectedRecordId(null); resetSearchResults() }
  const toggleFolder = (folderId: number) => setExpandedFolders((current) => {
    const next = new Set(current)
    if (next.has(folderId)) next.delete(folderId)
    else next.add(folderId)
    return next
  })

  const activeRecords = useMemo(() => searchActive
    ? [...records.filter((record) => !searchRecords.some((row) => row.id === record.id)), ...searchRecords]
    : records, [records, searchActive, searchRecords])
  const visibleFolders = useMemo(() => {
    if (exposedTypeId === null) return folders
    const matching = new Set<number>(records.filter((record) => record.documentTypeId === exposedTypeId && record.folderId !== null).map((record) => record.folderId as number))
    return folders.map((folder) => filterFolders(folder, matching)).filter((folder): folder is FolderSummary => folder !== null)
  }, [exposedTypeId, folders, records])
  const matchingRecords = useMemo(() => {
    if (searchActive) return searchRecords
    const normalized = search.trim().toLocaleLowerCase()
    return records.filter((record) => {
      if (exposedTypeId !== null && record.documentTypeId !== exposedTypeId) return false
      if (selectedFolderId !== null) {
        const inSelected = record.folderId === selectedFolderId
        const inDescendant = selectedFolderDescendants?.has(record.folderId ?? -1) ?? false
        if (normalized && searchSubfolders ? !inDescendant : !inSelected) return false
      }
      return !normalized || record.title.toLocaleLowerCase().includes(normalized)
    })
  }, [exposedTypeId, records, search, searchActive, searchRecords, searchSubfolders, selectedFolderDescendants, selectedFolderId])
  const activeEdges = useMemo(() => [...new Map([...supersessionEdges, ...(searchActive ? searchEdges : [])].map((edge) => [`${edge.newerId}:${edge.olderId}`, edge])).values()], [searchActive, searchEdges, supersessionEdges])
  const recordTrees = useMemo(() => buildSupersessionTrees(matchingRecords, activeEdges), [matchingRecords, activeEdges])
  const directCountByFolder = useMemo(() => {
    const counts = new Map<number, number>()
    const visit = (nodes: FolderSummary[]) => nodes.forEach((folder) => { counts.set(folder.id, folder.readableRecordCount); visit(folder.children) })
    visit(folders)
    if (exposedTypeId !== null) {
      for (const record of records) {
        if (record.documentTypeId !== exposedTypeId) continue
        if (record.folderId !== null) counts.set(record.folderId, (counts.get(record.folderId) ?? 0) + 1)
      }
    }
    return counts
  }, [exposedTypeId, folders, records])
  const rootBadgeCount = exposedTypeId === null ? model.totalReadableRecordCount : records.filter((record) => record.documentTypeId === exposedTypeId).length
  const documentTypeName = exposedTypeId === null ? null : documentTypes.find((type) => type.id === exposedTypeId)?.name ?? null
  const selectedRecord = selectedRecordId != null ? activeRecords.find((record) => record.id === selectedRecordId) ?? null : null
  const selectedIsSuperseded = selectedRecord ? isSuperseded(selectedRecord.id, activeEdges) : false
  const returnTo = selectedFolderId === null ? `${model.baseUrl}/records` : `${model.baseUrl}/records?folder=${selectedFolderId}`

  if (selectedRecordId !== null && !matchingRecords.some((record) => record.id === selectedRecordId)) {
    setSelectedRecordId(null)
  }
  useEffect(() => {
    if (!contextMenu) return
    const close = () => setContextMenu(null)
    window.addEventListener('click', close)
    return () => window.removeEventListener('click', close)
  }, [contextMenu])

  return {
    search: { value: search, setValue: setSearch, active: searchActive, loading: searching, subfolders: searchSubfolders, setSubfolders: setSearchSubfolders },
    folders: { list: visibleFolders, byId: folderById, selectedId: selectedFolderId, select: selectFolder, expandedIds: expandedFolders, toggleExpanded: toggleFolder, selected: selectedFolder, descendantIds: selectedFolderDescendants },
    results: { records: matchingRecords, trees: recordTrees, edges: activeEdges, loadMore, hasMore: searchActive && searchHasMore, loadingMore, counts: directCountByFolder, total: model.totalReadableRecordCount, rootCount: rootBadgeCount },
    selection: { recordId: selectedRecordId, selectRecord: setSelectedRecordId, selected: selectedRecord, isSuperseded: selectedIsSuperseded },
    actions: { dialog, setDialog, menu: contextMenu, setMenu: setContextMenu, returnTo },
    exposure: { typeId: exposedTypeId, apply: applyExposure, typeChoice, setTypeChoice, typeName: documentTypeName },
    capabilities,
    resetSearchResults,
  }
}

export type RecordsWorkspaceHandle = ReturnType<typeof useRecordsWorkspace>
