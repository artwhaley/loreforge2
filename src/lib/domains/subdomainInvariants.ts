export type SubdomainInput = { domainId: number | string; slug: string; parentSubdomainId?: number | string | null }

export function assertSubdomainShape(input: SubdomainInput): true {
  if (!input.slug.trim()) throw new Error('Subdomain slug is required.')
  if (input.parentSubdomainId !== null && input.parentSubdomainId !== undefined) throw new Error('Subdomains cannot contain recursive parent Subdomains.')
  if (input.domainId === null || input.domainId === undefined || input.domainId === '') throw new Error('Subdomain must belong to one Domain.')
  return true
}
