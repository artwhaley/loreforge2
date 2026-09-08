import type { Payload } from 'payload'

import type { WorkPageModel } from '@/lib/page-models/management/work'
import { projectDomainWork } from '@/lib/work/projection'

/**
 * Domain Work Page Model builder (OBSIDIAN-T07). Adapts `projectDomainWork()`
 * directly — authorization filtering lives in the projection, never here, and
 * `domainAdmin` is derived by the projection from the acting Character's kind
 * and administrative Domain, never from role labels.
 */
export async function buildWorkPageModel(input: {
  payload: Payload
  userId: number | string
  activeCharacterId?: number | string | null
  tenantId: number | string
  domainSlug: string
  domainName: string
}): Promise<WorkPageModel> {
  const { payload, userId, activeCharacterId, tenantId, domainSlug, domainName } = input
  const work = await projectDomainWork(payload, { userId, activeCharacterId: activeCharacterId ?? null }, tenantId, { domainSlug })
  return {
    baseUrl: `/domain/${domainSlug}`,
    domainSlug,
    domainName,
    authorized: work.authorized,
    domainAdmin: work.domainAdmin,
    entries: work.entries,
    status: null,
  }
}