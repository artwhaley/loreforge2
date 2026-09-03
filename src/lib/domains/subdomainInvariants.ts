export type SubdomainInput = { domainId: number | string; slug: string; parentSubdomainId?: number | string | null }

export function assertSubdomainShape(input: SubdomainInput): true {
  if (!input.slug.trim()) throw new Error('Department slug is required.')
  if (input.parentSubdomainId !== null && input.parentSubdomainId !== undefined) throw new Error('Departments cannot contain recursive parent Departments.')
  if (input.domainId === null || input.domainId === undefined || input.domainId === '') throw new Error('Department must belong to one Domain.')
  return true
}
