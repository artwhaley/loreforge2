import { describe, expect, it } from 'vitest'

import { civic } from '@/designs/civic'
import { ledger } from '@/designs/ledger'
import { poster } from '@/designs/poster'
import type { DesignDefinition } from './types'

// Config-parameterized pages are erased at the fixture boundary, mirroring the
// registry erasure (OBSIDIAN-T02).
type Erased = DesignDefinition<object>

/**
 * OBSIDIAN-T08 operational-slot baseline.
 *
 * The `work` / `members` / `management.*` slots are REQUIRED in the type as
 * of T08: every Design must declare them to compile. The `status` field marks
 * the difference between first-class and compatibility Designs — Poster
 * declares compatibility renderers (delegating to the shared operational
 * bodies) and is gated out of first-class conformance at T09. This fixture
 * records the declared set for every Design and trips if a required slot
 * silently disappears from the type or a Design's declaration.
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
  ['civic', civic as unknown as Erased],
  ['ledger', ledger as unknown as Erased],
  ['poster', poster as unknown as Erased],
]

const FULL_OPERATIONAL_SET: OperationalSlot[] = [...OPERATIONAL_SLOTS]

describe('OBSIDIAN-T08 operational slot baseline', () => {
  it('every Design declares the full required operational set (type-enforced, recorded here)', () => {
    for (const [key, design] of ALL_DESIGNS) {
      expect(declaredSlots(design), `${key} declared operational slots`).toEqual(FULL_OPERATIONAL_SET)
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

  it('Poster carries the compatibility status marker (T09 gates first-class off it)', () => {
    expect((poster as Erased).status).toBe('compatibility')
    expect((civic as Erased).status).toBe('first-class')
    expect((ledger as Erased).status).toBe('first-class')
  })
})