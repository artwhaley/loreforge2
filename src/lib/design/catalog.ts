// Pure Design catalog (P08D-T03-E). Keys + basic metadata + status ONLY —
// no React component imports, so Payload/schema-safe code can import this
// without pulling Design bundles. The registry (which imports the Designs)
// derives its metadata from here; validators never re-declare the key set.
import type { DesignKey } from './types'
import type { DesignStatus } from './contracts'

export type DesignCatalogEntry = {
  key: DesignKey
  status: DesignStatus
  name: string
  description: string
  thumbnail: string
}

export const DESIGN_CATALOG: readonly DesignCatalogEntry[] = [
  {
    key: 'civic',
    status: 'first-class',
    name: 'Civic',
    description: 'A classic institutional portal: composed masthead, clear directory, structured record grid.',
    thumbnail: '/designs/civic.svg',
  },
  {
    key: 'ledger',
    status: 'first-class',
    name: 'Ledger',
    description: 'An editorial archive: persistent side index, generous reading column, ruled register.',
    thumbnail: '/designs/ledger.svg',
  },
  {
    key: 'poster',
    status: 'compatibility',
    name: 'Poster',
    description: 'A cultural publication: monumental type, asymmetric compositions, graphic destination tiles.',
    thumbnail: '/designs/poster.svg',
  },
  {
    key: 'obsidian',
    status: 'first-class',
    name: 'Obsidian',
    description: 'A night-harbour world: dark atmospheric surfaces, luminous accents, cinematic records.',
    thumbnail: '/designs/obsidian.svg',
  },
] as const

export const DESIGN_CATALOG_KEYS: readonly DesignKey[] = DESIGN_CATALOG.map((entry) => entry.key)

/**
 * First-class Designs pass the shared conformance contract and isolation
 * checks. Poster remains compatibility; a Design earns its place here by
 * passing the release-gate registry contract — never by fiat.
 */
export const FIRST_CLASS_DESIGNS: readonly DesignKey[] = DESIGN_CATALOG.filter((entry) => entry.status === 'first-class').map((entry) => entry.key)
