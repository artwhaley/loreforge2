import { NextResponse } from 'next/server'
import { getPayload } from 'payload'

import config from '@payload-config'

import { assertCanDelegate } from '@/lib/authz/delegation'
import { recordDomainAudit } from '@/lib/domains/domainAudit'
import { runInTransaction } from '@/lib/db/transactions'
import { assertRoleDefaultScope } from '@/lib/authz/roleDefaults'
import { resolveActingIdentity } from '@/lib/tenant/actingIdentity'

const idOf = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'object' && value !== null && 'value' in value) return idOf((value as { value: unknown }).value)
  return typeof value === 'object' && 'id' in value ? Number((value as { id: number | string }).id) : Number(value)
}

export async function POST(request: Request) {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: request.headers })
  const form = await request.formData()
  const domainSlug = String(form.get('domainSlug') ?? '')
  const requestedPrincipalType = String(form.get('principalType') ?? 'Character')
  const principalType = (['Character', 'User', 'Role'].includes(requestedPrincipalType) ? requestedPrincipalType : 'Character') as 'Character' | 'User' | 'Role'
  const principalId = Number(form.get(principalType === 'Role' ? 'roleId' : principalType === 'User' ? 'userId' : 'characterId') ?? '')
  const resourceTypeRaw = String(form.get('resourceType') ?? 'Folder')
  const resourceType = resourceTypeRaw === 'Document' ? 'Document' : resourceTypeRaw === 'DocumentType' ? 'DocumentType' : 'Folder'
  const resourceId = Number(form.get(resourceType === 'Document' ? 'documentId' : resourceType === 'DocumentType' ? 'typeId' : 'folderId') ?? '')
  const readState = String(form.get('readState') ?? 'inherit')
  const writeState = String(form.get('writeState') ?? 'inherit')
  // P07X-T04: Role × Document Type capability editor submits one JSON map of
  // { capability: 'inherit' | 'grant' | 'deny' } per Type row.
  const capabilityStatesRaw = String(form.get('capabilityStates') ?? '')
  let capabilityStates: Record<string, string> | null = null
  if (resourceType === 'DocumentType') {
    try {
      const parsed = JSON.parse(capabilityStatesRaw) as unknown
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('invalid')
      capabilityStates = parsed as Record<string, string>
      for (const [capability, state] of Object.entries(capabilityStates)) {
        if (!['read', 'create_document', 'edit_document', 'delete_document', 'submit_document', 'approve_document', 'file_document', 'lock_document', 'unlock_document', 'restore_document', 'export_document', 'manage_access'].includes(capability)) throw new Error('invalid capability')
        if (!['inherit', 'grant', 'deny'].includes(state)) throw new Error('invalid state')
      }
    } catch { return NextResponse.redirect(new URL('/', request.url), 303) }
  }
  const anchor = resourceType === 'DocumentType' ? 'type-access' : 'folder-access'
  const destination = principalType === 'Role' ? `/domain/${domainSlug}/roles?roleId=${principalId}#${anchor}` : `/domain/${domainSlug}/manage/people/${principalId}#${anchor}`
  if (!user || !domainSlug || !Number.isFinite(principalId) || !Number.isFinite(resourceId)) return NextResponse.redirect(new URL('/', request.url), 303)
  const domainResult = await payload.find({ collection: 'domains', where: { slug: { equals: domainSlug } }, depth: 0, limit: 1 })
  const domain = domainResult.docs[0]
  if (!domain) return NextResponse.redirect(new URL(destination, request.url), 303)
  const acting = await resolveActingIdentity(payload, request, user.id)
  const activeCharacterId = acting.tenantSlug === domainSlug ? acting.characterId : null
  const resourceCollection = resourceType === 'Document' ? 'documents' : resourceType === 'DocumentType' ? 'document-types' : 'folders'
  const [principal, resource] = await Promise.all([
    payload.findByID({ collection: principalType === 'Role' ? 'roles' : principalType === 'User' ? 'users' : 'characters', id: principalId, depth: 0 }).catch(() => null),
    payload.findByID({ collection: resourceCollection, id: resourceId, depth: 0 }).catch(() => null),
  ])
  const principalRecord = principal as ({ id: number; status?: string; active?: boolean; domain?: unknown } | null)
  if (!principalRecord || principalType === 'Character' && principalRecord.status !== 'active' || principalType === 'User' && principalRecord.id <= 0 || principalType === 'Role' && principalRecord.active === false || !resource || idOf(resource.domain) !== Number(domain.id)) return NextResponse.redirect(new URL(destination, request.url), 303)
  if (principalType === 'Character') {
    const membership = await payload.find({ collection: 'domain-memberships', where: { and: [{ domain: { equals: domain.id } }, { character: { equals: principalId } }, { status: { equals: 'active' } }] }, depth: 0, limit: 1 })
    if (!membership.docs[0]) return NextResponse.redirect(new URL(destination, request.url), 303)
  } else if (principalType === 'Role' && idOf(principalRecord.domain) !== Number(domain.id)) return NextResponse.redirect(new URL(destination, request.url), 303)
  if (principalType === 'Role') {
    // P07X-T04: the Role × Document Type capability grid is the primary
    // authoring surface; Folder defaults stay behind the Role-scope check.
    if (resourceType !== 'Folder' && resourceType !== 'DocumentType') return NextResponse.redirect(new URL(destination, request.url), 303)
    if (resourceType === 'Folder') {
      try { await assertRoleDefaultScope(payload, { domainId: domain.id, roleId: principalId, folderId: resource.id }) } catch { return NextResponse.redirect(new URL(destination, request.url), 303) }
    }
  }
  if (resourceType === 'DocumentType' && capabilityStates == null) return NextResponse.redirect(new URL(destination, request.url), 303)
  try {
    const actor = { userId: user.id, activeCharacterId }
    const resourceRef = { type: resourceType, id: resource.id } as const
    if (resourceType === 'DocumentType') {
      // P07X-T04: delegating a Type record capability requires manage_access on
      // the Type scope, and granting requires possessing the capability there.
      for (const [capability, state] of Object.entries(capabilityStates as Record<string, string>)) {
        const operation = state === 'inherit' ? 'revoke' : state === 'grant' ? 'grant' : 'deny'
        await assertCanDelegate(payload, actor, domain.id, capability as never, resourceRef, operation)
      }
    } else {
      await assertCanDelegate(payload, actor, domain.id, 'read', resourceRef, readState === 'inherit' ? 'revoke' : readState === 'grant' ? 'grant' : 'deny')
      if (writeState !== 'inherit') {
        const operation = writeState === 'grant' ? 'grant' : 'deny'
        await assertCanDelegate(payload, actor, domain.id, 'create_document', resourceRef, operation)
        await assertCanDelegate(payload, actor, domain.id, 'edit_document', resourceRef, operation)
      } else await assertCanDelegate(payload, actor, domain.id, 'edit_document', resourceRef, 'revoke')
    }
  } catch { return NextResponse.redirect(new URL(destination, request.url), 303) }
  try {
    await runInTransaction(payload, async (transactionID) => {
      const req = { transactionID }
      const existing = await payload.find({ collection: 'permission-rules', where: { and: [{ domain: { equals: domain.id } }, { principalType: { equals: principalType } }] }, depth: 0, limit: 0, pagination: false, req })
      const directRules = existing.docs.filter((rule) => idOf(rule.principal) === principalId && rule.resourceType === resourceType && idOf(rule.resource) === resourceId)
      const removeCapabilities = async (capabilities: string[]) => {
        for (const rule of directRules.filter((item) => capabilities.includes(item.capability))) await payload.delete({ collection: 'permission-rules', id: rule.id, req })
      }
      const saveAxis = async (state: string, capabilities: string[]) => {
        if (!['inherit', 'grant', 'deny'].includes(state)) throw new Error('Invalid Folder permission state.')
        await removeCapabilities(capabilities)
        if (state === 'inherit') return
        for (const capability of capabilities) {
          await payload.create({ collection: 'permission-rules', req, data: { domain: domain.id, principalType, principal: { relationTo: principalType === 'Role' ? 'roles' : principalType === 'User' ? 'users' : 'characters', value: principalRecord.id }, resourceType, resource: { relationTo: resourceType === 'Document' ? 'documents' : 'folders', value: resource.id }, capability: capability as 'read' | 'create_document' | 'edit_document', effect: state as 'grant' | 'deny', active: true, actorUser: user.id, actorCharacter: activeCharacterId ?? undefined } } as never)
        }
      }
      if (resourceType === 'DocumentType' && capabilityStates != null) {
        // Each Type row is one submit: delete the previous rules for every
        // capability in the row, then write the explicit grant/deny cells.
        for (const [capability, state] of Object.entries(capabilityStates)) {
          await removeCapabilities([capability])
          if (state === 'inherit') continue
          await payload.create({ collection: 'permission-rules', req, data: { domain: domain.id, principalType, principal: { relationTo: principalType === 'Role' ? 'roles' : principalType === 'User' ? 'users' : 'characters', value: principalRecord.id }, resourceType, resource: { relationTo: 'document-types', value: resource.id }, capability, effect: state as 'grant' | 'deny', active: true, actorUser: user.id, actorCharacter: activeCharacterId ?? undefined } } as never)
        }
      } else {
        await saveAxis(readState, ['read'])
        await saveAxis(writeState, ['create_document', 'edit_document'])
      }
      payload.logger.info(`P07-T05 audit: saved direct permission override domain=${domain.id} principalType=${principalType} principal=${principalRecord.id} resourceType=${resourceType} resource=${resource.id} actorUser=${user.id}`)
      await recordDomainAudit({
        payload, domainId: domain.id, eventType: 'folder_access_changed', actorUser: user.id,
        actorCharacter: activeCharacterId,
        targetType: resourceType === 'Document' ? 'document' : resourceType === 'DocumentType' ? 'document-type' : 'folder', targetId: resource.id,
        action: 'saved',
        context: { principalType, principalId: principalRecord.id, resourceType, resourceId: resource.id, readState, writeState, capabilityStates, capabilities: resourceType === 'DocumentType' ? Object.keys(capabilityStates as Record<string, string>) : ['read', 'create_document', 'edit_document'] },
        transactionID,
      })
    })
  } catch (error) {
    payload.logger.error(error)
    const failed = new URL(destination, request.url)
    failed.searchParams.set('error', 'mutation')
    return NextResponse.redirect(failed, 303)
  }
  return NextResponse.redirect(new URL(destination, request.url), 303)
}
