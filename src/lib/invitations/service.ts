import { createHash, randomBytes } from 'node:crypto'

import type { Payload } from 'payload'

import { runInTransaction } from '@/lib/db/transactions'

import { assertInvitationPurposeState } from './validate'
import { idOf, invitationPurposeLabel, isInvitationPurpose, isInvitationToken, type InvitationPurpose, type InvitationStatus } from './types'

type RelationRow = { id?: number | string; name?: unknown; email?: unknown; slug?: unknown }

export type InvitationRow = {
  id: number | string
  purpose?: unknown
  domain?: unknown
  character?: unknown
  tokenHash?: unknown
  issuedByUser?: unknown
  issuedByCharacter?: unknown
  createdAt?: unknown
  expiresAt?: unknown
  revokedAt?: unknown
  maxUses?: unknown
  useCount?: unknown
  lastUsedAt?: unknown
}

export type SafeInvitationView = {
  id: number
  purpose: InvitationPurpose
  purposeLabel: string
  domain: { id: number; name: string; slug: string } | null
  character: { id: number; name: string } | null
  issuedByUser: { id: number; name: string } | null
  issuedByCharacter: { id: number; name: string } | null
  createdAt: string | null
  expiresAt: string | null
  revokedAt: string | null
  maxUses: number | null
  useCount: number
  lastUsedAt: string | null
  exhausted: boolean
}

export type InvitationResolution = {
  status: InvitationStatus
  invitation: SafeInvitationView | null
}

export type InvitationConsumeResult = InvitationResolution & { consumed: boolean }

export type ConsumeInvitationOptions = { expectedPurpose?: InvitationPurpose; transactionID?: number | string | null }

export type IssueInvitationInput = {
  purpose: InvitationPurpose
  domainId: number | string
  characterId?: number | string | null
  issuedByUserId: number | string
  issuedByCharacterId: number | string
  expiresAt?: Date | string | null
  maxUses?: number | null
}

const relationRecord = (value: unknown): RelationRow | null => value && typeof value === 'object' ? value as RelationRow : null

const text = (value: unknown, fallback = ''): string => typeof value === 'string' ? value : value == null ? fallback : String(value)

/** Return the only persisted representation of a raw invite token. */
export function hashInvitationToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex')
}

/** Generate 256 bits of random URL-safe token material. */
export function generateInvitationToken(): string {
  return randomBytes(32).toString('base64url')
}

function isoDate(value: Date | string | null | undefined): string | undefined {
  if (value == null || value === '') return undefined
  const date = value instanceof Date ? value : new Date(value)
  if (!Number.isFinite(date.getTime())) throw new Error('Invitation expiresAt must be a valid date.')
  return date.toISOString()
}

function normalizedMaxUses(purpose: InvitationPurpose, maxUses: number | null | undefined): number | null {
  if (purpose === 'domain_bootstrap' || purpose === 'character_claim') return 1
  if (maxUses == null) return null
  if (!Number.isInteger(maxUses) || maxUses < 2) throw new Error('A domain_join Invitation must be multi-use (maxUses null or at least 2).')
  return maxUses
}

/**
 * Issue a link and return its raw token exactly once. The raw token is never
 * passed to Payload, logged, or included in the safe invitation projection.
 */
export async function issueInvitation(payload: Payload, input: IssueInvitationInput): Promise<{ token: string; invitation: SafeInvitationView }> {
  if (!isInvitationPurpose(input.purpose)) throw new Error('Unknown Invitation purpose.')
  const domainId = idOf(input.domainId)
  const issuedByUserId = idOf(input.issuedByUserId)
  const issuedByCharacterId = idOf(input.issuedByCharacterId)
  if (domainId == null || issuedByUserId == null || issuedByCharacterId == null) throw new Error('Invitation Domain and issuer identities are required.')
  const characterId = idOf(input.characterId)
  const maxUses = normalizedMaxUses(input.purpose, input.maxUses)
  const token = generateInvitationToken()
  const data = {
    purpose: input.purpose,
    domain: domainId,
    character: characterId,
    tokenHash: hashInvitationToken(token),
    issuedByUser: issuedByUserId,
    issuedByCharacter: issuedByCharacterId,
    expiresAt: isoDate(input.expiresAt),
    maxUses,
    useCount: 0,
  }
  // Validate live target state before persisting. Collection hooks repeat this
  // check, which protects direct overrideAccess writes as well.
  await assertInvitationPurposeState(payload, data)
  const created = await payload.create({ collection: 'invitations', overrideAccess: true, data: data as never }) as unknown as InvitationRow
  const hydrated = await payload.findByID({ collection: 'invitations', id: created.id, depth: 1, overrideAccess: true }).catch(() => created) as unknown as InvitationRow
  return { token, invitation: toSafeInvitation(hydrated) }
}

