export type DomainOwnership = { kind?: string; ownerUser?: unknown; ownerCharacter?: unknown }

const present = (value: unknown) => value !== null && value !== undefined && value !== ''

export function assertDomainOwnership(domain: DomainOwnership): true {
  const kind = domain.kind ?? 'community'
  if (kind === 'community' && !present(domain.ownerUser)) throw new Error('A Community Domain must have exactly one Owner User.')
  if (kind === 'community' && present(domain.ownerCharacter)) throw new Error('A Community Domain cannot have an Owner Character.')
  if (kind === 'personal' && !present(domain.ownerCharacter)) throw new Error('A Personal Domain must have exactly one Owner Character.')
  if (kind === 'personal' && present(domain.ownerUser)) throw new Error('A Personal Domain cannot have an Owner User.')
  return true
}
