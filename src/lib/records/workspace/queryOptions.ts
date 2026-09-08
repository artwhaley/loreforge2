export const RECORDS_PAGE_SIZES = [6, 12, 24, 25, 50, 100] as const
export type RecordsPageSize = (typeof RECORDS_PAGE_SIZES)[number]

export const RECORDS_SEARCH_SORTS = ['-updatedAt', 'updatedAt', 'title', '-title'] as const
export type RecordsSearchSort = (typeof RECORDS_SEARCH_SORTS)[number]

/** Parse the bounded server-search controls; malformed values use safe defaults. */
export function parseRecordsSearchOptions(params: URLSearchParams): {
  pageSize: RecordsPageSize
  sort: RecordsSearchSort
} {
  const rawPageSize = params.get('pageSize')
  const pageSize = RECORDS_PAGE_SIZES.find((value) => String(value) === rawPageSize) ?? 50
  const rawSort = params.get('sort')
  const sort = RECORDS_SEARCH_SORTS.includes(rawSort as RecordsSearchSort) ? rawSort as RecordsSearchSort : '-updatedAt'
  return { pageSize, sort }
}
