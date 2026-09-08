/**
 * Local Obsidian adapters (OBSIDIAN-T10).
 *
 * These types exist only inside the Obsidian Design folder until later tickets
 * wire the components to production Page Models (T14 Lore, T18 management).
 * They are compile-safe local declarations, NOT live contracts: nothing in the
 * route tree or the registry imports them yet.
 */

/** Adapter for `ObsidianLore` until T14 expands the production Lore model. */
export type LoreEntryAdapter = {
  id: number
  title: string
  slug: string
  group: string
  summary: string
  updatedLabel: string
  bodyHtml: string
}

export type LorePageModelAdapter = {
  baseUrl: string
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