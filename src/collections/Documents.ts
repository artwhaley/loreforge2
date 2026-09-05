import type { CollectionConfig } from 'payload'

import { canAccessDocument, canAccessDocumentVersion, readableVersionParentQuery } from '@/lib/authorization/documentAccess'
import { evaluatePermission } from '@/lib/authz/evaluate'
import { assertLifecycleTransition, canEditDocumentBody, type Lifecycle } from '@/lib/documents/lifecycle'

const relationId = (value: unknown): number | null => value && typeof value === 'object' && 'id' in value ? Number((value as { id: number | string }).id) : value === null || value === undefined || value === '' ? null : Number(value)
// Keep this literal local to the collection config: importing activeTenant
// here creates a payload.config -> Documents -> activeTenant -> payload cycle.
const ACTIVE_CHARACTER_COOKIE = 'sl-civic-active-character'

/** Resolve the selected acting Character from the authenticated request only.
 * canAccessDocument still validates controller ownership and active Domain
 * membership; this merely carries the browser's server-set selector into
 * Payload's collection access boundary. */
function requestActiveCharacterId(req: { headers?: Headers | Record<string, string | string[] | undefined> }): number | null {
  const rawCookie = req.headers instanceof Headers ? req.headers.get('cookie') : req.headers?.cookie
  const cookie = Array.isArray(rawCookie) ? rawCookie.join(';') : rawCookie ?? ''
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${ACTIVE_CHARACTER_COOKIE}=([^;]+)`))
  if (!match) return null
  const id = Number(decodeURIComponent(match[1]))
  return Number.isInteger(id) && id > 0 ? id : null
}

export const Documents: CollectionConfig = {
  slug: 'documents',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'tenant', 'origin', 'updatedAt'],
  },
  timestamps: true,
  versions: { maxPerDoc: 0 },
  access: {
    // Direct REST/GraphQL/revision reads, updates, and version reads must
    // prove the caller can access this exact Document through the shared
    // interim decision (src/lib/authorization/documentAccess.ts). Internal
    // server queries use Local API overrideAccess after their own tenant
    // boundary has been established; the Local API in Payload 3.88 defaults
    // to overrideAccess, so these functions guard the HTTP surface.
    //
    // P07P-04 (owner decision 2026-09-04) removed the controlled-Character
    // union fallback. P07X-T02 (superseding) removed ambient User-level
    // authority entirely: with no validated acting Character the session
    // resolves NO Domain authority, so direct reads/updates fail closed.
    // The owner's authority is exercised through their provisioned
    // domain_admin Character, carried by the selector cookie. Application
    // routes that resolve an active Character pass it explicitly.
    read: async ({ req, id }) => {
      if (!req.user || id === undefined || id === null) return false
      return canAccessDocument({ payload: req.payload, user: req.user, activeCharacterId: requestActiveCharacterId(req), documentId: id, capability: 'read' })
    },
    update: async ({ req, id }) => {
      if (!req.user || id === undefined || id === null) return false
      return canAccessDocument({ payload: req.payload, user: req.user, activeCharacterId: requestActiveCharacterId(req), documentId: id, capability: 'update' })
    },
    readVersions: async ({ req, id }) => {
      if (!req.user) return false
      const activeCharacterId = requestActiveCharacterId(req)
      if (id !== undefined && id !== null) return canAccessDocumentVersion({ payload: req.payload, user: req.user, activeCharacterId, versionId: id })
      return readableVersionParentQuery({ payload: req.payload, user: req.user, activeCharacterId })
    },
    // Permanent deletion is never an ordinary Domain action. P04 workflow
    // uses softDeletedAt/softDeletedBy and a reversible restore path.
    delete: () => false,
  },
  hooks: {
    beforeChange: [
      async ({ data, originalDoc, operation, req }) => {
        const folder = data?.folder ?? originalDoc?.folder
        const domainId = relationId(data?.domain ?? originalDoc?.domain)
        if (folder === null || folder === undefined || folder === '') {
          throw new Error('Every Document must belong to a Folder; use the Domain Root when no branch is selected.')
        }
        // Defense in depth behind access.update: a Document may never be filed
        // into a Folder outside its own Domain (or legacy Tenant). This also
        // blocks cross-Domain re-file even when authority exists elsewhere.
        if (operation === 'create' || data?.folder !== undefined) {
          const folderId = relationId(folder)
          if (folderId) {
            const folderRecord = await req.payload.findByID({ collection: 'folders', id: folderId, depth: 0, overrideAccess: true }).catch(() => null) as { domain?: unknown; tenant?: unknown } | null
            const folderDomainId = relationId(folderRecord?.domain)
            if (domainId && folderDomainId && Number(folderDomainId) !== Number(domainId)) {
              throw new Error('A Document cannot be filed into a Folder from another Domain.')
            }
            if (!domainId) {
              const tenantId = relationId(data?.tenant ?? originalDoc?.tenant)
              const folderTenantId = relationId(folderRecord?.tenant)
              if (tenantId && folderTenantId && Number(folderTenantId) !== Number(tenantId)) {
                throw new Error('A Document cannot be filed into a Folder from another Tenant.')
              }
            }
          }
        }
        const documentType = data?.documentType ?? originalDoc?.documentType
        if (operation === 'create' && (documentType === null || documentType === undefined || documentType === '')) throw new Error('Every Document must have a Document Type.')
        const from = String(originalDoc?.lifecycle ?? 'draft') as Lifecycle
        const to = String(data?.lifecycle ?? originalDoc?.lifecycle ?? 'draft') as Lifecycle
        if (operation === 'update') {
          const supersedesLock = (req.context as Record<string, unknown> | undefined)?.supersedesLock === true
          if (supersedesLock) {
            // P05R-T02: supersedesLock is not a general lifecycle bypass. Only
            // Filed records may be locked by supersession; an already-Locked
            // predecessor may stay Locked without a bogus transition; Draft /
            // Pending-Review records must never jump to Locked through it.
            if (to !== 'locked') throw new Error('A superseded Document can only transition to Locked.')
            if (from !== 'filed' && from !== 'locked') throw new Error('Only Filed or already-Locked Documents may be locked by supersession.')
          } else {
            assertLifecycleTransition(from, to)
          }
          const isPrivilegedTransition = from !== to && to !== 'pending_review'
          if (isPrivilegedTransition && !supersedesLock && req.user?.id && domainId) {
            // P07X-T02: the transition decision evaluates the acting identity
            // (carried by the selector cookie), never ambient User authority.
            const decision = await evaluatePermission({ payload: req.payload, actor: { userId: req.user.id, activeCharacterId: requestActiveCharacterId(req) }, domainId, capability: to === 'locked' ? 'lock_document' : to === 'filed' ? (from === 'pending_review' ? 'approve_document' : 'file_document') : to === 'draft' ? 'edit_document' : 'unlock_document', resource: { type: 'Document', id: originalDoc?.id ?? 0 } })
            if (!decision.allowed) throw new Error('An authorized acting identity or Role is required for this lifecycle transition.')
          }
          if (data?.body !== undefined && data.body !== originalDoc?.body && !canEditDocumentBody(from)) throw new Error('This Document is not editable in its current lifecycle state.')
        }
        const context = req.context as Record<string, unknown> | undefined
        // Every normal application-created Document must carry an explicit
        // authoring context. If an acting Character is selected, the context
        // also drives the required Prepared by credit. Seeders/migrations
        // use the explicit system seam; a missing request user must never be
        // an accidental bypass of this boundary.
        if (operation === 'create' && !context?.allowSystemCreate) {
          const actorUserId = relationId(context?.actorUserId ?? req.user?.id)
          const preparedCharacterId = relationId(context?.preparedByCharacterId)
          if (!actorUserId) throw new Error('Document creation requires an authenticated authoring context.')
          if (preparedCharacterId) {
            // P07X-T02: an active member Character, or the provisioned
            // domain_admin of exactly this Domain (administrative create
            // without RP membership or Prepared-by credit).
            const preparedCharacter = await req.payload.findByID({ collection: 'characters', id: preparedCharacterId, depth: 0, overrideAccess: true }).catch(() => null) as { status?: string; kind?: string; controlledBy?: unknown; administrativeDomain?: unknown } | null
            const controllerId = relationId(preparedCharacter?.controlledBy)
            const membership = domainId ? await req.payload.find({ collection: 'domain-memberships', where: { and: [{ domain: { equals: domainId } }, { character: { equals: preparedCharacterId } }, { status: { equals: 'active' } }] }, depth: 0, limit: 1, overrideAccess: true }) : { docs: [] }
            const kind = String(preparedCharacter?.kind ?? 'player')
            const adminDomainId = relationId(preparedCharacter?.administrativeDomain)
            const scopedDomainAdmin = kind === 'domain_admin' && domainId != null && adminDomainId === Number(domainId)
            if (!preparedCharacter || preparedCharacter.status !== 'active' || controllerId !== actorUserId || (!membership.docs[0] && !scopedDomainAdmin)) throw new Error('The Prepared-by Character must be an active Character controlled by the author in this Domain.')
          } else {
            // A no-Character create is reserved for the Domain's owner User
            // ONLY (the one person the domain_admin identity is provisioned
            // for). Platform/legacy domain-admins no longer have ambient
            // create authority (P07X-T02); ordinary members must act through
            // the selected Character.
            const domain = domainId ? await req.payload.findByID({ collection: 'domains', id: domainId, depth: 0, overrideAccess: true }).catch(() => null) as { ownerUser?: unknown } | null : null
            const owner = relationId(domain?.ownerUser)
            if (owner !== actorUserId) throw new Error('Document creation requires an acting Character unless the author is the Domain owner.')
          }
          if (!context?.allowUserCreate && !preparedCharacterId) throw new Error('Document creation requires an explicit authoring context.')
        }
        return data
      },
    ],
    // NOTE: the Prepared-by credit is applied by the application actions AFTER
    // the create commits (archive.ts calls ensurePreparedBy explicitly). It
    // cannot run inside an afterChange hook on this adapter: with real
    // per-operation transactions enabled (P05R-T02 B), hook-inner payload
    // calls neither see the just-created row (it is uncommitted) nor begin
    // their own nested transaction (single-connection libsql refuses with
    // SQLITE_BUSY). The preparedByCharacterId context flag still marks the
    // create as Character-authored so the J gate and audit stay intact.
  },
  fields: [
    {
      name: 'domain',
      type: 'relationship',
      relationTo: 'domains',
      label: 'Domain',
      admin: { description: 'Canonical Domain relationship. Populated by the Phase 3 migration.' },
    },
    {
      name: 'tenant',
      type: 'relationship',
      relationTo: 'tenants',
      required: false,
      // Legacy compatibility only (P05R-T06 D). New product code must not
      // depend on this field — Domains are canonical. Removal is P10 work
      // (DEF-TENANT-01).
      admin: { hidden: true },
    },
    {
      name: 'documentType',
      type: 'relationship',
      relationTo: 'document-types',
      required: true,
      index: true,
      label: 'Document Type',
    },
    {
      name: 'folder',
      type: 'relationship',
      relationTo: 'folders',
      index: true,
      // P05R-T04 A: genuinely required — root filing stores the system-managed
      // Domain root Folder explicitly (the picker defaults to it), never null.
      required: true,
    },
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'body',
      type: 'textarea',
      required: true,
      admin: {
        description:
          'Canonical Markdown body. Presentation (theme) is applied by the tenant, never stored here.',
      },
    },
    {
      name: 'origin',
      type: 'select',
      required: true,
      defaultValue: 'web-editor',
      // Legacy compatibility only (P05R-T06 D). New product code must not
      // depend on this field. Removal is P10 work (DEF-ORIGIN-01).
      options: [
        { label: 'Web editor', value: 'web-editor' },
        { label: 'Markdown import', value: 'markdown-import' },
        { label: 'Form', value: 'form' },
      ],
    },
    {
      name: 'sourceKind',
      type: 'select',
      required: true,
      defaultValue: 'web',
      options: [
        { label: 'Web', value: 'web' },
        { label: 'Markdown import', value: 'markdown-import' },
        { label: 'Form', value: 'form' },
        { label: 'Correspondence', value: 'correspondence' },
        { label: 'Second Life', value: 'second-life' },
      ],
    },
    {
      name: 'lifecycle',
      type: 'select',
      required: true,
      defaultValue: 'draft',
      options: [
        { label: 'Draft', value: 'draft' },
        { label: 'Pending Review', value: 'pending_review' },
        { label: 'Filed', value: 'filed' },
        { label: 'Locked', value: 'locked' },
      ],
    },
    { name: 'publicAccess', type: 'select', required: true, defaultValue: 'inherit', options: [{ label: 'Inherit', value: 'inherit' }, { label: 'Private', value: 'private' }, { label: 'Public', value: 'public' }] },
    { name: 'softDeletedAt', type: 'date', admin: { readOnly: true } },
    { name: 'softDeletedBy', type: 'relationship', relationTo: 'users', admin: { readOnly: true } },
    {
      name: 'createdBy',
      type: 'relationship',
      relationTo: 'users',
      admin: {
        description: 'Author, if known',
      },
    },
  ],
}
