import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

// Shared operational bodies import interactive management components whose
// server-action modules pull Payload config at import; stub the action
// modules and the app-router hooks (same boundary as operationalDispatch).
vi.mock('@/lib/actions/documentTypes', () => ({ deleteTypeAction: async () => ({}), duplicateTypeAction: async () => ({}), moveTypeAction: async () => ({}), setActiveTypeAction: async () => ({}), updateTypeAction: async () => ({}) }))
vi.mock('@/lib/actions/typeFolders', () => ({ createTypeFolderAction: async () => ({}), deleteTypeFolderAction: async () => ({}), moveTypeFolderAction: async () => ({}), renameTypeFolderAction: async () => ({}) }))
vi.mock('@/lib/actions/invitations', () => ({ issueInvitationAction: async () => ({ ok: true as const }) }))
vi.mock('next/navigation', () => ({
  usePathname: () => '/domain/preview-domain',
  useRouter: () => ({ push: () => {}, refresh: () => {} }),
  useSearchParams: () => new URLSearchParams(),
}))

import { civic } from '@/designs/civic'
import { civicDefaults } from '@/designs/civic/config'
import { ledger } from '@/designs/ledger'
import { ledgerDefaults } from '@/designs/ledger/config'
import { resolveDomainDesign } from './resolveDomainDesign'
import type { DesignDefinition } from './types'
import type { LegacyDomainAppearance } from './contracts'
import {
  assertOperationalCapabilities,
} from './conformance'
import {
  DEPARTMENTS_MANAGEMENT_MODEL,
  DEPARTMENTS_MANAGEMENT_VIEWER_MODEL,
  FOLDERS_MANAGEMENT_DENIED_MODEL,
  FOLDERS_MANAGEMENT_MODEL,
  INVITATIONS_MANAGEMENT_MODEL,
  MEMBERS_MANAGEMENT_MODEL,
  MEMBERS_MANAGEMENT_VIEWER_MODEL,
  WORK_MANAGEMENT_EMPTY_MODEL,
  WORK_MANAGEMENT_MODEL,
} from './fixtures'

type Erased = DesignDefinition<object>

const VARIANT = { headerLayout: 'centered', documentStyle: 'classic' }
const stubAction = async () => {}

/**
 * OBSIDIAN-T09 management conformance gate. The same deterministic Page Model
 * fixtures render through Civic and Ledger's operational slots; capability
 * absence produces no actionable control; the required slot set is enforced
 * (T08 type-level + this gate). Poster stays out of first-class assertions —
 * its status is 'compatibility' (asserted in operationalSlots fixture).
 */
