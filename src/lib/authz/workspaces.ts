import type { Payload } from 'payload'

import { decideOne, folderAncestry, type AuthzSession } from './session'
import { evaluatePermission, type PermissionActor } from './evaluate'

/**
 * P07P-02: batch evaluation over one request-owned session.
 *
 * canOpenPeople previously ran up to 5 + 3×departments + 1×folders full
 * evaluator loads (each ~8 SQL statements); it now loads one session and
 * decides every capability/resource pair with ZERO additional SQL. Mutations
 * still enforce their own resource capability separately.
 */

/** Navigation/membership capabilities whose presence anywhere opens People. */
const PEOPLE_OPEN_CAPABILITIES = ['manage_members', 'manage_roles', 'manage_access', 'assign_roles', 'assign_subordinates'] as const
const DEPARTMENT_CAPABILITIES = ['manage_roles', 'assign_roles', 'assign_subordinates'] as const

export async function canOpenPeopleSession(session: AuthzSession): Promise<boolean> {
  if (session.authority) return true
  for (const capability of PEOPLE_OPEN_CAPABILITIES) {
    if (decideOne(session, capability, { type: 'Domain', id: session.domainId }).allowed) return true
  }
  for (const subdomainId of session.subdomains.keys()) {
    for (const capability of DEPARTMENT_CAPABILITIES) {
      if (decideOne(session, capability, { type: 'Subdomain', id: subdomainId }).allowed) return true
    }
  }
  for (const folderId of session.folders.keys()) {
    if (decideOne(session, 'manage_access', { type: 'Folder', id: folderId }).allowed) return true
  }
  return false
}

export async function canOpenPeople(payload: Payload, actor: PermissionActor, domainId: number | string) {
  const { loadAuthorizationSession } = await import('./session')
  const session = await loadAuthorizationSession(payload, actor, domainId)
  return canOpenPeopleSession(session)
}

export type FolderControls = { canManageAccess: boolean; canGrantRead: boolean; canGrantWrite: boolean }

/** Batch form of folderControls: resolves every folder in one session pass. */
export function folderControlsSession(session: AuthzSession, folderIds: Array<number | string>): Map<number, FolderControls> {
  const byFolder = new Map<number, FolderControls>()
  for (const folderIdRaw of folderIds) {
    const folderId = Number(folderIdRaw)
    const ancestry = folderAncestry(session, folderId)
    const target = { type: 'Folder' as const, id: folderId, folderChain: ancestry.chain, subdomainId: ancestry.subdomainId }
    const [canManageAccess, canGrantRead, create, edit] = [
      decideOne(session, 'manage_access', target),
      decideOne(session, 'read', target),
      decideOne(session, 'create_document', target),
      decideOne(session, 'edit_document', target),
    ]
    byFolder.set(folderId, { canManageAccess: canManageAccess.allowed, canGrantRead: canGrantRead.allowed, canGrantWrite: create.allowed && edit.allowed })
  }
  return byFolder
}

/** Legacy single-folder signature kept for callers not yet migrated. */
export async function folderControls(payload: Payload, actor: PermissionActor, domainId: number | string, folderId: number | string): Promise<FolderControls> {
  const { loadAuthorizationSession } = await import('./session')
  const session = await loadAuthorizationSession(payload, actor, domainId)
  return folderControlsSession(session, [folderId]).get(Number(folderId)) ?? { canManageAccess: false, canGrantRead: false, canGrantWrite: false }
}

export { evaluatePermission }
