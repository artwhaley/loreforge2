import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

// The shared operational bodies import interactive management components whose
// server-action modules pull Payload config (DB/secret guards) at import
// time; the action modules are not exercised here (the interactive surfaces
// are covered by their own workspace tests), so stub them at the module
// boundary. The FolderManager workspace also needs the app-router hook stubs.
vi.mock('@/lib/actions/documentTypes', () => ({ deleteTypeAction: async () => ({}), duplicateTypeAction: async () => ({}), moveTypeAction: async () => ({}), setActiveTypeAction: async () => ({}), updateTypeAction: async () => ({}) }))
vi.mock('@/lib/actions/typeFolders', () => ({ createTypeFolderAction: async () => ({}), deleteTypeFolderAction: async () => ({}), moveTypeFolderAction: async () => ({}), renameTypeFolderAction: async () => ({}) }))
vi.mock('next/navigation', () => ({
  usePathname: () => '/domain/preview-domain',
  useRouter: () => ({ push: () => {}, refresh: () => {} }),
  useSearchParams: () => new URLSearchParams(),
}))

import { civic } from '@/designs/civic'
import { civicDefaults } from '@/designs/civic/config'
import { obsidian } from '@/designs/obsidian'
import { obsidianDefaults } from '@/designs/obsidian/config'
import type { FolderManagementPageModel } from '@/lib/page-models/management/folders'
import type { DesignDefinition } from './types'

// Config is erased at the fixture boundary (OBSIDIAN-T02); concrete renders
// use each Design's real defaults.
type Erased = DesignDefinition<object>

const CONFIG = {}
const REAL_CONFIGS = { civic: civicDefaults, obsidian: obsidianDefaults } as const
const VARIANT = { headerLayout: 'centered', documentStyle: 'classic' }

const FOLDERS_MODEL: FolderManagementPageModel = {
  baseUrl: '/domain/preview-domain',
  domainSlug: 'preview-domain',
  domainName: 'Preview Domain',
  domainId: 42,
  rootManageable: true,
  status: null,
  nodes: [
    { id: 1, name: 'Hall of Coin', createdAt: '2026-01-01T00:00:00.000Z', systemManaged: false, canManage: true, children: [] },
  ],
}

/**
 * OBSIDIAN-T08 route-level dispatch: the routes hand the SAME page model to
 * `route.design.pages.<slot>` and never branch on Design keys. This test
 * proves the same model drives a DIFFERENT renderer identity per Design (the
 * entrypoints are distinct functions registered under each Design), and that
 * the model renders through each slot. It mirrors what the route does
 * (`resolveDomainRouteShell(...)` → `route.design.pages.management.folders`),
 * with the resolver itself covered by the existing resolver tests.
 */
describe('OBSIDIAN-T08 operational dispatch', () => {
  it('each Design registers its own operational entrypoint for the same slot', () => {
    const designs = { civic: civic as unknown as Erased, obsidian: obsidian as unknown as Erased }
    const entries = Object.values(designs).map((design) => design.pages.management.folders)
    expect(new Set(entries).size).toBe(2)
    // Type-level requiredness is the real gate; these are distinct functions.
    expect(entries[0]).not.toBe(entries[1])
  })

  it('the same FolderManagementPageModel renders through every Design slot without branching', () => {
    const renders: Array<() => HTMLElement> = [
      () => render(<civic.pages.management.folders {...FOLDERS_MODEL} {...VARIANT} designConfig={civicDefaults} />).container,
      () => render(<obsidian.pages.management.folders {...FOLDERS_MODEL} {...VARIANT} designConfig={obsidianDefaults} />).container,
    ]
    for (const renderSlot of renders) {
      const container = renderSlot()
      // The surface chrome renders synchronously; the interactive tree loads
      // its nodes asynchronously (covered by the folder workspace tests).
      expect(container.textContent).toContain('Folders')
      expect(container.textContent).toContain('New folder')
    }
  })

  it('first-class Designs drive the model with distinct owned renderers', () => {
    const { container: civicContainer } = render(<civic.pages.management.folders {...FOLDERS_MODEL} {...VARIANT} designConfig={civicDefaults} />)
    const { container: obsidianContainer } = render(<obsidian.pages.management.folders {...FOLDERS_MODEL} {...VARIANT} designConfig={obsidianDefaults} />)
    expect(civicContainer.innerHTML).toBeTruthy()
    expect(obsidianContainer.innerHTML).toBeTruthy()
    // Same model, same surface copy, but rendered by different owned entrypoints.
    expect(civic.pages.management.folders).not.toBe(obsidian.pages.management.folders)
  })
})