describe('OBSIDIAN-T09 management conformance gate', () => {
  const pairs: Array<[Erased, object]> = [
    [civic as unknown as Erased, civicDefaults],
    [ledger as unknown as Erased, ledgerDefaults],
  ]

  it('Civic and Ledger render the same work model with the same actionable approve/reject surface', () => {
    for (const [Design, config] of pairs) {
      const { container } = render(
        <Design.pages.work {...WORK_MANAGEMENT_MODEL} approveAction={stubAction} rejectAction={stubAction} {...VARIANT} designConfig={config} />,
      )
      assertOperationalCapabilities(container, 'work', WORK_MANAGEMENT_MODEL)
    }
  })

  it('work without entries renders no approve/reject control (capability absence)', () => {
    for (const [Design, config] of pairs) {
      const { container } = render(
        <Design.pages.work {...WORK_MANAGEMENT_EMPTY_MODEL} approveAction={stubAction} rejectAction={stubAction} {...VARIANT} designConfig={config} />,
      )
      assertOperationalCapabilities(container, 'work', WORK_MANAGEMENT_EMPTY_MODEL, { capabilityPresent: false })
      expect(container.textContent).not.toContain('Approve and file')
    }
  })

  it('Civic and Ledger render the members directory from the same model', () => {
    for (const [Design, config] of pairs) {
      const { container } = render(<Design.pages.members {...MEMBERS_MANAGEMENT_MODEL} {...VARIANT} designConfig={config} />)
      assertOperationalCapabilities(container, 'members', MEMBERS_MANAGEMENT_MODEL)
    }
  })

  it('members without search capability exposes no admin search', () => {
    for (const [Design, config] of pairs) {
      const { container } = render(<Design.pages.members {...MEMBERS_MANAGEMENT_VIEWER_MODEL} {...VARIANT} designConfig={config} />)
      assertOperationalCapabilities(container, 'members', MEMBERS_MANAGEMENT_VIEWER_MODEL, { capabilityPresent: false })
      expect(container.textContent).not.toContain('Search Characters to add')
    }
  })

  it('Civic and Ledger render departments management with archive capability from the same model', () => {
    for (const [Design, config] of pairs) {
      const { container } = render(<Design.pages.management.departments {...DEPARTMENTS_MANAGEMENT_MODEL} {...VARIANT} designConfig={config} />)
      assertOperationalCapabilities(container, 'management.departments', DEPARTMENTS_MANAGEMENT_MODEL)
    }
  })

  it('departments without archive capability renders only the restore path', () => {
    for (const [Design, config] of pairs) {
      const { container } = render(<Design.pages.management.departments {...DEPARTMENTS_MANAGEMENT_VIEWER_MODEL} {...VARIANT} designConfig={config} />)
      assertOperationalCapabilities(container, 'management.departments', DEPARTMENTS_MANAGEMENT_VIEWER_MODEL, { capabilityPresent: false })
      expect(container.textContent).toContain('Restore')
      expect(container.textContent).not.toContain('Archive')
    }
  })

  it('Civic and Ledger render invitations with revoke only for revocable links', () => {
    for (const [Design, config] of pairs) {
      const { container } = render(<Design.pages.management.invitations {...INVITATIONS_MANAGEMENT_MODEL} {...VARIANT} designConfig={config} />)
      assertOperationalCapabilities(container, 'management.invitations', INVITATIONS_MANAGEMENT_MODEL)
      expect(container.textContent).toContain('Revoke')
    }
  })

  it('Civic and Ledger expose the folders surface and gate the root create affordance', () => {
    for (const [Design, config] of pairs) {
      const { container } = render(<Design.pages.management.folders {...FOLDERS_MANAGEMENT_MODEL} {...VARIANT} designConfig={config} />)
      assertOperationalCapabilities(container, 'management.folders', FOLDERS_MANAGEMENT_MODEL)
      const denied = render(<Design.pages.management.folders {...FOLDERS_MANAGEMENT_DENIED_MODEL} {...VARIANT} designConfig={config} />)
      assertOperationalCapabilities(denied.container, 'management.folders', FOLDERS_MANAGEMENT_DENIED_MODEL, { capabilityPresent: false })
    }
  })

  it('invalid active config is normalized to Design defaults before the operation renderer receives it', () => {
    const invalid = { designTemplate: 'civic', schemaVersion: 1, designConfig: { notTheRightShape: true } } as unknown as LegacyDomainAppearance
    const resolved = resolveDomainDesign(invalid)
    expect(resolved.design.key).toBe('civic')
    // The normalized config is the Civic defaults, not the raw invalid blob.
    expect(JSON.stringify(resolved.config)).toBe(JSON.stringify(civicDefaults))
    // And it renders an operational surface without throwing.
    const ErasedCivic = civic as unknown as Erased
    const { container } = render(
      <ErasedCivic.pages.management.folders {...FOLDERS_MANAGEMENT_MODEL} {...VARIANT} designConfig={resolved.config as object} />,
    )
    assertOperationalCapabilities(container, 'management.folders', FOLDERS_MANAGEMENT_MODEL)
  })

  it('every required operational slot is declared and renders a heading (identity check across Designs)', () => {
    const slotPairs: Array<[(design: Erased) => unknown, (container: HTMLElement) => void]> = [
      [(design) => design.pages.work, (c) => expect(c.textContent).toContain('Work')],
      [(design) => design.pages.members, (c) => expect(c.textContent).toContain('Members')],
      [(design) => design.pages.management.departments, (c) => expect(c.textContent).toContain('Manage Departments')],
      [(design) => design.pages.management.folders, (c) => expect(c.textContent).toContain('Folders')],
      [(design) => design.pages.management.roles, (c) => expect(c.textContent).toContain('Roles')],
      [(design) => design.pages.management.documentTypes, (c) => expect(c.textContent).toContain('Document Types')],
      [(design) => design.pages.management.people, (c) => expect(c.textContent).toContain('People')],
      [(design) => design.pages.management.invitations, (c) => expect(c.textContent).toContain('Invitations')],
    ]
    for (const Design of [civic, ledger] as Erased[]) {
      for (const [slot, assert] of slotPairs) {
        expect(slot(Design), `required slot must be declared on ${(Design as { key: string }).key}`).toBeTruthy()
      }
    }
  })
})