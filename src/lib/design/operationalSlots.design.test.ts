import { describe, expect, it } from 'vitest'

import { civic } from '@/designs/civic'
import { ledger } from '@/designs/ledger'
import { poster } from '@/designs/poster'
import type { DesignDefinition } from './types'

/**
 * OBSIDIAN-T01 operational-slot baseline.
 *
 * The `work` / `members` / `management.*` slots are OPTIONAL at T01 by design
 * (frozen requiredness ladder, patch spec §5.1). This fixture records which
 * slots each Design currently declares and — critically — type-checks that any
 * slot a Design DOES declare is well-formed. T08 flips the required sets to
 * the full operational surface for first-class Designs (Poster keeps a
 * compatibility marker); T09 enforces them at the conformance gate.
 *
 * Declared-slot baseline at T01: every Design declares none of the new
 * operational slots. The type itself prevents declaring a malformed slot.
 */

const OPERATIONAL_SLOTS = [
  'work',
  'members',
  'management.departments',
  'management.folders',
  'management.roles',
  'management.documentTypes',
  'management.people',
  'management.person',
  'management.invitations',
] as const

type OperationalSlot = (typeof OPERATIONAL_SLOTS)[number]

// Only `pages` is inspected here; it is not parameterized by the Design's
// config type, so the erased-shape pick avoids the generic variance issue
// that a whole-`DesignDefinition` parameter would hit.
function declaredSlots(design: { pages: DesignDefinition<object>['pages'] }): OperationalSlot[] {
  const declared: OperationalSlot[] = []
  if (design.pages.work) declared.push('work')
  if (design.pages.members) declared.push('members')
  const management = design.pages.management
  if (management) {
    if (management.departments) declared.push('management.departments')
    if (management.folders) declared.push('management.folders')
    if (management.roles) declared.push('management.roles')
    if (management.documentTypes) declared.push('management.documentTypes')
    if (management.people) declared.push('management.people')
    if (management.person) declared.push('management.person')
    if (management.invitations) declared.push('management.invitations')
  }
  return declared
}

const ALL_DESIGNS: Array<[string, { pages: DesignDefinition<object>['pages'] }]> = [
  ['civic', civic],
  ['ledger', ledger],
  ['poster', poster],
]

describe('OBSIDIAN-T01 operational slot baseline', () => {
  it('records the declared operational slots for every Design (T01 baseline: none)', () => {
    // At T01 every Design may omit the new optional slots; the baseline is
    // empty and T08 updates these sets to the full operational surface.
    const expected: Record<string, OperationalSlot[]> = {
      civic: [],
      ledger: [],
      poster: [],
    }
    for (const [key, design] of ALL_DESIGNS) {
      expect(declaredSlots(design), `${key} declared operational slots`).toEqual(expected[key])
    }
  })

  it('every declared operational slot is a valid slot name', () => {
    for (const [, design] of ALL_DESIGNS) {
      for (const slot of declaredSlots(design)) {
        expect(OPERATIONAL_SLOTS).toContain(slot)
      }
    }
  })

  it('the valid slot name list is complete and frozen for the stack', () => {
    expect(OPERATIONAL_SLOTS).toEqual([
      'work',
      'members',
      'management.departments',
      'management.folders',
      'management.roles',
      'management.documentTypes',
      'management.people',
      'management.person',
      'management.invitations',
    ])
  })
})