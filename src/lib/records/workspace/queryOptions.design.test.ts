import { describe, expect, it } from 'vitest'

import { parseRecordsSearchOptions, RECORDS_PAGE_SIZES, RECORDS_SEARCH_SORTS } from './queryOptions'

describe('records search query options', () => {
  it('accepts only the bounded page sizes and sort keys', () => {
    for (const pageSize of RECORDS_PAGE_SIZES) {
      for (const sort of RECORDS_SEARCH_SORTS) {
        expect(parseRecordsSearchOptions(new URLSearchParams({ pageSize: String(pageSize), sort }))).toEqual({ pageSize, sort })
      }
    }
  })

  it('falls back safely for malformed or out-of-contract values', () => {
    expect(parseRecordsSearchOptions(new URLSearchParams({ pageSize: '101', sort: 'updatedAt;drop' }))).toEqual({ pageSize: 50, sort: '-updatedAt' })
    expect(parseRecordsSearchOptions(new URLSearchParams({ pageSize: '0x32', sort: '' }))).toEqual({ pageSize: 50, sort: '-updatedAt' })
    expect(parseRecordsSearchOptions(new URLSearchParams())).toEqual({ pageSize: 50, sort: '-updatedAt' })
  })
})
