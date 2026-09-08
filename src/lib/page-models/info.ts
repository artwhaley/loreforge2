import type { NavigationItem } from './common'

export type AboutPageModel = {
  baseUrl: string
  bodyHtml: string
  editHref: string | null
  destinations: NavigationItem[]
}

export type LorePageModel = {
  baseUrl: string
  destinations: NavigationItem[]
  /** Published Domain pages other than the reserved home/about slugs. */
  entries: LoreEntrySummary[]
}

export type LoreEntrySummary = {
  slug: string
  href: string
  title: string
  bodyHtml: string
  /** Optional metadata is absent when the current Pages schema cannot provide it. */
  group?: string | null
  summary?: string | null
  revisionLabel?: string | null
}
