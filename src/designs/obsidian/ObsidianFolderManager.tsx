import type { FolderManagementPageModel } from '@/lib/page-models/management/folders'
import { FolderManager } from '@/components/folders/FolderManager'

/** Obsidian's folder surface consumes the canonical folder workspace. */
export function ObsidianFolderManager({ model }: { model: FolderManagementPageModel }) {
  return <FolderManager model={model} />
}