function targetIsExhausted(row: InvitationRow): boolean {
  const maxUses = row.maxUses == null || row.maxUses === '' ? null : Number(row.maxUses)
  return maxUses != null && Number.isFinite(maxUses) && Number(row.useCount ?? 0) >= maxUses
}

function statusWithoutTarget(row: InvitationRow, expectedPurpose?: InvitationPurpose): InvitationStatus {
  if (!isInvitationPurpose(row.purpose)) return 'invalid'
  if (expectedPurpose && row.purpose !== expectedPurpose) return 'invalid'
  if (row.revokedAt) return 'revoked'
  const expiresAt = row.expiresAt == null || row.expiresAt === '' ? NaN : Date.parse(String(row.expiresAt))
  if (Number.isFinite(expiresAt) && expiresAt <= Date.now()) return 'expired'
  if (targetIsExhausted(row)) return 'exhausted'
  return 'valid'
}

/** Create a deliberately narrow, token-free projection for UI/API use. */
export function toSafeInvitation(row: InvitationRow): SafeInvitationView {
  const purpose = isInvitationPurpose(row.purpose) ? row.purpose : 'domain_join'
  const domain = relationRecord(row.domain)
  const character = relationRecord(row.character)
  const issuedByUser = relationRecord(row.issuedByUser)
  const issuedByCharacter = relationRecord(row.issuedByCharacter)
  const maxUses = row.maxUses == null || row.maxUses === '' ? null : Number(row.maxUses)
  const useCount = Number(row.useCount ?? 0)
  return {
    id: Number(row.id),
    purpose,
    purposeLabel: invitationPurposeLabel(purpose),
    domain: idOf(domain?.id ?? row.domain) == null ? null : { id: Number(idOf(domain?.id ?? row.domain)), name: text(domain?.name, 'Domain'), slug: text(domain?.slug, '') },
    character: idOf(character?.id ?? row.character) == null ? null : { id: Number(idOf(character?.id ?? row.character)), name: text(character?.name, 'Character') },
    issuedByUser: idOf(issuedByUser?.id ?? row.issuedByUser) == null ? null : { id: Number(idOf(issuedByUser?.id ?? row.issuedByUser)), name: text(issuedByUser?.name ?? issuedByUser?.email, 'User') },
    issuedByCharacter: idOf(issuedByCharacter?.id ?? row.issuedByCharacter) == null ? null : { id: Number(idOf(issuedByCharacter?.id ?? row.issuedByCharacter)), name: text(issuedByCharacter?.name, 'Character') },
    createdAt: row.createdAt == null ? null : String(row.createdAt),
    expiresAt: row.expiresAt == null ? null : String(row.expiresAt),
    revokedAt: row.revokedAt == null ? null : String(row.revokedAt),
    maxUses: maxUses == null || !Number.isFinite(maxUses) ? null : maxUses,
    useCount: Number.isFinite(useCount) ? useCount : 0,
    lastUsedAt: row.lastUsedAt == null ? null : String(row.lastUsedAt),
    exhausted: maxUses != null && Number.isFinite(maxUses) && useCount >= maxUses,
  }
}

async function findByToken(payload: Payload, token: string, transactionID?: number | string | null): Promise<InvitationRow | null> {
  if (!isInvitationToken(token)) return null
  const result = await payload.find({
    collection: 'invitations',
    where: { tokenHash: { equals: hashInvitationToken(token) } },
    depth: 1,
    limit: 1,
    overrideAccess: true,
    req: transactionID == null ? undefined : { transactionID },
  })
  return (result.docs[0] as unknown as InvitationRow | undefined) ?? null
}

