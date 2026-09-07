import type { FolderSummary, RecordSummary, SupersessionEdge } from '@/lib/page-models/common'
import type { SupersessionNode } from './supersession'

export type RecordsSearchResult = {
  records: RecordSummary[]
  edges: SupersessionEdge[]
  cursor: string | null
  hasMore: boolean
}

export type RecordsDialog = 'create-folder' | 'rename-folder' | 'delete-folder' | null
export type RecordsContextMenu = { kind: 'folder' | 'record'; id: number | null; x: number; y: number } | null

export type RecordsWorkspace = {
  search: { value: string; setValue(value: string): void; active: boolean; loading: boolean }
  folders: {
    list: FolderSummary[]
    byId: Map<number, FolderSummary>
    selectedId: number | null
    select(id: number | null): void
    expandedIds: ReadonlySet<number>
    toggleExpanded(id: number): void
    selected: FolderSummary | null
    descendantIds: ReadonlySet<number> | null
  }
  results: {
    records: RecordSummary[]
    trees: SupersessionNode[]
    edges: SupersessionEdge[]
    loadMore(): void
    hasMore: boolean
    loadingMore: boolean
  }
  selection: { recordId: number | null; selectRecord(id: number | null): void }
  actions: { dialog: RecordsDialog; setDialog(dialog: RecordsDialog): void; menu: RecordsContextMenu; setMenu(menu: RecordsContextMenu): void }
  exposure: { typeId: number | null; apply(typeChoice: string): void; typeChoice: string; setTypeChoice(value: string): void }
}
