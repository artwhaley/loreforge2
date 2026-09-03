export function copyLifecycle(domainKind: string): 'draft' {
  // Community copies always begin as Draft. Personal keep-copy policy is a
  // later phase and is intentionally not inferred here.
  if (domainKind === 'personal' || domainKind === 'community') return 'draft'
  return 'draft'
}

export function resolveCrossDomainType(sourceName: string, destinationTypes: Array<{ id: number; name: string; active?: boolean | null }>, plainTextId?: number | null) {
  const exact = destinationTypes.find((type) => type.active !== false && type.name.trim().toLocaleLowerCase() === sourceName.trim().toLocaleLowerCase())
  return exact?.id ?? plainTextId ?? null
}

export function operationIdentity(operation: 'copy' | 'same-domain-move' | 'cross-domain-move', sourceId: number, destinationId: number) {
  return operation === 'copy' ? { idChanges: true, expectedId: destinationId } : { idChanges: false, expectedId: sourceId }
}
