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
    expect(explorer, 'ExplorerBody owns its Design-local SCSS').toMatch(/\.\/.*\.module\.scss/)
  })

  it('the records route stays thin: model building and Design dispatch only', () => {
    const page = read(path.join(SRC, 'app/(frontend)/domain/[slug]/records/page.tsx'))
    expect(page).toContain('resolveDomainRouteShell')
    expect(page).toContain('buildRecordsPageModel')
    expect(page, 'route renders through the registry, never Civic presentation').not.toContain('ExplorerBody')
    expect(page, 'route has no route-local records styles').not.toContain('styles.')
  })
})