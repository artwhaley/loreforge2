import type { DocumentTypesManagementPageModel } from '@/lib/page-models/management/documentTypes'
import { DocumentTypesBrowser } from '@/components/documentTypes/DocumentTypesBrowser'

/** Obsidian's Type surface consumes the canonical Type tree/workspace. */
export function ObsidianDocumentTypes({ model }: { model: DocumentTypesManagementPageModel }) {
  return <DocumentTypesBrowser model={model} />
}
