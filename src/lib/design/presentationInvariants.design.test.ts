import { readFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * P08D-T01-F static ownership invariants (G2). Records presentation belongs
 * to the Designs; the route supplies only the Page Model and the Design
 * dispatch. These source-tree checks keep presentation imports from creeping
 * back into the route tree — the same posture shellInvariants uses for the
 * shell (DOM tests cannot see the server-rendered route).
 */
const ROOT = process.cwd()
const SRC = path.join(ROOT, 'src')
const PRUNE = new Set(['node_modules', '.next', '.git', '.cache'])

function walk(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry)
    if (statSync(full).isDirectory()) {
      if (!PRUNE.has(entry)) out.push(...walk(full))
    } else if (/\.(ts|tsx)$/.test(entry)) {
      out.push(full)
    }
  }
  return out
}

const rel = (p: string) => path.relative(ROOT, p).replaceAll(path.sep, '/')
const read = (p: string) => readFileSync(p, 'utf8')

describe('P08D-T01 records presentation ownership', () => {
  it('no Design presentation imports the records route tree or the legacy explorer', () => {
    for (const file of walk(path.join(SRC, 'designs'))) {
      const content = read(file)
      const relative = rel(file)
      expect(content, `${relative} must not import the records route tree`).not.toContain('@/app/(frontend)/domain/[slug]/records')
      expect(content, `${relative} must not reference the legacy RecordsExplorer`).not.toContain('RecordsExplorer')
    }
  })

  it('Civic owns its Records DOM and styles: no @/app import in the Records presentation files', () => {
    for (const file of ['src/designs/civic/ExplorerBody.tsx', 'src/designs/civic/CivicRecords.tsx']) {
      const content = read(path.join(SRC, file.replace(/^src\//, '')))
      expect(content, `${file} must not import from the route tree`).not.toContain('@/app/')
    }
    const explorer = read(path.join(SRC, 'designs/civic/ExplorerBody.tsx'))
    expect(explorer, 'ExplorerBody owns its Design-local CSS module').toMatch(/\.\/.*\.module\.(?:css|scss)/)
  })

  it('the records route stays thin: model building and Design dispatch only', () => {
    const page = read(path.join(SRC, 'app/(frontend)/domain/[slug]/records/page.tsx'))
    expect(page).toContain('resolveDomainRouteShell')
    expect(page).toContain('buildRecordsPageModel')
    expect(page, 'route renders through the registry, never Civic presentation').not.toContain('ExplorerBody')
    expect(page, 'route has no route-local records styles').not.toContain('styles.')
  })
})

describe('P08D-T09 first-class isolation scan', () => {
  const FIRST_CLASS_DIRS = ['civic', 'obsidian', 'atelier']
  const FORBIDDEN = [
    '@/app/',
    '@/components/theme/',
    '@/payload.config',
    '@/collections/',
    '@/lib/authz/',
    '@/designs/civic',
    '@/designs/obsidian',
    '@/designs/atelier',
    '../shared/legacy-frame',
    '../shared/legacy-thin',
  ]

  // OBSIDIAN-T09: first-class Designs must never import server-action modules.
  // Work action bridges arrive as props (WorkDesignViewProps); management
  // mutations live behind the shared workspace/endpoints. A first-class
  // Design importing an action module would bypass the action-bridge seam.
  const FORBIDDEN_ACTIONS = ['@/lib/actions/']

  it('first-class Design production files import none of the forbidden modules', () => {
    for (const dir of FIRST_CLASS_DIRS) {
      for (const file of walk(path.join(SRC, 'designs', dir))) {
        if (file.includes('.design.test.')) continue
        const content = read(file)
        const relative = rel(file)
        for (const forbidden of [...FORBIDDEN, ...FORBIDDEN_ACTIONS]) {
          expect(content, `${relative} must not import ${forbidden}`).not.toContain(forbidden)
        }
      }
    }
  })

  it('first-class Designs never reference legacy shared frame/thin modules even relative', () => {
    for (const dir of FIRST_CLASS_DIRS) {
      for (const file of walk(path.join(SRC, 'designs', dir))) {
        if (file.includes('.design.test.')) continue
        const relative = rel(file)
        expect(read(file), `${relative} must not use the legacy shared frame`).not.toMatch(/shared\/legacy-frame/)
        expect(read(file), `${relative} must not use legacy thin views`).not.toMatch(/shared\/legacy-thin/)
      }
    }
  })
})

describe('P08D-T02 document presentation ownership', () => {
  it('the shared Document action helper is pure: no client directive, no app imports', () => {
    const helper = read(path.join(SRC, 'lib/documents/presentation/actions.ts'))
    expect(helper, 'helper must stay a pure server-safe module').not.toContain("'use client'")
    expect(helper, 'helper imports no route tree').not.toContain('@/app/')
    expect(helper, 'helper imports no client action context').not.toContain('useRecordActions')
    expect(helper, 'helper imports no workspace').not.toContain('workspace/')
  })

  it('Document views take the action bridge as props — never client action context', () => {
    for (const file of ['src/designs/civic/CivicDocument.tsx', 'src/designs/obsidian/ObsidianDocument.tsx', 'src/designs/atelier/public.tsx']) {
      const content = read(path.join(SRC, file.replace(/^src\//, '')))
      const relative = file
      expect(content, `${relative} must not consume the client action context hook`).not.toContain('useRecordActions')
      expect(content, `${relative} receives the bridge via DocumentDesignViewProps`).toContain('workflowAction')
    }
    // Civic and Atelier consume the shared action descriptor helper directly;
    // Obsidian delegates rendering to its own bar over the same props seam.
    expect(read(path.join(SRC, 'designs/civic/CivicDocument.tsx')), 'civic consumes the shared action descriptor helper').toContain('getDocumentActions')
    expect(read(path.join(SRC, 'designs/atelier/public.tsx')), 'atelier consumes the shared action descriptor helper').toContain('getDocumentActions')
  })
})
