import type { Payload } from 'payload'
import type { Capability } from '@/lib/permissions/capabilities'

/** Additive, repeatable development fixtures. Never resets Ar or existing accounts. */
export async function seedPhase7Acceptance(payload: Payload) {
  const userKeys = ['owner', 'outside', 'head', 'deputy', 'member', 'access', 'folders', 'roles', 'claims', 'claimant', 'claimant2', 'platform', 'commander', 'captain1', 'captain2', 'warrior', 'denied', 'multi']
  const users: Record<string, number> = {}
  const characters: Record<string, number> = {}
  for (const key of userKeys) {
    const email = `p7-${key}@example.test`
    const existing = await payload.find({ collection: 'users', where: { email: { equals: email } }, depth: 0, limit: 1 })
    const user = existing.docs[0] ?? await payload.create({ collection: 'users', data: { email, password: 'test-password-123', name: `P7 ${key}`, slVerificationState: 'unlinked', isPlatformAdmin: key === 'platform' } })
    users[key] = Number(user.id)
    const name = `P7 ${key}`
    const rows = await payload.find({ collection: 'characters', where: { and: [{ name: { equals: name } }, { controlledBy: { equals: user.id } }] }, depth: 0, limit: 1 })
    characters[key] = Number((rows.docs[0] ?? await payload.create({ collection: 'characters', data: { name, controlledBy: user.id, status: 'active', kind: 'player' } })).id)
  }
  const domains: Record<string, number> = {}
  for (const [key, slug, name, owner] of [['workshop', 'p7-workshop', 'P7 Workshop', 'owner'], ['outside', 'p7-outside', 'P7 Outside', 'outside']]) {
    const rows = await payload.find({ collection: 'domains', where: { slug: { equals: slug } }, depth: 0, limit: 1 })
    const domain = rows.docs[0] ?? await payload.create({ collection: 'domains', data: { slug, name, ownerUser: users[owner], kind: 'community', lifecycle: 'active', defaultFilingPolicy: 'direct-file', publicEnabled: false, preset: 'heritage', primaryColor: '#243145', secondaryColor: '#8A6A3C', accentColor: '#B9975B', backgroundColor: '#F3EFE6', headingFontKey: 'georgia', bodyFontKey: 'verdana' } })
    if (Number(typeof domain.ownerUser === 'object' ? domain.ownerUser?.id : domain.ownerUser) !== users[owner]) throw new Error(`Reserved fixture Domain ${slug} has a different owner; refusing to alter it.`)
    domains[key] = Number(domain.id)
  }
  const domainId = domains.workshop
  async function membership(character: number, domain: number) {
    const rows = await payload.find({ collection: 'domain-memberships', where: { and: [{ domain: { equals: domain } }, { character: { equals: character } }] }, limit: 1, depth: 0 })
    if (!rows.docs.length) await payload.create({ collection: 'domain-memberships', data: { domain, character, status: 'active', addedBy: users.owner } })
  }
  for (const key of userKeys) await membership(characters[key], key === 'outside' ? domains.outside : domainId)
  const departments: Record<string, number> = {}
  for (const name of ['Scribes', 'Warriors', 'Magistrates']) {
    const rows = await payload.find({ collection: 'subdomains', where: { and: [{ domain: { equals: domainId } }, { name: { equals: name } }] }, limit: 1, depth: 0 })
    departments[name] = Number((rows.docs[0] ?? await payload.create({ collection: 'subdomains', data: { domain: domainId, name, slug: name.toLowerCase() } })).id)
  }
  const roles: Record<string, number> = {}
  for (const [key, name, department, parent] of [
    ['head', 'Head Scribe', 'Scribes', ''], ['deputy', 'Assistant Head Scribe', 'Scribes', 'head'],
    ['clerk', 'Records Clerk', 'Scribes', 'deputy'], ['helper', 'Deputy Clerk', 'Scribes', 'clerk'],
    ['peer', 'Historical Archivist', 'Scribes', 'head'], ['inactive', 'Retired Clerk', 'Scribes', 'deputy'],
    ['commander', 'Commander', 'Warriors', ''], ['captain1', 'First Captain', 'Warriors', 'commander'],
    ['captain2', 'Second Captain', 'Warriors', 'commander'], ['warrior', 'Warrior', 'Warriors', ''],
    ['magistrate', 'Magistrate', 'Magistrates', ''],
  ]) {
    const rows = await payload.find({ collection: 'roles', where: { and: [{ domain: { equals: domainId } }, { name: { equals: name } }] }, limit: 1, depth: 0 })
    roles[key] = Number((rows.docs[0] ?? await payload.create({ collection: 'roles', data: { domain: domainId, subdomain: departments[department], name, parentRole: parent ? roles[parent] : null, active: key !== 'inactive', system: false } })).id)
  }
  for (const [key, role] of [['head', 'head'], ['deputy', 'deputy'], ['member', 'clerk'], ['commander', 'commander'], ['captain1', 'captain1'], ['captain2', 'captain2'], ['warrior', 'warrior'], ['denied', 'warrior'], ['multi', 'warrior'], ['multi', 'magistrate']]) {
    const rows = await payload.find({ collection: 'role-assignments', where: { and: [{ character: { equals: characters[key] } }, { role: { equals: roles[role] } }] }, limit: 1, depth: 0 })
    if (!rows.docs.length) await payload.create({ collection: 'role-assignments', data: { character: characters[key], role: roles[role], status: 'active', assignedBy: users.owner } })
  }
  const folders: Record<string, number> = {}
  for (const [key, name, parent, department] of [
    ['root', 'Domain Root', '', ''], ['scribes', 'Scribes', 'root', 'Scribes'], ['deeds', 'Deeds', 'scribes', 'Scribes'],
    ['deedsChild', 'Filed Deeds', 'deeds', 'Scribes'], ['history', 'Historical Records', 'scribes', 'Scribes'],
    ['warriors', 'Warriors', 'root', 'Warriors'], ['first', 'First Platoon', 'warriors', 'Warriors'],
    ['second', 'Second Platoon', 'warriors', 'Warriors'], ['incidents', 'Incident Reports', 'warriors', 'Warriors'],
    ['pendingIncidents', 'Pending Incident Reports', 'incidents', 'Warriors'], ['investigatingIncidents', 'Investigating Incident Reports', 'incidents', 'Warriors'],
    ['closedIncidents', 'Closed Incident Reports', 'incidents', 'Warriors'],
    ['courts', 'Court Cases', 'root', 'Magistrates'],
  ]) {
    const rows = await payload.find({ collection: 'folders', where: { and: [{ domain: { equals: domainId } }, { name: { equals: name } }] }, limit: 1, depth: 0 })
    folders[key] = Number((rows.docs[0] ?? await payload.create({ collection: 'folders', data: { domain: domainId, name, parent: parent ? folders[parent] : null, subdomain: department ? departments[department] : null, systemManaged: key === 'root', filingPolicy: 'inherit', publicAccess: 'inherit' } })).id)
  }
  const rule = async (principalType: 'Character' | 'Role', principal: number, resourceType: 'Domain' | 'Subdomain' | 'Folder' | 'DocumentType', resource: number, capability: Capability, effect: 'grant' | 'deny' = 'grant') => {
    const principalCollection = principalType === 'Character' ? 'characters' : 'roles'
    const resourceCollection = resourceType === 'Domain' ? 'domains' : resourceType === 'Subdomain' ? 'subdomains' : resourceType === 'DocumentType' ? 'document-types' : 'folders'
    const ruleKey = JSON.stringify([domainId, principalType, principalCollection, principal, resourceType, resourceCollection, resource, capability])
    if ((await payload.find({ collection: 'permission-rules', where: { ruleKey: { equals: ruleKey } }, depth: 0, limit: 1 })).docs.length) return
    await payload.create({ collection: 'permission-rules', data: { ruleKey, domain: domainId, principalType, principal: { relationTo: principalCollection, value: principal }, resourceType, resource: { relationTo: resourceCollection, value: resource }, capability, effect, active: true, actorUser: users.owner, actorCharacter: characters.owner } })
  }
  for (const key of ['head', 'deputy']) await rule('Role', roles[key], 'Subdomain', departments.Scribes, 'assign_subordinates')
  for (const cap of ['read', 'create_document', 'edit_document', 'manage_access'] as const) await rule('Role', roles.head, 'Folder', folders.scribes, cap)
  await rule('Role', roles.clerk, 'Folder', folders.scribes, 'read')
  for (const cap of ['manage_access', 'read'] as const) await rule('Character', characters.access, 'Folder', folders.deeds, cap)
  for (const cap of ['edit_document', 'create_document'] as const) await rule('Character', characters.access, 'Folder', folders.deeds, cap, 'deny')
  await rule('Character', characters.folders, 'Folder', folders.deeds, 'manage_folders')
  await rule('Character', characters.roles, 'Subdomain', departments.Scribes, 'manage_roles')
  await rule('Character', characters.claims, 'Domain', domainId, 'manage_claims')
  for (const key of ['captain1', 'captain2', 'warrior', 'magistrate']) for (const cap of ['read', 'create_document', 'edit_document'] as const) {
    const folder = key === 'captain1' ? folders.first : key === 'captain2' ? folders.second : key === 'warrior' ? folders.incidents : folders.courts
    await rule('Role', roles[key], 'Folder', folder, cap)
  }
  await rule('Character', characters.denied, 'Folder', folders.incidents, 'read', 'deny')
  await rule('Character', characters.warrior, 'Folder', folders.courts, 'read')
  // P07X-T03: Document Type is the primary ordinary record-authorization unit.
  // The seed mirrors every record-capability Folder grant onto the Domain's
  // Plain Text Type (the deterministic translation the corrective stack
  // prescribes); Folder DENIES stay Folder-scoped so they narrow Type grants.
  const plainTextType = (await payload.find({ collection: 'document-types', where: { and: [{ domain: { equals: domainId } }, { name: { equals: 'Plain Text' } }, { active: { equals: true } }] }, depth: 0, limit: 1 })).docs[0]
  if (plainTextType) {
    // P07X-T05: the Incident Report lifecycle routes through real Folders.
    await payload.update({ collection: 'document-types', id: Number(plainTextType.id), data: {
      defaultFolder: folders.incidents,
      draftFolder: folders.incidents,
      pendingReviewFolder: folders.pendingIncidents,
      filedFolder: folders.investigatingIncidents,
      lockedFolder: folders.closedIncidents,
    } })
    const typeRules: Array<[string, number, Capability]> = [
      ['head', roles.head, 'read'], ['head', roles.head, 'create_document'], ['head', roles.head, 'edit_document'],
      ['clerk', roles.clerk, 'read'],
      ['captain1', roles.captain1, 'read'], ['captain1', roles.captain1, 'create_document'], ['captain1', roles.captain1, 'edit_document'],
      ['captain2', roles.captain2, 'read'], ['captain2', roles.captain2, 'create_document'], ['captain2', roles.captain2, 'edit_document'],
      ['warrior', roles.warrior, 'read'], ['warrior', roles.warrior, 'create_document'], ['warrior', roles.warrior, 'edit_document'],
      ['magistrate', roles.magistrate, 'read'], ['magistrate', roles.magistrate, 'create_document'], ['magistrate', roles.magistrate, 'edit_document'],
    ]
    for (const [key, roleId, capability] of typeRules) await rule('Role', roleId, 'DocumentType', Number(plainTextType.id), capability)
    await rule('Character', characters.access, 'DocumentType', Number(plainTextType.id), 'read')
  }
  const documents: Record<string, number> = {}
  for (const [key, title, folderKey, lifecycle] of [
    ['deed', 'P7 Working Deed', 'deeds', 'filed'], ['old', 'P7 Superseded Deed', 'deeds', 'locked'],
    ['current', 'P7 Current Deed', 'deeds', 'filed'], ['history', 'P7 History Record', 'history', 'filed'],
    ['first', 'P7 First Platoon Plan', 'first', 'filed'], ['second', 'P7 Second Platoon Plan', 'second', 'filed'],
    ['incident', 'P7 Incident Report', 'incidents', 'filed'], ['court', 'P7 Court Record', 'courts', 'filed'],
    ['outside', 'P7 Outside Record', '', 'filed'],
  ] as const) {
    const domain = key === 'outside' ? domains.outside : domainId
    let folder = folders[folderKey]
    if (key === 'outside') {
      const roots = await payload.find({ collection: 'folders', where: { domain: { equals: domain } }, limit: 1, depth: 0 })
      folder = Number((roots.docs[0] ?? await payload.create({ collection: 'folders', data: { domain, name: 'Domain Root', systemManaged: true, filingPolicy: 'inherit', publicAccess: 'inherit' } })).id)
      folders.outside = folder
    }
    const types = await payload.find({ collection: 'document-types', where: { domain: { equals: domain } }, limit: 1, depth: 0 })
    const type = types.docs[0] ?? await payload.create({ collection: 'document-types', data: { domain, name: 'Plain Text', active: true, defaultFilingPolicy: 'direct-file', templateFilingPolicy: 'inherit', defaultFolder: folder } })
    const rows = await payload.find({ collection: 'documents', where: { and: [{ domain: { equals: domain } }, { title: { equals: title } }] }, depth: 0, limit: 1 })
    documents[key] = Number((rows.docs[0] ?? await payload.create({ collection: 'documents', context: { allowSystemCreate: true }, data: { domain, documentType: type.id, folder, title, body: `# ${title}\n\nPhase 7 acceptance fixture.`, lifecycle, publicAccess: 'inherit', sourceKind: 'web', origin: 'web-editor', createdBy: key === 'outside' ? users.outside : users.owner } })).id)
  }
  if (!(await payload.find({ collection: 'document-relationships', where: { source: { equals: documents.current } }, depth: 0, limit: 1 })).docs.length) await payload.create({ collection: 'document-relationships', data: { domain: domainId, source: documents.current, target: documents.old, kind: 'supersedes', lockApplied: true, priorLifecycle: 'filed', actorUser: users.owner, actorCharacter: characters.owner } })
  for (const key of ['claimTarget', 'raceTarget']) {
    const name = key === 'claimTarget' ? 'P7 Unclaimed Applicant' : 'P7 Concurrent Claim Target'
    const rows = await payload.find({ collection: 'characters', where: { name: { equals: name } }, depth: 0, limit: 1 })
    characters[key] = Number((rows.docs[0] ?? await payload.create({ collection: 'characters', data: { name, status: 'active', kind: 'player' } })).id)
    await membership(characters[key], domainId)
  }
  return { users, characters, domains, departments, roles, folders, documents }
}