async function resolveRow(payload: Payload, row: InvitationRow, expectedPurpose?: InvitationPurpose, transactionID?: number | string | null): Promise<InvitationResolution> {
  const status = statusWithoutTarget(row, expectedPurpose)
  if (status !== 'valid') return { status, invitation: toSafeInvitation(row) }
  try {
    await assertInvitationPurposeState(payload, row, { transactionID })
  } catch {
    // A Character can be claimed or a Domain can be closed after issuance;
    // stale links fail closed without disclosing the underlying reason.
    return { status: 'invalid', invitation: toSafeInvitation(row) }
  }
  return { status: 'valid', invitation: toSafeInvitation(row) }
}

/** Resolve a raw token to a safe display projection; never return tokenHash. */
export async function resolveInvitation(payload: Payload, token: string, options: { expectedPurpose?: InvitationPurpose } = {}): Promise<InvitationResolution> {
  const row = await findByToken(payload, token)
  if (!row) return { status: 'invalid', invitation: null }
  return resolveRow(payload, row, options.expectedPurpose)
}

/**
 * Consume inside a BEGIN IMMEDIATE transaction. SQLite serializes competing
 * writers, so a one-use link can have exactly one successful increment.
 */
async function consumeInvitationInTransaction(payload: Payload, token: string, options: ConsumeInvitationOptions, transactionID: number | string): Promise<InvitationConsumeResult> {
  const row = await findByToken(payload, token, transactionID)
  if (!row) return { status: 'invalid', invitation: null, consumed: false }
  const resolved = await resolveRow(payload, row, options.expectedPurpose, transactionID)
  if (resolved.status !== 'valid') return { ...resolved, consumed: false }
  const useCount = Number(row.useCount ?? 0)
  const now = new Date().toISOString()
  const updated = await payload.update({
    collection: 'invitations',
    id: row.id,
    overrideAccess: true,
    req: { transactionID },
    depth: 1,
    data: { useCount: useCount + 1, lastUsedAt: now } as never,
  }) as unknown as InvitationRow
  return { status: 'valid', invitation: toSafeInvitation(updated), consumed: true }
}

export async function consumeInvitation(payload: Payload, token: string, options: ConsumeInvitationOptions = {}): Promise<InvitationConsumeResult> {
  if (!isInvitationToken(token)) return { status: 'invalid', invitation: null, consumed: false }
  try {
    if (options.transactionID != null) return await consumeInvitationInTransaction(payload, token, options, options.transactionID)
    return await runInTransaction(payload, async (transactionID) => {
      return consumeInvitationInTransaction(payload, token, options, transactionID)
    })
  } catch (error) {
    // A lock/transaction race must fail closed and must not expose database
    // diagnostics (or the raw token) through a public invite resolver.
    if (error instanceof Error && /SQLITE_BUSY|database is locked/i.test(error.message)) return { status: 'invalid', invitation: null, consumed: false }
    throw error
  }
}

export async function revokeInvitation(payload: Payload, invitationId: number | string): Promise<SafeInvitationView | null> {
  const id = idOf(invitationId)
  if (id == null) return null
  const row = await payload.findByID({ collection: 'invitations', id, depth: 1, overrideAccess: true }).catch(() => null) as unknown as InvitationRow | null
  if (!row) return null
  if (!row.revokedAt) {
    const updated = await payload.update({ collection: 'invitations', id, depth: 1, overrideAccess: true, data: { revokedAt: new Date().toISOString() } as never }) as unknown as InvitationRow
    return toSafeInvitation(updated)
  }
  return toSafeInvitation(row)
}

export async function listInvitations(payload: Payload, options: { domainId?: number | string; expectedPurpose?: InvitationPurpose } = {}): Promise<Array<SafeInvitationView & { status: InvitationStatus }>> {
  const domainId = options.domainId == null ? null : idOf(options.domainId)
  const result = await payload.find({
    collection: 'invitations',
    where: domainId == null ? undefined : { domain: { equals: domainId } },
    depth: 1,
    limit: 1000,
    pagination: false,
    sort: '-createdAt',
    overrideAccess: true,
  })
  const views: Array<SafeInvitationView & { status: InvitationStatus }> = []
  for (const row of result.docs as unknown as InvitationRow[]) {
    const view = toSafeInvitation(row)
    const resolved = await resolveRow(payload, row, options.expectedPurpose)
    views.push({ ...view, status: resolved.status })
  }
  return views
}

/** Build the only browser-facing representation of an issued raw token. */
export function invitationPath(token: string): string {
  if (!isInvitationToken(token)) throw new Error('Invalid invitation token.')
  return `/invite/${encodeURIComponent(token)}`
}
