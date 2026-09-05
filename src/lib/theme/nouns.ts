/**
 * Fixed platform nouns for customer-facing copy (owner decision 2026-09-05:
 * Domain vocabulary customization is removed - P08 corrective stack).
 *
 * Exactly these seven nouns exist. They are code constants, not theme data:
 * no editor, no storage, no per-Domain overrides.
 */

export const NOUN_SLOTS = ['domain', 'subdomain', 'archive', 'document', 'folder', 'role', 'member'] as const

export type NounSlot = (typeof NOUN_SLOTS)[number]

export type NounEntry = { singular: string; plural: string }

export type Nouns = Record<NounSlot, NounEntry>

export const PLATFORM_NOUNS: Nouns = {
  domain: { singular: 'Domain', plural: 'Domains' },
  subdomain: { singular: 'Department', plural: 'Departments' },
  archive: { singular: 'Archive', plural: 'Archives' },
  document: { singular: 'Record', plural: 'Records' },
  folder: { singular: 'Folder', plural: 'Folders' },
  role: { singular: 'Role', plural: 'Roles' },
  member: { singular: 'Member', plural: 'Members' },
}