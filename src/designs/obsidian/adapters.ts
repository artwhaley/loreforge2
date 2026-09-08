/**
 * Local Obsidian adapters (OBSIDIAN-T10).
 *
 * These types keep the source presentation independent of route and registry
 * plumbing while the live adapters supply the production Page Models.
 */

/** Presentation adapter for the production Lore model. */
export type LoreEntryAdapter = {
  title: string
  slug: string
  group?: string | null
  summary?: string | null
  updatedLabel?: string | null
  bodyHtml: string
}

export type LorePageModelAdapter = {
  baseUrl: string
  domainName?: string
  introduction: string
  entries: LoreEntryAdapter[]
}

/** Adapter for `ObsidianManagement` until T18 binds capability-filtered rows. */
export type ManagementRowAdapter = {
  id: number
  primary: string
  secondary: string
  status?: string
  updatedLabel?: string
}

export type ManagementPageModelAdapter = {
  baseUrl: string
  title: string
  eyebrow: string
  description: string
  createLabel: string
  searchPlaceholder: string
  columns: string[]
  rows: ManagementRowAdapter[]
  emptyLabel: string
}
