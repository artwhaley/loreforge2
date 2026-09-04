import { NextResponse } from 'next/server'
import { getPayload } from 'payload'

import config from '@payload-config'

import { isAllowed } from '@/lib/authz/evaluate'
import { assertFolderPlacement } from '@/lib/archive/folderInvariants'

const idOf = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'object' && value !== null && 'value' in value) return idOf((value as { value: unknown }).value)
  return typeof value === 'object' && value !== null && 'id' in value ? Number((value as { id: number | string }).id) : Number(value)
}

function destination(domainSlug: string, requested: string) {
  const allowed = [`/domain/${domainSlug}/manage/folders`, `/domain/${domainSlug}/records`]
  return allowed.some((path) => requested === path || requested.startsWith(`${path}?`)) ? requested : `/domain/${domainSlug}/manage/folders`
}

export async function POST(request: Request) {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: request.headers })
  const form = await request.formData()
  const domainSlug = String(form.get('domainSlug') ?? '')
  const returnTo = destination(domainSlug, String(form.get('returnTo') ?? ''))
  const action = String(form.get('action') ?? 'create')
  if (!user || !domainSlug) return NextResponse.redirect(new URL('/', request.url), 303)
  const domainResult = await payload.find({ collection: 'domains', where: { slug: { equals: domainSlug } }, depth: 0, limit: 1 })
  const domain = domainResult.docs[0]
  if (!domain || !await isAllowed({ payload, actor: { userId: user.id }, domainId: domain.id, capability: 'manage_folders', resource: { type: 'Domain', id: domain.id } })) return NextResponse.redirect(new URL(returnTo, request.url), 303)

  if (action === 'create') {
    const name = String(form.get('name') ?? '').trim()
    const parentId = idOf(form.get('parentId'))
    if (!name) return NextResponse.redirect(new URL(returnTo, request.url), 303)
    if (parentId !== null) {
      const parent = await payload.findByID({ collection: 'folders', id: parentId, depth: 0 }).catch(() => null)
      if (!parent || idOf(parent.domain) !== Number(domain.id)) return NextResponse.redirect(new URL(returnTo, request.url), 303)
    }
    await payload.create({ collection: 'folders', data: { domain: domain.id, name, parent: parentId, filingPolicy: 'inherit', systemManaged: false, publicAccess: 'inherit' } })
    payload.logger.info(`Phase 5 folder created: actorUser=${user.id} domain=${domain.id} parent=${parentId ?? 'root'}`)
    return NextResponse.redirect(new URL(returnTo, request.url), 303)
  }

  const folderId = Number(form.get('folderId') ?? '')
  if (!Number.isFinite(folderId)) return NextResponse.redirect(new URL(returnTo, request.url), 303)
  const folder = await payload.findByID({ collection: 'folders', id: folderId, depth: 0 }).catch(() => null)
  if (!folder || idOf(folder.domain) !== Number(domain.id) || folder.systemManaged) return NextResponse.redirect(new URL(returnTo, request.url), 303)

  if (action === 'delete') {
    const [children, documents] = await Promise.all([
      payload.count({ collection: 'folders', where: { parent: { equals: folderId } } }),
      payload.count({ collection: 'documents', where: { folder: { equals: folderId } } }),
    ])
    if (children.totalDocs > 0 || documents.totalDocs > 0) return NextResponse.redirect(new URL(returnTo, request.url), 303)
    await payload.delete({ collection: 'folders', id: folderId })
    payload.logger.info(`Phase 5 folder deleted: actorUser=${user.id} domain=${domain.id} folder=${folderId}`)
    return NextResponse.redirect(new URL(returnTo, request.url), 303)
  }

  if (action === 'rename') {
    const name = String(form.get('name') ?? '').trim()
    if (name) {
      await payload.update({ collection: 'folders', id: folderId, data: { name } })
      payload.logger.info(`Phase 5 folder renamed: actorUser=${user.id} domain=${domain.id} folder=${folderId}`)
    }
    return NextResponse.redirect(new URL(returnTo, request.url), 303)
  }

  if (action === 'move') {
    const parentId = idOf(form.get('parentId'))
    const allFolders = await payload.find({ collection: 'folders', where: { domain: { equals: domain.id } }, depth: 0, limit: 10000 })
    const parent = parentId === null ? null : allFolders.docs.find((candidate) => Number(candidate.id) === parentId)
    if (parentId !== null && !parent) return NextResponse.redirect(new URL(returnTo, request.url), 303)
    try {
      assertFolderPlacement(
        { id: folder.id, domainId: domain.id, parentId },
        parent ? { id: parent.id, domainId: idOf(parent.domain) ?? domain.id, parentId: idOf(parent.parent) } : null,
        allFolders.docs.map((candidate) => ({ id: candidate.id, domainId: idOf(candidate.domain) ?? domain.id, parentId: idOf(candidate.parent), systemManaged: Boolean(candidate.systemManaged) })),
      )
      await payload.update({ collection: 'folders', id: folderId, data: { parent: parentId } })
      payload.logger.info(`Phase 5 folder moved: actorUser=${user.id} domain=${domain.id} folder=${folderId} parent=${parentId ?? 'root'}`)
    } catch {
      // Keep the customer redirect stable when a move would create a cycle.
    }
  }
  return NextResponse.redirect(new URL(returnTo, request.url), 303)
}
