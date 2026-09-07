import type {
  DocumentTypeSummary,
  FolderSummary,
  RecordSummary,
  RecordsCapabilities,
  RecordsVocabulary,
  SupersessionEdge,
} from './common'

/** The requested query state carried from the search params into the model. */
export type RecordsQueryState = {
  folderId: number | null
  search: string
}

/**
 * Semantic Records page model. Intentional absence of layout concepts: no
 * sidebar, no table rows, no column widths. A Design composes the same
 * authorized data entirely its own way.
 */
export type RecordsPageModel = {
  baseUrl: string
  domainSlug: string

  folders: FolderSummary[]
  totalReadableRecordCount: number

  records: RecordSummary[]
  documentTypes: DocumentTypeSummary[]
  supersessionEdges: SupersessionEdge[]

  query: RecordsQueryState

  capabilities: RecordsCapabilities

  vocabulary: RecordsVocabulary
}