export type SubdomainInput = { domainId: number | string; slug: string; parentSubdomainId?: number | string | null }

export function assertSubdomainShape(input: SubdomainInput): true {
  if (!input.slug.trim()) throw new Error('Department slug is required.')
  if (input.parentSubdomainId !== null && input.parentSubdomainId !== undefined) throw new Error('Departments cannot contain recursive parent Departments.')
  if (input.domainId === null || input.domainId === undefined || input.domainId === '') throw new Error('Department must belong to one Domain.')
  return true
}

/**
 * Derive a Department URL slug from its display name: lowercase, spaces and
 * other separators become hyphens, diacritics are flattened, and anything
 * outside a-z/0-9 is removed. Repeated, leading, and trailing hyphens
 * collapse away. Returns '' when the name has no usable characters, which
 * the caller must reject as invalid.
 */
export function slugifyDepartmentName(name: string): string {
  return String(name)
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
