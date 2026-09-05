/**
 * P07X-T01 — Character kind vocabulary and pure field invariants.
 *
 * `Character.kind` is exactly `player | npc | domain_admin | platform_admin`.
 * There is deliberately NO `administrative` kind plus a scope flag: platform
 * work must require kind=platform_admin and Domain work must require
 * kind=domain_admin, and a wrong scope value must never turn one into the
 * other. Payload-dependent checks (owner equality, exactly-one provisioning,
 * membership/role/claim exclusions) live in the collection hooks and the
 * provisioning helpers.
 */

import type { Payload } from 'payload'

export const CHARACTER_KINDS = ['player', 'npc', 'domain_admin', 'platform_admin'] as const
export type CharacterKind = (typeof CHARACTER_KINDS)[number]

export const ADMIN_KINDS: ReadonlySet<CharacterKind> = new Set(['domain_admin', 'platform_admin'])

export function isCharacterKind(value: string): value is CharacterKind {
  return (CHARACTER_KINDS as readonly string[]).includes(value)
}

export function isAdminKind(kind: string | null | undefined): boolean {
  return kind != null && ADMIN_KINDS.has(kind as CharacterKind)
}

const present = (value: unknown): boolean => value !== null && value !== undefined && value !== ''

export type CharacterKindInput = {
  kind?: string | null
  controlledBy?: unknown
  administrativeDomain?: unknown
}

/**
 * Pure field-level invariants shared by the collection hook and tests.
 * - kind must be one of the four literals;
 * - admin kinds require a controlling User;
 * - domain_admin requires exactly one administrativeDomain;
 * - no other kind may carry an administrativeDomain.
 */
export function assertCharacterKindFields(input: CharacterKindInput): true {
  const kind = input.kind ?? 'player'
  if (!isCharacterKind(kind)) throw new Error(`Unknown Character kind "${kind}".`)
  if (isAdminKind(kind) && !present(input.controlledBy)) throw new Error('Administrative Characters must be controlled by a User.')
  if (kind === 'domain_admin' && !present(input.administrativeDomain)) throw new Error('A domain_admin Character must identify exactly one administrativeDomain.')
  if (kind !== 'domain_admin' && present(input.administrativeDomain)) throw new Error('Only domain_admin Characters may identify an administrativeDomain.')
  return true
}

/** Ordinary (non-admin) kinds only — used to filter RP/public projections. */
export function isOrdinaryKind(kind: string | null | undefined): boolean {
  return kind === 'player' || kind === 'npc'
}

/** Resolve whether a Character row is an administrative kind. */
export async function characterIsAdministrative(payload: Payload, characterId: number | string): Promise<boolean> {
  const row = await payload.findByID({ collection: 'characters', id: Number(characterId), depth: 0, overrideAccess: true }).catch(() => null) as { kind?: string } | null
  return isAdminKind(row?.kind ?? 'player')
}